// GET /api/health — revisa que el servidor y la BD respondan
const express = require('express');
const db = require('../config/db');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW()');
    res.json({ status: 'ok', serverTime: result.rows[0].now });
  } catch (error) {
    console.error('Error al consultar la BD:', error);
    res.status(500).json({ status: 'error', message: 'Error de conexión a la BD' });
  }
});

module.exports = router;
