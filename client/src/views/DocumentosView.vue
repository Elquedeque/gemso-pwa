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
        <h2>Mis Documentos</h2>
        <p class="subtitle">Documentos personales expedidos por Talento y Cultura</p>
      </header>

      <!-- Barra de Búsqueda y Filtros -->
      <section class="controls-section">
        <div class="search-box">
          <svg class="search-icon" viewBox="0 0 24 24">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor"/>
          </svg>
          <input 
            v-model="busqueda" 
            type="text" 
            placeholder="Buscar documento..." 
            class="search-input"
          />
        </div>

        <nav class="filter-bar" aria-label="Filtros de documentos">
          <button 
            v-for="cat in categorias" 
            :key="cat.id" 
            class="filter-chip" 
            :class="{ active: categoriaActiva === cat.id }"
            @click="categoriaActiva = cat.id"
          >
            {{ cat.nombre }}
          </button>
        </nav>
      </section>

      <!-- Lista / Feed de Documentos -->
      <section class="docs-feed-wrapper">
        <div class="docs-scroll-container">
          <article 
            v-for="doc in documentosFiltrados" 
            :key="doc.id" 
            class="doc-card"
          >
            <div class="doc-type-icon">
              <!-- Icono PDF -->
              <svg v-if="doc.formato === 'pdf'" class="svg-doc pdf" viewBox="0 0 24 24">
                <path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm12 6V9c0-.55-.45-1-1-1h-3v8h1.5v-2.5H15c.55 0 1-.45 1-1zm-2.5-1.5H15V11h-1.5V10.5z" fill="currentColor"/>
              </svg>
              <!-- Icono Generico -->
              <svg v-else class="svg-doc word" viewBox="0 0 24 24">
                <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" fill="currentColor"/>
              </svg>
            </div>

            <div class="doc-info">
              <h3 class="doc-title">{{ doc.titulo }}</h3>
              <p class="doc-meta">Emite: <strong>{{ doc.emisor }}</strong></p>
              <p class="doc-date">Expedido: {{ doc.fecha }}</p>
            </div>

            <div class="doc-actions">
              <button class="action-btn" title="Previsualizar" @click="verDocumento(doc)">
                <svg viewBox="0 0 24 24" class="action-icon">
                  <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="currentColor"/>
                </svg>
              </button>
              <button class="action-btn" title="Descargar" @click="descargarDocumento(doc)">
                <svg viewBox="0 0 24 24" class="action-icon">
                  <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" fill="currentColor"/>
                </svg>
              </button>
            </div>
          </article>

          <!-- Estado Vacío -->
          <div v-if="documentosFiltrados.length === 0" class="empty-state">
            <p>No se encontraron documentos.</p>
          </div>
        </div>
      </section>
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
import { ref, computed } from 'vue';
import AppHeader from '../components/AppHeader.vue';
import SidebarMenu from '../components/SidebarMenu.vue';
import NotificationsDrawer from '../components/NotificationsDrawer.vue';

const isMenuOpen = ref(false);
const isNotificationsOpen = ref(false);

const busqueda = ref('');
const categoriaActiva = ref('todos');

const categorias = [
  { id: 'todos', nombre: 'Todos' },
  { id: 'laborales', nombre: 'Constancias' },
  { id: 'contratos', nombre: 'Contratos' },
  { id: 'nomina', nombre: 'Nómina' }
];

// Lista de documentos recibidos desde T&C
const listaDocumentos = ref([
  {
    id: 1,
    titulo: 'Constancia Laboral con Sueldo',
    emisor: 'T&C - Talento y Cultura',
    fecha: '15 Sep 2026',
    categoria: 'laborales',
    formato: 'pdf'
  },
  {
    id: 2,
    titulo: 'Contrato Indefinido Firmado',
    emisor: 'T&C - Jurídico',
    fecha: '01 Ene 2026',
    categoria: 'contratos',
    formato: 'pdf'
  },
  {
    id: 3,
    titulo: 'Comprobante de Retención IMSS',
    emisor: 'T&C - Nómina',
    fecha: '10 Ago 2026',
    categoria: 'nomina',
    formato: 'pdf'
  }
]);

// Filtrado combinado (categoría + texto de búsqueda)
const documentosFiltrados = computed(() => {
  return listaDocumentos.value.filter(doc => {
    const coincideCategoria = categoriaActiva.value === 'todos' || doc.categoria === categoriaActiva.value;
    const coincideBusqueda = doc.titulo.toLowerCase().includes(busqueda.value.toLowerCase()) || 
                             doc.emisor.toLowerCase().includes(busqueda.value.toLowerCase());
    return coincideCategoria && coincideBusqueda;
  });
});

const verDocumento = (doc) => {
  console.log('Visualizar documento:', doc.titulo);
};

const descargarDocumento = (doc) => {
  console.log('Descargando documento:', doc.titulo);
};
</script>

<style scoped>
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

.page-header h2 {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary, #0f172a);
}

.subtitle {
  font-size: 0.85rem;
  color: var(--text-secondary, #64748b);
  margin: 0.2rem 0 0 0;
}

.controls-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* Buscador */
.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 0.85rem;
  width: 18px;
  height: 18px;
  color: var(--text-secondary, #64748b);
}

.search-input {
  width: 100%;
  padding: 0.6rem 0.85rem 0.6rem 2.4rem;
  border-radius: 20px;
  border: 1px solid var(--border-color, #cbd5e1);
  background: #ffffff;
  font-size: 0.85rem;
  outline: none;
  transition: border-color 0.2s ease;
}

.search-input:focus {
  border-color: var(--brand-primary, #000080);
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

/* Feed & Scroll */
.docs-feed-wrapper {
  background: #e2e8f0;
  border-radius: 16px;
  padding: 0.85rem 0.5rem 0.85rem 0.85rem;
  border: 1px solid #cbd5e1;
}

.docs-scroll-container {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  max-height: 520px;
  overflow-y: auto;
  padding-right: 0.5rem;
}

/* Tarjeta Documento */
.doc-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 0.85rem 1rem;
  border: 1px solid #cbd5e1;
  display: flex;
  align-items: center;
  gap: 0.85rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.doc-type-icon .svg-doc {
  width: 32px;
  height: 32px;
  color: #000080;
}

.doc-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.doc-title {
  font-size: 0.9rem;
  font-weight: 700;
  margin: 0;
  color: #0f172a;
}

.doc-meta, .doc-date {
  font-size: 0.75rem;
  margin: 0;
  color: #64748b;
}

.doc-actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.action-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.3rem;
  color: #000080;
  border-radius: 6px;
  transition: background-color 0.2s ease;
}

.action-btn:hover {
  background-color: #f1f5f9;
}

.action-icon {
  width: 22px;
  height: 22px;
}

.empty-state {
  text-align: center;
  padding: 2rem 1rem;
  color: #64748b;
  font-size: 0.9rem;
}
</style>