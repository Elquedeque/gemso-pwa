// Rutas de Inicio de Sesión y Registro
//   POST /api/login     Iniciar sesión (regresa usuario, permisos y token)
//   POST /api/usuarios  Registrar un usuario nuevo
const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { JWT_SECRET, DURACION_SESION } = require('../config/auth');
const { PERMISOS_TYC, obtenerPermisos } = require('../services/permisos');
const {
  normalizarCorreo,
  normalizarTelefono,
  TELEFONO_VALIDO,
  idValido
} = require('../services/validaciones');

const router = express.Router();

// Endpoint de Inicio de Sesión
// PENDIENTE: la contraseña se compara tal cual, sin cifrar. Meter bcrypt antes de la
// defensa (seguro lo preguntan). Ojo, hay que avisar antes de instalar el paquete
// y migrar las contraseñas que ya estan guardadas en la BD.
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
  const telefono = normalizarTelefono(req.body.telefono);
  const idSucursal = idValido(req.body.id_sucursal);
  const idEmpresa = idValido(req.body.id_empresa);
  const {
    nombre_completo,
    contraseña,
    puesto,
    id_departamento,
    fecha_nacimiento,
    fecha_ingreso
  } = req.body;

  // Validación básica de campos requeridos
  if (!nombre_completo || !correo || !telefono || !contraseña || !puesto || !id_departamento ||
      !idSucursal || !idEmpresa || !fecha_nacimiento || !fecha_ingreso) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }
  if (!TELEFONO_VALIDO.test(telefono)) {
    return res.status(400).json({ error: 'El teléfono debe tener 10 dígitos' });
  }

  try {
    // 1. Verificar si el correo ya existe
    const checkEmail = await db.query('SELECT id_usu FROM usuarios WHERE LOWER(correo) = $1', [correo]);
    if (checkEmail.rows.length > 0) {
      // TODO: aqui regreso 'message' y en el login 'error'... unificar a 'error' en todos
      return res.status(400).json({ message: 'El correo electrónico ya está registrado.' });
    }

    // 2. Insertar en la base de datos PostgreSQL
    //    En la misma consulta, si es de Talento y Cultura se le dan los permisos
    //    de publicar avisos y ver sus estadísticas (así quedó para la beta).
    //    El gerente no se pide aquí, ese lo asigna Talento y Cultura.
    const query = `
      WITH nuevo AS (
        INSERT INTO usuarios (
          nombre_completo,
          correo,
          contraseña,
          puesto,
          id_departamento,
          fecha_nacimiento,
          fecha_ingreso,
          telefono,
          id_sucursal,
          id_empresa
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $9, $10, $11)
        RETURNING id_usu, nombre_completo, correo, id_departamento
      ),
      permiso_tyc AS (
        INSERT INTO usuario_permisos (id_usu, id_per)
        SELECT nuevo.id_usu, p.id_per
        FROM nuevo
        JOIN departamentos d ON d.id_dep = nuevo.id_departamento
        JOIN permisos p ON p.nombre = ANY($8::text[])
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
      PERMISOS_TYC,
      telefono,
      idSucursal,
      idEmpresa
    ];

    const result = await db.query(query, values);

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      usuario: result.rows[0]
    });
  } catch (error) {
    // Error 23505: correo repetido (por si dos se registran al mismo tiempo)
    if (error.code === '23505') {
      return res.status(400).json({ message: 'El correo electrónico ya está registrado.' });
    }
    // Error 23503: el departamento, la sucursal o la empresa no existe
    if (error.code === '23503') {
      return res.status(400).json({ message: 'El departamento, la sucursal o la empresa no existe.' });
    }
    console.error('Error al registrar usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor al intentar registrar.' });
  }
});

module.exports = router;
