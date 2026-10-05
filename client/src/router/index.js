import { createRouter, createWebHistory } from 'vue-router';
import LoginView from '../views/LoginView.vue';

const routes = [
  {
    path: '/',
    name: 'Login',
    component: LoginView
  },
  {
    path: '/anuncios',
    name: 'Anuncios',
    component: () => import('../views/AnunciosView.vue')
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;