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
        <h2>Centro de Ayuda y Soporte</h2>
        <p class="subtitle">Resuelve tus dudas o envía una solicitud a Talento y Cultura</p>
      </header>

      <div class="help-grid">
        <!-- Columna Izquierda: Solicitudes y contacto -->
        <section class="help-section">
          <!-- Las solicitudes se hacen en el formulario de Monday que ya usa la empresa.
               La app no guarda reportes propios para no tener dos lugares donde revisar. -->
          <article class="help-card">
            <div class="card-header">
              <svg class="section-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 8h-3V4c0-1.1-.9-2-2-2H9c-1.1 0-2 .9-2 2v4H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 4h6v4H9V4zm11 16H4V10h16v10z"/>
              </svg>
              <div>
                <h3>Hacer una Solicitud</h3>
                <p class="card-desc">Problemas con la app, tu cuenta o tus datos</p>
              </div>
            </div>

            <p class="card-text">
              Las solicitudes a Talento y Cultura se registran en el formulario de Monday.
              Ahí puedes reportar una falla de la aplicación, un problema para entrar,
              información incorrecta en tu perfil o una sugerencia.
            </p>

            <a
              :href="URL_SOLICITUD_TYC"
              target="_blank"
              rel="noopener noreferrer"
              class="submit-btn"
            >
              Abrir formulario de solicitud
              <svg class="btn-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
              </svg>
            </a>
            <p class="card-note">Se abre en una pestaña nueva.</p>
          </article>

          <!-- Contacto Directo Rápido -->
          <article class="help-card contact-card">
            <h4>¿Necesitas atención inmediata?</h4>
            <p>Puedes comunicarte directamente con el área de TI / Talento y Cultura:</p>
            <div class="contact-links">
              <a href="mailto:fsalazar@gemso.com.mx" class="contact-btn email">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                <span>Correo de Soporte</span>
              </a>
            </div>
          </article>
        </section>

        <!-- Columna Derecha: Preguntas Frecuentes (FAQ) -->
        <section class="help-section">
          <article class="help-card">
            <div class="card-header">
              <svg class="section-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 16h-2v-2h2v2zm1.07-7.75l-.9.92C12.45 11.9 12 12.5 12 14h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z"/>
              </svg>
              <div>
                <h3>Preguntas Frecuentes</h3>
                <p class="card-desc">Respuestas rápidas a dudas comunes</p>
              </div>
            </div>

            <div class="faq-list">
              <details v-for="(item, index) in faqs" :key="index" class="faq-item">
                <summary class="faq-question">{{ item.pregunta }}</summary>
                <p class="faq-answer">{{ item.respuesta }}</p>
              </details>
            </div>
          </article>
        </section>
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
import { URL_SOLICITUD_TYC } from '../utils/enlaces';

const isMenuOpen = ref(false);
const isNotificationsOpen = ref(false);

const faqs = ref([
  {
    pregunta: '¿Cómo puedo instalar la PWA en mi teléfono celular?',
    respuesta: 'En Android (Chrome), presiona el menú de 3 puntos arriba a la derecha y selecciona "Agregar a la pantalla principal". En iPhone (Safari), toca el botón "Compartir" en la barra inferior y elige "Agregar al inicio".'
  },
  {
    pregunta: '¿Por qué no recibo notificaciones de nuevos avisos?',
    respuesta: 'Asegúrate de tener activadas las "Notificaciones Push" dentro de la pantalla de Ajustes y de haber otorgado los permisos necesarios a tu navegador.'
  },
  {
    pregunta: '¿Qué hago si la aplicación no carga correctamente?',
    respuesta: 'Intenta recargar la página o borrar la caché de tu navegador. Si el problema persiste, envía una solicitud con el formulario de esta pantalla.'
  },
  {
    pregunta: '¿Cómo hago una solicitud a Talento y Cultura?',
    respuesta: 'Usa el botón "Abrir formulario de solicitud" de esta pantalla o la opción "Solicitud T&C" del menú lateral. Las dos abren el formulario de Monday donde Talento y Cultura da seguimiento.'
  }
]);

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
  max-width: 1100px;
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

/* Layout Responsivo (Grid 2 columnas en Desktop, 1 en Móvil) */
.help-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
}

@media (min-width: 850px) {
  .help-grid {
    grid-template-columns: 1fr 1fr;
    align-items: start;
  }
}

.help-section {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.help-card {
  background: var(--bg-surface, #ffffff);
  border-radius: 16px;
  padding: 1.5rem;
  border: 1px solid var(--border-color, #e2e8f0);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border-color, #e2e8f0);
}

.section-icon {
  width: 26px;
  height: 26px;
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

/* Tarjeta de solicitud */
.card-text {
  font-size: 0.875rem;
  line-height: 1.5;
  color: color-mix(in srgb, var(--text-primary, #0f172a) 85%, transparent);
  margin: 0 0 1.25rem 0;
}

.card-note {
  font-size: 0.75rem;
  color: var(--text-secondary, #64748b);
  text-align: center;
  margin: 0.5rem 0 0 0;
}

.btn-icon {
  width: 16px;
  height: 16px;
}

.submit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  text-decoration: none;
  background: var(--brand-primary, #000080);
  color: #ffffff;
  border: none;
  padding: 0.8rem;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.submit-btn:hover {
  opacity: 0.9;
}

/* Contacto Rápido */
.contact-card h4 {
  margin: 0 0 0.25rem 0;
  font-size: 0.95rem;
  font-weight: 700;
}

.contact-card p {
  font-size: 0.825rem;
  color: var(--text-secondary, #64748b);
  margin: 0 0 1rem 0;
}

.contact-links {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.contact-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.65rem 1rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  text-decoration: none;
  transition: opacity 0.2s ease;
}

.contact-btn.email {
  background-color: var(--bg-primary, #f1f5f9);
  color: var(--text-primary, #0f172a);
  border: 1px solid var(--border-color, #e2e8f0);
}

.contact-btn svg {
  width: 18px;
  height: 18px;
}

/* FAQ Accordion */
.faq-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.faq-item {
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 10px;
  padding: 0.75rem 1rem;
  background-color: var(--bg-primary, #f8fafc);
  transition: background-color 0.2s ease;
}

.faq-item[open] {
  background-color: var(--bg-surface, #ffffff);
}

.faq-question {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--text-primary, #0f172a);
  cursor: pointer;
  outline: none;
  user-select: none;
}

.faq-answer {
  font-size: 0.85rem;
  /* Texto principal un poco atenuado: más legible que el gris secundario en ambos temas */
  color: color-mix(in srgb, var(--text-primary, #0f172a) 85%, transparent);
  margin: 0.5rem 0 0 0;
  line-height: 1.5;
}
</style>