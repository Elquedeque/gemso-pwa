// Consultas de Estadísticas de Avisos
// Las usan las rutas de routes/estadisticas.js (pantallas de Talento y Cultura)
// y los recordatorios de services/recordatorios.js (correo mensual y avisos bajo la meta),
// para que la pantalla y los correos den exactamente los mismos números.
//
// Cada destinatario queda en uno de tres estados:
//   - 'confirmado': pulsó "Confirmar Lectura" (tabla anuncios_leidos)
//   - 'visto':      abrió el aviso pero no ha confirmado (tabla anuncios_vistos)
//   - 'pendiente':  no lo ha abierto
const db = require('../config/db');

// Destinatarios de cada aviso con su estado de lectura.
// Es la misma regla de visibilidad que FILTRO_VISIBLES en routes/anuncios.js,
// pero vista desde el aviso: ¿qué usuarios lo pueden ver?
//   - aviso general: todos los usuarios
//   - aviso por departamento: los usuarios de ese departamento
//   - aviso para una persona: solo esa persona
// El autor no cuenta como destinatario de su propio aviso.
// Parámetros (NULL = sin filtro):
//   $1 = id del aviso   $2 = desde (fecha)   $3 = categoría   $4 = id del departamento
//   $5 = hasta (fecha, sin incluirla; la usa el resumen mensual de services/recordatorios.js)
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
      AND ($5::date IS NULL OR a.fecha_creacion < $5::date)
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
    AND ($5::date IS NULL OR a.fecha_creacion < $5::date)
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

module.exports = {
  CTE_DESTINATARIOS,
  CONSULTA_RESUMEN,
  CONSULTA_DEPARTAMENTOS,
  CLAVE_META,
  leerMeta
};
