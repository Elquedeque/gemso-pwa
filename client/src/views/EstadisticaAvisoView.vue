<template>
  <div class="dashboard-container">
    <AppHeader
      @toggle-menu="isMenuOpen = true"
      @toggle-notifications="isNotificationsOpen = true"
    />

    <main class="dashboard-main">
      <button class="back-link" @click="router.push('/estadisticas')">
        <svg viewBox="0 0 24 24" class="back-icon">
          <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor"/>
        </svg>
        <span>Volver a Estadísticas</span>
      </button>

      <div v-if="cargando" class="estado-box">
        <p>Cargando estadísticas del aviso...</p>
      </div>

      <div v-else-if="errorCarga" class="estado-box">
        <h3>{{ errorCarga }}</h3>
        <button class="btn-outline" @click="cargarDetalle">Reintentar</button>
      </div>

      <template v-else-if="detalle">
        <!-- Encabezado del aviso -->
        <header class="aviso-header">
          <span class="section-label">{{ detalle.urgente ? 'Aviso Urgente' : 'Aviso' }} · {{ detalle.categoria }}</span>
          <h1>{{ detalle.titulo }}</h1>
          <p class="aviso-meta">
            {{ detalle.autor }} · Para: {{ detalle.destino }} · {{ formatearFecha(detalle.fecha_creacion) }}
          </p>
        </header>

        <!-- Filtro por departamento (solo si el aviso llegó a más de uno) -->
        <section v-if="detalle.por_departamento.length > 1" class="filtros">
          <label class="campo">
            <span>Departamento</span>
            <select v-model="depFiltro">
              <option value="">Todos</option>
              <option v-for="d in detalle.por_departamento" :key="d.departamento" :value="d.departamento">
                {{ d.departamento }} ({{ d.destinatarios }})
              </option>
            </select>
          </label>
          <span v-if="depFiltro" class="filtros-nota">Mostrando solo a {{ depFiltro }}</span>
        </section>

        <!-- Resumen -->
        <section class="kpi-grid" aria-label="Resumen del aviso">
          <div class="kpi">
            <span class="kpi-label">Destinatarios</span>
            <span class="kpi-valor">{{ totales.destinatarios }}</span>
          </div>
          <div class="kpi">
            <span class="kpi-label">Lo abrieron</span>
            <span class="kpi-valor">{{ porcentaje(totales.vistos, totales.destinatarios) }}%</span>
            <span class="kpi-detalle">{{ totales.vistos }} de {{ totales.destinatarios }} personas</span>
          </div>
          <div class="kpi">
            <span class="kpi-label">Confirmaron lectura</span>
            <span class="kpi-valor">{{ porcentaje(totales.confirmados, totales.destinatarios) }}%</span>
            <span class="kpi-detalle">{{ totales.confirmados }} de {{ totales.destinatarios }} personas · meta {{ datosMeta.meta }}%</span>
          </div>
        </section>

        <section class="card">
          <h2 class="card-title">Alcance</h2>
          <BarraAlcance
            :destinatarios="totales.destinatarios"
            :vistos="totales.vistos"
            :confirmados="totales.confirmados"
            leyenda
          />
        </section>

        <!-- Avance por departamento (solo tiene sentido si hay más de uno) -->
        <section v-if="detalle.por_departamento.length > 1" class="card">
          <div class="card-header">
            <h2 class="card-title">¿Qué departamento va bajo?</h2>
            <MetaConfirmacion :datos="datosMeta" />
          </div>
          <RankingDepartamentos
            :departamentos="departamentosRanking"
            :meta="datosMeta.meta"
            :seleccionado="depFiltro || null"
            seleccionable
            @seleccionar="alternarDepartamento"
          />
        </section>

        <!-- Lista de personas -->
        <section class="card">
          <h2 class="card-title">Personas</h2>

          <div class="toolbar">
            <input
              v-model="busqueda"
              class="input-busqueda"
              type="search"
              placeholder="Buscar por nombre..."
              aria-label="Buscar persona por nombre"
            />
            <nav class="filter-bar" aria-label="Filtrar por estado">
              <button
                v-for="filtro in filtros"
                :key="filtro.id"
                class="filter-chip"
                :class="{ active: filtroActivo === filtro.id }"
                @click="filtroActivo = filtro.id"
              >
                {{ filtro.nombre }} ({{ filtro.total }})
              </button>
            </nav>
          </div>

          <ul v-if="personasFiltradas.length > 0" class="personas">
            <li v-for="p in personasFiltradas" :key="p.id_usu" class="persona">
              <div class="persona-datos">
                <span class="persona-nombre">{{ p.nombre_completo }}</span>
                <span class="persona-meta">
                  {{ [p.puesto, p.departamento].filter(Boolean).join(' · ') }}
                </span>
              </div>
              <div class="persona-estado">
                <span class="estado" :class="ESTADOS[p.estado].clase">
                  <span class="muestra"></span>{{ ESTADOS[p.estado].etiqueta }}
                </span>
                <span v-if="p.estado === 'confirmado'" class="persona-fecha">
                  {{ formatearFechaHora(p.fecha_leido) }}
                </span>
                <span v-else-if="p.estado === 'visto'" class="persona-fecha">
                  {{ formatearFechaHora(p.fecha_visto) }}
                </span>
              </div>
            </li>
          </ul>
          <p v-else class="sin-resultados">Nadie coincide con la búsqueda o el filtro.</p>
        </section>
      </template>
    </main>

    <SidebarMenu :is-open="isMenuOpen" @close="isMenuOpen = false" />
    <NotificationsDrawer :is-open="isNotificationsOpen" @close="isNotificationsOpen = false" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { apiFetch } from '../api';
import { porcentaje, ESTADOS, formatearFecha, formatearFechaHora, META_POR_DEFECTO } from '../utils/estadisticas';
import AppHeader from '../components/AppHeader.vue';
import SidebarMenu from '../components/SidebarMenu.vue';
import NotificationsDrawer from '../components/NotificationsDrawer.vue';
import BarraAlcance from '../components/BarraAlcance.vue';
import RankingDepartamentos from '../components/RankingDepartamentos.vue';
import MetaConfirmacion from '../components/MetaConfirmacion.vue';

const route = useRoute();
const router = useRouter();

const isMenuOpen = ref(false);
const isNotificationsOpen = ref(false);

const detalle = ref(null);
const cargando = ref(false);
const errorCarga = ref('');
const busqueda = ref('');
const filtroActivo = ref('todos');

// Departamento elegido (por nombre). Puede llegar desde la lista: /estadisticas/5?departamento=TI
const depFiltro = ref(typeof route.query.departamento === 'string' ? route.query.departamento : '');

// Meta compartida de Talento y Cultura; aquí solo se muestra, se cambia en la pantalla de Estadísticas
const datosMeta = ref({ meta: META_POR_DEFECTO, actualizado_por: null, fecha_actualizacion: null });

const cargarMeta = async () => {
  try {
    const res = await apiFetch('/api/estadisticas/meta');
    if (res.ok) datosMeta.value = await res.json();
  } catch (error) {
    // Si falla se queda la meta por defecto
    console.error('Error al cargar la meta:', error);
  }
};

const cargarDetalle = async () => {
  cargando.value = true;
  errorCarga.value = '';
  try {
    const res = await apiFetch(`/api/estadisticas/avisos/${route.params.id}`);
    const data = await res.json();
    if (!res.ok) {
      errorCarga.value = data.error || 'No se pudieron cargar las estadísticas';
      return;
    }
    detalle.value = data;
    // Si el departamento que llegó en la URL no recibió este aviso, se quita el filtro
    if (!data.por_departamento.some(d => d.departamento === depFiltro.value)) depFiltro.value = '';
  } catch (error) {
    console.error('Error al cargar estadísticas del aviso:', error);
    errorCarga.value = 'No se pudo conectar con el servidor';
  } finally {
    cargando.value = false;
  }
};

// Personas del departamento elegido (o todas)
const personasDep = computed(() =>
  (detalle.value?.personas || []).filter(p => !depFiltro.value || p.departamento === depFiltro.value)
);

// Totales para los KPIs y la barra, ya con el filtro de departamento
const totales = computed(() => ({
  destinatarios: personasDep.value.length,
  vistos: personasDep.value.filter(p => p.estado !== 'pendiente').length,
  confirmados: personasDep.value.filter(p => p.estado === 'confirmado').length
}));

// Tocar un departamento en el ranking lo filtra; tocarlo otra vez quita el filtro
const alternarDepartamento = (nombre) => {
  depFiltro.value = depFiltro.value === nombre ? '' : nombre;
};

// Filtros por estado, cada uno con cuántas personas tiene
const filtros = computed(() => {
  const personas = personasDep.value;
  const contar = (estado) => personas.filter(p => p.estado === estado).length;
  return [
    { id: 'todos', nombre: 'Todos', total: personas.length },
    { id: 'pendiente', nombre: 'Sin abrir', total: contar('pendiente') },
    { id: 'visto', nombre: 'Abrieron sin confirmar', total: contar('visto') },
    { id: 'confirmado', nombre: 'Confirmaron', total: contar('confirmado') }
  ];
});

// El ranking usa "envios" (lecturas esperadas); en un solo aviso son sus destinatarios.
// Aquí el departamento se identifica por su nombre.
const departamentosRanking = computed(() =>
  (detalle.value?.por_departamento || []).map(d => ({ ...d, id_dep: d.departamento, envios: d.destinatarios }))
);

const personasFiltradas = computed(() => {
  const texto = busqueda.value.trim().toLowerCase();
  return personasDep.value.filter(p => {
    if (filtroActivo.value !== 'todos' && p.estado !== filtroActivo.value) return false;
    return !texto || p.nombre_completo.toLowerCase().includes(texto);
  });
});

onMounted(() => {
  cargarMeta();
  cargarDetalle();
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

.back-link {
  align-self: flex-start;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: none;
  border: none;
  color: var(--brand-primary);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}

.back-icon {
  width: 18px;
  height: 18px;
}

.aviso-header h1 {
  font-size: 1.5rem;
  margin: 0.25rem 0;
  overflow-wrap: anywhere;
}

.section-label {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-secondary);
}

.aviso-meta {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
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
}

.kpi-detalle {
  font-size: 0.78rem;
  color: var(--text-secondary);
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

.card-header .card-title {
  margin: 0;
}

/* Filtro por departamento */
.filtros {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.5rem 1rem;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding: 0.85rem 1rem;
}

.campo {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 0 1 260px;
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

.filtros-nota {
  font-size: 0.8rem;
  color: var(--text-secondary);
  padding-bottom: 0.5rem;
}

.card-title {
  font-size: 1rem;
  font-weight: 700;
  margin: 0 0 0.85rem 0;
}

/* Búsqueda y filtros */
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 0.75rem;
}

.input-busqueda {
  flex: 1 1 220px;
  padding: 0.55rem 0.9rem;
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
  padding: 0.4rem 0.9rem;
  border-radius: 20px;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.filter-chip.active {
  background: var(--brand-primary);
  color: #ffffff;
  border-color: var(--brand-primary);
}

/* Lista de personas */
.personas {
  list-style: none;
  margin: 0;
  padding: 0;
}

.persona {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 0;
  border-bottom: 1px solid var(--border-color);
}

.persona:last-child {
  border-bottom: none;
}

.persona-datos,
.persona-estado {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.persona-estado {
  align-items: flex-end;
  flex-shrink: 0;
}

.persona-nombre {
  font-weight: 600;
  font-size: 0.9rem;
  overflow-wrap: anywhere;
}

.persona-meta,
.persona-fecha {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

/* Estado: muestra de color + texto (el color nunca va solo) */
.estado {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
}

.muestra {
  width: 10px;
  height: 10px;
  border-radius: 3px;
}

.estado.confirmado .muestra { background-color: var(--chart-confirmado); }
.estado.visto .muestra { background-color: var(--chart-visto); }
.estado.pendiente .muestra { background-color: var(--chart-pendiente); }

.sin-resultados {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

/* Estados de carga y error */
.estado-box {
  text-align: center;
  padding: 3rem 1.5rem;
  background: var(--bg-surface);
  border-radius: 16px;
  border: 1px solid var(--border-color);
}

.estado-box h3 {
  font-size: 1.1rem;
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
</style>
