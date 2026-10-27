import { createRouter, createWebHistory } from 'vue-router';
import LoginView from '../views/LoginView.vue';
import AnunciosView from '../views/AnunciosView.vue';
import MisAnunciosView from '../views/MisAnunciosView.vue';
import DocumentosView from '../views/DocumentosView.vue';
import PerfilView from '../views/PerfilView.vue';
import AjustesView from '../views/AjustesView.vue';
import AyudaView from '../views/AyudaView.vue';
import ContactoView from '../views/ContactoView.vue';
import CrearAvisoView from '../views/CrearAvisoView.vue';
import RegistroView from '../views/RegistroView.vue';

const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'login',
    component: LoginView
  },
  {
    path: '/registro',
    name: 'registro',
    component: RegistroView
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
  {
    path: '/mis-avisos/:id',
    name: 'detalle-aviso',
    component: () => import('../views/DetalleAvisoView.vue')
  },
  {
    path: '/crear-aviso',
    name: 'crear-aviso',
    component: CrearAvisoView,
    // Solo usuarios con permiso 'publicar_avisos' (beta: Talento y Cultura).
    // Es solo para la interfaz: el backend vuelve a validar el permiso al publicar.
    beforeEnter: () => {
      let usuario = null;
      try {
        usuario = JSON.parse(localStorage.getItem('usuario'));
      } catch {
        usuario = null;
      }
      if (!usuario?.id_usu) return '/login';
      if (!usuario.permisos?.includes('publicar_avisos')) return '/mis-avisos';
      return true;
    }
  },
  // ── RUTAS DEL SIDEBAR ──────────────────────────────────
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
  },
  {
    path: '/contacto',
    name: 'contacto',
    component: ContactoView
  },
  {
    path: '/agenda',
    name: 'agenda',
    component: AnunciosView
  },
  {
    path: '/accesibilidad',
    name: 'accesibilidad',
    component: () => import('../views/AccesibilidadView.vue')
  },
  // ── RUTA CATCH-ALL (Redirige cualquier ruta desconocida o rota al Login) ──
  {
    path: '/:pathMatch(.*)*',
    redirect: '/login'
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;