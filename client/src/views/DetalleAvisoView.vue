<template>
  <div class="dashboard-container">
    <!-- Header Reutilizable -->
    <AppHeader 
      @toggle-menu="isMenuOpen = true" 
      @toggle-notifications="isNotificationsOpen = true" 
    />

    <!-- Contenido Principal -->
    <main class="dashboard-main">
      <!-- Botón para regresar al listado -->
      <button class="back-link" @click="goBack">
        <svg viewBox="0 0 24 24" class="back-icon">
          <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor"/>
        </svg>
        <span>Volver a Mis Avisos</span>
      </button>

      <!-- Encabezado de la Noticia / Aviso -->
      <header class="aviso-header">
        <span class="section-label">Aviso</span>
        <h1 class="aviso-title">{{ aviso.titulo }}</h1>
        <p class="aviso-origen">{{ aviso.origen }}</p>
      </header>

      <!-- Cuerpo del Aviso -->
      <article class="aviso-content">
        <p v-for="(paragraph, index) in aviso.contenido" :key="index">
          {{ paragraph }}
        </p>
      </article>

      <!-- Caja de Archivos Adjuntos (Si existen) -->
      <section v-if="aviso.adjuntos && aviso.adjuntos.length > 0" class="attachments-card">
        <div 
          v-for="adjunto in aviso.adjuntos" 
          :key="adjunto.id" 
          class="attachment-item"
        >
          <!-- Icono según el tipo de archivo -->
          <div class="file-icon-wrapper">
            <!-- Icono PDF -->
            <svg v-if="adjunto.tipo === 'pdf'" class="file-svg pdf" viewBox="0 0 24 24">
              <path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm12 6V9c0-.55-.45-1-1-1h-3v8h1.5v-2.5H15c.55 0 1-.45 1-1zm-2.5-1.5H15V11h-1.5V10.5z" fill="currentColor"/>
            </svg>
            <!-- Icono DOCX / WORD -->
            <svg v-else-if="adjunto.tipo === 'docx' || adjunto.tipo === 'doc'" class="file-svg word" viewBox="0 0 24 24">
              <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" fill="currentColor"/>
            </svg>
            <!-- Icono Imagen (PNG/JPG) -->
            <svg v-else class="file-svg image" viewBox="0 0 24 24">
              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" fill="currentColor"/>
            </svg>
          </div>

          <!-- Nombre del Archivo -->
          <span class="file-name">{{ adjunto.nombre }}</span>

          <!-- Acciones del Archivo: Descargar y Ver -->
          <div class="file-actions">
            <button class="action-btn" title="Descargar" @click="descargarAdjunto(adjunto)">
              <svg viewBox="0 0 24 24" class="action-svg">
                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" fill="currentColor"/>
              </svg>
            </button>
            <button class="action-btn" title="Previsualizar" @click="verAdjunto(adjunto)">
              <svg viewBox="0 0 24 24" class="action-svg">
                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="currentColor"/>
              </svg>
            </button>
          </div>
        </div>
      </section>

      <!-- Botón Inferior: Confirmar Lectura -->
      <footer class="action-footer">
        <button 
          class="btn-confirm-read" 
          :class="{ 'is-read': aviso.leido }"
          @click="confirmarLectura"
        >
          {{ aviso.leido ? 'Lectura Confirmada' : 'Confirmar Lectura' }}
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
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import AppHeader from '../components/AppHeader.vue';
import SidebarMenu from '../components/SidebarMenu.vue';
import NotificationsDrawer from '../components/NotificationsDrawer.vue';

const router = useRouter();

// Modales del Sidebar
const isMenuOpen = ref(false);
const isNotificationsOpen = ref(false);

// Datos Mock del Aviso (Plantilla para la vista)
const aviso = ref({
  id: 1,
  titulo: 'Título de Aviso',
  origen: 'Origen de Aviso',
  leido: false,
  contenido: [
    'Lorem ipsum dolor sit amet consectetur adipiscing elit nibh praesent, suscipit sem netus et aliquam etiam condimentum ligula libero, lobortis metus sociosqu luctus vitae venenatis class augue.',
    'Viverra litora fringilla sociosqu commodo vitae leo est conubia penatibus nostra, suspendisse dictumst ullamcorper ante purus maecenas sollicitudin rutrum congue quam.'
  ],
  adjuntos: [
    { id: 101, nombre: 'Nombre_Ejemplo.pdf', tipo: 'pdf', url: '#' },
    { id: 102, nombre: 'Nombre_Ejemplo.docx', tipo: 'docx', url: '#' },
    { id: 103, nombre: 'Nombre_Ejemplo.png', tipo: 'png', url: '#' }
  ]
});

// Métodos de interacción
const goBack = () => {
  router.push('/mis-avisos');
};

const confirmarLectura = () => {
  aviso.value.leido = !aviso.value.leido;
};

const descargarAdjunto = (adjunto) => {
  console.log('Descargando archivo:', adjunto.nombre);
};

const verAdjunto = (adjunto) => {
  console.log('Previsualizando archivo:', adjunto.nombre);
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
  gap: 1.25rem;
}

/* Enlace/Botón Regresar */
.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: none;
  border: none;
  color: var(--brand-primary, #000080);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  align-self: flex-start;
}

.back-icon {
  width: 18px;
  height: 18px;
}

/* Encabezado */
.aviso-header {
  text-align: center;
}

.section-label {
  font-size: 1.25rem;
  font-weight: 700;
  color: #0f172a;
}

.aviso-title {
  font-size: 1.75rem;
  font-weight: 800;
  margin: 0.2rem 0;
  color: #0f172a;
}

.aviso-origen {
  font-size: 1rem;
  color: #475569;
  margin: 0;
}

/* Cuerpo de Texto */
.aviso-content {
  font-size: 0.95rem;
  line-height: 1.5;
  color: #1e293b;
  text-align: justify;
}

.aviso-content p {
  margin: 0 0 1rem 0;
}

/* Tarjeta de Adjuntos */
.attachments-card {
  background: #e2e8f0;
  border: 1px solid #94a3b8;
  border-radius: 12px;
  padding: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.attachment-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.file-icon-wrapper {
  display: flex;
  align-items: center;
}

.file-svg {
  width: 28px;
  height: 28px;
  color: #0f172a;
}

.file-name {
  flex: 1;
  font-size: 0.85rem;
  font-weight: 600;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.action-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.2rem;
  color: #0f172a;
  transition: transform 0.15 ease;
}

.action-btn:hover {
  transform: scale(1.15);
}

.action-svg {
  width: 26px;
  height: 26px;
}

/* Footer & Botón de Confirmación */
.action-footer {
  display: flex;
  justify-content: center;
  margin-top: auto;
  padding-top: 1rem;
}

.btn-confirm-read {
  background-color: #000080;
  color: #ffffff;
  border: none;
  border-radius: 25px;
  padding: 0.85rem 2.5rem;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(0, 0, 128, 0.25);
  transition: all 0.2s ease;
  width: 100%;
  max-width: 300px;
}

.btn-confirm-read.is-read {
  background-color: #059669;
}

.btn-confirm-read:hover {
  opacity: 0.95;
  transform: translateY(-1px);
}
</style>