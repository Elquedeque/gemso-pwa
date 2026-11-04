// Middleware de Permisos
// Se usa después de "autenticar": revisa en la BD que el usuario tenga el permiso.
// Ejemplo:  router.get('/', autenticar, requierePermiso('ver_estadisticas'), ...)
const { tienePermiso } = require('../services/permisos');

const requierePermiso = (permiso) => async (req, res, next) => {
  try {
    if (!(await tienePermiso(req.usuario.id_usu, permiso))) {
      return res.status(403).json({ error: 'No tienes permiso para esta sección' });
    }
    next();
  } catch (error) {
    console.error('Error al revisar permisos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = requierePermiso;
