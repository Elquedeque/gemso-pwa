// Invitaciones para registrarse (tabla invitaciones, migración 012)
// Talento y Cultura invita a una persona con su correo y departamento. La app le manda
// un enlace de un solo uso que vence en DIAS_VIGENCIA días. Solo con ese enlace se
// puede crear una cuenta, así nadie elige por su cuenta un departamento con permisos.
//
// El enlace lleva un código aleatorio (token). En la BD solo se guarda su huella
// SHA-256: con la tabla en la mano no se puede armar ningún enlace válido.
const crypto = require('crypto');
const db = require('../config/db');
const { enviarCorreo, escaparHtml, correoHabilitado } = require('./correo');

const DIAS_VIGENCIA = 7;

// Estado de una invitación, calculado en la consulta. El orden importa:
// una invitación usada sigue contando como usada aunque ya haya pasado su fecha.
const SQL_ESTADO = `
  CASE
    WHEN i.fecha_uso IS NOT NULL THEN 'usada'
    WHEN i.fecha_cancelada IS NOT NULL THEN 'cancelada'
    WHEN i.fecha_expira <= NOW() THEN 'vencida'
    ELSE 'pendiente'
  END`;

// Condición de "todavía sirve" (la misma que 'pendiente' arriba)
const SQL_PENDIENTE = 'i.fecha_uso IS NULL AND i.fecha_cancelada IS NULL AND i.fecha_expira > NOW()';

// Código del enlace: 32 bytes aleatorios en base64url (43 caracteres, seguros en una URL)
const generarToken = () => crypto.randomBytes(32).toString('base64url');

// Huella que se guarda en la BD y con la que se busca la invitación
const huella = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

// Un token con otra forma ni se busca en la BD
const TOKEN_VALIDO = /^[A-Za-z0-9_-]{43}$/;

// Dirección de la app para armar el enlace.
// APP_URL en el .env (por ejemplo https://app.gemso.com.mx). Si no está, se usa la
// dirección desde la que TyC abrió la app, que en desarrollo es la de Vite.
const direccionApp = (origen) => (process.env.APP_URL || origen || 'http://localhost:5173').replace(/\/+$/, '');

const enlaceRegistro = (token, origen) => `${direccionApp(origen)}/registro?invitacion=${token}`;

// Buscar una invitación pendiente por su token.
// Regresa { id_inv, correo, id_departamento, departamento, fecha_expira } o null.
const buscarPendiente = async (token) => {
  if (!TOKEN_VALIDO.test(String(token ?? ''))) return null;
  const result = await db.query(
    `SELECT i.id_inv, i.correo, i.id_departamento, d.nombre AS departamento, i.fecha_expira
     FROM invitaciones i
     JOIN departamentos d ON d.id_dep = i.id_departamento
     WHERE i.token_hash = $1 AND ${SQL_PENDIENTE}`,
    [huella(token)]
  );
  return result.rows[0] || null;
};

// Crear una invitación. Si el correo ya tenía otra pendiente, esa se cancela,
// para que solo funcione el enlace más reciente.
// Regresa la invitación guardada y el token (que no se guarda en ninguna parte).
const crear = async ({ correo, idDepartamento, creadaPor }) => {
  const token = generarToken();
  const result = await db.query(
    `WITH anteriores AS (
       UPDATE invitaciones i SET fecha_cancelada = NOW()
       WHERE i.correo = $1 AND ${SQL_PENDIENTE}
     )
     INSERT INTO invitaciones (correo, id_departamento, token_hash, creada_por, fecha_expira)
     VALUES ($1, $2, $3, $4, NOW() + make_interval(days => $5))
     RETURNING id_inv, correo, id_departamento, fecha_creacion, fecha_expira`,
    [correo, idDepartamento, huella(token), creadaPor, DIAS_VIGENCIA]
  );
  return { invitacion: result.rows[0], token };
};

// Mandar el correo con el enlace. Regresa true si se envió.
// Si falla, la invitación sigue siendo válida: TyC puede copiar el enlace y mandarlo por otro medio.
const enviarCorreoInvitacion = async ({ correo, departamento, enlace, invitadoPor }) => {
  if (!correoHabilitado) return false;

  const fechaLimite = new Date(Date.now() + DIAS_VIGENCIA * 24 * 60 * 60 * 1000).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    timeZone: 'America/Hermosillo'
  });

  try {
    await enviarCorreo({
      para: correo,
      asunto: 'Tu invitación a la app de GEMSO',
      titulo: 'Te damos la bienvenida a la app de GEMSO',
      contenidoHtml: `
        <p>Hola. ${escaparHtml(invitadoPor)}, de Talento y Cultura, te invitó a la app de comunicación interna
        de GEMSO, donde vas a recibir los avisos de la empresa y de tu departamento
        (<strong>${escaparHtml(departamento)}</strong>).</p>
        <p style="text-align:center;margin:28px 0;">
          <a href="${escaparHtml(enlace)}"
             style="background:#000080;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold;display:inline-block;">
            Crear mi cuenta
          </a>
        </p>
        <p>El enlace es personal, sirve una sola vez y vence el <strong>${escaparHtml(fechaLimite)}</strong>.
        Si vence, pide otro a Talento y Cultura.</p>
        <p style="font-size:13px;color:#64748b;">Si el botón no funciona, copia esta dirección en tu navegador:<br>
        <span style="word-break:break-all;">${escaparHtml(enlace)}</span></p>`,
      texto:
        `${invitadoPor}, de Talento y Cultura, te invitó a la app de GEMSO (${departamento}).\n\n` +
        `Crea tu cuenta aquí: ${enlace}\n\n` +
        `El enlace es personal, sirve una sola vez y vence el ${fechaLimite}.`,
      pie: 'Recibes este correo porque Talento y Cultura de GEMSO te invitó a registrarte. Si no lo esperabas, puedes ignorarlo.'
    });
    return true;
  } catch (error) {
    console.error(`No se pudo enviar la invitación a ${correo}:`, error.message);
    return false;
  }
};

module.exports = {
  DIAS_VIGENCIA,
  SQL_ESTADO,
  SQL_PENDIENTE,
  huella,
  enlaceRegistro,
  buscarPendiente,
  crear,
  enviarCorreoInvitacion
};
