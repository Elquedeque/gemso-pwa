<template>
  <div 
    class="notifications-overlay" 
    :class="{ open: isOpen }" 
    @click="$emit('close')"
  >
    <div class="notifications-container" @click.stop>
      <!-- Encabezado del Panel -->
      <div class="notifications-header">
        <span class="panel-title">Notificaciones</span>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>

      <!-- Contenido Principal: Lista de Notificaciones -->
      <div class="notifications-body">
        <div v-if="notificaciones.length === 0" class="empty-state">
          <p>No tienes notificaciones pendientes.</p>
        </div>

        <div 
          v-for="(notif, index) in notificaciones" 
          :key="index" 
          class="notification-item"
          :class="{ 'unread': !notif.leida }"
          @click="marcarComoLeida(index)"
        >
          <div class="notif-header">
            <span class="notif-title">{{ notif.titulo }}</span>
            <span class="notif-time">{{ notif.hora }}</span>
          </div>
          <p class="notif-desc">{{ notif.descripcion }}</p>
        </div>
      </div>

      <!-- Footer del Panel -->
      <div class="notifications-footer" v-if="notificaciones.length > 0">
        <button class="clear-all-btn" @click="marcarTodasComoLeidas">
          Marcar todas como leídas
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close']);

// Datos mock para notificaciones
const notificaciones = ref([
  {
    titulo: 'Nuevo comunicado de RH',
    descripcion: 'Se han actualizado las fechas del período vacacional 2026.',
    hora: 'Hace 10 min',
    leida: false
  },
  {
    titulo: 'Mantenimiento de Servidores',
    descripcion: 'El sistema estará fuera de servicio hoy a las 11:00 PM.',
    hora: 'Hace 2 horas',
    leida: false
  },
  {
    titulo: 'Bienvenido al Portal Gemso',
    descripcion: 'Explora los nuevos módulos de documentos y avisos.',
    hora: 'Ayer',
    leida: true
  }
]);

const marcarComoLeida = (index) => {
  notificaciones.value[index].leida = true;
};

const marcarTodasComoLeidas = () => {
  notificaciones.value.forEach(n => n.leida = true);
};
</script>

<style scoped>
.notifications-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(4px);
  z-index: 999;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
}

.notifications-overlay.open {
  opacity: 1;
  pointer-events: auto;
}

.notifications-container {
  position: absolute;
  top: 0;
  right: 0;
  width: 320px;
  height: 100%;
  background-color: var(--bg-surface, #ffffff);
  border-left: 1px solid var(--border-color, #e2e8f0);
  padding: 1.25rem 1rem;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  transform: translateX(100%);
  transition: transform 0.3s ease, background-color 0.3s ease;
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.08);
}

.notifications-overlay.open .notifications-container {
  transform: translateX(0);
}

.notifications-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-color, #e2e8f0);
}

.panel-title {
  color: var(--brand-primary, #000080);
  font-weight: 700;
  font-size: 1.15rem;
  letter-spacing: -0.3px;
}

.close-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary, #64748b);
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.close-btn:hover {
  background-color: var(--bg-primary, #f1f5f9);
  color: var(--text-primary, #0f172a);
}

.notifications-body {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.empty-state {
  text-align: center;
  color: var(--text-secondary, #64748b);
  padding: 2rem 1rem;
  font-size: 0.9rem;
}

.notification-item {
  padding: 0.85rem;
  border-radius: 10px;
  background-color: var(--bg-primary, #f1f5f9);
  border: 1px solid var(--border-color, #e2e8f0);
  cursor: pointer;
  transition: all 0.2s ease;
}

.notification-item.unread {
  background-color: var(--bg-surface, #ffffff);
  border-left: 4px solid var(--brand-accent, #0284c7);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.notif-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.35rem;
}

.notif-title {
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--text-primary, #0f172a);
}

.notif-time {
  font-size: 0.7rem;
  color: var(--text-secondary, #64748b);
}

.notif-desc {
  margin: 0;
  font-size: 0.8rem;
  color: var(--text-secondary, #475569);
  line-height: 1.35;
}

.notifications-footer {
  margin-top: auto;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color, #e2e8f0);
  display: flex;
  justify-content: center;
}

.clear-all-btn {
  background: transparent;
  border: none;
  color: var(--brand-accent, #0284c7);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}

.clear-all-btn:hover {
  text-decoration: underline;
}
</style>