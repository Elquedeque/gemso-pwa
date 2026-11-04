import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import './style.css'; // Colores de los dos temas (claro y oscuro)
import { aplicarPreferenciasGuardadas } from './utils/tema';

// Aplicar el tema, tamaño de letra y contraste que se eligieron en Accesibilidad
aplicarPreferenciasGuardadas();

const app = createApp(App);

app.use(router);
app.mount('#app');
