<template>
  <div class="sidebar-overlay" :class="{ open: isOpen }" @click="$emit('close')">
    <div class="sidebar-container" @click.stop>
      <!-- Encabezado / Control de Cierre -->
      <div class="sidebar-header">
        <span class="brand-title">Menú</span>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>

      <!-- Navegación Principal -->
      <nav class="nav-section">
        <button 
          v-for="item in menuPrincipal" 
          :key="item.ruta"
          class="nav-item"
          :class="{ active: rutaActual === item.ruta }"
          @click="navegar(item.ruta)"
        >
          <svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor">
            <path :d="item.iconPath" />
          </svg>
          <span>{{ item.label }}</span>
        </button>
      </nav>

      <hr class="nav-divider" />

      <!-- Sección Configuración -->
      <div class="section-label">Configuración</div>
      <nav class="nav-section">
        <button 
          v-for="item in menuConfiguracion" 
          :key="item.ruta"
          class="nav-item"
          @click="navegar(item.ruta)"
        >
          <svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor">
            <path :d="item.iconPath" />
          </svg>
          <span>{{ item.label }}</span>
        </button>
      </nav>

      <hr class="nav-divider" />

      <!-- Sección Acciones -->
      <div class="section-label">Acciones</div>
      <nav class="nav-section">
        <button 
          v-for="item in menuAcciones" 
          :key="item.ruta"
          class="nav-item"
          @click="navegar(item.ruta)"
        >
          <svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor">
            <path :d="item.iconPath" />
          </svg>
          <span>{{ item.label }}</span>
        </button>
      </nav>

      <!-- Botón Cerrar Sesión en la parte inferior -->
      <div class="sidebar-footer">
        <button class="logout-btn" @click="cerrarSesion">
          <svg class="logout-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
          </svg>
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';

// 1. Recibir la propiedad 'isOpen' desde AnunciosView.vue
const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
});

// 2. Definir eventos para avisar cuando se debe cerrar
const emit = defineEmits(['close']);

const router = useRouter();
const route = useRoute();

const rutaActual = computed(() => route.path);

// Definición de las opciones de menú con sus SVG Path integrados
const menuPrincipal = [
  { label: 'Inicio', ruta: '/anuncios', iconPath: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z' },
  { label: 'Mis Avisos', ruta: '/anuncios', iconPath: 'M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z' },
  { label: 'Documentos', ruta: '/documentos', iconPath: 'M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z' },
  { label: 'Agenda', ruta: '/agenda', iconPath: 'M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z' }
];

const menuConfiguracion = [
  { label: 'Mi Perfil', ruta: '/perfil', iconPath: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z' },
  { label: 'Accesibilidad', ruta: '/accesibilidad', iconPath: 'M12 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm9 7h-6v13h-2v-6h-2v6H9V9H3V7h18v2z' },
  { label: 'Ajustes', ruta: '/ajustes', iconPath: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.95s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z' }
];

const menuAcciones = [
  { label: 'Ayuda', ruta: '/ayuda', iconPath: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 16h-2v-2h2v2zm1.07-7.75l-.9.92C12.45 11.9 12 12.5 12 14h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z' },
  { label: 'Contacto', ruta: '/contacto', iconPath: 'M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z' }
];

const navegar = (ruta) => {
  emit('close');
  router.push(ruta);
};

const cerrarSesion = () => {
  emit('close');

  // Limpiar credenciales y sesión
  localStorage.removeItem('usuario');
  localStorage.removeItem('sesion');
  localStorage.clear();

  // Redirigir a la ruta raíz '/' o usando el nombre de la ruta
  router.replace({ name: 'Login' }); 
};
</script>

<style scoped>
/* Tu mismo CSS existente */
.sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 999;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
}

.sidebar-overlay.open {
  opacity: 1;
  pointer-events: auto;
}

.sidebar-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 280px;
  height: 100%;
  background-color: #030712;
  border-right: 1px solid #1f2937;
  padding: 1.25rem 1rem;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  transform: translateX(-100%);
  transition: transform 0.3s ease;
  overflow-y: auto;
}

.sidebar-overlay.open .sidebar-container {
  transform: translateX(0);
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
}

.brand-title {
  color: #38bdf8;
  font-weight: 700;
  font-size: 1.1rem;
}

.close-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 1.2rem;
  cursor: pointer;
}

.nav-section {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  background: transparent;
  border: none;
  color: #f8fafc;
  padding: 0.75rem 0.85rem;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
  transition: background 0.2s ease;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.nav-item.active {
  background: #000080;
  color: #ffffff;
}

.nav-icon {
  width: 20px;
  height: 20px;
  color: #38bdf8;
}

.nav-item.active .nav-icon {
  color: #ffffff;
}

.section-label {
  color: #94a3b8;
  font-size: 0.8rem;
  font-weight: 600;
  margin: 0.75rem 0 0.4rem 0.5rem;
}

.nav-divider {
  border: none;
  border-top: 1px solid #1f2937;
  margin: 0.85rem 0;
}

.sidebar-footer {
  margin-top: auto;
  padding-top: 1rem;
}

.logout-btn {
  width: 100%;
  background: #a51d24;
  color: #ffffff;
  border: none;
  border-radius: 25px;
  padding: 0.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(165, 29, 36, 0.3);
}

.logout-icon {
  width: 20px;
  height: 20px;
}
</style>