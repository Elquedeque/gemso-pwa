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
        <h2>Directorio de Contacto</h2>
        <p class="subtitle">Canales oficiales de atención e información interna</p>
      </header>

      <div class="contact-grid">
        <!-- Tarjeta: Talento y Cultura -->
        <article class="contact-card">
          <div class="card-badge">Atención al Personal</div>
          <div class="card-header">
            <div class="icon-avatar">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
              </svg>
            </div>
            <div>
              <h3>Talento y Cultura</h3>
              <p class="department-desc">Dudas sobre nómina, beneficios, vacantes e incidencias</p>
            </div>
          </div>

          <div class="contact-details">
            <div class="detail-item">
              <span class="detail-label">Correo Electrónico</span>
              <a href="mailto:CorreoEjemploTyC@gemso.com.mx" class="detail-value link">
                CorreoEjemploTyC@gemso.com.mx
              </a>
            </div>

            <div class="detail-item">
              <span class="detail-label">Teléfono de Atención</span>
              <a href="tel:6621234567" class="detail-value link">
                (662) XXX-XXXX ext. 101
              </a>
            </div>

            <div class="detail-item">
              <span class="detail-label">Horario de Atención</span>
              <span class="detail-value">Lunes a Viernes: 8:00 AM - 6:00 PM</span>
            </div>
          </div>
        </article>

        <!-- Tarjeta: Soporte y Sistemas -->
        <article class="contact-card">
          <div class="card-badge systems">Soporte Técnico</div>
          <div class="card-header">
            <div class="icon-avatar systems">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z"/>
              </svg>
            </div>
            <div>
              <h3>Sistemas / TI</h3>
              <p class="department-desc">Asistencia con accesos, equipos y fallas del sistema</p>
            </div>
          </div>

          <div class="contact-details">
            <div class="detail-item">
              <span class="detail-label">Correo Electrónico</span>
              <a href="mailto:CorreoEjemploSistemas@gemso.com.mx" class="detail-value link">
                CorreoEjemploSistemas@gemso.com.mx
              </a>
            </div>

            <div class="detail-item">
              <span class="detail-label">Mesa de Ayuda</span>
              <a href="tel:6621234568" class="detail-value link">
                (662) XXX-XXXX ext. 202
              </a>
            </div>

            <div class="detail-item">
              <span class="detail-label">Horario de Atención</span>
              <span class="detail-value">Lunes a Sábado: 8:00 AM - 6:00 PM</span>
            </div>
          </div>
        </article>
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

/* Grid Adaptativo para TV, PC, Laptop y Celular */
.contact-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
}

@media (min-width: 768px) {
  .contact-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Tarjetas de Contacto */
.contact-card {
  position: relative;
  background: var(--bg-surface, #ffffff);
  border-radius: 16px;
  padding: 1.5rem;
  border: 1px solid var(--border-color, #e2e8f0);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.card-badge {
  position: absolute;
  top: 1.25rem;
  right: 1.25rem;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.25rem 0.65rem;
  border-radius: 20px;
  background-color: #e0e7ff;
  color: var(--brand-primary, #000080);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.card-badge.systems {
  background-color: #f1f5f9;
  color: #475569;
}

.card-header {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding-right: 5rem; /* Espacio para el badge */
}

.icon-avatar {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  background-color: var(--brand-primary, #000080);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-avatar.systems {
  background-color: #0284c7;
}

.icon-avatar svg {
  width: 24px;
  height: 24px;
}

.card-header h3 {
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0 0 0.2rem 0;
}

.department-desc {
  font-size: 0.8rem;
  color: var(--text-secondary, #64748b);
  margin: 0;
  line-height: 1.3;
}

/* Lista de Detalles */
.contact-details {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-top: 1rem;
  border-top: 1px dashed var(--border-color, #e2e8f0);
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.detail-label {
  font-size: 0.725rem;
  font-weight: 600;
  color: var(--text-secondary, #64748b);
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.detail-value {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary, #0f172a);
}

.detail-value.link {
  color: var(--brand-primary, #000080);
  text-decoration: none;
  transition: opacity 0.2s ease;
  word-break: break-all;
}

.detail-value.link:hover {
  opacity: 0.8;
  text-decoration: underline;
}
</style>