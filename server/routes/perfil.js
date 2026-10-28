// Perfil del usuario de la sesión. Requiere sesión (middleware autenticar).
//   GET /api/perfil -> datos personales y organizacionales del usuario
// El usuario sale del token (req.usuario), así cada quien solo ve su propio perfil.
const express = require('express');
const db = require('../config/db');
const autenticar = require('../middleware/autenticar');

const router = express.Router();

router.get('/', autenticar, async (req, res) => {
  try {
    // LEFT JOIN: sucursal y gerente son opcionales (ver migración 003).
    // Las fechas se devuelven como texto 'YYYY-MM-DD' para evitar desfases por zona horaria.
    const query = `
      SELECT
        u.id_usu,
        u.nombre_completo,
        u.correo,
        u.telefono,
        u.puesto,
        TO_CHAR(u.fecha_ingreso, 'YYYY-MM-DD') AS fecha_ingreso,
        d.nombre AS departamento,
        s.nombre AS sucursal,
        g.nombre_completo AS gerente
      FROM usuarios u
      LEFT JOIN departamentos d ON d.id_dep = u.id_departamento
      LEFT JOIN sucursales s ON s.id_suc = u.id_sucursal
      LEFT JOIN usuarios g ON g.id_usu = u.id_gerente
      WHERE u.id_usu = $1;
    `;
    const result = await db.query(query, [req.usuario.id_usu]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({ error: 'Error al consultar la base de datos' });
  }
});

module.exports = router;
