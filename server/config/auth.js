// Configuración de Sesiones (tokens JWT)

// Clave para firmar los tokens. Si no está en el .env, el servidor no arranca
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32 || JWT_SECRET.startsWith('cambia_esto')) {
  console.error('Falta JWT_SECRET en server/.env (mínimo 32 caracteres). Ver .env.example');
  process.exit(1);
}

// Tiempo que dura una sesión antes de pedir login otra vez.
// 30 días porque es una PWA que se usa sobre todo en el celular personal: con 8 horas
// cada colaborador tenía que iniciar sesión todos los días. Es seguro alargarla porque
// en cada petición el servidor vuelve a revisar en la BD que el usuario exista, su
// departamento y sus permisos (middleware/autenticar.js y requierePermiso.js); el token
// solo dice quién es. Los tokens que ya se entregaron conservan su duración anterior.
const DURACION_SESION = '30d';

module.exports = { JWT_SECRET, DURACION_SESION };
