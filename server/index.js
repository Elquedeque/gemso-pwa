// Servidor Express de GEMSO PWA
// Aquí solo se arma la app y se conectan las rutas. Lo demás está separado en:
//   config/      conexión a la BD y sesiones (JWT)
//   middleware/  revisar el token de sesión y los permisos
//   services/    permisos y validaciones
//   routes/      endpoints de cada módulo

// Cargar el .env primero, porque config/ usa sus variables
require('dotenv').config();

const express = require('express');
const cors = require('cors');
require('./config/auth'); // Si falta JWT_SECRET en el .env, el servidor no arranca

const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const departamentosRoutes = require('./routes/departamentos');
const anunciosRoutes = require('./routes/anuncios');
const perfilRoutes = require('./routes/perfil');
const sucursalesRoutes = require('./routes/sucursales');
const empresasRoutes = require('./routes/empresas');
const estadisticasRoutes = require('./routes/estadisticas');

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

// Agregamos '0.0.0.0' para que escuche a cualquier dispositivo de tu red
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor Express listo para recibir conexiones en el puerto ${PORT}`);
});
