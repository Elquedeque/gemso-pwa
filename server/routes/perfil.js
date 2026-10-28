// Perfil del usuario de la sesión. Requiere sesión (middleware autenticar).
//   GET /api/perfil -> datos personales y organizacionales del usuario
//   PUT /api/perfil -> actualiza los datos que el usuario puede editar
// El usuario sale del token (req.usuario), así cada quien solo ve y edita su propio perfil.
const express = require('express');
const db = require('../config/db');
const autenticar = require('../middleware/autenticar');
const {
  normalizarCorreo,
  normalizarTelefono,
  TELEFONO_VALIDO,
  limpiarTexto,
  idValido
} = require('../services/validaciones');

const router = express.Router();

// Consulta del perfil completo (la usan GET y PUT para responder igual).
// LEFT JOIN: sucursal, empresa y gerente son opcionales (ver migraciones 003-005).
// Las fechas se devuelven como texto 'YYYY-MM-DD' para evitar desfases por zona horaria.
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
    g.nombre_completo AS gerente
  FROM usuarios u
  LEFT JOIN departamentos d ON d.id_dep = u.id_departamento
  LEFT JOIN sucursales s ON s.id_suc = u.id_sucursal
  LEFT JOIN empresas e ON e.id_emp = u.id_empresa
  LEFT JOIN usuarios g ON g.id_usu = u.id_gerente
  WHERE u.id_usu = $1;
`;

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

// Solo se actualizan nombre, correo, teléfono y empresa.
// Departamento, puesto, sucursal, gerente y fecha de ingreso los administra
// Talento y Cultura: si el cliente los manda, se ignoran.
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
    // El correo no puede pertenecer a otro usuario
    const duplicado = await db.query(
      'SELECT 1 FROM usuarios WHERE LOWER(correo) = $1 AND id_usu <> $2',
      [correo, idUsu]
    );
    if (duplicado.rows.length > 0) {
      return res.status(400).json({ error: 'El correo electrónico ya está registrado' });
    }

    await db.query(
      `UPDATE usuarios
       SET nombre_completo = $1, correo = $2, telefono = $3, id_empresa = $4
       WHERE id_usu = $5`,
      [nombre, correo, telefono, idEmpresa, idUsu]
    );

    const result = await db.query(CONSULTA_PERFIL, [idUsu]);
    res.json({ message: 'Perfil actualizado', perfil: result.rows[0] });
  } catch (error) {
    // 23505: correo duplicado (dos cambios simultáneos al mismo correo)
    if (error.code === '23505') {
      return res.status(400).json({ error: 'El correo electrónico ya está registrado' });
    }
    // 23503: la empresa no existe
    if (error.code === '23503') {
      return res.status(400).json({ error: 'La empresa seleccionada no existe' });
    }
    // 22001: texto más largo de lo permitido por la columna
    if (error.code === '22001') {
      return res.status(400).json({ error: 'Alguno de los campos excede la longitud permitida' });
    }
    console.error('Error al actualizar perfil:', error);
    res.status(500).json({ error: 'Error interno del servidor al actualizar el perfil' });
  }
});

module.exports = router;
