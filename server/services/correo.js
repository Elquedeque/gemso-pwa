// Envío de correos y plantilla común
// Todos los correos de la app comparten el mismo diseño: encabezado azul de GEMSO,
// contenido y un pie (por defecto, cómo dejar de recibir los recordatorios).
const { nodemailer, transporte, correoHabilitado, esPrueba, REMITENTE } = require('../config/correo');

// Los nombres vienen de la BD (los captura cada usuario), así que se escapan
// para que nadie pueda meter HTML dentro del correo.
const escaparHtml = (texto) =>
  String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const AZUL_GEMSO = '#000080'; // mismo azul de marca que el manifest de la PWA

// Pie de los recordatorios (es el que llevan los correos si no se indica otro)
const PIE_RECORDATORIOS =
  'Recibes este correo porque tienes activados los recordatorios de Talento y Cultura en la app de GEMSO. ' +
  'Para dejar de recibirlo, desactiva "Correos informativos" en Ajustes.';

// Arma el HTML completo. "contenido" ya debe venir escapado; "pie" es texto simple.
// Se usan tablas y estilos en línea porque muchos programas de correo ignoran el CSS.
const plantilla = (titulo, contenido, pie = PIE_RECORDATORIOS) => `<!doctype html>
<html lang="es">
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:8px;overflow:hidden;">
        <tr><td style="background:${AZUL_GEMSO};color:#ffffff;padding:20px 24px;">
          <div style="font-size:13px;letter-spacing:1px;opacity:0.85;">GEMSO · TALENTO Y CULTURA</div>
          <div style="font-size:20px;font-weight:bold;margin-top:4px;">${escaparHtml(titulo)}</div>
        </td></tr>
        <tr><td style="padding:24px;font-size:15px;line-height:1.5;">${contenido}</td></tr>
        <tr><td style="padding:16px 24px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">
          ${escaparHtml(pie)}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

// Enviar un correo. Regresa la info de nodemailer o lanza el error.
// "texto" es la versión sin formato, para programas que no muestran HTML.
// "pie" es opcional: si no se manda, va el pie de los recordatorios.
const enviarCorreo = async ({ para, asunto, titulo, contenidoHtml, texto, pie }) => {
  if (!correoHabilitado) throw new Error('Los correos están desactivados (faltan datos SMTP en el .env)');

  const info = await transporte.sendMail({
    from: REMITENTE,
    to: para,
    subject: asunto,
    html: plantilla(titulo, contenidoHtml, pie),
    text: texto
  });

  // Con Ethereal el correo no llega a nadie: se muestra el enlace para verlo
  if (esPrueba) console.log(`Correo de prueba "${asunto}" → ${nodemailer.getTestMessageUrl(info)}`);
  return info;
};

module.exports = { enviarCorreo, escaparHtml, correoHabilitado };
