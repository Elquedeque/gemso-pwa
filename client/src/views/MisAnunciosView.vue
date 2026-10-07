<template>
  <div class="dashboard-container">
    <!-- Header Reutilizable -->
    <AppHeader 
      @toggle-menu="isMenuOpen = true" 
      @toggle-notifications="isNotificationsOpen = true" 
    />

    <!-- Contenido Principal -->
    <main class="dashboard-main">
      <header class="page-header">
        <div class="header-title">
          <h2>Mis Avisos</h2>
          <p class="subtitle">Comunicados e informativos oficiales de la organización</p>
        </div>

        <!-- Accion Condicional para T&C / Creadores -->
        <button 
          v-if="esUsuarioTyC" 
          class="btn-create-announcement" 
          @click="crearAviso"
        >
          <svg class="btn-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
          <span>Nuevo Aviso</span>
        </button>
      </header>

      <!-- Barra de Filtros Categorizados -->
      <nav class="filter-bar" aria-label="Filtros de avisos">
        <button 
          v-for="filtro in listaFiltros" 
          :key="filtro.id" 
          class="filter-chip" 
          :class="{ active: filtroActivo === filtro.id }"
          @click="filtroActivo = filtro.id"
        >
          {{ filtro.nombre }}
        </button>
      </nav>

      <!-- Grid Responsivo de Avisos -->
      <section class="avisos-grid">
        <article 
          v-for="aviso in avisosFiltrados" 
          :key="aviso.id" 
          class="aviso-card"
          :class="{ 'card-read': aviso.leido }"
        >
          <!-- Barra Superior: Categoria + Icono Adjunto -->
          <div class="card-top-bar">
            <span class="badge" :class="aviso.categoriaClase">
              {{ aviso.categoria }}
            </span>
            
            <div v-if="aviso.tieneAdjunto" class="attachment-badge" title="Tiene archivo adjunto">
              <svg viewBox="0 0 24 24" class="svg-icon" fill="currentColor">
                <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/>
              </svg>
              <span>Adjunto</span>
            </div>
          </div>

          <!-- Cuerpo Central: Icono Megáfono y Título -->
          <div class="card-body">
            <div class="megaphone-wrapper">
              <svg viewBox="0 0 24 24" class="megaphone-icon" fill="currentColor">
                <path d="M20 12l-8.5-6v12L20 12zM4 9v6h4l5 5V4L8 9H4z"/>
              </svg>
            </div>
            <h3 class="aviso-title">{{ aviso.titulo }}</h3>
          </div>

          <!-- Acciones Inferiores -->
          <div class="card-actions">
            <button class="btn-action btn-outline" @click="verDetalleAviso(aviso)">
              Ver Más
            </button>

            <button 
              class="btn-action btn-solid" 
              :class="{ 'btn-read': aviso.leido }"
              @click="confirmarLectura(aviso)"
            >
              <svg v-if="aviso.leido" class="check-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
              <span>{{ aviso.leido ? 'Confirmado' : 'Confirmar Lectura' }}</span>
            </button>
          </div>
        </article>
      </section>

      <!-- Estado Vacío -->
      <div v-if="avisosFiltrados.length === 0" class="empty-state">
        <svg class="empty-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 12l-8.5-6v12L20 12zM4 9v6h4l5 5V4L8 9H4z"/>
        </svg>
        <h3>Sin avisos por el momento</h3>
        <p>No se encontraron avisos o comunicados en esta categoría.</p>
      </div>
    </main>

    <!-- Sidebar Menu y Drawer de Notificaciones -->
    <SidebarMenu :is-open="isMenuOpen" @close="isMenuOpen = false" />
    <NotificationsDrawer :is-open="isNotificationsOpen" @close="isNotificationsOpen = false" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import AppHeader from '../components/AppHeader.vue';
import SidebarMenu from '../components/SidebarMenu.vue';
import NotificationsDrawer from '../components/NotificationsDrawer.vue';

const router = useRouter();

const isMenuOpen = ref(false);
const isNotificationsOpen = ref(false);
const esUsuarioTyC = ref(false);
const filtroActivo = ref('todos');

const listaFiltros = [
  { id: 'todos', nombre: 'Todos' },
  { id: 'area', nombre: 'Mi Área' },
  { id: 'globales', nombre: 'Globales' },
  { id: 'urgentes', nombre: 'Urgentes' }
];

const listaAvisos = ref([
  {
    id: 1,
    titulo: 'Mantenimiento en Servidores de red el Fin de Semana',
    categoria: 'Urgente',
    categoriaClase: 'badge-urgente',
    tipo: 'urgentes',
    tieneAdjunto: true,
    leido: false
  },
  {
    id: 2,
    titulo: 'Nueva Encuesta de Clima Organizacional 2026',
    categoria: 'T&C',
    categoriaClase: 'badge-tyc',
    tipo: 'area',
    tieneAdjunto: true,
    leido: false
  },
  {
    id: 3,
    titulo: 'Mensaje de Dirección General - Q3',
    categoria: 'Gerente',
    categoriaClase: 'badge-gerente',
    tipo: 'globales',
    tieneAdjunto: false,
    leido: true
  }
]);

const avisosFiltrados = computed(() => {
  if (filtroActivo.value === 'todos') {
    return listaAvisos.value;
  }
  return listaAvisos.value.filter(item => item.tipo === filtroActivo.value);
});

const confirmarLectura = (aviso) => {
  aviso.leido = !aviso.leido;
};

const verDetalleAviso = (aviso) => {
  router.push(`/mis-avisos/${aviso.id}`);
};

const crearAviso = () => {
  router.push('/crear-aviso');
};

onMounted(() => {
  const sesion = localStorage.getItem('usuario');
  if (sesion) {
    const user = JSON.parse(sesion);
    esUsuarioTyC.value = user.rol === 'TyC' || user.departamento === 'RRHH' || user.esCreador;
  } else {
    esUsuarioTyC.value = true; 
  }
});
</script>

<style scoped>
.dashboard-container {
  min-height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-primary, #f8fafc);
  color: var(--text-primary, #0f172a);
}

.dashboard-main {
  flex: 1;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 1.5rem 1.25rem 2.5rem;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* Page Header con acción integrada */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.page-header h2 {
  font-size: 1.6rem;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary, #0f172a);
}

.subtitle {
  font-size: 0.875rem;
  color: var(--text-secondary, #64748b);
  margin: 0.2rem 0 0 0;
}

.btn-create-announcement {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background-color: var(--brand-primary, #000080);
  color: #ffffff;
  border: none;
  padding: 0.6rem 1.1rem;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s ease, transform 0.2s ease;
  white-space: nowrap;
}

.btn-create-announcement:hover {
  opacity: 0.92;
  transform: translateY(-1px);
}

.btn-icon {
  width: 18px;
  height: 18px;
}

/* Filtros Chips */
.filter-bar {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  padding-bottom: 0.25rem;
}

.filter-chip {
  background: var(--bg-surface, #ffffff);
  border: 1px solid var(--border-color, #cbd5e1);
  color: var(--text-secondary, #64748b);
  padding: 0.45rem 1rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.filter-chip:hover {
  border-color: var(--brand-primary, #000080);
  color: var(--brand-primary, #000080);
}

.filter-chip.active {
  background: var(--brand-primary, #000080);
  color: #ffffff;
  border-color: var(--brand-primary, #000080);
}

/* Grid Adaptativo */
.avisos-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.25rem;
}

@media (min-width: 640px) {
  .avisos-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .avisos-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* Tarjeta de Aviso */
.aviso-card {
  background: var(--bg-surface, #ffffff);
  border-radius: 16px;
  padding: 1.25rem;
  border: 1px solid var(--border-color, #e2e8f0);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 1.25rem;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.aviso-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.06);
}

.aviso-card.card-read {
  opacity: 0.85;
}

.card-top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* Badges */
.badge {
  color: #ffffff;
  padding: 0.3rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.badge-urgente { background-color: #ef4444; }
.badge-tyc { background-color: var(--brand-primary, #000080); }
.badge-gerente { background-color: #0284c7; }

.attachment-badge {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: var(--text-secondary, #64748b);
  background: var(--bg-primary, #f1f5f9);
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
}

.attachment-badge .svg-icon {
  width: 14px;
  height: 14px;
}

/* Cuerpo */
.card-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.75rem;
}

.megaphone-wrapper {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background-color: rgba(0, 0, 128, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
}

.megaphone-icon {
  width: 26px;
  height: 26px;
  color: var(--brand-primary, #000080);
}

.aviso-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-primary, #0f172a);
  line-height: 1.4;
}

/* Botones dentro de la Card */
.card-actions {
  display: flex;
  gap: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px dashed var(--border-color, #e2e8f0);
}

.btn-action {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.55rem 0.5rem;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.btn-outline {
  background-color: var(--bg-primary, #f1f5f9);
  color: var(--text-primary, #0f172a);
}

.btn-solid {
  background-color: var(--brand-primary, #000080);
  color: #ffffff;
}

.btn-read {
  background-color: #10b981 !important;
}

.btn-action:hover {
  opacity: 0.9;
}

.check-icon {
  width: 16px;
  height: 16px;
}

/* Estado Vacío */
.empty-state {
  text-align: center;
  padding: 3.5rem 1.5rem;
  background: var(--bg-surface, #ffffff);
  border-radius: 16px;
  border: 1px solid var(--border-color, #e2e8f0);
}

.empty-icon {
  width: 48px;
  height: 48px;
  color: var(--text-secondary, #94a3b8);
  margin-bottom: 0.75rem;
}

.empty-state h3 {
  font-size: 1.1rem;
  margin: 0 0 0.25rem 0;
}

.empty-state p {
  font-size: 0.85rem;
  color: var(--text-secondary, #64748b);
  margin: 0;
}
</style>