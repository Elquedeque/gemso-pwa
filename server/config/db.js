// Conexión a PostgreSQL (gemso_db)
// Los datos se toman del server/.env (guía en .env.example).
// index.js carga el .env antes de llegar a este archivo.
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: String(process.env.DB_PASSWORD), // Forzado como string
  port: process.env.DB_PORT,
});

// Ejecutar varias consultas como una sola: si alguna falla, no se guarda ninguna.
// Ejemplo:
//   await db.transaccion(async (cliente) => {
//     await cliente.query('UPDATE ...');
//     await cliente.query('INSERT ...');
//   });
const transaccion = async (fn) => {
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    const resultado = await fn(cliente);
    await cliente.query('COMMIT');
    return resultado;
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }
};

module.exports = {
  query: (text, params) => pool.query(text, params),
  transaccion
};
