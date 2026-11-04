<template>
  <div class="dashboard-container">
    <AppHeader
      @toggle-menu="isMenuOpen = true"
      @toggle-notifications="isNotificationsOpen = true"
    />

    <main class="dashboard-main">
      <header class="page-header">
        <h2>Estadísticas de Avisos</h2>
        <p class="subtitle">Quién ha visto y confirmado los comunicados de Talento y Cultura</p>
      </header>

      <!-- Filtros: aplican a toda la pantalla -->
      <section class="filtros" aria-label="Filtros de estadísticas">
        <label class="campo">
          <span>Periodo</span>
          <select v-model="filtros.periodo">
            <option v-for="p in PERIODOS" :key="p.id" :value="p.id">{{ p.nombre }}</option>
          </select>
        </label>
        <label class="campo">
          <span>Categoría</span>
          <select v-model="filtros.categoria">
            <option value="">Todas</option>
            <option v-for="c in opciones.categorias" :key="c" :value="c">{{ c }}</option>
          </select>
        </label>
        <label class="campo">
          <span>Departamento</span>
          <select v-model="filtros.idDep">
            <option :value="null">Todos</option>
            <option v-for="d in opciones.departamentos" :key="d.id_dep" :value="d.id_dep">{{ d.nombre }}</option>
          </select>
        </label>
        <button v-if="hayFiltros" class="btn-limpiar" @click="limpiarFiltros">Limpiar filtros</button>
      </section>

      <div v-if="cargando" class="estado-box">
        <p>Cargando estadísticas...</p>
      </div>

      <div v-else-if="errorCarga" class="estado-box">
        <h3>No se pudieron cargar las estadísticas</h3>
        <p>{{ errorCarga }}</p>
        <button class="btn-outline" @click="cargarEstadisticas">Reintentar</button>
      </div>

      <div v-else-if="avisos.length === 0" class="estado-box">
        <h3>Sin avisos {{ textoPeriodo }}</h3>
        <p>Prueba con otro periodo o quita los filtros.</p>
      </div>

      <template v-else>
        <!-- 1. La respuesta en una frase -->
        <section class="resumen" :class="depsBajoMeta.length > 0 ? 'resumen-alerta' : 'resumen-ok'">
          <p class="resumen-frase">
            {{ capitalizar(textoPeriodo) }}
            <template v-if="nombreDepFiltro">, en {{ nombreDepFiltro }},</template>
            se confirmó el <strong>{{ resumen.pctConfirmados }}%</strong> de las lecturas.
            La meta es <strong>{{ meta }}%</strong>.
          </p>
          <p v-if="depsBajoMeta.length > 0" class="resumen-estado">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
            </svg>
            <span>
              {{ depsBajoMeta.length === 1 ? 'Va bajo la meta:' : `${depsBajoMeta.length} departamentos van bajo la meta:` }}
              <strong>{{ nombresBajoMeta }}</strong>
            </span>
          </p>
          <p v-else class="resumen-estado">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
            <span>Todos los departamentos están en meta.</span>
          </p>
        </section>

        <!-- 2. Números principales -->
        <section class="kpi-grid" aria-label="Números principales">
          <div class="kpi">
            <span class="kpi-label">Avisos publicados</span>
            <span class="kpi-valor">{{ avisos.length }}</span>
            <span class="kpi-detalle">para {{ resumen.destinatarios }} lecturas en total</span>
          </div>
          <div class="kpi">
            <span class="kpi-label">Lo abrieron</span>
            <span class="kpi-valor">{{ resumen.pctVistos }}%</span>
            <span class="kpi-detalle">{{ resumen.vistos }} de {{ resumen.destinatarios }} lecturas</span>
          </div>
          <div class="kpi">
            <span class="kpi-label">Confirmaron lectura</span>
            <span class="kpi-valor">{{ resumen.pctConfirmados }}%</span>
            <span class="kpi-detalle">{{ resumen.confirmados }} de {{ resumen.destinatarios }} lecturas</span>
          </div>
        </section>

        <details class="ayuda">
          <summary>¿Cómo se leen estos números?</summary>
          <ul>
            <li>
              <strong>Lectura:</strong> una persona que debía leer un aviso.
              Un aviso para 10 personas son 10 lecturas.
            </li>
            <li><strong>Lo abrieron:</strong> entraron a ver el aviso, aunque no lo hayan confirmado.</li>
            <li><strong>Confirmaron:</strong> pulsaron "Confirmar Lectura". Es el número que se compara con la meta.</li>
            <li>
              <strong>Bajo meta:</strong> el departamento confirma menos del % de la meta.
              La meta es la misma para todo Talento y Cultura; se cambia en "¿Qué departamento va bajo?".
            </li>
          </ul>
        </details>

        <!-- 3. ¿Qué departamento va bajo? -->
        <section v-if="departamentos.length > 0" class="card">
          <div class="card-header">
            <h3 class="card-title">¿Qué departamento va bajo?</h3>
            <MetaConfirmacion :datos="datosMeta" editable @actualizada="datosMeta = $event" />
          </div>
          <RankingDepartamentos
            :departamentos="departamentos"
            :meta="meta"
            :seleccionado="filtros.idDep"
            seleccionable
            @seleccionar="alternarDepartamento"
          />
        </section>

        <!-- 4. Avisos -->
        <section class="card">
          <div class="card-header">
            <h3 class="card-title">Avisos</h3>
            <span v-if="nombreDepFiltro" class="card-ayuda">Contando solo a {{ nombreDepFiltro }}</span>
          </div>

          <div class="toolbar">
            <input
              v-model="busqueda"
              class="input-busqueda"
              type="search"
              placeholder="Buscar aviso por título..."
              aria-label="Buscar aviso por título"
            />
            <nav class="filter-bar" aria-label="Filtros de la lista">
              <button
                v-for="filtro in listaFiltros"
                :key="filtro.id"
                class="filter-chip"
                :class="{ active: filtroLista === filtro.id }"
                @click="filtroLista = filtro.id"
              >
                {{ filtro.nombre }}
              </button>
            </nav>
          </div>

          <div v-if="avisosFiltrados.length > 0" class="lista">
            <button
              v-for="aviso in avisosFiltrados"
              :key="aviso.id_anu"
              class="fila-aviso"
              @click="verDetalle(aviso)"
            >
              <div class="fila-top">
                <div class="fila-titulo">
                  <span v-if="aviso.urgente" class="badge badge-urgente">Urgente</span>
                  <h3>{{ aviso.titulo }}</h3>
                </div>
                <span class="fila-pct">{{ porcentaje(aviso.confirmados, aviso.destinatarios) }}% confirmó</span>
              </div>
              <p class="fila-meta">
                {{ aviso.categoria }} · Para: {{ aviso.destino }} · {{ formatearFecha(aviso.fecha_creacion) }}
              </p>
              <BarraAlcance
                :destinatarios="aviso.destinatarios"
                :vistos="aviso.vistos"
                :confirmados="aviso.confirmados"
                leyenda
              />
              <span class="fila-ver">Ver quiénes faltan →</span>
            </button>
          </div>
          <p v-else class="sin-resultados">No hay avisos que coincidan con la búsqueda.</p>
        </section>
      </template>
    </main>

    <SidebarMenu :is-open="isMenuOpen" @close="isMenuOpen = false" />
    <NotificationsDrawer :is-open="isNotificationsOpen" @close="isNotificationsOpen = false" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { apiFetch } from '../api';
import {
  porcentaje,
  formatearFecha,
  fechaDesde,
  PERIODOS,
  META_POR_DEFECTO
} from '../utils/estadisticas';
import AppHeader from '../components/AppHeader.vue';
import SidebarMenu from '../components/SidebarMenu.vue';
import NotificationsDrawer from '../components/NotificationsDrawer.vue';
import BarraAlcance from '../components/BarraAlcance.vue';
import RankingDepartamentos from '../components/RankingDepartamentos.vue';
import MetaConfirmacion from '../components/MetaConfirmacion.vue';

const router = useRouter();

const isMenuOpen = ref(false);
const isNotificationsOpen = ref(false);

const avisos = ref([]);
const departamentos = ref([]);
const opciones = ref({ categorias: [], departamentos: [] });
const cargando = ref(false);
const errorCarga = ref('');

// Filtros que se mandan al servidor
const FILTROS_INICIALES = { periodo: '30', categoria: '', idDep: null };
const filtros = reactive({ ...FILTROS_INICIALES });

// Meta de confirmación compartida (GET/PUT /api/estadisticas/meta).
// Solo cambia lo que se marca como "Bajo meta", no hace falta volver a consultar los avisos.
const datosMeta = ref({ meta: META_POR_DEFECTO, actualizado_por: null, fecha_actualizacion: null });
const meta = computed(() => datosMeta.value.meta);

// Filtros de la lista de avisos (solo en pantalla)
const busqueda = ref('');
const filtroLista = ref('todos');
const listaFiltros = [
  { id: 'todos', nombre: 'Todos' },
  { id: 'pendientes', nombre: 'Con pendientes' },
  { id: 'urgentes', nombre: 'Urgentes' }
];

// Armar "?desde=...&categoria=...&id_dep=..." con los filtros que tengan valor
const queryFiltros = () => {
  const params = new URLSearchParams();
  const periodo = PERIODOS.find(p => p.id === filtros.periodo);
  const desde = fechaDesde(periodo?.dias ?? null);
  if (desde) params.set('desde', desde);
  if (filtros.categoria) params.set('categoria', filtros.categoria);
  if (filtros.idDep) params.set('id_dep', filtros.idDep);
  const texto = params.toString();
  return texto ? `?${texto}` : '';
};

// Pedir a la API y regresar el JSON, o lanzar el mensaje de error
const pedir = async (ruta) => {
  const res = await apiFetch(ruta);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al consultar las estadísticas');
  return data;
};

const cargarEstadisticas = async () => {
  cargando.value = true;
  errorCarga.value = '';
  const query = queryFiltros();
  try {
    const [listaAvisos, listaDeps] = await Promise.all([
      pedir(`/api/estadisticas/avisos${query}`),
      pedir(`/api/estadisticas/departamentos${query}`)
    ]);
    avisos.value = listaAvisos;
    departamentos.value = listaDeps;
  } catch (error) {
    console.error('Error al cargar estadísticas:', error);
    errorCarga.value = error instanceof TypeError ? 'No se pudo conectar con el servidor' : error.message;
  } finally {
    cargando.value = false;
  }
};

const cargarOpciones = async () => {
  try {
    opciones.value = await pedir('/api/estadisticas/filtros');
  } catch (error) {
    // Sin opciones los filtros de categoría y departamento solo quedan en "Todos"
    console.error('Error al cargar filtros:', error);
  }
};

const cargarMeta = async () => {
  try {
    datosMeta.value = await pedir('/api/estadisticas/meta');
  } catch (error) {
    // Si falla se queda la meta por defecto
    console.error('Error al cargar la meta:', error);
  }
};

watch(() => [filtros.periodo, filtros.categoria, filtros.idDep], cargarEstadisticas);

const hayFiltros = computed(() =>
  Object.keys(FILTROS_INICIALES).some(k => filtros[k] !== FILTROS_INICIALES[k])
);

const limpiarFiltros = () => Object.assign(filtros, FILTROS_INICIALES);

// Tocar un departamento en el ranking lo filtra; tocarlo otra vez quita el filtro
const alternarDepartamento = (idDep) => {
  filtros.idDep = filtros.idDep === idDep ? null : idDep;
};

const nombreDepFiltro = computed(() =>
  opciones.value.departamentos.find(d => d.id_dep === filtros.idDep)?.nombre || ''
);

// Periodo en texto para las frases: "en los últimos 30 días" / "en todo el historial"
const textoPeriodo = computed(() =>
  PERIODOS.find(p => p.id === filtros.periodo)?.frase || 'en todo el historial'
);

const capitalizar = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1);

// Totales de todos los avisos juntos. Una "lectura" es una persona que debía leer un aviso.
const resumen = computed(() => {
  const sumar = (campo) => avisos.value.reduce((total, a) => total + a[campo], 0);
  const destinatarios = sumar('destinatarios');
  const vistos = sumar('vistos');
  const confirmados = sumar('confirmados');
  return {
    destinatarios,
    vistos,
    confirmados,
    pctVistos: porcentaje(vistos, destinatarios),
    pctConfirmados: porcentaje(confirmados, destinatarios)
  };
});

// La API los manda del más bajo al más alto, así que la lista ya sale en ese orden
const depsBajoMeta = computed(() =>
  departamentos.value.filter(d => porcentaje(d.confirmados, d.envios) < meta.value)
);

const nombresBajoMeta = computed(() =>
  depsBajoMeta.value
    .map(d => `${d.departamento} (${porcentaje(d.confirmados, d.envios)}%)`)
    .join(', ')
);

const avisosFiltrados = computed(() => {
  const texto = busqueda.value.trim().toLowerCase();
  return avisos.value.filter(a => {
    if (texto && !a.titulo.toLowerCase().includes(texto)) return false;
    if (filtroLista.value === 'pendientes') return a.confirmados < a.destinatarios;
    if (filtroLista.value === 'urgentes') return a.urgente;
    return true;
  });
});

const verDetalle = (aviso) => {
  // Si hay filtro de departamento, el detalle abre ya filtrado
  const query = nombreDepFiltro.value ? { departamento: nombreDepFiltro.value } : {};
  router.push({ path: `/estadisticas/${aviso.id_anu}`, query });
};

onMounted(() => {
  cargarOpciones();
  cargarMeta();
  cargarEstadisticas();
});
</script>

<style scoped>
.dashboard-container {
  min-height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

.dashboard-main {
  flex: 1;
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
  padding: 1.5rem 1.25rem 2.5rem;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.page-header h2 {
  font-size: 1.6rem;
  font-weight: 700;
  margin: 0;
}

.subtitle {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0.2rem 0 0 0;
}

/* Tarjetas de resumen */
.kpi-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
}

@media (min-width: 640px) {
  .kpi-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.kpi {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding: 1rem 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.kpi-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.kpi-valor {
  font-size: 1.9rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--text-primary);
}

.kpi-detalle {
  font-size: 0.78rem;
  color: var(--text-secondary);
}

/* Búsqueda y filtros */
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
}

.input-busqueda {
  flex: 1 1 240px;
  padding: 0.6rem 0.9rem;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  background: var(--bg-input);
  color: var(--text-primary);
  font-size: 0.9rem;
}

.filter-bar {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
}

.filter-chip {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  padding: 0.45rem 1rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.filter-chip.active {
  background: var(--brand-primary);
  color: #ffffff;
  border-color: var(--brand-primary);
}

/* Lista de avisos */
.lista {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.fila-aviso {
  width: 100%;
  text-align: left;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding: 1rem 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  cursor: pointer;
  color: inherit;
  font: inherit;
  transition: border-color 0.2s ease, transform 0.2s ease;
}

.fila-aviso:hover {
  border-color: var(--brand-primary);
  transform: translateY(-1px);
}

.fila-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
}

.fila-titulo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.fila-titulo h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  overflow-wrap: anywhere;
}

.fila-pct {
  font-size: 0.85rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.fila-meta {
  margin: 0;
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.badge {
  color: #ffffff;
  padding: 0.15rem 0.55rem;
  border-radius: 20px;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  white-space: nowrap;
}

.badge-urgente { background-color: #dc2626; }

/* Estados de carga, error y vacío */
.estado-box {
  text-align: center;
  padding: 3rem 1.5rem;
  background: var(--bg-surface);
  border-radius: 16px;
  border: 1px solid var(--border-color);
}

.estado-box h3 {
  font-size: 1.1rem;
  margin: 0 0 0.25rem 0;
}

.estado-box p {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin: 0 0 0.75rem 0;
}

.btn-outline {
  background-color: var(--bg-primary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

/* Barra de filtros */
.filtros {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.75rem;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding: 0.85rem 1rem;
}

.campo {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1 1 150px;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.campo select {
  padding: 0.5rem 0.6rem;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-input);
  color: var(--text-primary);
  font-size: 0.85rem;
}

.btn-limpiar {
  background: none;
  border: none;
  color: var(--brand-primary);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0.5rem 0.25rem;
}

/* Secciones */
.card {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 1.1rem 1.25rem;
}

.card-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.25rem 1rem;
  margin-bottom: 0.85rem;
}

.card-title {
  font-size: 1rem;
  font-weight: 700;
  margin: 0;
}

.card-ayuda {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.card .toolbar {
  margin-bottom: 0.75rem;
}

/* Dentro de la tarjeta, los avisos van como filas con borde suave */
.card .fila-aviso {
  background: var(--bg-primary);
}

.sin-resultados {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

/* Resumen en una frase */
.resumen {
  border-radius: 16px;
  padding: 1.1rem 1.25rem;
  border: 1px solid var(--border-color);
  background: var(--bg-surface);
}

.resumen-alerta {
  border-color: var(--tint-red-border);
}

.resumen-ok {
  border-color: var(--tint-green-border);
}

.resumen-frase {
  margin: 0;
  font-size: 1.05rem;
  line-height: 1.5;
}

.resumen-estado {
  display: flex;
  align-items: flex-start;
  gap: 0.45rem;
  margin: 0.6rem 0 0;
  padding: 0.55rem 0.75rem;
  border-radius: 10px;
  font-size: 0.9rem;
}

.resumen-estado svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  margin-top: 1px;
}

.resumen-alerta .resumen-estado {
  background: var(--tint-red-bg);
  color: var(--color-danger);
}

.resumen-ok .resumen-estado {
  background: var(--tint-green-bg);
  color: var(--tint-green-text);
}

/* Ayuda desplegable */
.ayuda {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.ayuda summary {
  cursor: pointer;
  font-weight: 600;
  color: var(--brand-primary);
  width: fit-content;
}

.ayuda ul {
  margin: 0.5rem 0 0;
  padding-left: 1.2rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.ayuda strong {
  color: var(--text-primary);
}

.fila-ver {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--brand-primary);
}
</style>
