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

// Guardia para pantallas que piden un permiso (tabla usuario_permisos).
// Esto es solo para la pantalla, el backend vuelve a revisar el permiso en cada petición.
// Sin sesión manda al login; sin permiso, a Mis Avisos.
const soloConPermiso = (permiso) => () => {
  let usuario = null;
  try {
    usuario = JSON.parse(localStorage.getItem('usuario'));
  } catch {
    usuario = null;
  }
  if (!usuario?.id_usu || !localStorage.getItem('token')) return '/login';
  if (!usuario.permisos?.includes(permiso)) return '/mis-avisos';
  return true;
};

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
    // Solo entran usuarios con permiso 'publicar_avisos' (en la beta, Talento y Cultura)
    beforeEnter: soloConPermiso('publicar_avisos')
  },
  {
    path: '/estadisticas',
    name: 'estadisticas',
    component: () => import('../views/EstadisticasAvisosView.vue'),
    beforeEnter: soloConPermiso('ver_estadisticas')
  },
  {
    path: '/estadisticas/:id',
    name: 'estadistica-aviso',
    component: () => import('../views/EstadisticaAvisoView.vue'),
    beforeEnter: soloConPermiso('ver_estadisticas')
  },
  {
    path: '/invitaciones',
    name: 'invitaciones',
    component: () => import('../views/InvitacionesView.vue'),
    beforeEnter: soloConPermiso('invitar_colaboradores')
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
    path: '/perfil/editar',
    name: 'editar-perfil',
    component: () => import('../views/EditarPerfilView.vue')
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

// PENDIENTE: solo /crear-aviso revisa la sesion. Hacer un router.beforeEach para que
// perfil, avisos, documentos, etc. manden al login si no hay token.
// (La API ya bloquea los datos, pero la pantalla se alcanza a ver vacia)
const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;