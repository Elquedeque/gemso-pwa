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
        <p class="subtitle">Resuelve tus dudas o reporta un problema técnico con la plataforma</p>
      </header>

      <div class="help-grid">
        <!-- Columna Izquierda: Formulario de Reporte / Contacto -->
        <section class="help-section">
          <article class="help-card">
            <div class="card-header">
              <svg class="section-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 8h-3V4c0-1.1-.9-2-2-2H9c-1.1 0-2 .9-2 2v4H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 4h6v4H9V4zm11 16H4V10h16v10z"/>
              </svg>
              <div>
                <h3>Reportar un Problema</h3>
                <p class="card-desc">Envía un ticket a Soporte TI / Talento y Cultura</p>
              </div>
            </div>

            <!-- Alerta de éxito al enviar -->
            <div v-if="enviadoConExito" class="success-alert">
              <svg class="alert-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <div>
                <strong>¡Reporte enviado con éxito!</strong>
                <p>El equipo de soporte revisará tu caso a la brevedad.</p>
              </div>
            </div>

            <!-- Formulario -->
            <form v-else @submit.prevent="enviarReporte" class="help-form">
              <div class="form-group">
                <label for="asunto">Categoría o Asunto *</label>
                <select id="asunto" v-model="form.categoria" required class="form-input">
                  <option value="" disabled selected>Selecciona una opción</option>
                  <option value="falla_app">Falla técnica en la aplicación</option>
                  <option value="cuenta_acceso">Problemas de acceso o contraseña</option>
                  <option value="datos_erroneos">Información personal / laboral incorrecta</option>
                  <option value="sugerencia">Sugerencia de mejora</option>
                  <option value="otro">Otro motivo</option>
                </select>
              </div>

              <div class="form-group">
                <label for="descripcion">Descripción del Problema *</label>
                <textarea 
                  id="descripcion" 
                  v-model="form.descripcion" 
                  rows="4" 
                  placeholder="Detalla qué estabas haciendo o qué error te aparece..." 
                  required 
                  class="form-input textarea"
                ></textarea>
              </div>

              <button type="submit" class="submit-btn" :disabled="enviando">
                <span v-if="enviando">Enviando...</span>
                <span v-else>Enviar Reporte</span>
              </button>
            </form>
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

const isMenuOpen = ref(false);
const isNotificationsOpen = ref(false);

const enviando = ref(false);
const enviadoConExito = ref(false);

const form = ref({
  categoria: '',
  descripcion: ''
});

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
    respuesta: 'Intenta recargar la página o borrar la caché de tu navegador. Si el problema persiste, envía un reporte usando el formulario en esta pantalla.'
  },
  {
    pregunta: '¿Dónde consulto mis documentos laborales?',
    respuesta: 'Puedes ingresar al menú lateral desplegable y seleccionar la sección "Documentos" para ver o descargar tus archivos organizacionales.'
  }
]);

const enviarReporte = () => {
  enviando.value = true;
  
  // Simulación de envío (aquí se conectará a la API del backend)
  setTimeout(() => {
    enviando.value = false;
    enviadoConExito.value = true;
    
    // Resetear formulario tras 4 segundos
    setTimeout(() => {
      enviadoConExito.value = false;
      form.value.categoria = '';
      form.value.descripcion = '';
    }, 4000);
  }, 1000);
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

/* Formulario */
.help-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-group label {
  font-size: 0.825rem;
  font-weight: 600;
  color: var(--text-primary, #0f172a);
}

.form-input {
  width: 100%;
  padding: 0.75rem 0.85rem;
  border-radius: 10px;
  border: 1px solid var(--border-color, #cbd5e1);
  background-color: var(--bg-surface, #ffffff);
  color: var(--text-primary, #0f172a);
  font-size: 0.9rem;
  box-sizing: border-box;
  outline: none;
  transition: border-color 0.2s ease;
}

.form-input:focus {
  border-color: var(--brand-primary, #000080);
}

.textarea {
  resize: vertical;
  font-family: inherit;
}

.submit-btn {
  background: var(--brand-primary, #000080);
  color: #ffffff;
  border: none;
  padding: 0.8rem;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: opacity 0.2s ease;
  margin-top: 0.5rem;
}

.submit-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Alerta de Éxito */
.success-alert {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  background-color: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #166534;
  padding: 1rem;
  border-radius: 12px;
}

.alert-icon {
  width: 24px;
  height: 24px;
  color: #22c55e;
  flex-shrink: 0;
}

.success-alert strong {
  font-size: 0.95rem;
}

.success-alert p {
  font-size: 0.825rem;
  margin: 0.2rem 0 0 0;
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
  font-size: 0.825rem;
  color: var(--text-secondary, #64748b);
  margin: 0.5rem 0 0 0;
  line-height: 1.4;
}
</style>