// Limpieza y Validación de datos del usuario
// La usan el registro (routes/auth.js) y la edición del perfil (routes/perfil.js).

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

module.exports = { normalizarCorreo, normalizarTelefono, TELEFONO_VALIDO, limpiarTexto, idValido };
