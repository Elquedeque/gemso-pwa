// Utilidades para las pantallas de Estadísticas de Avisos

// Porcentaje entero de "parte" sobre "total" (0 si no hay total)
export const porcentaje = (parte, total) => (total > 0 ? Math.round((parte / total) * 100) : 0);

// Estados de lectura que manda la API (routes/estadisticas.js)
export const ESTADOS = {
  confirmado: { etiqueta: 'Confirmó', clase: 'confirmado' },
  visto: { etiqueta: 'Abrió, sin confirmar', clase: 'visto' },
  pendiente: { etiqueta: 'Sin abrir', clase: 'pendiente' }
};

export const formatearFecha = (fecha) =>
  new Date(fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });

export const formatearFechaHora = (fecha) =>
  new Date(fecha).toLocaleString('es-MX', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit'
  });

// Saber si el usuario de la sesión tiene un permiso (lo guarda LoginView en localStorage)
export const usuarioTienePermiso = (permiso) => {
  try {
    const usuario = JSON.parse(localStorage.getItem('usuario'));
    return Array.isArray(usuario?.permisos) && usuario.permisos.includes(permiso);
  } catch {
    return false;
  }
};

// Meta de confirmación (%) mientras llega la que está guardada en la BD (GET /api/estadisticas/meta)
// Un departamento con menos confirmación que la meta se marca como "Bajo meta"
export const META_POR_DEFECTO = 80;

// Periodos del filtro: días hacia atrás (null = todo el historial) y cómo se dicen en una frase
export const PERIODOS = [
  { id: '7', nombre: 'Últimos 7 días', frase: 'en los últimos 7 días', dias: 7 },
  { id: '30', nombre: 'Últimos 30 días', frase: 'en los últimos 30 días', dias: 30 },
  { id: '90', nombre: 'Últimos 90 días', frase: 'en los últimos 90 días', dias: 90 },
  { id: 'todo', nombre: 'Todo el historial', frase: 'en todo el historial', dias: null }
];

// Fecha AAAA-MM-DD de hace "dias" días (con la hora local, no UTC), o null para "todo"
export const fechaDesde = (dias) => {
  if (dias === null) return null;
  const f = new Date();
  f.setDate(f.getDate() - dias);
  const dosDigitos = (n) => String(n).padStart(2, '0');
  return `${f.getFullYear()}-${dosDigitos(f.getMonth() + 1)}-${dosDigitos(f.getDate())}`;
};

// Horas promedio de confirmación en texto corto: "45 min", "5.2 h" o "3.1 días"
export const formatearHoras = (horas) => {
  if (horas === null || horas === undefined) return '—';
  if (horas < 1) return `${Math.max(1, Math.round(horas * 60))} min`;
  if (horas < 48) return `${horas.toFixed(1)} h`;
  return `${(horas / 24).toFixed(1)} días`;
};
