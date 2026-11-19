// Enlaces de un solo uso (invitaciones y restablecimiento de contraseña)
// El enlace lleva un código aleatorio (token). En la BD solo se guarda su huella
// SHA-256: con la tabla en la mano no se puede armar ningún enlace válido
// (misma idea que guardar las contraseñas cifradas).
const crypto = require('crypto');

// Código del enlace: 32 bytes aleatorios en base64url (43 caracteres, seguros en una URL)
const generarToken = () => crypto.randomBytes(32).toString('base64url');

// Huella que se guarda en la BD y con la que se busca el enlace
const huella = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

// Un token con otra forma ni se busca en la BD
const TOKEN_VALIDO = /^[A-Za-z0-9_-]{43}$/;
const tokenValido = (token) => TOKEN_VALIDO.test(String(token ?? ''));

// Dirección de la app para armar los enlaces.
// APP_URL en el .env (por ejemplo https://app.gemso.com.mx). Si no está, se usa la
// dirección desde la que TyC abrió la app, que en desarrollo es la de Vite.
const direccionApp = (origen) => (process.env.APP_URL || origen || 'http://localhost:5173').replace(/\/+$/, '');

module.exports = { generarToken, huella, tokenValido, direccionApp };
