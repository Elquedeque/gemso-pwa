<template>
  <div class="dashboard-container">
    <!-- Header Componentizado Reutilizable -->
    <AppHeader 
      @toggle-menu="isMenuOpen = true" 
      @toggle-notifications="isNotificationsOpen = true" 
    />

    <!-- Contenido Principal -->
    <main class="dashboard-main">
      <div class="page-title">
        <h2>Accesibilidad</h2>
        <p>Ajusta la apariencia visual del portal según tus necesidades.</p>
      </div>

      <!-- Sección: Tema Visual (Modo Oscuro) -->
      <section class="settings-card">
        <div class="card-header">
          <div class="icon-wrapper">
            <svg viewBox="0 0 24 24" class="card-icon" fill="currentColor">
              <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4C12.92 3.04 12.46 3 12 3z"/>
            </svg>
          </div>
          <div>
            <h3>Apariencia del Tema</h3>
            <p>Selecciona la paleta de colores de tu preferencia.</p>
          </div>
        </div>

        <div class="theme-options">
          <button 
            class="theme-btn" 
            :class="{ active: !isDarkMode }" 
            @click="setDarkMode(false)"
          >
            <div class="theme-preview light-preview">
              <div class="preview-header"></div>
              <div class="preview-body"></div>
            </div>
            <span>Modo Claro</span>
          </button>

          <button 
            class="theme-btn" 
            :class="{ active: isDarkMode }" 
            @click="setDarkMode(true)"
          >
            <div class="theme-preview dark-preview">
              <div class="preview-header"></div>
              <div class="preview-body"></div>
            </div>
            <span>Modo Oscuro</span>
          </button>
        </div>
      </section>

      <!-- Sección: Ajuste de Texto -->
      <section class="settings-card">
        <div class="card-header">
          <div class="icon-wrapper">
            <svg viewBox="0 0 24 24" class="card-icon" fill="currentColor">
              <path d="M2.5 4v3h5v12h3V7h5V4h-13zm19 5h-9v3h3v7h3v-7h3V9z"/>
            </svg>
          </div>
          <div>
            <h3>Tamaño de Letra</h3>
            <p>Aumenta el tamaño del texto para facilitar la lectura.</p>
          </div>
        </div>

        <div class="toggle-row">
          <label class="toggle-label" for="font-size-select">Tamaño del texto</label>
          <select id="font-size-select" v-model="fontSize" @change="updateFontSize" class="custom-select">
            <option value="normal">Normal (Predeterminado)</option>
            <option value="grande">Grande (+10%)</option>
            <option value="muy-grande">Muy Grande (+20%)</option>
          </select>
        </div>
      </section>

      <!-- Sección: Mayor Contraste -->
      <section class="settings-card">
        <div class="card-header">
          <div class="icon-wrapper">
            <svg viewBox="0 0 24 24" class="card-icon" fill="currentColor">
              <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
            </svg>
          </div>
          <div>
            <h3>Mayor Contraste</h3>
            <p>Resalta bordes y textos para mejorar la nitidez.</p>
          </div>
        </div>

        <div class="toggle-row">
          <span class="toggle-label">Aumentar contraste de bordes</span>
          <label class="switch">
            <input type="checkbox" v-model="highContrast" @change="toggleHighContrast">
            <span class="slider round"></span>
          </label>
        </div>
      </section>
    </main>

    <!-- Menú Lateral Reusable -->
    <SidebarMenu 
      :is-open="isMenuOpen" 
      @close="isMenuOpen = false" 
    />

    <!-- Drawer de Notificaciones -->
    <NotificationsDrawer 
      :is-open="isNotificationsOpen" 
      @close="isNotificationsOpen = false" 
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import AppHeader from '../components/AppHeader.vue';
import SidebarMenu from '../components/SidebarMenu.vue';
import NotificationsDrawer from '../components/NotificationsDrawer.vue';

const router = useRouter();
const isMenuOpen = ref(false);
const isNotificationsOpen = ref(false);
const isDarkMode = ref(false);
const fontSize = ref('normal');
const highContrast = ref(false);

onMounted(() => {
  if (typeof window !== 'undefined') {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || document.documentElement.classList.contains('dark')) {
      isDarkMode.value = true;
    }

    const savedSize = localStorage.getItem('fontSize');
    if (savedSize) {
      fontSize.value = savedSize;
    }

    highContrast.value = localStorage.getItem('highContrast') === 'true';
  }
});

const setDarkMode = (enableDark) => {
  isDarkMode.value = enableDark;
  if (enableDark) {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  } else {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  }
};

const updateFontSize = () => {
  localStorage.setItem('fontSize', fontSize.value);
  if (fontSize.value === 'grande') {
    document.documentElement.style.fontSize = '110%';
  } else if (fontSize.value === 'muy-grande') {
    document.documentElement.style.fontSize = '120%';
  } else {
    document.documentElement.style.fontSize = '100%';
  }
};

const toggleHighContrast = () => {
  localStorage.setItem('highContrast', highContrast.value);
  if (highContrast.value) {
    document.documentElement.classList.add('high-contrast');
  } else {
    document.documentElement.classList.remove('high-contrast');
  }
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
  transition: background-color 0.3s ease, color 0.3s ease;
}

.dashboard-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  max-width: 700px;
  width: 100%;
  margin: 0 auto;
  padding: 1.5rem 1.25rem;
  box-sizing: border-box;
}

.page-title h2 {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 0.25rem 0;
  color: var(--text-primary, #0f172a);
}

.page-title p {
  font-size: 0.9rem;
  color: var(--text-secondary, #64748b);
  margin: 0;
}

.settings-card {
  background: var(--bg-surface, #ffffff);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 16px;
  padding: 1.25rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  margin-bottom: 1.25rem;
}

.icon-wrapper {
  background: rgba(2, 132, 199, 0.1);
  color: var(--brand-accent, #0284c7);
  width: 42px;
  height: 42px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.card-icon {
  width: 22px;
  height: 22px;
}

.card-header h3 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--text-primary, #0f172a);
}

.card-header p {
  margin: 0.2rem 0 0 0;
  font-size: 0.8rem;
  color: var(--text-secondary, #64748b);
}

.theme-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.theme-btn {
  background: transparent;
  border: 2px solid var(--border-color, #e2e8f0);
  border-radius: 12px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.theme-btn span {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary, #0f172a);
}

.theme-btn.active {
  border-color: var(--brand-accent, #0284c7);
  background: rgba(2, 132, 199, 0.05);
}

.theme-btn.active span {
  color: var(--brand-accent, #0284c7);
}

.theme-preview {
  width: 100%;
  height: 55px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}

.light-preview {
  background: #f1f5f9;
}
.light-preview .preview-header {
  height: 16px;
  background: #ffffff;
  border-bottom: 1px solid #cbd5e1;
}
.light-preview .preview-body {
  flex: 1;
  background: #ffffff;
  margin: 6px;
  border-radius: 4px;
}

.dark-preview {
  background: #0b1120;
}
.dark-preview .preview-header {
  height: 16px;
  background: #1e293b;
}
.dark-preview .preview-body {
  flex: 1;
  background: #1e293b;
  margin: 6px;
  border-radius: 4px;
}

.toggle-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 0.5rem;
}

.toggle-label {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-primary, #0f172a);
}

.custom-select {
  padding: 0.5rem 0.8rem;
  border-radius: 8px;
  border: 1px solid var(--border-color, #cbd5e1);
  background-color: var(--bg-surface, #ffffff);
  color: var(--text-primary, #0f172a);
  font-size: 0.85rem;
  outline: none;
}

.switch {
  position: relative;
  display: inline-block;
  width: 46px;
  height: 24px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: var(--border-color, #cbd5e1);
  transition: .3s;
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: .3s;
}

.slider.round {
  border-radius: 24px;
}

.slider.round:before {
  border-radius: 50%;
}

input:checked + .slider {
  background-color: var(--brand-accent, #0284c7);
}

input:checked + .slider:before {
  transform: translateX(22px);
}
</style>