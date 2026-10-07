import { createRouter, createWebHistory } from 'vue-router';
import LoginView from '../views/LoginView.vue';
import AnunciosView from '../views/AnunciosView.vue';

const routes = [
  {
    path: '/',
    name: 'login',
    component: LoginView
  },
  {
    path: '/anuncios',
    name: 'anuncios',
    component: AnunciosView
  },
  // ── RUTAS DEL SIDEBAR ──────────────────────────────────
  {
    path: '/documentos',
    name: 'documentos',
    component: AnunciosView // Cambiar por DocumentosView cuando esté listo
  },
  {
    path: '/agenda',
    name: 'agenda',
    component: AnunciosView
  },
  {
    path: '/perfil',
    name: 'perfil',
    component: AnunciosView
  },
  {
    path: '/accesibilidad',
    name: 'accesibilidad',
    component: () => import('../views/AccesibilidadView.vue')
  },
  {
    path: '/ajustes',
    name: 'ajustes',
    component: AnunciosView
  },
  {
    path: '/ayuda',
    name: 'ayuda',
    component: AnunciosView
  },
  {
    path: '/contacto',
    name: 'contacto',
    component: AnunciosView
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;