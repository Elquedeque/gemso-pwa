const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Ruta de prueba
app.get('/api/health', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW()');
    res.json({ status: 'ok', serverTime: result.rows[0].now });
  } catch (error) {
    console.error('Error al consultar la BD:', error);
    res.status(500).json({ status: 'error', message: 'Error de conexión a la BD' });
  }
});

// Endpoint de Inicio de Sesión
app.post('/api/login', async (req, res) => {
  const { correo, contraseña } = req.body;

  if (!correo || !contraseña) {
    return res.status(400).json({ error: 'Debes proporcionar correo y contraseña' });
  }

  try {
    const query = `
      SELECT u.id_usu, u.nombre_completo, u.correo, u.puesto, d.nombre AS departamento
      FROM usuarios u
      LEFT JOIN departamentos d ON u.id_departamento = d.id_dep
      WHERE u.correo = $1 AND u.contraseña = $2
    `;
    
    const result = await db.query(query, [correo, contraseña]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const usuario = result.rows[0];
    res.json({
      message: 'Inicio de sesión exitoso',
      usuario
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint de Registro de Usuarios
app.post('/api/usuarios', async (req, res) => {
  const { 
    nombre_completo, 
    correo, 
    contraseña, 
    puesto, 
    id_departamento, 
    fecha_nacimiento, 
    fecha_ingreso 
  } = req.body;

  // Validación básica de campos requeridos
  if (!nombre_completo || !correo || !contraseña || !puesto || !id_departamento || !fecha_nacimiento || !fecha_ingreso) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  try {
    // 1. Verificar si el correo ya existe
    const checkEmail = await db.query('SELECT id_usu FROM usuarios WHERE correo = $1', [correo]);
    if (checkEmail.rows.length > 0) {
      return res.status(400).json({ message: 'El correo electrónico ya está registrado.' });
    }

    // 2. Insertar en la base de datos PostgreSQL
    const query = `
      INSERT INTO usuarios (
        nombre_completo, 
        correo, 
        contraseña, 
        puesto, 
        id_departamento, 
        fecha_nacimiento, 
        fecha_ingreso
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id_usu, nombre_completo, correo;
    `;

    const values = [
      nombre_completo, 
      correo, 
      contraseña, 
      puesto, 
      id_departamento, 
      fecha_nacimiento, 
      fecha_ingreso
    ];

    const result = await db.query(query, values);

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      usuario: result.rows[0]
    });
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor al intentar registrar.' });
  }
});

// NUEVO: Endpoint para obtener todos los anuncios
app.get('/api/anuncios', async (req, res) => {
  try {
    const query = `
      SELECT 
        a.id_anu,
        a.titulo,
        a.contenido,
        a.categoria,
        a.urgente,
        a.fecha_creacion,
        u.nombre_completo AS autor,
        d.nombre AS departamento_destino
      FROM anuncios a
      INNER JOIN usuarios u ON a.id_autor = u.id_usu
      LEFT JOIN departamentos d ON a.id_dep_destino = d.id_dep
      ORDER BY a.fecha_creacion DESC;
    `;
    const result = await db.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener anuncios:', error);
    res.status(500).json({ error: 'Error al consultar la base de datos' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor Express corriendo en http://localhost:${PORT}`);
});