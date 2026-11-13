<template>
  <header class="dashboard-header">
    <!-- Botón del menú de hamburguesa -->
    <button class="icon-btn" @click="$emit('toggle-menu')" title="Abrir menú">
      <svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="3" y1="12" x2="21" y2="12"></line>
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <line x1="3" y1="18" x2="21" y2="18"></line>
      </svg>
    </button>

    <!-- Logo Institucional con tamaño incrementado -->
    <div class="brand-logo">
      <img src="../assets/icon_GEMSO.png" alt="GEMSO" class="header-logo-img" />
    </div>

    <!-- Botón de Notificaciones -->
    <button
      class="icon-btn campana-btn"
      @click="$emit('toggle-notifications')"
      :aria-label="etiquetaCampana"
      title="Ver notificaciones"
    >
      <svg viewBox="0 0 24 24" class="svg-icon">
        <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" fill="currentColor"/>
      </svg>
      <!-- Contador de avisos nuevos (utils/campana.js) -->
      <span v-if="campana.nuevas > 0" class="contador" aria-hidden="true">
        {{ campana.nuevas > 9 ? '9+' : campana.nuevas }}
      </span>
    </button>
  </header>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { campana, cargarCampana } from '../utils/campana';

defineEmits(['toggle-menu', 'toggle-notifications']);

// Para lectores de pantalla: "Notificaciones, 3 nuevas"
const etiquetaCampana = computed(() => {
  const n = campana.value.nuevas;
  if (n === 0) return 'Notificaciones';
  return `Notificaciones, ${n} ${n === 1 ? 'nueva' : 'nuevas'}`;
});

onMounted(() => cargarCampana());
</script>

<style scoped>
.dashboard-header {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1.25rem;
  background-color: var(--bg-surface, #ffffff);
  border-bottom: 1px solid var(--border-color, #e2e8f0);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  box-sizing: border-box;
}

.icon-btn {
  background: var(--brand-primary, #000080);
  border: none;
  color: #ffffff;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: opacity 0.2s ease, transform 0.1s ease;
}

.icon-btn:hover {
  opacity: 0.9;
  transform: scale(1.03);
}

.svg-icon {
  width: 20px;
  height: 20px;
}

.campana-btn {
  position: relative;
}

.contador {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  box-sizing: border-box;
  border-radius: 999px;
  background: #dc2626;
  color: #ffffff;
  border: 2px solid var(--bg-surface, #ffffff);
  font-size: 0.65rem;
  font-weight: 700;
  line-height: 14px;
  text-align: center;
}

/* Logo más destacado (se incrementó la altura de 36px a 48px) */
.header-logo-img {
  height: 48px;
  width: auto;
  object-fit: contain;
  display: block;
}
</style>