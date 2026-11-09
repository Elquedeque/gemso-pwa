// URL del Backend
// En desarrollo se deja vacía porque Vite manda /api al servidor Express (vite.config.js),
// así funciona igual desde la PC o desde un celular conectado a la misma red.
// Para producción se pone VITE_API_URL en client/.env (por ejemplo https://api.gemso.com).
export const API_URL = import.meta.env.VITE_API_URL || '';

// Caché donde el Service Worker guarda las respuestas de la API para verlas sin conexión.
// Debe ser igual a CACHE_API en client/src/sw.js
const CACHE_API = 'gemso-api';

// Borrar la sesión que guardó LoginView.
// También se borra el caché de la API, para que en un equipo compartido
// el siguiente usuario no vea sin conexión los avisos del anterior,
// y la suscripción push, para que no le lleguen sus notificaciones.
// Las preferencias de Accesibilidad (tema, tamaño de letra) se conservan.
export const cerrarSesionLocal = () => {
  localStorage.removeItem('usuario');
  localStorage.removeItem('token');
  if ('caches' in window) caches.delete(CACHE_API).catch(() => {});

  // Quitar la suscripción push del navegador (por ejemplo si la sesión venció).
  // Al servidor no se le avisa porque ya no hay token; en el siguiente envío
  // el servicio push responde 410 y el servidor borra la suscripción solo.
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .getRegistration()
      .then((registro) => registro?.pushManager?.getSubscription())
      .then((suscripcion) => suscripcion?.unsubscribe())
      .catch(() => {});
  }
};

// Petición a la API mandando el token de sesión en "Authorization"
// Si el servidor responde 401 (sin sesión o con el token vencido),
// se borra la sesión y se regresa al login.
export const apiFetch = async (ruta, opciones = {}) => {
  const token = localStorage.getItem('token');
  const headers = { ...opciones.headers };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${ruta}`, { ...opciones, headers });

  if (res.status === 401) {
    cerrarSesionLocal();
    window.location.assign('/login');
  }
  return res;
};
