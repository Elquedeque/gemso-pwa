// Configuración de las sesiones (tokens JWT).

// Clave para firmar los tokens de sesión. Sin ella no se arranca el servidor.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32 || JWT_SECRET.startsWith('cambia_esto')) {
  console.error('Falta JWT_SECRET en server/.env (mínimo 32 caracteres). Ver .env.example');
  process.exit(1);
}

// Tiempo que dura una sesión antes de pedir login otra vez
const DURACION_SESION = '8h';

module.exports = { JWT_SECRET, DURACION_SESION };
