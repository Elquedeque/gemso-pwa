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
        <div>
          <h2>Mis Documentos</h2>
          <p class="subtitle">Expedientes y constancias personales emitidas por Talento y Cultura</p>
        </div>
      </header>

      <!-- Controles: Buscador y Filtros -->
      <section class="controls-section">
        <div class="search-box">
          <svg class="search-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          <input 
            v-model="busqueda" 
            type="text" 
            placeholder="Buscar por título o emisor..." 
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

      <!-- Grid Responsivo de Documentos -->
      <section class="docs-grid">
        <article 
          v-for="doc in documentosFiltrados" 
          :key="doc.id" 
          class="doc-card"
        >
          <div class="doc-card-top">
            <div class="doc-type-icon">
              <!-- Icono PDF -->
              <svg v-if="doc.formato === 'pdf'" class="svg-doc pdf" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm12 6V9c0-.55-.45-1-1-1h-3v8h1.5v-2.5H15c.55 0 1-.45 1-1zm-2.5-1.5H15V11h-1.5V10.5z"/>
              </svg>
              <!-- Icono Genérico -->
              <svg v-else class="svg-doc doc" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
              </svg>
            </div>
            <span class="category-badge" :class="doc.categoria">{{ obtenerNombreCategoria(doc.categoria) }}</span>
          </div>

          <div class="doc-info">
            <h3 class="doc-title">{{ doc.titulo }}</h3>
            <p class="doc-meta"><strong>Emite:</strong> {{ doc.emisor }}</p>
            <p class="doc-date"><strong>Expedido:</strong> {{ doc.fecha }}</p>
          </div>

          <div class="doc-actions">
            <button class="action-btn preview" title="Previsualizar" @click="verDocumento(doc)">
              <svg viewBox="0 0 24 24" class="action-icon" fill="currentColor">
                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
              </svg>
              <span>Ver</span>
            </button>

            <button class="action-btn download" title="Descargar" @click="descargarDocumento(doc)">
              <svg viewBox="0 0 24 24" class="action-icon" fill="currentColor">
                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
              </svg>
              <span>Descargar</span>
            </button>
          </div>
        </article>
      </section>

      <!-- Estado Vacío -->
      <div v-if="documentosFiltrados.length === 0" class="empty-state">
        <svg class="empty-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
        </svg>
        <h3>No se encontraron documentos</h3>
        <p>Intenta ajustando los términos de búsqueda o seleccionando otra categoría.</p>
      </div>
    </main>

    <!-- Sidebar y Notificaciones -->
    <SidebarMenu :is-open="isMenuOpen" @close="isMenuOpen = false" />
    <NotificationsDrawer :is-open="isNotificationsOpen" @close="isNotificationsOpen = false" />
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

const documentosFiltrados = computed(() => {
  return listaDocumentos.value.filter(doc => {
    const coincideCategoria = categoriaActiva.value === 'todos' || doc.categoria === categoriaActiva.value;
    const coincideBusqueda = doc.titulo.toLowerCase().includes(busqueda.value.toLowerCase()) || 
                             doc.emisor.toLowerCase().includes(busqueda.value.toLowerCase());
    return coincideCategoria && coincideBusqueda;
  });
});

const obtenerNombreCategoria = (catId) => {
  const cat = categorias.find(c => c.id === catId);
  return cat ? cat.nombre : catId;
};

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
  background-color: var(--bg-primary, #f8fafc);
  color: var(--text-primary, #0f172a);
}

.dashboard-main {
  flex: 1;
  width: 100%;
  max-width: 1200px; /* Consistente con PerfilView y AyudaView */
  margin: 0 auto;
  padding: 1.5rem 1.25rem 2.5rem;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
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
  margin: 0.25rem 0 0 0;
}

/* Sección de Controles */
.controls-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

@media (min-width: 768px) {
  .controls-section {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  max-width: 400px;
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
  padding: 0.65rem 0.85rem 0.65rem 2.5rem;
  border-radius: 12px;
  border: 1px solid var(--border-color, #cbd5e1);
  background: var(--bg-surface, #ffffff);
  color: var(--text-primary, #0f172a);
  font-size: 0.875rem;
  outline: none;
  transition: border-color 0.2s ease;
}

.search-input:focus {
  border-color: var(--brand-primary, #000080);
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

/* Grid Adaptativo de Tarjetas */
.docs-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.25rem;
}

@media (min-width: 640px) {
  .docs-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .docs-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* Tarjeta de Documento */
.doc-card {
  background: var(--bg-surface, #ffffff);
  border-radius: 16px;
  padding: 1.25rem;
  border: 1px solid var(--border-color, #e2e8f0);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 1rem;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.doc-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.06);
}

.doc-card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.doc-type-icon {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  background-color: #fee2e2;
  display: flex;
  align-items: center;
  justify-content: center;
}

.doc-type-icon .svg-doc {
  width: 24px;
  height: 24px;
  color: #ef4444;
}

.doc-type-icon .svg-doc.doc {
  color: #0284c7;
}

.category-badge {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.25rem 0.65rem;
  border-radius: 20px;
  background-color: #f1f5f9;
  color: #475569;
  text-transform: uppercase;
}

.category-badge.laborales {
  background-color: #e0e7ff;
  color: var(--brand-primary, #000080);
}

.category-badge.nomina {
  background-color: #dcfce7;
  color: #15803d;
}

.doc-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.doc-title {
  font-size: 1rem;
  font-weight: 700;
  margin: 0 0 0.35rem 0;
  color: var(--text-primary, #0f172a);
  line-height: 1.3;
}

.doc-meta, .doc-date {
  font-size: 0.8rem;
  margin: 0;
  color: var(--text-secondary, #64748b);
}

/* Botones de Acción */
.doc-actions {
  display: flex;
  gap: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px dashed var(--border-color, #e2e8f0);
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.55rem 0.75rem;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s ease, background-color 0.2s ease;
  border: none;
}

.action-btn.preview {
  background-color: var(--bg-primary, #f1f5f9);
  color: var(--text-primary, #0f172a);
}

.action-btn.download {
  background-color: var(--brand-primary, #000080);
  color: #ffffff;
}

.action-btn:hover {
  opacity: 0.9;
}

.action-icon {
  width: 16px;
  height: 16px;
}

/* Estado Vacío */
.empty-state {
  text-align: center;
  padding: 3rem 1.5rem;
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