// Cifrado de contraseñas con bcrypt (paquete bcryptjs)
// En la BD nunca se guarda la contraseña, solo su hash. Un hash no se puede
// "descifrar": para iniciar sesión se calcula de nuevo y se compara.
const bcrypt = require('bcryptjs');

// Costo del cifrado: 2^10 rondas. Tarda unos 100 ms por contraseña, poco para
// un usuario pero mucho para quien intente adivinar millones de combinaciones.
const RONDAS = 10;

// bcrypt solo toma en cuenta los primeros 72 bytes de la contraseña.
// Se rechazan las más largas para que no haya diferencias silenciosas.
const MAX_BYTES = 72;
const MIN_CARACTERES = 8;

// Hash válido que se usa cuando el correo no existe. Así el login tarda lo mismo
// exista o no la cuenta, y no se puede averiguar qué correos están registrados.
const HASH_FICTICIO = bcrypt.hashSync('cuenta-inexistente', RONDAS);

// Un hash de bcrypt empieza con $2a$, $2b$ o $2y$ y mide 60 caracteres
function esHash(valor) {
  return typeof valor === 'string' && /^\$2[aby]\$\d{2}\$.{53}$/.test(valor);
}

function cifrar(contraseña) {
  return bcrypt.hash(contraseña, RONDAS);
}

// hash puede ser null (correo inexistente): se compara contra el ficticio
async function verificar(contraseña, hash) {
  const coincide = await bcrypt.compare(contraseña, hash || HASH_FICTICIO);
  return Boolean(hash) && coincide;
}

// Regresa el mensaje de error, o null si la contraseña es aceptable
function validarNueva(contraseña) {
  if (typeof contraseña !== 'string' || contraseña.length < MIN_CARACTERES) {
    return `La contraseña debe tener al menos ${MIN_CARACTERES} caracteres`;
  }
  if (Buffer.byteLength(contraseña, 'utf8') > MAX_BYTES) {
    return 'La contraseña es demasiado larga (máximo 72 caracteres)';
  }
  return null;
}

module.exports = { cifrar, verificar, validarNueva, esHash, RONDAS, MIN_CARACTERES };
