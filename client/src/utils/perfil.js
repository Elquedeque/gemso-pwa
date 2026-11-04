// Formato de los Datos del Perfil (GET /api/perfil)
// Lo usan PerfilView y EditarPerfilView para que se vea igual en las dos.

// Texto para los campos que todavía no se capturan en la BD
export const mostrar = (valor) => valor || 'No registrado';

// Convertir 'YYYY-MM-DD' en fecha local (para que no se recorra un día)
const aFecha = (texto) => {
  const [anio, mes, dia] = texto.split('-').map(Number);
  return new Date(anio, mes - 1, dia);
};

// Iniciales del avatar: primera letra de las dos primeras palabras del nombre
export const obtenerIniciales = (nombre) =>
  (nombre || '').trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() || '').join('');

// Teléfono de 10 dígitos con formato "662 123 4567"
export const formatearTelefono = (tel) => {
  if (!tel) return 'No registrado';
  return /^\d{10}$/.test(tel) ? `${tel.slice(0, 3)} ${tel.slice(3, 6)} ${tel.slice(6)}` : tel;
};

// Fecha con formato "27 jul 2026"
export const formatearFecha = (texto) => {
  if (!texto) return 'No registrado';
  return aFecha(texto).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Antigüedad desde la fecha de ingreso, por ejemplo "3 meses" o "1 año 2 meses"
export const calcularAntiguedad = (fechaIngreso) => {
  if (!fechaIngreso) return '—';
  const ingreso = aFecha(fechaIngreso);
  const hoy = new Date();
  let meses = (hoy.getFullYear() - ingreso.getFullYear()) * 12 + (hoy.getMonth() - ingreso.getMonth());
  if (hoy.getDate() < ingreso.getDate()) meses--; // Todavía no se cumple el mes
  if (meses < 1) return 'Menos de 1 mes';

  const anios = Math.floor(meses / 12);
  const resto = meses % 12;
  const partes = [];
  if (anios) partes.push(`${anios} ${anios === 1 ? 'año' : 'años'}`);
  if (resto) partes.push(`${resto} ${resto === 1 ? 'mes' : 'meses'}`);
  return partes.join(' ');
};
