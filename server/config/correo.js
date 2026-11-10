// Configuración del envío de correos (paquete nodemailer)
// Los datos del servidor de correo (SMTP) se toman del server/.env:
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS  datos de la cuenta que envía
//   CORREO_REMITENTE                            nombre y correo que ve quien lo recibe
//
// En desarrollo se usa Ethereal (ethereal.email): un buzón de prueba donde los
// correos NO llegan a nadie, solo se pueden ver en una página de vista previa.
// Para usar la cuenta real de la empresa basta con cambiar esas variables.
//
// Si faltan datos, el servidor arranca igual pero sin correos (como con push).
const nodemailer = require('nodemailer');

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, CORREO_REMITENTE } = process.env;

const correoHabilitado = Boolean(SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS && CORREO_REMITENTE);

// Con Ethereal se muestra en consola el enlace para ver cada correo enviado
const esPrueba = correoHabilitado && SMTP_HOST.includes('ethereal.email');

let transporte = null;
if (correoHabilitado) {
  const puerto = Number(SMTP_PORT);
  transporte = nodemailer.createTransport({
    host: SMTP_HOST,
    port: puerto,
    secure: puerto === 465, // 465 cifra desde el inicio; 587 cifra después con STARTTLS
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });
} else {
  console.warn('Correos desactivados: faltan SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS o CORREO_REMITENTE en el .env');
}

module.exports = {
  nodemailer,
  transporte,
  correoHabilitado,
  esPrueba,
  REMITENTE: CORREO_REMITENTE || null
};
