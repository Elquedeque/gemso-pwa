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
// Cada destinatario queda en uno de tres estados:
//   - 'confirmado': pulsó "Confirmar Lectura" (tabla anuncios_leidos)
//   - 'visto':      abrió el aviso pero no ha confirmado (tabla anuncios_vistos)
//   - 'pendiente':  no lo ha abierto
const express = require('express');
const db = require('../config/db');
const autenticar = require('../middleware/autenticar');
const requierePermiso = require('../middleware/requierePermiso');
const { PERMISO_VER_ESTADISTICAS } = require('../services/permisos');

const router = express.Router();

// Todas las rutas de este archivo piden sesión y permiso
router.use(autenticar, requierePermiso(PERMISO_VER_ESTADISTICAS));

// Destinatarios de cada aviso con su estado de lectura.
// Es la misma regla de visibilidad que FILTRO_VISIBLES en routes/anuncios.js,
// pero vista desde el aviso: ¿qué usuarios lo pueden ver?
//   - aviso general: todos los usuarios
//   - aviso por departamento: los usuarios de ese departamento
//   - aviso para una persona: solo esa persona
// El autor no cuenta como destinatario de su propio aviso.
// Parámetros (NULL = sin filtro):
//   $1 = id del aviso   $2 = desde (fecha)   $3 = categoría   $4 = id del departamento
const CTE_DESTINATARIOS = `
  WITH destinatarios AS (
    SELECT
      a.id_anu,
      a.fecha_creacion AS fecha_aviso,
      u.id_usu,
      u.nombre_completo,
      u.puesto,
      u.id_departamento AS id_dep,
      d.nombre AS departamento,
      COALESCE(v.fecha_visto, l.fecha_leido) AS fecha_visto,
      l.fecha_leido,
      CASE
        WHEN l.id_usu IS NOT NULL THEN 'confirmado'
        WHEN v.id_usu IS NOT NULL THEN 'visto'
        ELSE 'pendiente'
      END AS estado
    FROM anuncios a
    JOIN usuarios u ON u.id_usu <> a.id_autor AND (
         (a.id_dep_destino IS NULL AND a.id_usu_destino IS NULL)
         OR a.id_dep_destino = u.id_departamento
         OR a.id_usu_destino = u.id_usu)
    LEFT JOIN departamentos d ON d.id_dep = u.id_departamento
    LEFT JOIN anuncios_vistos v ON v.id_anu = a.id_anu AND v.id_usu = u.id_usu
    LEFT JOIN anuncios_leidos l ON l.id_anu = a.id_anu AND l.id_usu = u.id_usu
    WHERE ($1::int IS NULL OR a.id_anu = $1)
      AND ($2::date IS NULL OR a.fecha_creacion >= $2::date)
      AND ($3::text IS NULL OR a.categoria = $3)
      AND ($4::int IS NULL OR u.id_departamento = $4)
  )
`;

// Resumen por aviso: datos del aviso + conteos de su audiencia.
// Con filtro de departamento solo quedan los avisos que le llegaron a ese departamento (HAVING).
const CONSULTA_RESUMEN = `
  ${CTE_DESTINATARIOS}
  SELECT
    a.id_anu,
    a.titulo,
    a.categoria,
    a.urgente,
    a.fecha_creacion,
    au.nombre_completo AS autor,
    CASE
      WHEN dd.nombre IS NOT NULL THEN dd.nombre
      WHEN ud.nombre_completo IS NOT NULL THEN ud.nombre_completo
      ELSE 'Todos'
    END AS destino,
    COUNT(de.id_usu)::int AS destinatarios,
    COUNT(de.id_usu) FILTER (WHERE de.estado <> 'pendiente')::int AS vistos,
    COUNT(de.id_usu) FILTER (WHERE de.estado = 'confirmado')::int AS confirmados
  FROM anuncios a
  JOIN usuarios au ON au.id_usu = a.id_autor
  LEFT JOIN departamentos dd ON dd.id_dep = a.id_dep_destino
  LEFT JOIN usuarios ud ON ud.id_usu = a.id_usu_destino
  LEFT JOIN destinatarios de ON de.id_anu = a.id_anu
  WHERE ($1::int IS NULL OR a.id_anu = $1)
    AND ($2::date IS NULL OR a.fecha_creacion >= $2::date)
    AND ($3::text IS NULL OR a.categoria = $3)
  GROUP BY a.id_anu, au.nombre_completo, dd.nombre, ud.nombre_completo
  HAVING $4::int IS NULL OR COUNT(de.id_usu) > 0
  ORDER BY a.fecha_creacion DESC
`;

// KPIs por departamento. Un "envío" es un aviso que le tocaba a una persona.
// horas_confirmacion: promedio de horas entre que se publicó el aviso y que la persona confirmó.
// Orden: primero el de menor % de confirmación, para ver rápido qué departamento va bajo.
const CONSULTA_DEPARTAMENTOS = `
  ${CTE_DESTINATARIOS}
  SELECT
    de.id_dep,
    COALESCE(de.departamento, 'Sin departamento') AS departamento,
    COUNT(DISTINCT de.id_usu)::int AS personas,
    COUNT(DISTINCT de.id_anu)::int AS avisos,
    COUNT(*)::int AS envios,
    COUNT(*) FILTER (WHERE de.estado <> 'pendiente')::int AS vistos,
    COUNT(*) FILTER (WHERE de.estado = 'confirmado')::int AS confirmados,
    ROUND(
      (AVG(EXTRACT(EPOCH FROM (de.fecha_leido - de.fecha_aviso)) / 3600)
        FILTER (WHERE de.estado = 'confirmado'))::numeric,
      1
    )::float AS horas_confirmacion
  FROM destinatarios de
  GROUP BY de.id_dep, de.departamento
  ORDER BY
    COUNT(*) FILTER (WHERE de.estado = 'confirmado')::float / COUNT(*) ASC,
    COUNT(*) FILTER (WHERE de.estado <> 'pendiente')::float / COUNT(*) ASC,
    departamento
`;

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

// Meta de confirmación (tabla configuracion, migración 008). Si no existe se usa 80%.
const CLAVE_META = 'meta_confirmacion';
const META_POR_DEFECTO = 80;

const leerMeta = async () => {
  const result = await db.query(
    `SELECT c.valor, c.fecha_actualizacion, u.nombre_completo AS actualizado_por
     FROM configuracion c
     LEFT JOIN usuarios u ON u.id_usu = c.id_usu_actualizo
     WHERE c.clave = $1`,
    [CLAVE_META]
  );
  const fila = result.rows[0];
  return {
    meta: fila ? Number(fila.valor) : META_POR_DEFECTO,
    actualizado_por: fila?.actualizado_por || null,
    fecha_actualizacion: fila?.fecha_actualizacion || null
  };
};

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
    const result = await db.query(CONSULTA_RESUMEN, [null, ...filtros.valores]);
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
    const result = await db.query(CONSULTA_DEPARTAMENTOS, [null, ...filtros.valores]);
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

  const sinFiltros = [idAnu, null, null, null];
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
