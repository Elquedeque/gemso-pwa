// Limpieza y validación de datos de usuario, compartida por el registro
// (routes/auth.js) y la edición del perfil (routes/perfil.js).

// Los correos se manejan sin distinguir mayúsculas y sin espacios (ver migración 002)
const normalizarCorreo = (correo) => String(correo ?? '').trim().toLowerCase();

// El teléfono se guarda solo con dígitos: "(662) 123-4567" -> "6621234567"
const normalizarTelefono = (telefono) => String(telefono ?? '').replace(/\D/g, '');
const TELEFONO_VALIDO = /^\d{10}$/; // número nacional de México a 10 dígitos

// Texto obligatorio: sin espacios sobrantes; '' si no es texto
const limpiarTexto = (valor) => (typeof valor === 'string' ? valor.trim() : '');

// Id de catálogo: entero positivo o null si no es válido
const idValido = (valor) => {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : null;
};

module.exports = { normalizarCorreo, normalizarTelefono, TELEFONO_VALIDO, limpiarTexto, idValido };
