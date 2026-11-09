// Notificaciones push del lado del navegador
// Flujo para activarlas:
//   1. Pedir permiso al usuario (solo después de que toque el interruptor en Ajustes)
//   2. Pedir al servidor la llave pública VAPID
//   3. Suscribir el dispositivo con el Service Worker (el navegador habla con Google/Mozilla/Apple)
//   4. Mandar la suscripción a Express para guardarla en suscripciones_push
import { apiFetch } from '../api';

// ¿El navegador soporta notificaciones push?
export const soportaPush = () =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

// En iPhone/iPad solo funciona si la app está instalada en la pantalla de inicio (iOS 16.4+)
export const esIOSSinInstalar = () => {
  const esIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const instalada = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  return esIOS && !instalada;
};

// La llave VAPID viene en base64 "url-safe" y el navegador la pide como bytes
const base64ABytes = (base64) => {
  const relleno = '='.repeat((4 - (base64.length % 4)) % 4);
  const normal = (base64 + relleno).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(normal), (c) => c.charCodeAt(0));
};

// Suscripción actual de este dispositivo (null si no hay o si no hay Service Worker)
export const obtenerSuscripcion = async () => {
  if (!soportaPush()) return null;
  const registro = await navigator.serviceWorker.getRegistration();
  return registro ? registro.pushManager.getSubscription() : null;
};

// Estado para mostrar en Ajustes:
//   'no-soportado' | 'ios-instalar' | 'bloqueado' | 'activo' | 'inactivo'
export const estadoPush = async () => {
  if (esIOSSinInstalar()) return 'ios-instalar';
  if (!soportaPush()) return 'no-soportado';
  if (Notification.permission === 'denied') return 'bloqueado';
  const suscripcion = await obtenerSuscripcion();
  return suscripcion && Notification.permission === 'granted' ? 'activo' : 'inactivo';
};

// Leer el mensaje de error que manda Express
const errorDeRespuesta = async (res, porDefecto) => {
  const datos = await res.json().catch(() => ({}));
  return new Error(datos.error || porDefecto);
};

// Activar las notificaciones en este dispositivo
export const activarPush = async () => {
  if (!soportaPush()) throw new Error('Este navegador no soporta notificaciones');

  // 1. Permiso
  const permiso = await Notification.requestPermission();
  if (permiso !== 'granted') {
    throw new Error('No se dio permiso para mostrar notificaciones');
  }

  // 2. Llave pública del servidor
  const resLlave = await apiFetch('/api/push/llave-publica');
  if (!resLlave.ok) throw await errorDeRespuesta(resLlave, 'No se pudo obtener la llave del servidor');
  const { llave } = await resLlave.json();

  // 3. Suscribir el dispositivo. userVisibleOnly es obligatorio: cada push muestra una notificación.
  const registro = await navigator.serviceWorker.ready;
  let suscripcion = await registro.pushManager.getSubscription();
  if (!suscripcion) {
    try {
      suscripcion = await registro.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64ABytes(llave)
      });
    } catch (error) {
      // AbortError: el navegador no pudo registrarse en su servicio push.
      // Pasa en Brave, que trae apagado ese servicio por defecto.
      if (error.name === 'AbortError') {
        throw new Error(navigator.brave
          ? 'Brave trae apagadas las notificaciones push. Actívalas en brave://settings/privacy (opción de usar los servicios de Google para mensajes push), reinicia el navegador y vuelve a intentarlo.'
          : 'El navegador no pudo conectarse a su servicio de notificaciones. Revisa tu conexión e inténtalo de nuevo.');
      }
      throw error;
    }
  }

  // 4. Guardarla en el servidor
  const res = await apiFetch('/api/push/suscripcion', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(suscripcion)
  });
  if (!res.ok) {
    // Si el servidor no la guardó, se quita también del navegador para no quedar a medias
    await suscripcion.unsubscribe().catch(() => {});
    throw await errorDeRespuesta(res, 'No se pudo activar las notificaciones');
  }
};

// Desactivar las notificaciones en este dispositivo (servidor y navegador)
export const desactivarPush = async () => {
  const suscripcion = await obtenerSuscripcion();
  if (!suscripcion) return;

  await apiFetch('/api/push/suscripcion', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: suscripcion.endpoint })
  }).catch(() => {}); // si no hay conexión, el servidor la borrará al recibir 410 en el próximo envío

  await suscripcion.unsubscribe();
};

// Mandar una notificación de prueba a mis dispositivos
export const probarPush = async () => {
  const res = await apiFetch('/api/push/prueba', { method: 'POST' });
  if (!res.ok) throw await errorDeRespuesta(res, 'No se pudo enviar la prueba');
};
