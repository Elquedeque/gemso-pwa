// Fechas en la zona horaria de Hermosillo
// Los recordatorios dependen del día (cumpleaños, lunes, día 1 del mes), así que
// siempre se calcula con la hora de Hermosillo, aunque el servidor esté en otra zona.
// Las fechas se manejan como texto 'AAAA-MM-DD' para que no se recorran un día.

const ZONA = 'America/Hermosillo'; // UTC-7 todo el año, sin horario de verano

// Día de una fecha en Hermosillo, como 'AAAA-MM-DD' (en-CA usa ese formato)
const fechaLocal = (fecha = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(fecha);

// Hora (0 a 23) de una fecha en Hermosillo
const horaLocal = (fecha = new Date()) =>
  Number(new Intl.DateTimeFormat('en-US', { timeZone: ZONA, hour: 'numeric', hourCycle: 'h23' }).format(fecha));

// Las cuentas se hacen en UTC para que no influya la zona del equipo
const aUTC = (texto) => new Date(`${texto}T00:00:00Z`);
const aTexto = (fecha) => fecha.toISOString().slice(0, 10);

// Sumar (o restar) días a 'AAAA-MM-DD'
const sumarDias = (texto, dias) => {
  const fecha = aUTC(texto);
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return aTexto(fecha);
};

// Lunes de la semana de esa fecha (la semana va de lunes a domingo)
const lunesDeLaSemana = (texto) => {
  const diasDesdeLunes = (aUTC(texto).getUTCDay() + 6) % 7;
  return sumarDias(texto, -diasDesdeLunes);
};

// Primer día del mes de esa fecha y del mes anterior
const primerDiaDelMes = (texto) => `${texto.slice(0, 7)}-01`;
const primerDiaDelMesAnterior = (texto) => {
  const [anio, mes] = texto.split('-').map(Number);
  return aTexto(new Date(Date.UTC(anio, mes - 2, 1)));
};

// Días de calendario entre dos fechas 'AAAA-MM-DD'
const diasEntre = (desde, hasta) => Math.round((aUTC(hasta) - aUTC(desde)) / 86400000);

// Texto en español, por ejemplo "lunes 9 de noviembre" o "octubre de 2026"
const formatear = (texto, opciones) =>
  new Date(`${texto}T12:00:00Z`).toLocaleDateString('es-MX', { timeZone: 'UTC', ...opciones });
const formatearDia = (texto) => formatear(texto, { weekday: 'long', day: 'numeric', month: 'long' });
const formatearMes = (texto) => formatear(texto, { month: 'long', year: 'numeric' });
const formatearCorto = (texto) => formatear(texto, { day: 'numeric', month: 'long' }); // "9 de noviembre"

module.exports = {
  ZONA,
  fechaLocal,
  horaLocal,
  sumarDias,
  lunesDeLaSemana,
  primerDiaDelMes,
  primerDiaDelMesAnterior,
  diasEntre,
  formatearDia,
  formatearMes,
  formatearCorto
};
