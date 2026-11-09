import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import './style.css'; // Colores de los dos temas (claro y oscuro)
import { aplicarPreferenciasGuardadas } from './utils/tema';
// Service Worker propio (src/sw.js), compilado por vite-plugin-pwa (vite.config.js).
// Con registerType 'autoUpdate' la app se actualiza sola al publicar una versión nueva.
import { registerSW } from 'virtual:pwa-register';

registerSW({ immediate: true });

// Aplicar el tema, tamaño de letra y contraste que se eligieron en Accesibilidad
aplicarPreferenciasGuardadas();

const app = createApp(App);

app.use(router);
app.mount('#app');
