// GET /api/departamentos — catálogo de departamentos (lo usan el registro y la pantalla de Invitaciones)
// solo_por_invitacion: el registro abierto no lo muestra (hoy Talento y Cultura, migración 012)
const express = require('express');
const db = require('../config/db');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT id_dep, nombre, solo_por_invitacion FROM departamentos ORDER BY nombre ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener departamentos:', error);
    res.status(500).json({ error: 'Error al consultar la base de datos' });
  }
});

module.exports = router;
