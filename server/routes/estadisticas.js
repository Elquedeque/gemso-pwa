// Rutas de Estadísticas de Avisos (solo con permiso ver_estadisticas; en la beta, Talento y Cultura)
//   GET /api/estadisticas/filtros        Opciones para los filtros (categorías y departamentos)
//   GET /api/estadisticas/avisos         Todos los avisos con su alcance (destinatarios, vistos, confirmados)
//   GET /api/estadisticas/departamentos  KPIs por departamento, del más bajo al más alto en confirmación
//   GET /api/estadisticas/avisos/:id     Detalle de un aviso: resumen, avance por departamento y lista de personas
//   GET /api/estadisticas/meta           Meta de confirmación (%) compartida por Talento y Cultura
//   PUT /api/estadisticas/meta           Cambiar la meta: { "meta": 85 }
//
// /avisos y /departamentos aceptan filtros opcionales en la URL:
//   ?desde=AAAA-MM-DD   solo avisos publicados desde esa fecha
//   ?categoria=Texto    solo avisos de esa categoría
//   ?id_dep=N           solo los destinatarios de ese departamento
//
// Las consultas están en services/estadisticas.js (también las usan los recordatorios).
const express = require('express');
const db = require('../config/db');
const autenticar = require('../middleware/autenticar');
const requierePermiso = require('../middleware/requierePermiso');
const { PERMISO_VER_ESTADISTICAS } = require('../services/permisos');
const {
  CTE_DESTINATARIOS,
  CONSULTA_RESUMEN,
  CONSULTA_DEPARTAMENTOS,
  CLAVE_META,
  leerMeta
} = require('../services/estadisticas');

const router = express.Router();

// Todas las rutas de este archivo piden sesión y permiso
router.use(autenticar, requierePermiso(PERMISO_VER_ESTADISTICAS));

// Leer y validar los filtros de la URL. Regresa { error } o { valores: [desde, categoria, id_dep] }
const leerFiltros = (query) => {
  const { desde, categoria, id_dep: idDep } = query;

  let fechaDesde = null;
  if (desde !== undefined && desde !== '') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(desde) || Number.isNaN(Date.parse(desde))) {
      return { error: 'La fecha "desde" debe tener el formato AAAA-MM-DD' };
    }
    fechaDesde = desde;
  }

  let textoCategoria = null;
  if (categoria !== undefined && categoria !== '') {
    if (typeof categoria !== 'string' || categoria.length > 50) {
      return { error: 'Categoría inválida' };
    }
    textoCategoria = categoria;
  }

  let idDepartamento = null;
  if (idDep !== undefined && idDep !== '') {
    idDepartamento = Number(idDep);
    if (!Number.isInteger(idDepartamento) || idDepartamento <= 0) {
      return { error: 'Departamento inválido' };
    }
  }

  return { valores: [fechaDesde, textoCategoria, idDepartamento] };
};

// Agrupar a las personas por departamento para la tabla de avance del detalle
const agruparPorDepartamento = (personas) => {
  const grupos = new Map();
  for (const p of personas) {
    const nombre = p.departamento || 'Sin departamento';
    if (!grupos.has(nombre)) {
      grupos.set(nombre, { departamento: nombre, destinatarios: 0, vistos: 0, confirmados: 0 });
    }
    const g = grupos.get(nombre);
    g.destinatarios += 1;
    if (p.estado !== 'pendiente') g.vistos += 1;
    if (p.estado === 'confirmado') g.confirmados += 1;
  }
  return [...grupos.values()].sort((a, b) => a.departamento.localeCompare(b.departamento, 'es'));
};

// Endpoint con las opciones de los filtros
// Las categorías salen de los avisos publicados (así aparecen también las que ya no están en el formulario)
router.get('/filtros', async (req, res) => {
  try {
    const [categorias, departamentos] = await Promise.all([
      db.query('SELECT DISTINCT categoria FROM anuncios ORDER BY categoria'),
      db.query('SELECT id_dep, nombre FROM departamentos ORDER BY nombre')
    ]);
    res.json({
      categorias: categorias.rows.map(r => r.categoria),
      departamentos: departamentos.rows
    });
  } catch (error) {
    console.error('Error al obtener filtros de estadísticas:', error);
    res.status(500).json({ error: 'Error al consultar la base de datos' });
  }
});

// Endpoint para consultar la meta
router.get('/meta', async (req, res) => {
  try {
    res.json(await leerMeta());
  } catch (error) {
    console.error('Error al obtener la meta:', error);
    res.status(500).json({ error: 'Error al consultar la base de datos' });
  }
});

// Endpoint para cambiar la meta (número entero de 1 a 100)
router.put('/meta', async (req, res) => {
  const meta = req.body?.meta;
  if (!Number.isInteger(meta) || meta < 1 || meta > 100) {
    return res.status(400).json({ error: 'La meta debe ser un número entero entre 1 y 100' });
  }

  try {
    await db.query(
      `INSERT INTO configuracion (clave, valor, id_usu_actualizo, fecha_actualizacion)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (clave) DO UPDATE
       SET valor = EXCLUDED.valor,
           id_usu_actualizo = EXCLUDED.id_usu_actualizo,
           fecha_actualizacion = EXCLUDED.fecha_actualizacion`,
      [CLAVE_META, String(meta), req.usuario.id_usu]
    );
    res.json({ message: 'Meta actualizada', ...(await leerMeta()) });
  } catch (error) {
    console.error('Error al guardar la meta:', error);
    res.status(500).json({ error: 'Error interno del servidor al guardar la meta' });
  }
});

// Endpoint con el resumen de todos los avisos
router.get('/avisos', async (req, res) => {
  const filtros = leerFiltros(req.query);
  if (filtros.error) return res.status(400).json({ error: filtros.error });

  try {
    const result = await db.query(CONSULTA_RESUMEN, [null, ...filtros.valores, null]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener estadísticas de avisos:', error);
    res.status(500).json({ error: 'Error al consultar la base de datos' });
  }
});

// Endpoint con los KPIs por departamento
router.get('/departamentos', async (req, res) => {
  const filtros = leerFiltros(req.query);
  if (filtros.error) return res.status(400).json({ error: filtros.error });

  try {
    const result = await db.query(CONSULTA_DEPARTAMENTOS, [null, ...filtros.valores, null]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener estadísticas por departamento:', error);
    res.status(500).json({ error: 'Error al consultar la base de datos' });
  }
});

// Endpoint con el detalle de un aviso
router.get('/avisos/:id', async (req, res) => {
  const idAnu = Number(req.params.id);
  if (!Number.isInteger(idAnu) || idAnu <= 0) {
    return res.status(400).json({ error: 'Aviso inválido' });
  }

  const sinFiltros = [idAnu, null, null, null, null];
  try {
    const resumen = await db.query(CONSULTA_RESUMEN, sinFiltros);
    if (resumen.rows.length === 0) {
      return res.status(404).json({ error: 'Aviso no encontrado' });
    }

    // Personas: primero las pendientes, luego las que solo lo vieron, al final las que confirmaron
    const personas = await db.query(
      `${CTE_DESTINATARIOS}
       SELECT id_usu, nombre_completo, puesto, departamento, estado, fecha_visto, fecha_leido
       FROM destinatarios
       ORDER BY
         CASE estado WHEN 'pendiente' THEN 0 WHEN 'visto' THEN 1 ELSE 2 END,
         nombre_completo`,
      sinFiltros
    );

    res.json({
      ...resumen.rows[0],
      por_departamento: agruparPorDepartamento(personas.rows),
      personas: personas.rows
    });
  } catch (error) {
    console.error('Error al obtener estadísticas del aviso:', error);
    res.status(500).json({ error: 'Error al consultar la base de datos' });
  }
});

module.exports = router;
