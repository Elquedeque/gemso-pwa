// Service Worker de GEMSO PWA
// Antes lo generaba vite-plugin-pwa de forma automática (modo generateSW).
// Ahora es propio (modo injectManifest) porque, además del caché sin conexión,
// tiene que recibir notificaciones push. Al compilar, el plugin reemplaza
// self.__WB_MANIFEST por la lista de archivos de la app.
//
// Trabajos de este archivo:
//   1. Caché: abrir la app y releer avisos sin internet (igual que antes)
//   2. Push: mostrar la notificación aunque la app esté cerrada
//   3. Clic en la notificación: abrir la app en el aviso
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { clientsClaim } from 'workbox-core';

// Nombre del caché de respuestas de la API.
// Debe ser igual a CACHE_API en client/src/api.js (ahí se borra al cerrar sesión).
const CACHE_API = 'gemso-api';

// ── Actualización automática ─────────────────────────────────
// Equivale a registerType 'autoUpdate': la versión nueva se activa en cuanto se descarga
// y toma el control de las pestañas abiertas.
self.skipWaiting();
clientsClaim();

// ── 1. Caché sin conexión ────────────────────────────────────

// Archivos de la app (JS, CSS, HTML, imágenes); se borran los de versiones anteriores
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Cualquier ruta de Vue Router (/mis-avisos, /perfil...) carga index.html sin conexión,
// menos las peticiones a la API, que siempre van al servidor
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('index.html'), {
    denylist: [/^\/api\//]
  })
);

// Consultas GET a la API: primero se pide al servidor; si no hay conexión
// (o tarda más de 5 s) se muestra la última respuesta guardada.
// Login, registro y cualquier POST/PUT/DELETE no pasan por aquí.
registerRoute(
  ({ url, request }) =>
    request.method === 'GET' &&
    url.pathname.startsWith('/api/') &&
    url.pathname !== '/api/health',
  new NetworkFirst({
    cacheName: CACHE_API,
    networkTimeoutSeconds: 5,
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 }) // 7 días
    ]
  })
);

// ── 2. Recibir una notificación push ─────────────────────────
// El servidor (server/services/notificaciones.js) manda un JSON con:
//   { titulo, cuerpo, url, etiqueta, urgente }
self.addEventListener('push', (event) => {
  let datos = {};
  try {
    datos = event.data ? event.data.json() : {};
  } catch {
    // Si no viene en JSON, se usa el texto tal cual
    datos = { cuerpo: event.data ? event.data.text() : '' };
  }

  const titulo = datos.titulo || 'GEMSO';
  const opciones = {
    body: datos.cuerpo || 'Tienes un aviso nuevo',
    icon: '/pwa-192x192.png',
    badge: '/pwa-64x64.png',
    tag: datos.etiqueta, // misma etiqueta = reemplaza a la anterior en lugar de duplicarse
    // Los avisos urgentes se quedan en pantalla hasta que el usuario los toque
    requireInteraction: Boolean(datos.urgente),
    data: { url: datos.url || '/' }
  };

  // waitUntil: el navegador no apaga el Service Worker hasta que se muestre la notificación
  event.waitUntil(self.registration.showNotification(titulo, opciones));
});

// ── 3. Clic en la notificación ───────────────────────────────
// Si la app ya está abierta, se enfoca y se navega al aviso; si no, se abre una ventana nueva.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const destino = new URL(event.notification.data?.url || '/', self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ventanas) => {
      const abierta = ventanas.find((v) => v.url.startsWith(self.location.origin));
      if (abierta) {
        return abierta.focus().then((v) => v.navigate(destino));
      }
      return self.clients.openWindow(destino);
    })
  );
});
