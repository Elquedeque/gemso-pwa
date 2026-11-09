import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';

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

      // ── Service Worker propio (src/sw.js) ──────────────────────
      // injectManifest: el plugin no genera el Service Worker, solo le inyecta la lista
      // de archivos para el caché. Se escribe a mano porque también recibe notificaciones push.
      // El caché de la API (CACHE_API) y la ruta de respaldo ahora están dentro de src/sw.js.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      injectManifest: {
        // Se guardan los archivos de la app (JS, CSS, HTML, imágenes) para abrirla sin internet
        globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}']
      },

      // Poner en true para probar el Service Worker con "npm run dev"
      devOptions: { enabled: false, type: 'module' }
    })
  ]
});
