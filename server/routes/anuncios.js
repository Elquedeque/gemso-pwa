// Avisos / comunicados. Todas las rutas requieren sesión (middleware autenticar).
//   GET  /api/anuncios            -> lista de avisos visibles (?limite=N opcional)
//   GET  /api/anuncios/:id        -> detalle de un aviso con sus adjuntos
//   POST /api/anuncios            -> publicar (requiere permiso publicar_avisos)
//   POST /api/anuncios/:id/leido  -> confirmar lectura
const express = require('express');
const db = require('../config/db');
const autenticar = require('../middleware/autenticar');
const { PERMISO_PUBLICAR_AVISOS, tienePermiso } = require('../services/permisos');

const router = express.Router();

// Valida un id opcional: undefined/null/'' -> null; entero positivo -> número; otro -> NaN
const idOpcional = (valor) => {
  if (valor === undefined || valor === null || valor === '') return null;
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : NaN;
};

// Categorías permitidas (deben coincidir con el <select> de CrearAvisoView.vue)
const CATEGORIAS_AVISO = ['Corporativo', 'Autofest 2026', 'Talento y Cultura', 'Sistemas / TI', 'General'];

// Regla de visibilidad de anuncios (usada por la lista y el detalle):
//   avisos generales (sin departamento ni usuario destino)
//   + avisos dirigidos al departamento del usuario ($2)
//   + avisos dirigidos personalmente al usuario ($1)
const FILTRO_VISIBLES = `
  ((a.id_dep_destino IS NULL AND a.id_usu_destino IS NULL)
   OR a.id_dep_destino = $2
   OR a.id_usu_destino = $1)
`;

// Endpoint para obtener los anuncios visibles para el usuario de la sesión
router.get('/', autenticar, async (req, res) => {
  const { id_usu: idUsu, id_departamento } = req.usuario;

  // ?limite=N opcional (1 a 50); sin él se devuelven todos
  let limite = null;
  if (req.query.limite !== undefined) {
    limite = Number(req.query.limite);
    if (!Number.isInteger(limite) || limite < 1 || limite > 50) {
      return res.status(400).json({ error: 'El límite debe ser un número entre 1 y 50' });
    }
  }

  try {
    const query = `
      SELECT
        a.id_anu,
        a.titulo,
        a.contenido,
        a.categoria,
        a.urgente,
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
      ORDER BY a.fecha_creacion DESC
      LIMIT $3;
    `;
    // LIMIT NULL en PostgreSQL equivale a "sin límite"
    const result = await db.query(query, [idUsu, id_departamento, limite]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener anuncios:', error);
    res.status(500).json({ error: 'Error al consultar la base de datos' });
  }
});

// Endpoint para obtener el detalle de un anuncio (con sus adjuntos)
// Solo lo devuelve si es visible para el usuario; si no, responde 404
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
// El autor es siempre el usuario de la sesión (no se acepta id_autor del cliente).
// Destino opcional: id_dep_destino (un departamento) o id_usu_destino (una persona);
// sin ninguno, el aviso es general. No se permiten ambos a la vez.
router.post('/', autenticar, async (req, res) => {
  const { titulo, contenido, categoria, urgente } = req.body;
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
  if (Number.isNaN(idDepDestino) || Number.isNaN(idUsuDestino)) {
    return res.status(400).json({ error: 'Departamento o usuario destino inválido' });
  }
  if (idDepDestino !== null && idUsuDestino !== null) {
    return res.status(400).json({ error: 'Elige un departamento o un usuario destino, no ambos' });
  }

  try {
    // Solo usuarios con permiso pueden publicar (beta: Talento y Cultura)
    if (!(await tienePermiso(idAutor, PERMISO_PUBLICAR_AVISOS))) {
      return res.status(403).json({ error: 'No tienes permiso para publicar avisos' });
    }

    const query = `
      INSERT INTO anuncios (titulo, contenido, categoria, urgente, id_autor, id_dep_destino, id_usu_destino)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id_anu, titulo, contenido, categoria, urgente, id_autor, id_dep_destino, id_usu_destino, fecha_creacion;
    `;
    const values = [
      titulo.trim(),
      contenido.trim(),
      categoria.trim(),
      urgente === true,
      idAutor,
      idDepDestino,
      idUsuDestino
    ];

    const result = await db.query(query, values);

    res.status(201).json({
      message: 'Anuncio publicado exitosamente',
      anuncio: result.rows[0]
    });
  } catch (error) {
    // 23503: el departamento o el usuario destino no existen
    if (error.code === '23503') {
      return res.status(400).json({ error: 'El departamento o el usuario destino no existe' });
    }
    // 22001: texto más largo de lo permitido por la columna
    if (error.code === '22001') {
      return res.status(400).json({ error: 'Alguno de los campos excede la longitud permitida' });
    }
    console.error('Error al publicar anuncio:', error);
    res.status(500).json({ error: 'Error interno del servidor al publicar el anuncio' });
  }
});

// Endpoint para confirmar la lectura de un anuncio
// Solo se puede confirmar un aviso que el usuario puede ver (misma regla que la lista)
router.post('/:id/leido', autenticar, async (req, res) => {
  const idAnu = Number(req.params.id);
  const { id_usu: idUsu, id_departamento } = req.usuario;

  if (!Number.isInteger(idAnu) || idAnu <= 0) {
    return res.status(400).json({ error: 'Aviso inválido' });
  }

  try {
    const visible = await db.query(
      `SELECT 1 FROM anuncios a WHERE a.id_anu = $3 AND ${FILTRO_VISIBLES}`,
      [idUsu, id_departamento, idAnu]
    );
    if (visible.rows.length === 0) {
      return res.status(404).json({ error: 'Aviso no encontrado' });
    }

    // ON CONFLICT: si ya estaba confirmado, no se duplica (uq_usuario_anuncio)
    await db.query(
      `INSERT INTO anuncios_leidos (id_usu, id_anu)
       VALUES ($1, $2)
       ON CONFLICT (id_usu, id_anu) DO NOTHING`,
      [idUsu, idAnu]
    );
    res.json({ message: 'Lectura confirmada', id_anu: idAnu, leido: true });
  } catch (error) {
    // 23503: el aviso se borró entre la verificación y el registro
    if (error.code === '23503') {
      return res.status(404).json({ error: 'Aviso no encontrado' });
    }
    console.error('Error al confirmar lectura:', error);
    res.status(500).json({ error: 'Error interno del servidor al confirmar la lectura' });
  }
});

module.exports = router;
