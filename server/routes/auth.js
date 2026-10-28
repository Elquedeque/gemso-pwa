// Inicio de sesión y registro de usuarios.
//   POST /api/login     -> devuelve el usuario, sus permisos y un token de sesión
//   POST /api/usuarios  -> registra un usuario nuevo
const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { JWT_SECRET, DURACION_SESION } = require('../config/auth');
const { PERMISO_PUBLICAR_AVISOS, obtenerPermisos } = require('../services/permisos');

const router = express.Router();

// Los correos se manejan sin distinguir mayúsculas y sin espacios (ver migración 002)
const normalizarCorreo = (correo) => String(correo ?? '').trim().toLowerCase();

// Endpoint de Inicio de Sesión
router.post('/login', async (req, res) => {
  const { contraseña } = req.body;
  const correo = normalizarCorreo(req.body.correo);

  if (!correo || !contraseña) {
    return res.status(400).json({ error: 'Debes proporcionar correo y contraseña' });
  }

  try {
    const query = `
      SELECT u.id_usu, u.nombre_completo, u.correo, u.puesto, d.nombre AS departamento
      FROM usuarios u
      LEFT JOIN departamentos d ON u.id_departamento = d.id_dep
      WHERE LOWER(u.correo) = $1 AND u.contraseña = $2
    `;

    const result = await db.query(query, [correo, contraseña]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const usuario = result.rows[0];
    usuario.permisos = await obtenerPermisos(usuario.id_usu);

    const token = jwt.sign({ id_usu: usuario.id_usu }, JWT_SECRET, { expiresIn: DURACION_SESION });

    res.json({
      message: 'Inicio de sesión exitoso',
      token,
      usuario
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint de Registro de Usuarios
router.post('/usuarios', async (req, res) => {
  const correo = normalizarCorreo(req.body.correo);
  const {
    nombre_completo,
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
    const checkEmail = await db.query('SELECT id_usu FROM usuarios WHERE LOWER(correo) = $1', [correo]);
    if (checkEmail.rows.length > 0) {
      return res.status(400).json({ message: 'El correo electrónico ya está registrado.' });
    }

    // 2. Insertar en la base de datos PostgreSQL.
    //    En la misma sentencia (atómica): si el usuario es de Talento y Cultura,
    //    se le asigna el permiso de publicar avisos (regla de la beta).
    const query = `
      WITH nuevo AS (
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
        RETURNING id_usu, nombre_completo, correo, id_departamento
      ),
      permiso_tyc AS (
        INSERT INTO usuario_permisos (id_usu, id_per)
        SELECT nuevo.id_usu, p.id_per
        FROM nuevo
        JOIN departamentos d ON d.id_dep = nuevo.id_departamento
        JOIN permisos p ON p.nombre = $8
        WHERE d.nombre = 'Talento y Cultura'
      )
      SELECT id_usu, nombre_completo, correo FROM nuevo;
    `;

    const values = [
      nombre_completo,
      correo,
      contraseña,
      puesto,
      id_departamento,
      fecha_nacimiento,
      fecha_ingreso,
      PERMISO_PUBLICAR_AVISOS
    ];

    const result = await db.query(query, values);

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      usuario: result.rows[0]
    });
  } catch (error) {
    // 23505: correo duplicado (p. ej. dos registros simultáneos con el mismo correo)
    if (error.code === '23505') {
      return res.status(400).json({ message: 'El correo electrónico ya está registrado.' });
    }
    console.error('Error al registrar usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor al intentar registrar.' });
  }
});

module.exports = router;
