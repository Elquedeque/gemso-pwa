// Middleware de Autenticación
// Revisa el token que llega en "Authorization: Bearer <token>" y guarda al usuario en req.usuario.
// El usuario siempre se saca del token, nunca de lo que mande el cliente.
// El departamento se consulta en la BD por si le cambiaron de área después del login,
// y también si la cuenta sigue activa (migración 013).
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
      'SELECT id_usu, id_departamento, activo FROM usuarios WHERE id_usu = $1',
      [payload.id_usu]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }
    // Si Talento y Cultura lo desactivó, su sesión deja de servir aunque el token no haya vencido
    if (!result.rows[0].activo) {
      return res.status(401).json({ error: 'Tu cuenta está desactivada. Comunícate con Talento y Cultura.' });
    }
    const { activo, ...usuario } = result.rows[0];
    req.usuario = usuario;
    next();
  } catch (error) {
    console.error('Error al autenticar:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = autenticar;
