// GET /api/sucursales — catálogo de sucursales (lo usa el registro)
const express = require('express');
const db = require('../config/db');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT id_suc, nombre FROM sucursales ORDER BY nombre ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener sucursales:', error);
    res.status(500).json({ error: 'Error al consultar la base de datos' });
  }
});

module.exports = router;
