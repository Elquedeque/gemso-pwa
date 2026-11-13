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

      <!-- Contenido Principal: avisos que todavía no has abierto -->
      <div class="notifications-body">
        <p v-if="campana.error && campana.avisos.length === 0" class="empty-state">
          {{ campana.error }}
          <button class="clear-all-btn" @click="cargarCampana(true)">Reintentar</button>
        </p>
        <p v-else-if="campana.cargando && campana.avisos.length === 0" class="empty-state">Cargando...</p>
        <div v-else-if="campana.avisos.length === 0" class="empty-state">
          <p>Estás al día: ya abriste todos tus avisos.</p>
        </div>

        <template v-else>
          <p class="resumen">
            {{ campana.sinAbrir === 1 ? 'Tienes 1 aviso sin abrir' : `Tienes ${campana.sinAbrir} avisos sin abrir` }}
          </p>
          <button
            v-for="aviso in campana.avisos"
            :key="aviso.id_anu"
            type="button"
            class="notification-item"
            :class="{ unread: aviso.nueva, urgente: aviso.urgente }"
            @click="abrirAviso(aviso)"
          >
            <span class="notif-header">
              <span class="notif-categoria">{{ aviso.urgente ? 'Urgente' : aviso.categoria }}</span>
              <span class="notif-time">{{ tiempoRelativo(aviso.fecha_creacion) }}</span>
            </span>
            <span class="notif-title">{{ aviso.titulo }}</span>
            <span class="notif-desc">{{ aviso.contenido }}</span>
          </button>
        </template>
      </div>

      <!-- Footer del Panel -->
      <div class="notifications-footer">
        <button v-if="campana.nuevas > 0" class="clear-all-btn" :disabled="marcando" @click="marcarTodas">
          Marcar todas como leídas
        </button>
        <button class="clear-all-btn secundario" @click="verTodos">Ver todos los avisos</button>
      </div>
    </div>
  </div>
</template>

<script setup>
// Panel de la campana: avisos que el usuario puede ver y no ha abierto (utils/campana.js).
// Resaltados los nuevos (publicados después de "Marcar todas como leídas").
// Al tocar uno se abre el aviso, y eso lo registra como visto en las estadísticas.
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { campana, cargarCampana, quitarDeCampana, marcarTodasLeidas, tiempoRelativo } from '../utils/campana';

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close']);
const router = useRouter();
const marcando = ref(false);

// Al abrir el panel siempre se pide la lista actualizada
watch(() => props.isOpen, (abierto) => {
  if (abierto) cargarCampana(true);
});

const abrirAviso = (aviso) => {
  quitarDeCampana(aviso.id_anu);
  emit('close');
  router.push(`/mis-avisos/${aviso.id_anu}`);
};

const verTodos = () => {
  emit('close');
  router.push('/mis-avisos');
};

const marcarTodas = async () => {
  marcando.value = true;
  try {
    await marcarTodasLeidas();
  } catch (error) {
    campana.value.error = error.message;
  } finally {
    marcando.value = false;
  }
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

.resumen {
  margin: 0;
  font-size: 0.78rem;
  color: var(--text-secondary, #64748b);
}

.notification-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  width: 100%;
  text-align: left;
  font: inherit;
  color: inherit;
  padding: 0.85rem;
  border-radius: 10px;
  background-color: var(--bg-primary, #f1f5f9);
  border: 1px solid var(--border-color, #e2e8f0);
  cursor: pointer;
  transition: all 0.2s ease;
}

.notification-item:hover,
.notification-item:focus-visible {
  border-color: var(--brand-primary, #000080);
}

.notification-item.unread {
  background-color: var(--bg-surface, #ffffff);
  border-left: 4px solid var(--brand-accent, #0284c7);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.notification-item.urgente {
  border-left: 4px solid var(--color-danger, #dc2626);
}

.notif-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.notif-categoria {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--tint-blue-text, #2563eb);
}

.notification-item.urgente .notif-categoria {
  color: var(--color-danger, #dc2626);
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
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.notifications-footer {
  margin-top: auto;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color, #e2e8f0);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
}

.clear-all-btn.secundario {
  color: var(--text-secondary, #64748b);
}

.clear-all-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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