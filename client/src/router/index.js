import { createRouter, createWebHistory } from 'vue-router';
import LoginView from '../views/LoginView.vue';
import AnunciosView from '../views/AnunciosView.vue';
import MisAnunciosView from '../views/MisAnunciosView.vue';
import DocumentosView from '../views/DocumentosView.vue';
import PerfilView from '../views/PerfilView.vue';
import AjustesView from '../views/AjustesView.vue';
import AyudaView from '../views/AyudaView.vue';

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
  {
    path: '/mis-avisos',
    name: 'mis-avisos',
    component: MisAnunciosView
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
  },
  {
  path: '/mis-avisos/:id',
  name: 'detalle-aviso',
  component: () => import('../views/DetalleAvisoView.vue')
  },
  {
  path: '/documentos',
  name: 'documentos',
  component: DocumentosView
  },
  {
  path: '/perfil',
  name: 'perfil',
  component: PerfilView
  },
  {
  path: '/ajustes',
  name: 'ajustes',
  component: AjustesView
  },
  {
  path: '/ayuda',
  name: 'ayuda',
  component: AyudaView
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;