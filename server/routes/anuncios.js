// Rutas de Avisos / Comunicados (todas piden sesión iniciada)
//   GET  /api/anuncios            Lista de avisos que el usuario puede ver (?limite=N y ?destacados=1 opcionales)
//   GET  /api/anuncios/destinatarios  Personas a las que se puede dirigir un aviso (solo con permiso publicar_avisos)
//   GET  /api/anuncios/notificaciones          Campana: avisos sin abrir y cuántos son nuevos
//   POST /api/anuncios/notificaciones/leidas   Campana: "Marcar todas como leídas"
//   GET  /api/anuncios/:id       Detalle de un aviso con sus adjuntos (y registra que lo vio)
//   POST /api/anuncios            Publicar un aviso (solo con permiso publicar_avisos) y mandar push
//   POST /api/anuncios/:id/leido  Confirmar lectura
//   PUT  /api/anuncios/:id/destacado  Destacar o quitar del carrusel (solo con permiso publicar_avisos)
//   POST /api/anuncios/:id/imagen     Subir o reemplazar la imagen (publicar_avisos)
//   GET  /api/anuncios/:id/imagen     Ver la imagen
//   POST /api/anuncios/:id/adjuntos   Subir un adjunto (publicar_avisos, máximo 5)
//   GET  /api/anuncios/:id/adjuntos/:idAdj  Ver o descargar (?descargar=1) un adjunto
const path = require('path');
const express = require('express');
const db = require('../config/db');
const almacenamiento = require('../services/almacenamiento');
const autenticar = require('../middleware/autenticar');
const requierePermiso = require('../middleware/requierePermiso');
const { PERMISO_PUBLICAR_AVISOS, tienePermiso } = require('../services/permisos');
const { notificarNuevoAviso } = require('../services/notificaciones');

const router = express.Router();

// Validar un id opcional: si viene vacío regresa null, si no es un entero positivo regresa NaN
const idOpcional = (valor) => {
  if (valor === undefined || valor === null || valor === '') return null;
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : NaN;
};

// Categorías permitidas (tienen que ser las mismas del <select> en CrearAvisoView.vue)
// Si agrego otra categoria en el formulario, acordarme de ponerla aqui tambien
const CATEGORIAS_AVISO = ['Corporativo', 'Autofest 2026', 'Talento y Cultura', 'Sistemas / TI', 'General'];

// Regla de Visibilidad (la usan la lista, el detalle y la confirmación de lectura)
// Un usuario puede ver:
//   - Los avisos generales (sin departamento ni usuario destino)
//   - Los avisos para su departamento ($2)
//   - Los avisos dirigidos a él directamente ($1)
const FILTRO_VISIBLES = `
  ((a.id_dep_destino IS NULL AND a.id_usu_destino IS NULL)
   OR a.id_dep_destino = $2
   OR a.id_usu_destino = $1)
`;

// Guardar la primera vez que un usuario ve un aviso (tabla anuncios_vistos, migración 006)
// ON CONFLICT: si ya lo había visto se queda la fecha original
const registrarVista = (idUsu, idAnu) =>
  db.query(
    `INSERT INTO anuncios_vistos (id_usu, id_anu)
     VALUES ($1, $2)
     ON CONFLICT (id_usu, id_anu) DO NOTHING`,
    [idUsu, idAnu]
  );

// Endpoint para obtener los anuncios que le tocan al usuario
// Con ?destacados=1 solo regresa los destacados (carrusel de la pantalla de inicio, migración 014)
router.get('/', autenticar, async (req, res) => {
  const { id_usu: idUsu, id_departamento } = req.usuario;

  // Límite opcional de 1 a 50; si no viene, se mandan todos
  let limite = null;
  if (req.query.limite !== undefined) {
    limite = Number(req.query.limite);
    if (!Number.isInteger(limite) || limite < 1 || limite > 50) {
      return res.status(400).json({ error: 'El límite debe ser un número entre 1 y 50' });
    }
  }
  const soloDestacados = req.query.destacados === '1';

  try {
    const query = `
      SELECT
        a.id_anu,
        a.titulo,
        a.contenido,
        a.categoria,
        a.urgente,
        a.destacado,
        a.imagen IS NOT NULL AS tiene_imagen,
        a.fecha_creacion,
        a.id_dep_destino,
        a.id_usu_destino,
        u.nombre_completo AS autor,
        d.nombre AS departamento_destino,
        EXISTS (SELECT 1 FROM anuncios_adj j WHERE j.id_anu = a.id_anu) AS tiene_adjunto,
        EXISTS (SELECT 1 FROM anuncios_leidos l WHERE l.id_anu = a.id_anu AND l.id_usu = $1) AS leido
      FROM anuncios a
      INNER JOIN usuarios u ON a.id_autor = u.id_usu
      LEFT JOIN departamentos d ON a.id_dep_destino = d.id_dep
      WHERE ${FILTRO_VISIBLES}
        AND (NOT $4 OR a.destacado)
      ORDER BY a.fecha_creacion DESC
      LIMIT $3;
    `;
    // Si limite es null, PostgreSQL lo toma como "sin límite"
    const result = await db.query(query, [idUsu, id_departamento, limite, soloDestacados]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener anuncios:', error);
    res.status(500).json({ error: 'Error al consultar la base de datos' });
  }
});

// Personas a las que se puede dirigir un aviso (destino "Una persona" en CrearAvisoView)
// Solo colaboradores activos (migración 013). Va antes de '/:id' para que Express no
// confunda "destinatarios" con un id.
router.get('/destinatarios', autenticar, requierePermiso(PERMISO_PUBLICAR_AVISOS), async (req, res) => {
  try {
    const result = await db.query(
      `SELECT u.id_usu, u.nombre_completo, d.nombre AS departamento
       FROM usuarios u
       LEFT JOIN departamentos d ON d.id_dep = u.id_departamento
       WHERE u.activo
       ORDER BY u.nombre_completo`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener destinatarios:', error);
    res.status(500).json({ error: 'Error al consultar la base de datos' });
  }
});

// ── Campana de notificaciones (migración 015) ─────────────────────────
// Avisos que el usuario puede ver y todavía no ha abierto (sin fila en anuncios_vistos),
// sin contar los que él mismo publicó. "Nueva" = publicada después de la última vez
// que tocó "Marcar todas como leídas" (o de su registro, si nunca lo ha hecho).
const LIMITE_CAMPANA = 20;
const SQL_CORTE_CAMPANA = `(SELECT COALESCE(notificaciones_vistas_hasta, fecha_creacion, 'epoch')
                            FROM usuarios WHERE id_usu = $1)`;
const SQL_SIN_ABRIR = `
  ${FILTRO_VISIBLES}
  AND a.id_autor <> $1
  AND NOT EXISTS (SELECT 1 FROM anuncios_vistos v WHERE v.id_anu = a.id_anu AND v.id_usu = $1)
`;

router.get('/notificaciones', autenticar, async (req, res) => {
  const { id_usu: idUsu, id_departamento } = req.usuario;
  try {
    // Una sola consulta para la lista y los contadores, así siempre coinciden entre sí
    // (con dos consultas, abrir un aviso justo en medio daba una lista y un contador distintos).
    // Las funciones de ventana (OVER ()) cuentan todos los avisos sin abrir antes del LIMIT.
    const result = await db.query(
      `WITH sin_abrir AS (
         SELECT a.id_anu, a.titulo, LEFT(a.contenido, 160) AS contenido, a.categoria, a.urgente,
                a.fecha_creacion, a.id_autor,
                a.fecha_creacion > ${SQL_CORTE_CAMPANA} AS nueva
         FROM anuncios a
         WHERE ${SQL_SIN_ABRIR}
       )
       SELECT s.id_anu, s.titulo, s.contenido, s.categoria, s.urgente, s.fecha_creacion, s.nueva,
              u.nombre_completo AS autor,
              (COUNT(*) OVER ())::int AS total_sin_abrir,
              (COUNT(*) FILTER (WHERE s.nueva) OVER ())::int AS total_nuevas
       FROM sin_abrir s
       INNER JOIN usuarios u ON u.id_usu = s.id_autor
       ORDER BY s.fecha_creacion DESC
       LIMIT ${LIMITE_CAMPANA}`,
      [idUsu, id_departamento]
    );
    const primera = result.rows[0];
    res.json({
      sin_abrir: primera ? primera.total_sin_abrir : 0,
      nuevas: primera ? primera.total_nuevas : 0,
      avisos: result.rows.map(({ total_sin_abrir, total_nuevas, ...aviso }) => aviso)
    });
  } catch (error) {
    console.error('Error al obtener notificaciones:', error);
    res.status(500).json({ error: 'Error al consultar la base de datos' });
  }
});

// "Marcar todas como leídas": solo guarda la hora. Los avisos siguen en la lista hasta
// que se abran, y no se registran como vistos (no cambia las estadísticas de TyC).
router.post('/notificaciones/leidas', autenticar, async (req, res) => {
  try {
    await db.query('UPDATE usuarios SET notificaciones_vistas_hasta = NOW() WHERE id_usu = $1', [req.usuario.id_usu]);
    res.json({ message: 'Notificaciones marcadas como leídas', nuevas: 0 });
  } catch (error) {
    console.error('Error al marcar notificaciones:', error);
    res.status(500).json({ error: 'Error al guardar' });
  }
});

// Endpoint para obtener el detalle de un anuncio (con sus adjuntos)
// Si el usuario no lo puede ver, se responde 404 como si no existiera
router.get('/:id', autenticar, async (req, res) => {
  const idAnu = Number(req.params.id);
  const { id_usu: idUsu, id_departamento } = req.usuario;

  if (!Number.isInteger(idAnu) || idAnu <= 0) {
    return res.status(400).json({ error: 'Aviso inválido' });
  }

  try {
    const query = `
      SELECT
        a.id_anu,
        a.titulo,
        a.contenido,
        a.categoria,
        a.urgente,
        a.destacado,
        a.imagen IS NOT NULL AS tiene_imagen,
        a.fecha_creacion,
        a.id_dep_destino,
        a.id_usu_destino,
        u.nombre_completo AS autor,
        d.nombre AS departamento_destino,
        EXISTS (SELECT 1 FROM anuncios_leidos l WHERE l.id_anu = a.id_anu AND l.id_usu = $1) AS leido
      FROM anuncios a
      INNER JOIN usuarios u ON a.id_autor = u.id_usu
      LEFT JOIN departamentos d ON a.id_dep_destino = d.id_dep
      WHERE a.id_anu = $3 AND ${FILTRO_VISIBLES};
    `;
    const result = await db.query(query, [idUsu, id_departamento, idAnu]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Aviso no encontrado' });
    }

    // Registrar que el usuario abrió el aviso (solo cuenta la primera vez)
    await registrarVista(idUsu, idAnu);

    const adjuntos = await db.query(
      `SELECT id_anu_adj, nombre_archivo, tipo_archivo, tamano_bytes
       FROM anuncios_adj
       WHERE id_anu = $1
       ORDER BY id_anu_adj`,
      [idAnu]
    );

    res.json({ ...result.rows[0], adjuntos: adjuntos.rows });
  } catch (error) {
    console.error('Error al obtener detalle del anuncio:', error);
    res.status(500).json({ error: 'Error al consultar la base de datos' });
  }
});

// Endpoint para publicar un anuncio
// El autor siempre es el usuario de la sesión, no se acepta id_autor desde el cliente.
// Destino opcional: un departamento (id_dep_destino) o una persona (id_usu_destino).
// Si no viene ninguno, el aviso es general. No se pueden mandar los dos.
// destacado (opcional): el aviso también sale en el carrusel de inicio (migración 014).
router.post('/', autenticar, async (req, res) => {
  const { titulo, contenido, categoria, urgente, destacado } = req.body;
  const idAutor = req.usuario.id_usu;
  const idDepDestino = idOpcional(req.body.id_dep_destino);
  const idUsuDestino = idOpcional(req.body.id_usu_destino);

  const esTexto = (v) => typeof v === 'string' && v.trim() !== '';
  if (!esTexto(titulo) || !esTexto(contenido) || !esTexto(categoria)) {
    return res.status(400).json({ error: 'Título, contenido y categoría son obligatorios' });
  }
  if (!CATEGORIAS_AVISO.includes(categoria.trim())) {
    return res.status(400).json({ error: 'Categoría inválida' });
  }
  if (urgente !== undefined && typeof urgente !== 'boolean') {
    return res.status(400).json({ error: 'El campo urgente debe ser verdadero o falso' });
  }
  if (destacado !== undefined && typeof destacado !== 'boolean') {
    return res.status(400).json({ error: 'El campo destacado debe ser verdadero o falso' });
  }
  if (Number.isNaN(idDepDestino) || Number.isNaN(idUsuDestino)) {
    return res.status(400).json({ error: 'Departamento o usuario destino inválido' });
  }
  if (idDepDestino !== null && idUsuDestino !== null) {
    return res.status(400).json({ error: 'Elige un departamento o un usuario destino, no ambos' });
  }

  try {
    // 1. Revisar que tenga permiso para publicar (en la beta solo Talento y Cultura)
    if (!(await tienePermiso(idAutor, PERMISO_PUBLICAR_AVISOS))) {
      return res.status(403).json({ error: 'No tienes permiso para publicar avisos' });
    }

    // La persona destino debe existir y estar activa: a un desactivado no le llegaría (migración 013)
    if (idUsuDestino !== null) {
      const destino = await db.query('SELECT activo FROM usuarios WHERE id_usu = $1', [idUsuDestino]);
      if (destino.rows.length === 0) {
        return res.status(400).json({ error: 'El usuario destino no existe' });
      }
      if (!destino.rows[0].activo) {
        return res.status(400).json({ error: 'El usuario destino está desactivado' });
      }
    }

    // 2. Guardar el aviso en la BD
    const query = `
      INSERT INTO anuncios (titulo, contenido, categoria, urgente, destacado, id_autor, id_dep_destino, id_usu_destino)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id_anu, titulo, contenido, categoria, urgente, destacado, id_autor, id_dep_destino, id_usu_destino, fecha_creacion;
    `;
    const values = [
      titulo.trim(),
      contenido.trim(),
      categoria.trim(),
      urgente === true,
      destacado === true,
      idAutor,
      idDepDestino,
      idUsuDestino
    ];

    const result = await db.query(query, values);

    res.status(201).json({
      message: 'Anuncio publicado exitosamente',
      anuncio: result.rows[0]
    });

    // 3. Mandar la notificación push a quienes pueden ver el aviso.
    // Va después de responder para que TyC no espere a que terminen los envíos;
    // si falla, el aviso ya quedó publicado y solo se registra el error.
    notificarNuevoAviso(result.rows[0]).catch((error) =>
      console.error('Error al enviar notificaciones del aviso:', error)
    );
  } catch (error) {
    // Error 23503: el departamento o el usuario destino no existe
    if (error.code === '23503') {
      return res.status(400).json({ error: 'El departamento o el usuario destino no existe' });
    }
    // Error 22001: algún texto es más largo de lo que acepta la columna
    if (error.code === '22001') {
      return res.status(400).json({ error: 'Alguno de los campos excede la longitud permitida' });
    }
    console.error('Error al publicar anuncio:', error);
    res.status(500).json({ error: 'Error interno del servidor al publicar el anuncio' });
  }
});

// ── Imagen y adjuntos (migración 016, services/almacenamiento.js) ─────
// Subir: el cuerpo de la petición es el archivo tal cual (Content-Type: application/octet-stream)
// y el nombre original va en el encabezado X-Nombre-Archivo (con encodeURIComponent, por los
// acentos). Así no hace falta un paquete extra para formularios multipart.
// Descargar: Express revisa que el usuario pueda ver el aviso y entrega el archivo; no hay
// enlaces públicos.
const MAX_ADJUNTOS = 5;
const recibirArchivo = (tipo) =>
  express.raw({ type: () => true, limit: almacenamiento.REGLAS[tipo].maxBytes });

// Nombre original del archivo, sin rutas y con un largo razonable
const nombreDelArchivo = (req) => {
  let nombre = '';
  try {
    nombre = decodeURIComponent(req.get('X-Nombre-Archivo') || '');
  } catch {
    nombre = '';
  }
  return path.basename(nombre).trim().slice(0, 200);
};

// Aviso que el usuario puede ver, o cualquiera si tiene permiso de publicar
// (TyC administra también los dirigidos a otros departamentos). null si no.
const avisoAccesible = async (usuario, idAnu) => {
  const visible = await db.query(
    `SELECT a.id_anu, a.imagen FROM anuncios a WHERE a.id_anu = $3 AND ${FILTRO_VISIBLES}`,
    [usuario.id_usu, usuario.id_departamento, idAnu]
  );
  if (visible.rows[0]) return visible.rows[0];
  if (!(await tienePermiso(usuario.id_usu, PERMISO_PUBLICAR_AVISOS))) return null;
  return (await db.query('SELECT id_anu, imagen FROM anuncios WHERE id_anu = $1', [idAnu])).rows[0] || null;
};

// Entregar un archivo del almacenamiento
const enviarArchivo = async (res, clave, nombreDescarga, descargar) => {
  if (!(await almacenamiento.existe(clave))) {
    return res.status(404).json({ error: 'El archivo no está disponible en este momento' });
  }
  res.type(almacenamiento.mimeDe(clave));
  // no-cache: el navegador puede guardarlo, pero pregunta cada vez si cambió (ETag de sendFile).
  // Con max-age, al reemplazar la imagen de un aviso se seguía viendo la anterior, porque la
  // dirección (/api/anuncios/:id/imagen) es la misma. Si no cambió, responde 304 sin reenviarla.
  res.set('Cache-Control', 'private, no-cache');
  if (nombreDescarga) {
    res.attachment(nombreDescarga); // pone el nombre original al descargar
    if (!descargar) res.set('Content-Disposition', res.get('Content-Disposition').replace('attachment', 'inline'));
  }
  res.sendFile(almacenamiento.rutaDe(clave));
};

const idDe = (valor) => {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : null;
};

// Subir o reemplazar la imagen del aviso
router.post('/:id/imagen', autenticar, requierePermiso(PERMISO_PUBLICAR_AVISOS), recibirArchivo('imagen'), async (req, res) => {
  const idAnu = idDe(req.params.id);
  if (!idAnu) return res.status(400).json({ error: 'Aviso inválido' });
  try {
    const actual = await db.query('SELECT imagen FROM anuncios WHERE id_anu = $1', [idAnu]);
    if (actual.rows.length === 0) return res.status(404).json({ error: 'Aviso no encontrado' });

    const ext = almacenamiento.validar(req.body, nombreDelArchivo(req), 'imagen');
    const clave = await almacenamiento.guardar(req.body, `avisos/${idAnu}`, ext);
    await db.query('UPDATE anuncios SET imagen = $1 WHERE id_anu = $2', [clave, idAnu]);
    await almacenamiento.borrar(actual.rows[0].imagen); // la anterior, si había
    res.status(201).json({ message: 'Imagen guardada', id_anu: idAnu, tiene_imagen: true });
  } catch (error) {
    if (error instanceof almacenamiento.ErrorArchivo) return res.status(400).json({ error: error.message });
    console.error('Error al guardar la imagen:', error);
    res.status(500).json({ error: 'No se pudo guardar la imagen' });
  }
});

// Ver la imagen del aviso
router.get('/:id/imagen', autenticar, async (req, res) => {
  const idAnu = idDe(req.params.id);
  if (!idAnu) return res.status(400).json({ error: 'Aviso inválido' });
  try {
    const aviso = await avisoAccesible(req.usuario, idAnu);
    if (!aviso || !aviso.imagen) return res.status(404).json({ error: 'Imagen no encontrada' });
    await enviarArchivo(res, aviso.imagen);
  } catch (error) {
    console.error('Error al entregar la imagen:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Subir un adjunto (máximo MAX_ADJUNTOS por aviso)
router.post('/:id/adjuntos', autenticar, requierePermiso(PERMISO_PUBLICAR_AVISOS), recibirArchivo('adjunto'), async (req, res) => {
  const idAnu = idDe(req.params.id);
  if (!idAnu) return res.status(400).json({ error: 'Aviso inválido' });
  const nombre = nombreDelArchivo(req);
  try {
    const conteo = await db.query(
      `SELECT (SELECT COUNT(*) FROM anuncios WHERE id_anu = $1)::int AS existe,
              (SELECT COUNT(*) FROM anuncios_adj WHERE id_anu = $1)::int AS adjuntos`,
      [idAnu]
    );
    if (!conteo.rows[0].existe) return res.status(404).json({ error: 'Aviso no encontrado' });
    if (conteo.rows[0].adjuntos >= MAX_ADJUNTOS) {
      return res.status(400).json({ error: `Un aviso puede tener máximo ${MAX_ADJUNTOS} adjuntos` });
    }

    const ext = almacenamiento.validar(req.body, nombre, 'adjunto');
    const clave = await almacenamiento.guardar(req.body, `avisos/${idAnu}`, ext);
    const result = await db.query(
      `INSERT INTO anuncios_adj (id_anu, nombre_archivo, tipo_archivo, url_archivo, tamano_bytes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id_anu_adj, nombre_archivo, tipo_archivo, tamano_bytes`,
      [idAnu, nombre, ext, clave, req.body.length]
    );
    res.status(201).json({ message: 'Adjunto guardado', adjunto: result.rows[0] });
  } catch (error) {
    if (error instanceof almacenamiento.ErrorArchivo) return res.status(400).json({ error: error.message });
    console.error('Error al guardar el adjunto:', error);
    res.status(500).json({ error: 'No se pudo guardar el adjunto' });
  }
});

// Descargar (?descargar=1) o ver en el navegador un adjunto
router.get('/:id/adjuntos/:idAdj', autenticar, async (req, res) => {
  const idAnu = idDe(req.params.id);
  const idAdj = idDe(req.params.idAdj);
  if (!idAnu || !idAdj) return res.status(400).json({ error: 'Adjunto inválido' });
  try {
    if (!(await avisoAccesible(req.usuario, idAnu))) return res.status(404).json({ error: 'Adjunto no encontrado' });
    const adj = await db.query(
      'SELECT nombre_archivo, url_archivo FROM anuncios_adj WHERE id_anu_adj = $1 AND id_anu = $2',
      [idAdj, idAnu]
    );
    if (adj.rows.length === 0) return res.status(404).json({ error: 'Adjunto no encontrado' });
    await enviarArchivo(res, adj.rows[0].url_archivo, adj.rows[0].nombre_archivo, req.query.descargar === '1');
  } catch (error) {
    console.error('Error al entregar el adjunto:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Destacar o quitar del carrusel un aviso ya publicado: { "destacado": false }
// Lo puede hacer cualquiera con permiso publicar_avisos (en la beta, el equipo de TyC), no solo
// el autor: el carrusel es de todo el equipo. No revisa la regla de visibilidad, porque TyC
// también administra los avisos dirigidos a otros departamentos.
router.put('/:id/destacado', autenticar, requierePermiso(PERMISO_PUBLICAR_AVISOS), async (req, res) => {
  const idAnu = Number(req.params.id);
  const destacado = req.body?.destacado;
  if (!Number.isInteger(idAnu) || idAnu <= 0) {
    return res.status(400).json({ error: 'Aviso inválido' });
  }
  if (typeof destacado !== 'boolean') {
    return res.status(400).json({ error: 'El campo destacado debe ser verdadero o falso' });
  }

  try {
    const result = await db.query(
      'UPDATE anuncios SET destacado = $1 WHERE id_anu = $2 RETURNING id_anu, destacado',
      [destacado, idAnu]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Aviso no encontrado' });
    }
    res.json({
      message: destacado ? 'El aviso ya aparece en el carrusel' : 'El aviso ya no aparece en el carrusel',
      ...result.rows[0]
    });
  } catch (error) {
    console.error('Error al cambiar destacado:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para confirmar la lectura de un anuncio
// Solo se puede confirmar un aviso que el usuario sí puede ver
router.post('/:id/leido', autenticar, async (req, res) => {
  const idAnu = Number(req.params.id);
  const { id_usu: idUsu, id_departamento } = req.usuario;

  if (!Number.isInteger(idAnu) || idAnu <= 0) {
    return res.status(400).json({ error: 'Aviso inválido' });
  }

  try {
    // 1. Revisar que el aviso sea visible para el usuario
    const visible = await db.query(
      `SELECT 1 FROM anuncios a WHERE a.id_anu = $3 AND ${FILTRO_VISIBLES}`,
      [idUsu, id_departamento, idAnu]
    );
    if (visible.rows.length === 0) {
      return res.status(404).json({ error: 'Aviso no encontrado' });
    }

    // 2. Registrar la lectura (ON CONFLICT evita duplicarla si ya la había confirmado)
    await db.query(
      `INSERT INTO anuncios_leidos (id_usu, id_anu)
       VALUES ($1, $2)
       ON CONFLICT (id_usu, id_anu) DO NOTHING`,
      [idUsu, idAnu]
    );

    // 3. Se puede confirmar desde la tarjeta sin abrir el detalle; también cuenta como vista
    await registrarVista(idUsu, idAnu);

    res.json({ message: 'Lectura confirmada', id_anu: idAnu, leido: true });
  } catch (error) {
    // Error 23503: el aviso se borró justo entre la revisión y el registro
    if (error.code === '23503') {
      return res.status(404).json({ error: 'Aviso no encontrado' });
    }
    console.error('Error al confirmar lectura:', error);
    res.status(500).json({ error: 'Error interno del servidor al confirmar la lectura' });
  }
});

module.exports = router;
