// GET /api/empresas — catálogo de empresas del grupo GEMSO (registro y edición de perfil)
const express = require('express');
const db = require('../config/db');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT id_emp, nombre FROM empresas ORDER BY nombre ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener empresas:', error);
    res.status(500).json({ error: 'Error al consultar la base de datos' });
  }
});

module.exports = router;
