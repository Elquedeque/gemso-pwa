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
        <h2>Mi Perfil</h2>
        <p class="subtitle">Información personal y de tu cuenta laboral</p>
      </header>

      <div class="profile-layout">
        <!-- Tarjeta Resumen / Avatar -->
        <aside class="profile-card hero-card">
          <div class="avatar-wrapper">
            <img :src="usuario.avatar" :alt="usuario.nombre" class="avatar-img" />
            <span class="status-badge" title="Activo"></span>
          </div>
          <h3 class="user-name">{{ usuario.nombre }}</h3>
          <p class="user-role">{{ usuario.puesto }}</p>
          <span class="department-tag">{{ usuario.departamento }}</span>

          <div class="quick-stats">
            <div class="stat-item">
              <span class="stat-value">{{ usuario.antiguedad }}</span>
              <span class="stat-label">Antigüedad</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-item">
              <span class="stat-value">{{ usuario.expediente }}</span>
              <span class="stat-label">N° Empleado</span>
            </div>
          </div>
        </aside>

        <!-- Secciones de Información Detallada -->
        <section class="profile-details">
          <!-- Datos Personales -->
          <article class="profile-card">
            <div class="card-header">
              <svg class="section-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
              <h3>Datos Personales</h3>
            </div>
            <div class="info-grid">
              <div class="info-item">
                <label>Nombre Completo</label>
                <p>{{ usuario.nombre }}</p>
              </div>
              <div class="info-item">
                <label>Correo Electrónico</label>
                <p>{{ usuario.correo }}</p>
              </div>
              <div class="info-item">
                <label>Teléfono de Contacto</label>
                <p>{{ usuario.telefono }}</p>
              </div>
              <div class="info-item">
                <label>Ubicación / Sucursal</label>
                <p>{{ usuario.sucursal }}</p>
              </div>
            </div>
          </article>

          <!-- Información Laboral (T&C) -->
          <article class="profile-card">
            <div class="card-header">
              <svg class="section-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z"/>
              </svg>
              <h3>Información Organizacional</h3>
            </div>
            <div class="info-grid">
              <div class="info-item">
                <label>Empresa</label>
                <p>{{ usuario.empresa }}</p>
              </div>
              <div class="info-item">
                <label>Jefe Inmediato</label>
                <p>{{ usuario.jefeInmediato }}</p>
              </div>
              <div class="info-item">
                <label>Fecha de Ingreso</label>
                <p>{{ usuario.fechaIngreso }}</p>
              </div>
              <div class="info-item">
                <label>Tipo de Contrato</label>
                <p>{{ usuario.tipoContrato }}</p>
              </div>
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

const usuario = ref({
  nombre: 'Francisco Alberto Salazar Figueroa',
  puesto: 'Practicante de Desarrollo PWA',
  departamento: 'Tecnologías de la Información',
  empresa: 'GEMSO',
  correo: 'francisco.salazar@gemso.com.mx',
  telefono: '+52 (662) 123-4567',
  sucursal: 'Hermosillo, Sonora',
  antiguedad: '6 meses',
  expediente: 'EMP-9042',
  jefeInmediato: 'Ing. Supervisor T&C',
  fechaIngreso: '01 Mar 2026',
  tipoContrato: 'Residencia Profesional',
  avatar: 'https://ui-avatars.com/api/?name=Francisco+Salazar&background=000080&color=ffffff&size=128'
});
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
  max-width: 1200px; /* Ancho máximo amplio para laptops, TV y monitores de escritorio */
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

/* Layout Responsivo (Grid de 2 columnas en Desktop/TV, 1 columna en Móvil) */
.profile-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
}

@media (min-width: 850px) {
  .profile-layout {
    grid-template-columns: 320px 1fr;
    align-items: start;
  }
}

/* Estilo Base de las Tarjetas */
.profile-card {
  background: var(--bg-surface, #ffffff);
  border-radius: 16px;
  padding: 1.5rem;
  border: 1px solid var(--border-color, #e2e8f0);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
}

/* Tarjeta Hero (Avatar) */
.hero-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.avatar-wrapper {
  position: relative;
  margin-bottom: 1rem;
}

.avatar-img {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
  border: 4px solid var(--brand-primary, #000080);
}

.status-badge {
  position: absolute;
  bottom: 6px;
  right: 6px;
  width: 16px;
  height: 16px;
  background-color: #22c55e;
  border: 2px solid #ffffff;
  border-radius: 50%;
}

.user-name {
  font-size: 1.15rem;
  font-weight: 700;
  margin: 0 0 0.25rem 0;
  color: var(--text-primary, #0f172a);
}

.user-role {
  font-size: 0.875rem;
  color: var(--text-secondary, #64748b);
  margin: 0 0 0.75rem 0;
}

.department-tag {
  background-color: var(--bg-primary, #f1f5f9);
  color: var(--brand-primary, #000080);
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.35rem 0.85rem;
  border-radius: 20px;
  margin-bottom: 1.5rem;
}

.quick-stats {
  display: flex;
  align-items: center;
  justify-content: space-around;
  width: 100%;
  padding-top: 1.25rem;
  border-top: 1px solid var(--border-color, #e2e8f0);
}

.stat-item {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 1rem;
  font-weight: 700;
  color: var(--brand-primary, #000080);
}

.stat-label {
  font-size: 0.75rem;
  color: var(--text-secondary, #64748b);
}

.stat-divider {
  width: 1px;
  height: 28px;
  background-color: var(--border-color, #e2e8f0);
}

/* Detalle de Secciones */
.profile-details {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 1.25rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border-color, #e2e8f0);
}

.section-icon {
  width: 22px;
  height: 22px;
  color: var(--brand-primary, #000080);
}

.card-header h3 {
  font-size: 1.05rem;
  font-weight: 700;
  margin: 0;
}

/* Grid de Información (2 columnas en tablet/desktop, 1 columna en teléfonos) */
.info-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

@media (min-width: 580px) {
  .info-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.info-item label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary, #64748b);
  text-transform: uppercase;
  letter-spacing: 0.3px;
  display: block;
  margin-bottom: 0.25rem;
}

.info-item p {
  font-size: 0.925rem;
  font-weight: 500;
  color: var(--text-primary, #0f172a);
  margin: 0;
  word-break: break-word;
}
</style>