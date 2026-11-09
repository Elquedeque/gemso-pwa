// Rutas de notificaciones push
//   GET    /api/push/llave-publica  Llave pública VAPID para que el navegador se suscriba
//   POST   /api/push/suscripcion    Guardar la suscripción de este dispositivo (pide sesión)
//   DELETE /api/push/suscripcion    Borrar la suscripción de este dispositivo (pide sesión)
//   POST   /api/push/prueba         Mandar una notificación de prueba a mis dispositivos (pide sesión)
const express = require('express');
const db = require('../config/db');
const autenticar = require('../middleware/autenticar');
const { pushHabilitado, VAPID_PUBLIC_KEY } = require('../config/push');
const { enviarASuscripciones } = require('../services/notificaciones');

const router = express.Router();

// Si el servidor no tiene llaves VAPID, las rutas responden 503 (servicio no disponible)
const requierePush = (req, res, next) => {
  if (!pushHabilitado) {
    return res.status(503).json({ error: 'Las notificaciones push no están configuradas en el servidor' });
  }
  next();
};

const esTexto = (v) => typeof v === 'string' && v.trim() !== '';

// Revisar que la suscripción tenga la forma que entrega el navegador:
// { endpoint: 'https://...', keys: { p256dh: '...', auth: '...' } }
const validarSuscripcion = (s) =>
  s && esTexto(s.endpoint) && s.endpoint.startsWith('https://') &&
  s.keys && esTexto(s.keys.p256dh) && esTexto(s.keys.auth);

// La llave pública no es secreta, por eso no pide sesión
router.get('/llave-publica', requierePush, (req, res) => {
  res.json({ llave: VAPID_PUBLIC_KEY });
});

// Guardar (o actualizar) la suscripción del dispositivo para el usuario de la sesión.
// ON CONFLICT: si el dispositivo ya estaba registrado, se le asigna al usuario actual
// (caso de un equipo compartido donde cambió la persona).
router.post('/suscripcion', autenticar, requierePush, async (req, res) => {
  const suscripcion = req.body;
  if (!validarSuscripcion(suscripcion)) {
    return res.status(400).json({ error: 'Suscripción inválida' });
  }

  try {
    await db.query(
      `INSERT INTO suscripciones_push (id_usu, endpoint, p256dh, auth, user_agent)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (endpoint) DO UPDATE
         SET id_usu = EXCLUDED.id_usu,
             p256dh = EXCLUDED.p256dh,
             auth = EXCLUDED.auth,
             user_agent = EXCLUDED.user_agent,
             fecha_creacion = CURRENT_TIMESTAMP`,
      [
        req.usuario.id_usu,
        suscripcion.endpoint,
        suscripcion.keys.p256dh,
        suscripcion.keys.auth,
        (req.headers['user-agent'] || '').slice(0, 300)
      ]
    );
    res.status(201).json({ message: 'Notificaciones activadas en este dispositivo' });
  } catch (error) {
    console.error('Error al guardar suscripción push:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Borrar la suscripción. Solo se puede borrar una que sea del usuario de la sesión.
router.delete('/suscripcion', autenticar, async (req, res) => {
  const { endpoint } = req.body || {};
  if (!esTexto(endpoint)) {
    return res.status(400).json({ error: 'Falta el endpoint de la suscripción' });
  }

  try {
    await db.query('DELETE FROM suscripciones_push WHERE endpoint = $1 AND id_usu = $2', [
      endpoint,
      req.usuario.id_usu
    ]);
    res.json({ message: 'Notificaciones desactivadas en este dispositivo' });
  } catch (error) {
    console.error('Error al borrar suscripción push:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Notificación de prueba a todos los dispositivos del usuario (botón en Ajustes)
router.post('/prueba', autenticar, requierePush, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id_sus, endpoint, p256dh, auth FROM suscripciones_push WHERE id_usu = $1',
      [req.usuario.id_usu]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'No tienes dispositivos con notificaciones activadas' });
    }

    const resultado = await enviarASuscripciones(rows, {
      titulo: 'Notificación de prueba',
      cuerpo: 'Si ves este mensaje, las notificaciones de GEMSO funcionan en tu dispositivo.',
      url: '/ajustes',
      etiqueta: 'prueba'
    });
    // 502: el servidor funcionó, pero ningún servicio push aceptó el mensaje
    if (resultado.enviados === 0) {
      return res.status(502).json({ error: 'No se pudo entregar la notificación. Desactiva y vuelve a activar las notificaciones', ...resultado });
    }
    res.json({ message: 'Notificación enviada', ...resultado });
  } catch (error) {
    console.error('Error al enviar notificación de prueba:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
