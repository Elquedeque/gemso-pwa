import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import './style.css'; // variables de color de ambos temas (claro y html.dark)
import { aplicarPreferenciasGuardadas } from './utils/tema';

// Tema, tamaño de letra y alto contraste elegidos en Accesibilidad
aplicarPreferenciasGuardadas();

const app = createApp(App);

app.use(router);
app.mount('#app');
