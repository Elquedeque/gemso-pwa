// Servidor Express de GEMSO PWA
// Aquí solo se arma la app y se conectan las rutas. Lo demás está separado en:
//   config/      conexión a la BD y sesiones (JWT)
//   middleware/  revisar el token de sesión y los permisos
//   services/    permisos, validaciones, notificaciones, correos y recordatorios
//   routes/      endpoints de cada módulo

// Cargar el .env primero, porque config/ usa sus variables
require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
require('./config/auth'); // Si falta JWT_SECRET en el .env, el servidor no arranca
require('./config/push'); // Si faltan las llaves VAPID, avisa en consola y sigue sin push
require('./config/correo'); // Si faltan los datos SMTP, avisa en consola y sigue sin correos
const { iniciarTareas } = require('./services/tareas');

const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const departamentosRoutes = require('./routes/departamentos');
const anunciosRoutes = require('./routes/anuncios');
const perfilRoutes = require('./routes/perfil');
const sucursalesRoutes = require('./routes/sucursales');
const empresasRoutes = require('./routes/empresas');
const estadisticasRoutes = require('./routes/estadisticas');
const pushRoutes = require('./routes/push');
const invitacionesRoutes = require('./routes/invitaciones');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Rutas de la API
app.use('/api/health', healthRoutes);
app.use('/api', authRoutes); // /api/login y /api/usuarios
app.use('/api/departamentos', departamentosRoutes);
app.use('/api/anuncios', anunciosRoutes);
app.use('/api/perfil', perfilRoutes);
app.use('/api/sucursales', sucursalesRoutes);
app.use('/api/empresas', empresasRoutes);
app.use('/api/estadisticas', estadisticasRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/invitaciones', invitacionesRoutes);

// Una ruta de /api que no existe responde con JSON, no con la página de la app
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Ruta de la API no encontrada' });
});

// ── Frontend: la app de Vue ya compilada (client/dist) ────────────────
// Se genera con "npm run build" dentro de client/. Así la app y la API salen
// del mismo servidor y la misma dirección, como lo pide la PWA en producción.
const CARPETA_DIST = path.join(__dirname, '..', 'client', 'dist');

app.use(express.static(CARPETA_DIST, {
  setHeaders(res, archivo) {
    const nombre = path.basename(archivo);
    if (nombre === 'index.html' || nombre === 'sw.js' || nombre.endsWith('.webmanifest')) {
      // Siempre se revisa si hay versión nueva (si no, los usuarios se quedan con la vieja)
      res.setHeader('Cache-Control', 'no-cache');
    } else if (archivo.includes(`${path.sep}assets${path.sep}`)) {
      // Los archivos de assets/ llevan un hash en el nombre: si cambian, cambia el nombre
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));

// Fallback para Vue Router: si alguien entra directo a /estadisticas o recarga
// la página, se entrega index.html y Vue Router decide qué pantalla mostrar.
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(CARPETA_DIST, 'index.html'), (err) => {
    if (err) res.status(404).send('Falta compilar el frontend: ejecuta "npm run build" en client/');
  });
});

// Agregamos '0.0.0.0' para que escuche a cualquier dispositivo de tu red
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor Express listo para recibir conexiones en el puerto ${PORT}`);
  iniciarTareas(); // Recordatorios para Talento y Cultura (services/tareas.js)
});
