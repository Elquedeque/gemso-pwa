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

// ── Protección de pantallas ──────────────────────────────────────────
// Esto es solo para la pantalla: el backend vuelve a revisar la sesión y los
// permisos en cada petición. Sirve para no mostrar pantallas vacías o con errores.
//
// Reglas (ver router.beforeEach al final):
//   - Toda pantalla pide sesión, salvo las marcadas con meta: { publica: true }.
//     Así, una pantalla nueva nace protegida aunque se olvide marcarla.
//   - Las que piden un permiso (tabla usuario_permisos) usan soloConPermiso().

// Usuario guardado por LoginView, o null si no hay sesión
const leerSesion = () => {
  if (!localStorage.getItem('token')) return null;
  try {
    const usuario = JSON.parse(localStorage.getItem('usuario'));
    return usuario?.id_usu ? usuario : null;
  } catch {
    return null;
  }
};

// Guardia para pantallas que piden un permiso. La sesión ya la revisó beforeEach;
// aquí solo se ve el permiso. Sin permiso, a Mis Avisos.
const soloConPermiso = (permiso) => () => {
  const usuario = leerSesion();
  if (!usuario?.permisos?.includes(permiso)) return '/mis-avisos';
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
    component: LoginView,
    meta: { publica: true }
  },
  {
    path: '/registro',
    name: 'registro',
    component: RegistroView,
    meta: { publica: true }
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
  {
    path: '/colaboradores',
    name: 'colaboradores',
    component: () => import('../views/ColaboradoresView.vue'),
    beforeEnter: soloConPermiso('gestionar_colaboradores')
  },
  {
    path: '/colaboradores/:id',
    name: 'colaborador',
    component: () => import('../views/ColaboradorView.vue'),
    beforeEnter: soloConPermiso('gestionar_colaboradores')
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

const router = createRouter({
  history: createWebHistory(),
  routes
});

// Se ejecuta antes de abrir cualquier pantalla
router.beforeEach((to) => {
  const haySesion = leerSesion() !== null;

  // Pantalla protegida sin sesión: al login, recordando a dónde quería ir
  // (por ejemplo, al tocar una notificación que abre /estadisticas/5)
  if (!to.meta.publica && !haySesion) {
    return { path: '/login', query: { volver: to.fullPath } };
  }

  // Con sesión no tiene caso volver a iniciarla
  if (to.name === 'login' && haySesion) {
    return '/anuncios';
  }

  return true;
});

export default router;