// URL base del backend.
// En desarrollo se deja vacía: Vite reenvía /api al servidor Express (ver vite.config.js),
// así funciona igual desde la PC o desde un celular en la misma red.
// Para producción, define VITE_API_URL en client/.env (ej. https://api.gemso.com).
export const API_URL = import.meta.env.VITE_API_URL || '';

// Borra la sesión guardada por LoginView
export const cerrarSesionLocal = () => {
  localStorage.removeItem('usuario');
  localStorage.removeItem('token');
};

// fetch hacia la API con el token de sesión en "Authorization".
// Si el servidor responde 401 (sin sesión o token vencido), se borra la sesión
// y se manda al login.
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
