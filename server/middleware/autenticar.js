// Middleware de autenticación.
// Lee "Authorization: Bearer <token>", lo verifica y deja al usuario en req.usuario.
// El usuario sale del token firmado, nunca de lo que mande el cliente en query/body.
// También se carga su departamento actual desde la BD (por si cambió tras el login).
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { JWT_SECRET } = require('../config/auth');

const autenticar = async (req, res, next) => {
  const [tipo, token] = (req.headers.authorization || '').split(' ');
  if (tipo !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Debes iniciar sesión' });
  }

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Tu sesión expiró. Inicia sesión nuevamente' });
  }

  try {
    const result = await db.query(
      'SELECT id_usu, id_departamento FROM usuarios WHERE id_usu = $1',
      [payload.id_usu]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }
    req.usuario = result.rows[0];
    next();
  } catch (error) {
    console.error('Error al autenticar:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = autenticar;
