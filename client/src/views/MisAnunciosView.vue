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
        <h2>Mis Avisos</h2>
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

      <!-- Contenedor Principal de la Lista / Feed de Cards -->
      <section class="cards-feed-wrapper">
        <div class="cards-scroll-container">
          <!-- Card de Aviso -->
          <article 
            v-for="aviso in avisosFiltrados" 
            :key="aviso.id" 
            class="aviso-card"
          >
            <!-- Badge Superior Izquierdo -->
            <div class="card-top-bar">
              <span class="badge" :class="aviso.categoriaClase">{{ aviso.categoria }}</span>
              
              <!-- Icono de Archivo Adjunto (si existe) -->
              <div v-if="aviso.tieneAdjunto" class="attachment-icon" title="Tiene archivo adjunto">
                <svg viewBox="0 0 24 24" class="svg-icon">
                  <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z" fill="currentColor"/>
                </svg>
              </div>
            </div>

            <!-- Contenido Central: Icono y Título -->
            <div class="card-body">
              <div class="megaphone-icon">
                <svg viewBox="0 0 24 24" class="svg-icon">
                  <path d="M20 12l-8.5-6v12L20 12zM4 9v6h4l5 5V4L8 9H4z" fill="currentColor"/>
                </svg>
              </div>
              <h3 class="aviso-title">"{{ aviso.titulo }}"</h3>
            </div>

            <!-- Botones de Acción Inferiores -->
            <div class="card-actions">
              <button class="btn-action btn-outline" @click="verDetalleAviso(aviso)">
                Ver Más
              </button>

              <button 
                class="btn-action btn-solid" 
                :class="{ 'btn-read': aviso.leido }"
                @click="confirmarLectura(aviso)"
              >
                {{ aviso.leido ? 'Lectura Confirmada' : 'Confirmar Lectura' }}
              </button>
            </div>
          </article>

          <!-- Estado Vacío -->
          <div v-if="avisosFiltrados.length === 0" class="empty-state">
            <p>No hay avisos disponibles en esta categoría.</p>
          </div>
        </div>
      </section>

      <!-- Botón Flotante/Inferior Condicional para T&C / RRHH -->
      <footer v-if="esUsuarioTyC" class="tyc-action-bar">
        <button class="btn-tyc" @click="crearAviso">
          Pantalla para T&C y Creadores de Avisos
        </button>
      </footer>
    </main>

    <!-- Sidebar Menu -->
    <SidebarMenu 
      :is-open="isMenuOpen" 
      @close="isMenuOpen = false" 
    />

    <!-- Notifications Drawer -->
    <NotificationsDrawer 
      :is-open="isNotificationsOpen" 
      @close="isNotificationsOpen = false" 
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import AppHeader from '../components/AppHeader.vue';
import SidebarMenu from '../components/SidebarMenu.vue';
import NotificationsDrawer from '../components/NotificationsDrawer.vue';

const router = useRouter();

// Estados de los paneles laterales
const isMenuOpen = ref(false);
const isNotificationsOpen = ref(false);

// Rol de usuario (Simulación de permisos T&C / RRHH)
const esUsuarioTyC = ref(false);

// Filtro seleccionado
const filtroActivo = ref('todos');

const listaFiltros = [
  { id: 'todos', nombre: 'Todos' },
  { id: 'area', nombre: 'Mi Área' },
  { id: 'globales', nombre: 'Globales' },
  { id: 'urgentes', nombre: 'Urgentes' }
];

// Lista de Avisos
const listaAvisos = ref([
  {
    id: 1,
    titulo: 'AVISO',
    categoria: 'Urgente',
    categoriaClase: 'badge-urgente',
    tipo: 'urgentes',
    tieneAdjunto: true,
    leido: false
  },
  {
    id: 2,
    titulo: 'AVISO',
    categoria: 'T&C',
    categoriaClase: 'badge-tyc',
    tipo: 'area',
    tieneAdjunto: true,
    leido: false
  },
  {
    id: 3,
    titulo: 'AVISO',
    categoria: 'Gerente',
    categoriaClase: 'badge-gerente',
    tipo: 'globales',
    tieneAdjunto: false,
    leido: false
  }
]);

// Filtrado Reactivo
const avisosFiltrados = computed(() => {
  if (filtroActivo.value === 'todos') {
    return listaAvisos.value;
  }
  return listaAvisos.value.filter(item => item.tipo === filtroActivo.value);
});

// Métodos de Acción
const confirmarLectura = (aviso) => {
  aviso.leido = !aviso.leido;
};

// Método de Acción para navegar al detalle
const verDetalleAviso = (aviso) => {
  // Redirige a la pantalla de detalle pasando el ID del aviso
  router.push(`/mis-avisos/${aviso.id}`);
};

const crearAviso = () => {
  router.push('/crear-anuncio');
};

onMounted(() => {
  // Comprobación de rol de usuario guardado en localStorage o Store
  const sesion = localStorage.getItem('usuario');
  if (sesion) {
    const user = JSON.parse(sesion);
    // Habilitar si el rol es TyC, RRHH o Administrador
    esUsuarioTyC.value = user.rol === 'TyC' || user.departamento === 'RRHH' || user.esCreador;
  } else {
    // Valor por defecto para pruebas/desarrollo
    esUsuarioTyC.value = true; 
  }
});
</script>

<style scoped>
/* Contenedor Base */
.dashboard-container {
  min-height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-primary, #f1f5f9);
  color: var(--text-primary, #0f172a);
}

.dashboard-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  max-width: 500px;
  width: 100%;
  margin: 0 auto;
  padding: 1rem 1.25rem 2rem;
  box-sizing: border-box;
  gap: 1rem;
}

/* Título */
.page-header h2 {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary, #0f172a);
}

/* Chips de Filtro */
.filter-bar {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  padding-bottom: 0.25rem;
}

.filter-chip {
  background: #ffffff;
  border: 1px solid #000080;
  color: #000080;
  padding: 0.35rem 0.85rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.filter-chip.active {
  background: #000080;
  color: #ffffff;
}

/* Feed Wrapper con scrollbar estilo prototipo */
.cards-feed-wrapper {
  background: #e2e8f0;
  border-radius: 16px;
  padding: 0.85rem 0.5rem 0.85rem 0.85rem;
  border: 1px solid #cbd5e1;
}

.cards-scroll-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-height: 520px;
  overflow-y: auto;
  padding-right: 0.5rem;
}

/* Scrollbar personalizado azul como en la maqueta */
.cards-scroll-container::-webkit-scrollbar {
  width: 6px;
}
.cards-scroll-container::-webkit-scrollbar-track {
  background: #cbd5e1;
  border-radius: 10px;
}
.cards-scroll-container::-webkit-scrollbar-thumb {
  background: #000080;
  border-radius: 10px;
}

/* Tarjeta individual de aviso */
.aviso-card {
  background: linear-gradient(180deg, #ffffff 0%, #cbd5e1 100%);
  border-radius: 16px;
  padding: 1rem;
  border: 1px solid #94a3b8;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.card-top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* Badges de Categoría */
.badge {
  color: #ffffff;
  padding: 0.25rem 0.75rem;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 700;
}
.badge-urgente { background-color: #b91c1c; }
.badge-tyc { background-color: #334155; }
.badge-gerente { background-color: #334155; }

.attachment-icon {
  color: #0f172a;
}
.attachment-icon .svg-icon {
  width: 22px;
  height: 22px;
}

/* Cuerpo central de la Card */
.card-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  padding: 0.25rem 0;
}

.megaphone-icon .svg-icon {
  width: 44px;
  height: 44px;
  color: #000080;
}

.aviso-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 800;
  color: #0f172a;
  text-transform: uppercase;
}

/* Botones dentro de la Card */
.card-actions {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
}

.btn-action {
  flex: 1;
  padding: 0.5rem 0.25rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.btn-outline, .btn-solid {
  background-color: #000080;
  color: #ffffff;
}

.btn-action:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.btn-read {
  background-color: #059669 !important;
}

/* Botón inferior condicional */
.tyc-action-bar {
  margin-top: auto;
  display: flex;
  justify-content: center;
}

.btn-tyc {
  background-color: #000080;
  color: #ffffff;
  border: none;
  border-radius: 20px;
  padding: 0.65rem 1.25rem;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.15);
  transition: transform 0.2s ease;
}

.btn-tyc:hover {
  transform: scale(1.02);
}

.empty-state {
  text-align: center;
  padding: 2rem 1rem;
  color: #64748b;
  font-size: 0.9rem;
}
</style>