import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
//Configuracion PWA
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
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'GEMSO PWA',
        short_name: 'GEMSO',
        description: 'Aplicacion Web Progresiva para GEMSO',
        theme_color: '#1e293b',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
});