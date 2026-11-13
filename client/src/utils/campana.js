// Campana de notificaciones (GET /api/anuncios/notificaciones, migración 015)
// Estado compartido: lo usan AppHeader (contador rojo) y NotificationsDrawer (lista),
// que se montan por separado en cada pantalla.
//   - avisos:    avisos que el usuario no ha abierto (máximo 20, los más recientes)
//   - nuevas:    cuántos se publicaron desde la última vez que tocó "Marcar todas como leídas"
//   - sinAbrir:  total de avisos sin abrir (puede ser mayor que la lista)
import { ref } from 'vue';
import { apiFetch } from '../api';

export const campana = ref({ avisos: [], nuevas: 0, sinAbrir: 0, cargando: false, error: '' });

// Cada pantalla vuelve a montar el encabezado; para no consultar en cada cambio de
// pantalla, se reutiliza la respuesta por unos segundos (salvo que se pida forzar).
const VIGENCIA_MS = 20 * 1000;
let ultimaCarga = 0;
let tokenCargado = null;
// Avisos abiertos en esta sesión cuya visita quizá todavía no registra el servidor
const abiertos = new Set();

export const cargarCampana = async (forzar = false) => {
  const token = localStorage.getItem('token');
  if (!token) return;
  // Si cambió la sesión (otra persona en un equipo compartido), no se muestran los avisos del anterior
  if (token !== tokenCargado) {
    campana.value = { avisos: [], nuevas: 0, sinAbrir: 0, cargando: false, error: '' };
    abiertos.clear();
    tokenCargado = token;
    forzar = true;
  }
  if (!forzar && Date.now() - ultimaCarga < VIGENCIA_MS) return;
  ultimaCarga = Date.now();

  campana.value.cargando = true;
  campana.value.error = '';
  try {
    const res = await apiFetch('/api/anuncios/notificaciones');
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'No se pudieron cargar las notificaciones');
    // Una respuesta que salió antes de que se registrara la visita puede traer un aviso
    // que el usuario acaba de abrir: se quita aquí y se descuenta de los contadores.
    // La respuesta es de una sola consulta, así que lista y contadores son coherentes.
    let { avisos, nuevas, sin_abrir: sinAbrir } = data;
    for (const aviso of avisos.filter((a) => abiertos.has(a.id_anu))) {
      sinAbrir -= 1;
      if (aviso.nueva) nuevas -= 1;
    }
    // Los que el servidor ya no manda ya quedaron registrados como vistos
    for (const id of abiertos) if (!avisos.some((a) => a.id_anu === id)) abiertos.delete(id);
    campana.value.avisos = avisos.filter((a) => !abiertos.has(a.id_anu));
    campana.value.nuevas = Math.max(0, nuevas);
    campana.value.sinAbrir = Math.max(0, sinAbrir);
  } catch (error) {
    campana.value.error = error.message;
    ultimaCarga = 0; // reintentar en la siguiente pantalla
  } finally {
    campana.value.cargando = false;
  }
};

// Al abrir un aviso desde la campana se quita de la lista sin esperar al servidor
// (el detalle lo registra como visto)
export const quitarDeCampana = (idAnu) => {
  abiertos.add(idAnu);
  const aviso = campana.value.avisos.find((a) => a.id_anu === idAnu);
  if (!aviso) return;
  campana.value.avisos = campana.value.avisos.filter((a) => a.id_anu !== idAnu);
  campana.value.sinAbrir = Math.max(0, campana.value.sinAbrir - 1);
  if (aviso.nueva) campana.value.nuevas = Math.max(0, campana.value.nuevas - 1);
  ultimaCarga = 0;
};

// "Marcar todas como leídas": quita el contador; los avisos siguen en la lista hasta abrirlos
export const marcarTodasLeidas = async () => {
  const res = await apiFetch('/api/anuncios/notificaciones/leidas', { method: 'POST' });
  if (!res.ok) throw new Error('No se pudieron marcar como leídas');
  campana.value.nuevas = 0;
  campana.value.avisos = campana.value.avisos.map((a) => ({ ...a, nueva: false }));
};

// "Hace 5 min", "Hace 3 h", "Ayer" o "12 nov"
export const tiempoRelativo = (fecha) => {
  const f = new Date(fecha);
  const minutos = Math.floor((Date.now() - f.getTime()) / 60000);
  if (minutos < 1) return 'Ahora';
  if (minutos < 60) return `Hace ${minutos} min`;
  const ayer = new Date();
  ayer.setDate(ayer.getDate() - 1);
  if (minutos < 24 * 60 && f.toDateString() === new Date().toDateString()) return `Hace ${Math.floor(minutos / 60)} h`;
  if (f.toDateString() === ayer.toDateString()) return 'Ayer';
  return f.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
};
