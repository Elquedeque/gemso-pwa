// Permisos de Usuario (tablas permisos y usuario_permisos)
// En la beta solo Talento y Cultura tiene estos permisos (migraciones 001, 006, 011 y 012)
const db = require('../config/db');

const PERMISO_PUBLICAR_AVISOS = 'publicar_avisos';
const PERMISO_VER_ESTADISTICAS = 'ver_estadisticas';
const PERMISO_RECIBIR_RECORDATORIOS = 'recibir_recordatorios';
const PERMISO_INVITAR_COLABORADORES = 'invitar_colaboradores';

// Permisos que recibe automáticamente un usuario nuevo de Talento y Cultura
const PERMISOS_TYC = [
  PERMISO_PUBLICAR_AVISOS,
  PERMISO_VER_ESTADISTICAS,
  PERMISO_RECIBIR_RECORDATORIOS,
  PERMISO_INVITAR_COLABORADORES
];

// Obtener los permisos del usuario, por ejemplo ['publicar_avisos']
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

// Saber si el usuario tiene un permiso en específico
const tienePermiso = async (idUsu, permiso) => (await obtenerPermisos(idUsu)).includes(permiso);

module.exports = {
  PERMISO_PUBLICAR_AVISOS,
  PERMISO_VER_ESTADISTICAS,
  PERMISO_RECIBIR_RECORDATORIOS,
  PERMISO_INVITAR_COLABORADORES,
  PERMISOS_TYC,
  obtenerPermisos,
  tienePermiso
};
