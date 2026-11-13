// Limpieza y Validación de datos del usuario
// La usan el registro (routes/auth.js), la edición del perfil (routes/perfil.js),
// las invitaciones y la gestión de colaboradores de TyC (routes/colaboradores.js).

// Correo sin espacios y en minúsculas (migración 002)
const normalizarCorreo = (correo) => String(correo ?? '').trim().toLowerCase();

// Teléfono solo con números, por ejemplo "(662) 123-4567" queda "6621234567"
const normalizarTelefono = (telefono) => String(telefono ?? '').replace(/\D/g, '');
const TELEFONO_VALIDO = /^\d{10}$/; // Número de México a 10 dígitos

// Quitar espacios sobrantes (si no es texto regresa '')
const limpiarTexto = (valor) => (typeof valor === 'string' ? valor.trim() : '');

// Id de un catálogo: entero positivo, o null si no es válido
const idValido = (valor) => {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : null;
};

// Forma básica de un correo: algo@algo.algo, sin espacios
const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Fecha 'YYYY-MM-DD' que exista en el calendario (rechaza '2026-02-30').
// Regresa el mismo texto, o null si no es válida.
const fechaValida = (valor) => {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return null;
  const [anio, mes, dia] = valor.split('-').map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia
    ? valor
    : null;
};

module.exports = {
  normalizarCorreo,
  normalizarTelefono,
  TELEFONO_VALIDO,
  CORREO_VALIDO,
  limpiarTexto,
  idValido,
  fechaValida
};
