// Configuración de notificaciones push (paquete web-push)
// Las llaves VAPID identifican a este servidor ante los servicios push de los navegadores.
// La pública se comparte con el frontend; la privada solo vive en el server/.env.
// Se generan una sola vez con:  npx web-push generate-vapid-keys
//
// Si faltan las llaves, el servidor arranca igual pero sin notificaciones push
// (el resto de la app no depende de ellas).
const webpush = require('web-push');

const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;

const pushHabilitado = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY && VAPID_SUBJECT);

if (pushHabilitado) {
  // VAPID_SUBJECT es un correo de contacto (mailto:...) por si el servicio push necesita avisarnos algo
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} else {
  console.warn('Notificaciones push desactivadas: faltan VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY o VAPID_SUBJECT en el .env');
}

module.exports = {
  webpush,
  pushHabilitado,
  VAPID_PUBLIC_KEY: VAPID_PUBLIC_KEY || null
};
