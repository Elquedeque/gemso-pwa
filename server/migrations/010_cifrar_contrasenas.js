// Migración 010: cifrar con bcrypt las contraseñas que ya estaban guardadas
// Antes de esta migración las contraseñas se guardaban tal cual (texto plano).
// Este script reemplaza cada una por su hash. Es de Node y no SQL porque el
// hash se calcula con el mismo paquete que usa el login (bcryptjs).
//
// Se puede ejecutar varias veces sin efectos adicionales: salta las que ya
// son hash. Todo va en una transacción: si algo falla, no se cambia nada.
// Los usuarios siguen entrando con la misma contraseña de siempre.
//
// Ejecutar desde la carpeta server:  node migrations/010_cifrar_contrasenas.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const { Client } = require('pg');
const { cifrar, verificar, esHash } =require('../services/contrasenas');

async function main() {
  const client = new Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  });
  await client.connect();

  try {
    await client.query('BEGIN');
    // FOR UPDATE: nadie puede cambiar estas filas mientras corre el script
    const { rows } = await client.query('SELECT id_usu, contraseña FROM usuarios FOR UPDATE');

    let cifradas = 0;
    for (const usuario of rows) {
      if (esHash(usuario.contraseña)) continue;
      const hash = await cifrar(usuario.contraseña);
      // Comprobación: el hash nuevo debe aceptar la contraseña de siempre
      if (!(await verificar(usuario.contraseña, hash))) {
        throw new Error(`El hash del usuario ${usuario.id_usu} no coincide`);
      }
      await client.query('UPDATE usuarios SET contraseña = $1 WHERE id_usu = $2', [hash, usuario.id_usu]);
      cifradas++;
    }

    await client.query('COMMIT');
    console.log(`Usuarios: ${rows.length} · cifradas ahora: ${cifradas} · ya estaban cifradas: ${rows.length - cifradas}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error, no se cambió nada:', error.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
