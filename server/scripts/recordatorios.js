// Ejecutar los recordatorios a mano, como si fueran las 8:00 de una fecha.
// Sirve para probarlos sin esperar al lunes o al día 1.
//
// Uso (desde la carpeta server):
//   node scripts/recordatorios.js              → hoy
//   node scripts/recordatorios.js 2026-11-16   → simula que hoy es el 16 de noviembre
//
// Respeta el registro de envíos: lo que ya se mandó no se vuelve a mandar.
// Con Ethereal, la consola muestra el enlace para ver cada correo.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const { ejecutarPendientes, HORA_INICIO } = require('../services/recordatorios');

const fecha = process.argv[2];
if (fecha && !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
  console.error('La fecha debe tener el formato AAAA-MM-DD');
  process.exit(1);
}

// Hermosillo es UTC-7 todo el año
const hora = String(HORA_INICIO).padStart(2, '0');
const ahora = fecha ? new Date(`${fecha}T${hora}:00:00-07:00`) : new Date();

ejecutarPendientes(ahora)
  .then((resultado) => {
    console.log(resultado || `Fuera del horario de envío; prueba con una fecha: node scripts/recordatorios.js AAAA-MM-DD`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error.message);
    process.exit(1);
  });
