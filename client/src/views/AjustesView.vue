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

          <!-- Notificaciones Push -->
          <div class="setting-option">
            <div class="option-text">
              <label>Notificaciones Push</label>
              <span>Recibir alertas sobre nuevos anuncios en el dispositivo. <strong>Se recomienda mantener esta opción activada para no perderte comunicados urgentes o avisos operativos.</strong></span>
            </div>
            <input type="checkbox" v-model="config.notificacionesPush" class="toggle-switch" />
          </div>

          <!-- Correos Informativos -->
          <div class="setting-option">
            <div class="option-text">
              <label>Correos Informativos</label>
              <span>Recibir un resumen por email con la información relevante enviada durante el periodo.</span>
            </div>
            <input type="checkbox" v-model="config.notificacionesEmail" class="toggle-switch" />
          </div>
        </article>

        <!-- Guardado Rápido -->
        <div class="actions-wrapper">
          <button class="save-btn" @click="guardarAjustes">
            Guardar Cambios
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
import { ref } from 'vue';
import AppHeader from '../components/AppHeader.vue';
import SidebarMenu from '../components/SidebarMenu.vue';
import NotificationsDrawer from '../components/NotificationsDrawer.vue';

const isMenuOpen = ref(false);
const isNotificationsOpen = ref(false);

const config = ref({
  notificacionesPush: true,
  notificacionesEmail: false
});

const guardarAjustes = () => {
  localStorage.setItem('pwa_config', JSON.stringify(config.value));
  alert('Ajustes guardados correctamente');
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
</style>