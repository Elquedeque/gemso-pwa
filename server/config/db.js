// Conexión a PostgreSQL (gemso_db).
// Los datos de conexión vienen de server/.env (ver .env.example).
// index.js carga el .env antes de requerir este archivo.
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: String(process.env.DB_PASSWORD), // Forzado como string
  port: process.env.DB_PORT,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};
