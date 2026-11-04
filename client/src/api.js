// URL del Backend
// En desarrollo se deja vacía porque Vite manda /api al servidor Express (vite.config.js),
// así funciona igual desde la PC o desde un celular conectado a la misma red.
// Para producción se pone VITE_API_URL en client/.env (por ejemplo https://api.gemso.com).
export const API_URL = import.meta.env.VITE_API_URL || '';

// Borrar la sesión que guardó LoginView
export const cerrarSesionLocal = () => {
  localStorage.removeItem('usuario');
  localStorage.removeItem('token');
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
