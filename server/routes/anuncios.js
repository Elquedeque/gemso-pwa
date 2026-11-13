// Rutas de Avisos / Comunicados (todas piden sesión iniciada)
//   GET  /api/anuncios            Lista de avisos que el usuario puede ver (?limite=N y ?destacados=1 opcionales)
//   GET  /api/anuncios/destinatarios  Personas a las que se puede dirigir un aviso (solo con permiso publicar_avisos)
//   GET  /api/anuncios/:id       Detalle de un aviso con sus adjuntos (y registra que lo vio)
//   POST /api/anuncios            Publicar un aviso (solo con permiso publicar_avisos) y mandar push
//   POST /api/anuncios/:id/leido  Confirmar lectura
const express = require('express');
const db = require('../config/db');
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
      `SELECT id_anu_adj, nombre_archivo, tipo_archivo, url_archivo
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
