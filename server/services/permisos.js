// Permisos de usuario (tablas permisos / usuario_permisos).
// Beta: solo Talento y Cultura tiene 'publicar_avisos' (ver server/migrations/001_*.sql)
const db = require('../config/db');

const PERMISO_PUBLICAR_AVISOS = 'publicar_avisos';

// Devuelve la lista de nombres de permiso del usuario, ej. ['publicar_avisos']
const obtenerPermisos = async (idUsu) => {
  const result = await db.query(
    `SELECT p.nombre
     FROM usuario_permisos up
     JOIN permisos p ON p.id_per = up.id_per
     WHERE up.id_usu = $1
     ORDER BY p.nombre`,
    [idUsu]
  );
  return result.rows.map(r => r.nombre);
};

const tienePermiso = async (idUsu, permiso) => (await obtenerPermisos(idUsu)).includes(permiso);

module.exports = { PERMISO_PUBLICAR_AVISOS, obtenerPermisos, tienePermiso };
