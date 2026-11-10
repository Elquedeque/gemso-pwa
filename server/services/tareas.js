// Tareas programadas (paquete node-cron)
// Los recordatorios se revisan cada hora en punto, de 8:00 a 20:00 (hora de Hermosillo),
// y también al encender el servidor. Se revisa cada hora y no solo a las 8:00 por si
// el servidor estaba apagado a esa hora o falló un envío: como cada envío queda
// registrado (services/recordatorios.js), lo que ya se mandó no se repite.
//
// Para apagarlas (por ejemplo, en pruebas): RECORDATORIOS_ACTIVOS=false en el .env
const cron = require('node-cron');
const { ejecutarPendientes, HORA_INICIO, HORA_FIN } = require('./recordatorios');
const { ZONA } = require('./fechas');

// Espera tras encender el servidor antes de la primera revisión
const ESPERA_INICIAL_MS = 10 * 1000;

const revisarRecordatorios = async () => {
  try {
    const resultado = await ejecutarPendientes();
    // Solo se muestra en consola si se mandó algo o hubo error
    if (resultado && Object.entries(resultado).some(([clave, valor]) => clave !== 'fecha' && valor)) {
      console.log('Recordatorios enviados:', resultado);
    }
  } catch (error) {
    console.error('Error al revisar recordatorios:', error.message);
  }
};

const iniciarTareas = () => {
  if (process.env.RECORDATORIOS_ACTIVOS === 'false') {
    console.warn('Recordatorios desactivados (RECORDATORIOS_ACTIVOS=false en el .env)');
    return;
  }

  // "0 8-20 * * *" = minuto 0 de cada hora entre las 8 y las 20, todos los días
  cron.schedule(`0 ${HORA_INICIO}-${HORA_FIN} * * *`, revisarRecordatorios, {
    name: 'recordatorios',
    timezone: ZONA,
    noOverlap: true // si una revisión tarda, no empieza otra encima
  });

  setTimeout(revisarRecordatorios, ESPERA_INICIAL_MS);
  console.log(`Recordatorios programados cada hora de ${HORA_INICIO}:00 a ${HORA_FIN}:00 (${ZONA})`);
};

module.exports = { iniciarTareas, revisarRecordatorios };
