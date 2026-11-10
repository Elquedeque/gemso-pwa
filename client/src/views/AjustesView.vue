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
        <h2>Ajustes</h2>
        <p class="subtitle">Gestiona las preferencias de la aplicación</p>
      </header>

      <div class="settings-layout">
        <!-- Notificaciones -->
        <article class="settings-card">
          <div class="card-header">
            <svg class="section-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
            </svg>
            <div>
              <h3>Notificaciones</h3>
              <p class="card-desc">Elige qué avisos deseas recibir en la PWA</p>
            </div>
          </div>

          <!-- Notificaciones Push (se activan al momento, en este dispositivo) -->
          <div class="setting-option">
            <div class="option-text">
              <label for="toggle-push">Notificaciones Push</label>
              <span>Recibir alertas sobre nuevos anuncios en este dispositivo, aunque la app esté cerrada. <strong>Se recomienda mantener esta opción activada para no perderte comunicados urgentes o avisos operativos.</strong></span>
              <span v-if="mensajePush" class="push-estado" :class="{ 'push-error': errorPush }">{{ mensajePush }}</span>
              <button
                v-if="pushActivo"
                type="button"
                class="test-btn"
                :disabled="procesandoPush"
                @click="enviarPrueba"
              >
                Enviar notificación de prueba
              </button>
            </div>
            <input
              id="toggle-push"
              type="checkbox"
              class="toggle-switch"
              :checked="pushActivo"
              :disabled="!pushDisponible || procesandoPush"
              @change="cambiarPush"
            />
          </div>

          <!-- Correos Informativos -->
          <div class="setting-option">
            <div class="option-text">
              <label>Correos Informativos</label>
              <span>Recibir un resumen por email con la información relevante enviada durante el periodo.</span>
              <span v-if="mensajeCorreo" class="push-estado" :class="{ 'push-error': errorCorreo }">{{ mensajeCorreo }}</span>
            </div>
            <input
              type="checkbox"
              v-model="config.notificacionesEmail"
              class="toggle-switch"
              aria-label="Correos informativos"
              :disabled="cargandoCorreo"
            />
          </div>
        </article>

        <!-- Guardado Rápido -->
        <div class="actions-wrapper">
          <button class="save-btn" @click="guardarAjustes" :disabled="cargandoCorreo || guardando">
            {{ guardando ? 'Guardando...' : 'Guardar Cambios' }}
          </button>
        </div>
      </div>
    </main>

    <!-- Menú desplegable lateral y notificaciones -->
    <SidebarMenu :is-open="isMenuOpen" @close="isMenuOpen = false" />
    <NotificationsDrawer :is-open="isNotificationsOpen" @close="isNotificationsOpen = false" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import AppHeader from '../components/AppHeader.vue';
import SidebarMenu from '../components/SidebarMenu.vue';
import NotificationsDrawer from '../components/NotificationsDrawer.vue';
import { estadoPush, activarPush, desactivarPush, probarPush } from '../utils/push';
import { apiFetch } from '../api';

const isMenuOpen = ref(false);
const isNotificationsOpen = ref(false);

// ── Notificaciones push ──────────────────────────────────────
// No se guardan con "Guardar Cambios": el interruptor suscribe o quita
// este dispositivo en el momento (utils/push.js).

// 'no-soportado' | 'ios-instalar' | 'bloqueado' | 'activo' | 'inactivo'
const estado = ref('inactivo');
const procesandoPush = ref(false);
const mensajePush = ref('');
const errorPush = ref(false);

const pushActivo = computed(() => estado.value === 'activo');
const pushDisponible = computed(() => ['activo', 'inactivo'].includes(estado.value));

// Mensaje fijo para los casos donde el interruptor no se puede usar
const MENSAJES_ESTADO = {
  'no-soportado': 'Este navegador no permite notificaciones.',
  'ios-instalar': 'En iPhone primero instala la app: Compartir → "Agregar a inicio", y ábrela desde ahí.',
  bloqueado: 'Las notificaciones están bloqueadas. Actívalas en la configuración del navegador para este sitio.'
};

const mostrarMensaje = (texto, esError = false) => {
  mensajePush.value = texto;
  errorPush.value = esError;
};

const actualizarEstado = async () => {
  estado.value = await estadoPush();
  mostrarMensaje(MENSAJES_ESTADO[estado.value] || '', estado.value === 'bloqueado');
};

const cambiarPush = async (event) => {
  const activar = event.target.checked;
  procesandoPush.value = true;
  try {
    if (activar) {
      // El navegador muestra su propio aviso de permiso junto a la barra de direcciones
      if (Notification.permission === 'default') {
        mostrarMensaje('Permite las notificaciones en el aviso del navegador (junto a la barra de direcciones).');
      }
      await activarPush();
      await actualizarEstado();
      mostrarMensaje('Notificaciones activadas en este dispositivo.');
    } else {
      await desactivarPush();
      await actualizarEstado();
      mostrarMensaje('Notificaciones desactivadas en este dispositivo.');
    }
  } catch (error) {
    await actualizarEstado();
    if (!MENSAJES_ESTADO[estado.value]) mostrarMensaje(error.message, true);
  } finally {
    procesandoPush.value = false;
    event.target.checked = pushActivo.value; // el interruptor refleja el estado real
  }
};

const enviarPrueba = async () => {
  procesandoPush.value = true;
  try {
    await probarPush();
    mostrarMensaje('Notificación de prueba enviada. Debe aparecer en unos segundos.');
  } catch (error) {
    mostrarMensaje(error.message, true);
  } finally {
    procesandoPush.value = false;
  }
};

onMounted(actualizarEstado);

// ── Correos informativos ─────────────────────────────────────
// La preferencia se guarda en la BD (usuarios.recibir_correos, migración 011)
// para que se respete en cualquier dispositivo. Si está apagada, el servidor
// no le manda los resúmenes por correo de los recordatorios.
const config = ref({
  notificacionesEmail: true
});
const cargandoCorreo = ref(true);
const guardando = ref(false);
const mensajeCorreo = ref('');
const errorCorreo = ref(false);

const cargarPreferencias = async () => {
  try {
    const res = await apiFetch('/api/perfil');
    if (!res.ok) throw new Error();
    const perfil = await res.json();
    config.value.notificacionesEmail = perfil.recibir_correos !== false;
  } catch {
    mensajeCorreo.value = 'No se pudo cargar tu preferencia de correos.';
    errorCorreo.value = true;
  } finally {
    cargandoCorreo.value = false;
  }
};

onMounted(cargarPreferencias);

const guardarAjustes = async () => {
  guardando.value = true;
  mensajeCorreo.value = '';
  try {
    const res = await apiFetch('/api/perfil/preferencias', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recibir_correos: config.value.notificacionesEmail })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'No se pudieron guardar los ajustes.');
    mensajeCorreo.value = 'Ajustes guardados.';
    errorCorreo.value = false;
  } catch (error) {
    mensajeCorreo.value = error.message || 'No se pudieron guardar los ajustes.';
    errorCorreo.value = true;
  } finally {
    guardando.value = false;
  }
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
  max-width: 800px;
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

.settings-layout {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.settings-card {
  background: var(--bg-surface, #ffffff);
  border-radius: 16px;
  padding: 1.25rem 1.5rem;
  border: 1px solid var(--border-color, #e2e8f0);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border-color, #e2e8f0);
}

.section-icon {
  width: 24px;
  height: 24px;
  color: var(--brand-primary, #000080);
}

.card-header h3 {
  font-size: 1.05rem;
  font-weight: 700;
  margin: 0;
}

.card-desc {
  font-size: 0.775rem;
  color: var(--text-secondary, #64748b);
  margin: 0.1rem 0 0 0;
}

.setting-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem 0;
}

.setting-option:not(:last-child) {
  border-bottom: 1px dashed var(--border-color, #e2e8f0);
}

.option-text {
  display: flex;
  flex-direction: column;
  padding-right: 1.25rem;
  flex: 1; /* Permite que tome el espacio disponible restante */
  min-width: 0;
}

.option-text label {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary, #0f172a);
}

.option-text span {
  font-size: 0.775rem;
  color: var(--text-secondary, #64748b);
  margin-top: 0.2rem;
  line-height: 1.3;
}

.option-text span strong {
  color: var(--brand-primary, #000080);
}

.push-estado {
  color: var(--brand-primary, #000080) !important;
  font-weight: 600;
}

.push-estado.push-error {
  color: #dc2626 !important;
}

.test-btn {
  align-self: flex-start;
  margin-top: 0.6rem;
  background: transparent;
  color: var(--brand-primary, #000080);
  border: 1px solid var(--brand-primary, #000080);
  padding: 0.4rem 0.9rem;
  border-radius: 8px;
  font-size: 0.775rem;
  font-weight: 600;
  cursor: pointer;
}

.test-btn:disabled,
.toggle-switch:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Fix para mantener el tamaño constante del Checkbox */
.toggle-switch {
  width: 22px;
  height: 22px;
  min-width: 22px;
  min-height: 22px;
  flex-shrink: 0; /* Evita compresión por Flexbox */
  accent-color: var(--brand-primary, #000080);
  cursor: pointer;
}

.actions-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.5rem;
}

.save-btn {
  background: var(--brand-primary, #000080);
  color: #ffffff;
  border: none;
  padding: 0.75rem 1.75rem;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.save-btn:hover {
  opacity: 0.9;
}

.save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>