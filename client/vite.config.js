import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';

// Nombre del caché donde el Service Worker guarda las respuestas de la API.
// Debe ser igual a CACHE_API en client/src/api.js (ahí se borra al cerrar sesión).
const CACHE_API = 'gemso-api';

export default defineConfig({
  // Servidor de desarrollo: accesible desde otros dispositivos de la red
  // y con proxy de /api hacia Express, para no depender de "localhost" en el celular.
  server: {
    host: true,
    proxy: {
      '/api': 'http://localhost:3000'
    }
  },
  plugins: [
    vue(),
    VitePWA({
      // El Service Worker nuevo se activa solo al publicar una versión nueva
      registerType: 'autoUpdate',
      // Se registra desde main.js (virtual:pwa-register)
      injectRegister: false,

      // Archivos de public/ que también se guardan para usarse sin conexión
      includeAssets: ['apple-touch-icon.png', 'pwa-64x64.png'],

      // ── Manifest: cómo se ve la app al instalarla ──────────────
      manifest: {
        id: '/',
        name: 'GEMSO - Comunicación Interna',
        short_name: 'GEMSO',
        description: 'Avisos, documentos y perfil de los colaboradores de GEMSO Autos de Hermosillo.',
        lang: 'es-MX',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#000080', // azul de marca (--brand-primary en style.css)
        background_color: '#ffffff', // color de la pantalla de carga al abrir la app
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          // Versión con más margen para Android, que recorta el ícono en círculo
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },

      // ── Service Worker (Workbox) ───────────────────────────────
      workbox: {
        // Se guardan los archivos de la app (JS, CSS, HTML, imágenes) para abrirla sin internet
        globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
        // Cualquier ruta de Vue Router (/mis-avisos, /perfil...) carga index.html sin conexión,
        // menos las peticiones a la API, que siempre van al servidor
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,

        runtimeCaching: [
          {
            // Consultas GET a la API: primero se pide al servidor; si no hay conexión
            // (o tarda más de 5 s) se muestra la última respuesta guardada.
            // Así el colaborador puede releer sus avisos sin internet.
            // Login, registro y cualquier POST/PUT/DELETE no pasan por aquí.
            urlPattern: ({ url, request }) =>
              request.method === 'GET' &&
              url.pathname.startsWith('/api/') &&
              url.pathname !== '/api/health',
            handler: 'NetworkFirst',
            options: {
              cacheName: CACHE_API,
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 }, // 7 días
              cacheableResponse: { statuses: [200] }
            }
          }
        ]
      },

      // Poner en true para probar el Service Worker con "npm run dev"
      devOptions: { enabled: false }
    })
  ]
});
