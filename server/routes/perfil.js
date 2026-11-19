// Rutas del Perfil (piden sesión iniciada)
//   GET /api/perfil  Datos personales y laborales del usuario
//   PUT /api/perfil  Guardar los cambios que el usuario sí puede editar
//   PUT /api/perfil/preferencias  Guardar el interruptor "Correos informativos" de Ajustes
//   PUT /api/perfil/contrasena    Cambiar la contraseña: { actual, nueva }
// El usuario se saca del token, así cada quien solo ve y edita su propio perfil.
const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const autenticar = require('../middleware/autenticar');
const { JWT_SECRET, DURACION_SESION } = require('../config/auth');
const { cifrar, verificar, validarNueva } = require('../services/contrasenas');
const { crearLimite } = require('../services/limiteIntentos');
const {
  normalizarCorreo,
  normalizarTelefono,
  TELEFONO_VALIDO,
  limpiarTexto,
  idValido
} = require('../services/validaciones');

const router = express.Router();

// 5 intentos con la contraseña actual equivocada bloquean el cambio 15 minutos.
// Así, quien encuentre un celular con la sesión abierta no puede probar contraseñas.
const limiteContrasena = crearLimite({ maximo: 5, minutos: 15 });

// Consulta del perfil completo (la usan GET y PUT para responder lo mismo)
// Se usa LEFT JOIN porque sucursal, empresa y gerente pueden venir vacíos (migraciones 003 a 005).
// La fecha se manda como texto 'YYYY-MM-DD' para que no se recorra un día por la zona horaria.
const CONSULTA_PERFIL = `
  SELECT
    u.id_usu,
    u.nombre_completo,
    u.correo,
    u.telefono,
    u.puesto,
    TO_CHAR(u.fecha_ingreso, 'YYYY-MM-DD') AS fecha_ingreso,
    u.id_departamento,
    d.nombre AS departamento,
    u.id_sucursal,
    s.nombre AS sucursal,
    u.id_empresa,
    e.nombre AS empresa,
    g.nombre_completo AS gerente,
    u.recibir_correos
  FROM usuarios u
  LEFT JOIN departamentos d ON d.id_dep = u.id_departamento
  LEFT JOIN sucursales s ON s.id_suc = u.id_sucursal
  LEFT JOIN empresas e ON e.id_emp = u.id_empresa
  LEFT JOIN usuarios g ON g.id_usu = u.id_gerente
  WHERE u.id_usu = $1;
`;

// Endpoint para obtener el perfil
router.get('/', autenticar, async (req, res) => {
  try {
    const result = await db.query(CONSULTA_PERFIL, [req.usuario.id_usu]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({ error: 'Error al consultar la base de datos' });
  }
});

// Endpoint para editar el perfil
// Solo se actualizan nombre, correo, teléfono y empresa.
// Departamento, puesto, sucursal, gerente y fecha de ingreso los maneja
// Talento y Cultura, así que si llegan desde el cliente se ignoran.
router.put('/', autenticar, async (req, res) => {
  const idUsu = req.usuario.id_usu;
  const nombre = limpiarTexto(req.body.nombre_completo);
  const correo = normalizarCorreo(req.body.correo);
  const telefono = normalizarTelefono(req.body.telefono);
  const idEmpresa = idValido(req.body.id_empresa);

  if (!nombre || !correo || !telefono || !idEmpresa) {
    return res.status(400).json({ error: 'Nombre, correo, teléfono y empresa son obligatorios' });
  }
  if (!TELEFONO_VALIDO.test(telefono)) {
    return res.status(400).json({ error: 'El teléfono debe tener 10 dígitos' });
  }

  try {
    // 1. Verificar que el correo no sea de otro usuario
    const duplicado = await db.query(
      'SELECT 1 FROM usuarios WHERE LOWER(correo) = $1 AND id_usu <> $2',
      [correo, idUsu]
    );
    if (duplicado.rows.length > 0) {
      return res.status(400).json({ error: 'El correo electrónico ya está registrado' });
    }

    // 2. Guardar los cambios y regresar el perfil actualizado
    await db.query(
      `UPDATE usuarios
       SET nombre_completo = $1, correo = $2, telefono = $3, id_empresa = $4
       WHERE id_usu = $5`,
      [nombre, correo, telefono, idEmpresa, idUsu]
    );

    const result = await db.query(CONSULTA_PERFIL, [idUsu]);
    res.json({ message: 'Perfil actualizado', perfil: result.rows[0] });
  } catch (error) {
    // Error 23505: correo repetido (por si dos lo cambian al mismo tiempo)
    if (error.code === '23505') {
      return res.status(400).json({ error: 'El correo electrónico ya está registrado' });
    }
    // Error 23503: la empresa no existe
    if (error.code === '23503') {
      return res.status(400).json({ error: 'La empresa seleccionada no existe' });
    }
    // Error 22001: algún texto es más largo de lo que acepta la columna
    if (error.code === '22001') {
      return res.status(400).json({ error: 'Alguno de los campos excede la longitud permitida' });
    }
    console.error('Error al actualizar perfil:', error);
    res.status(500).json({ error: 'Error interno del servidor al actualizar el perfil' });
  }
});

// Endpoint para guardar las preferencias de Ajustes
// Por ahora solo "recibir_correos" (migración 011): si está apagado, no se le mandan
// los resúmenes por correo de los recordatorios. Las notificaciones push se manejan aparte.
router.put('/preferencias', autenticar, async (req, res) => {
  const recibirCorreos = req.body?.recibir_correos;
  if (typeof recibirCorreos !== 'boolean') {
    return res.status(400).json({ error: 'recibir_correos debe ser verdadero o falso' });
  }

  try {
    await db.query('UPDATE usuarios SET recibir_correos = $1 WHERE id_usu = $2', [recibirCorreos, req.usuario.id_usu]);
    res.json({ message: 'Preferencias guardadas', recibir_correos: recibirCorreos });
  } catch (error) {
    console.error('Error al guardar preferencias:', error);
    res.status(500).json({ error: 'Error interno del servidor al guardar las preferencias' });
  }
});

// Cambiar la contraseña con la sesión iniciada
// Pide la actual, para que nadie la cambie con un celular que encontró desbloqueado.
// Al cambiarla se cierran las sesiones de los otros dispositivos (contrasena_cambiada,
// migración 017) y este dispositivo recibe un token nuevo para seguir dentro.
// Si la actual es incorrecta se responde 400 y no 401: el 401 cerraría la sesión en la app.
router.put('/contrasena', autenticar, async (req, res) => {
  const idUsu = req.usuario.id_usu;
  const { actual, nueva } = req.body || {};

  if (typeof actual !== 'string' || !actual) {
    return res.status(400).json({ error: 'Escribe tu contraseña actual' });
  }
  const errorNueva = validarNueva(nueva);
  if (errorNueva) return res.status(400).json({ error: errorNueva });
  if (nueva === actual) {
    return res.status(400).json({ error: 'La contraseña nueva debe ser distinta de la actual' });
  }
  if (limiteContrasena.bloqueado(idUsu)) {
    return res.status(429).json({
      error: `Demasiados intentos con la contraseña actual. Espera ${limiteContrasena.minutos} minutos e inténtalo de nuevo.`
    });
  }

  try {
    const result = await db.query('SELECT contraseña AS hash FROM usuarios WHERE id_usu = $1', [idUsu]);
    if (!(await verificar(actual, result.rows[0]?.hash))) {
      limiteContrasena.fallo(idUsu);
      return res.status(400).json({ error: 'La contraseña actual no es correcta' });
    }
    limiteContrasena.limpiar(idUsu);

    const hash = await cifrar(nueva);
    await db.transaccion(async (cliente) => {
      await cliente.query(
        'UPDATE usuarios SET contraseña = $1, contrasena_cambiada = NOW() WHERE id_usu = $2',
        [hash, idUsu]
      );
      await cliente.query(
        `INSERT INTO cambios_colaboradores (id_usu, campo, valor_anterior, valor_nuevo, cambiado_por)
         VALUES ($1, 'contraseña', NULL, 'Cambiada por el colaborador', $1)`,
        [idUsu]
      );
    });

    // Token nuevo: se emite después del cambio, así que este sí pasa la revisión de autenticar.js
    const token = jwt.sign({ id_usu: idUsu }, JWT_SECRET, { expiresIn: DURACION_SESION });
    res.json({ message: 'Contraseña actualizada. Se cerró la sesión en tus otros dispositivos.', token });
  } catch (error) {
    console.error('Error al cambiar la contraseña:', error);
    res.status(500).json({ error: 'Error interno del servidor al cambiar la contraseña' });
  }
});

module.exports = router;
