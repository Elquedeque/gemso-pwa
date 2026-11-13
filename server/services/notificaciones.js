// Envío de notificaciones push
// Flujo: se buscan los dispositivos suscritos de quienes deben recibir el mensaje,
// se manda a cada uno con web-push y se borran los que ya no existen.
const db = require('../config/db');
const { webpush, pushHabilitado } = require('../config/push');

// Cuánto tiempo guarda el servicio push el mensaje si el dispositivo está apagado (24 h).
// Después de eso se descarta, para no recibir avisos viejos días después.
const TTL_SEGUNDOS = 60 * 60 * 24;

// Enviar un mensaje a una lista de suscripciones (filas de suscripciones_push)
// Los envíos van en paralelo; si uno falla no detiene a los demás.
const enviarASuscripciones = async (suscripciones, mensaje, { urgente = false } = {}) => {
  if (!pushHabilitado || suscripciones.length === 0) return { enviados: 0, eliminados: 0 };

  const payload = JSON.stringify(mensaje);
  const opciones = { TTL: TTL_SEGUNDOS, urgency: urgente ? 'high' : 'normal' };
  const vencidas = [];

  const resultados = await Promise.allSettled(
    suscripciones.map((s) =>
      webpush
        .sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, opciones)
        .catch((error) => {
          // 404 / 410: el usuario quitó el permiso o desinstaló la app; la suscripción ya no sirve
          if (error.statusCode === 404 || error.statusCode === 410) vencidas.push(s.id_sus);
          else console.error(`Error al enviar push (suscripción ${s.id_sus}):`, error.statusCode || error.message);
          throw error;
        })
    )
  );

  if (vencidas.length > 0) {
    await db.query('DELETE FROM suscripciones_push WHERE id_sus = ANY($1)', [vencidas]);
  }

  return {
    enviados: resultados.filter((r) => r.status === 'fulfilled').length,
    eliminados: vencidas.length
  };
};

// Notificar a todos los que pueden ver un aviso recién publicado.
// Usa la misma regla de visibilidad que routes/anuncios.js:
//   - aviso general           → todos los usuarios
//   - aviso a un departamento → los usuarios de ese departamento
//   - aviso a una persona     → solo esa persona
// Al autor no se le notifica su propio aviso.
const notificarNuevoAviso = async (anuncio) => {
  const { rows } = await db.query(
    `SELECT s.id_sus, s.endpoint, s.p256dh, s.auth
     FROM suscripciones_push s
     INNER JOIN usuarios u ON u.id_usu = s.id_usu
     WHERE u.id_usu <> $1
       AND u.activo -- los desactivados no reciben notificaciones (migración 013)
       AND (($2::int IS NULL AND $3::int IS NULL)
            OR u.id_departamento = $2
            OR u.id_usu = $3)`,
    [anuncio.id_autor, anuncio.id_dep_destino, anuncio.id_usu_destino]
  );

  // Vista previa corta del contenido para el cuerpo de la notificación
  const contenido = anuncio.contenido.length > 120 ? `${anuncio.contenido.slice(0, 117)}...` : anuncio.contenido;

  return enviarASuscripciones(
    rows,
    {
      titulo: anuncio.urgente ? `Urgente: ${anuncio.titulo}` : anuncio.titulo,
      cuerpo: contenido,
      url: `/mis-avisos/${anuncio.id_anu}`,
      // Con la misma etiqueta, el aviso no se repite si llega dos veces
      etiqueta: `aviso-${anuncio.id_anu}`,
      urgente: anuncio.urgente
    },
    { urgente: anuncio.urgente }
  );
};

module.exports = { enviarASuscripciones, notificarNuevoAviso };
