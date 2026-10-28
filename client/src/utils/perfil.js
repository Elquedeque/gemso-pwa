// Formato de los datos del perfil (GET /api/perfil).
// Lo usan PerfilView y EditarPerfilView para mostrar la información igual.

// Texto para campos opcionales que aún no se capturan en la BD
export const mostrar = (valor) => valor || 'No registrado';

// Convierte 'YYYY-MM-DD' en una fecha local (sin desfase por zona horaria)
const aFecha = (texto) => {
  const [anio, mes, dia] = texto.split('-').map(Number);
  return new Date(anio, mes - 1, dia);
};

// Iniciales para el avatar: primera letra de las dos primeras palabras del nombre
export const obtenerIniciales = (nombre) =>
  (nombre || '').trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() || '').join('');

// 10 dígitos -> "662 123 4567"
export const formatearTelefono = (tel) => {
  if (!tel) return 'No registrado';
  return /^\d{10}$/.test(tel) ? `${tel.slice(0, 3)} ${tel.slice(3, 6)} ${tel.slice(6)}` : tel;
};

// 'YYYY-MM-DD' -> "27 jul 2026"
export const formatearFecha = (texto) => {
  if (!texto) return 'No registrado';
  return aFecha(texto).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Antigüedad desde la fecha de ingreso, ej. "3 meses", "1 año 2 meses"
export const calcularAntiguedad = (fechaIngreso) => {
  if (!fechaIngreso) return '—';
  const ingreso = aFecha(fechaIngreso);
  const hoy = new Date();
  let meses = (hoy.getFullYear() - ingreso.getFullYear()) * 12 + (hoy.getMonth() - ingreso.getMonth());
  if (hoy.getDate() < ingreso.getDate()) meses--; // aún no se cumple el mes en curso
  if (meses < 1) return 'Menos de 1 mes';

  const anios = Math.floor(meses / 12);
  const resto = meses % 12;
  const partes = [];
  if (anios) partes.push(`${anios} ${anios === 1 ? 'año' : 'años'}`);
  if (resto) partes.push(`${resto} ${resto === 1 ? 'mes' : 'meses'}`);
  return partes.join(' ');
};
