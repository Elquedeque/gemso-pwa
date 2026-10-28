// Punto de entrada del servidor Express de GEMSO PWA.
// Aquí solo se configura la app y se montan las rutas; la lógica vive en:
//   config/      conexión a la BD y configuración de sesiones
//   middleware/  autenticación por token
//   services/    lógica compartida (permisos)
//   routes/      endpoints agrupados por módulo

// El .env se carga antes que todo lo demás: config/ lee sus variables al importarse.
require('dotenv').config();

const express = require('express');
const cors = require('cors');
require('./config/auth'); // valida JWT_SECRET al arrancar (detiene el servidor si falta)

const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const departamentosRoutes = require('./routes/departamentos');
const anunciosRoutes = require('./routes/anuncios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/health', healthRoutes);
app.use('/api', authRoutes); // /api/login y /api/usuarios
app.use('/api/departamentos', departamentosRoutes);
app.use('/api/anuncios', anunciosRoutes);

// Agregamos '0.0.0.0' para que escuche a cualquier dispositivo de tu red
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor Express listo para recibir conexiones en el puerto ${PORT}`);
});
