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
        <div>
          <h2>Mi Perfil</h2>
          <p class="subtitle">Información personal y de tu cuenta laboral</p>
        </div>
        <router-link v-if="perfil" to="/perfil/editar" class="edit-btn">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
          </svg>
          Editar perfil
        </router-link>
      </header>

      <!-- Estado de Carga / Error -->
      <div v-if="cargando" class="estado-box">
        <p>Cargando perfil...</p>
      </div>

      <div v-else-if="errorCarga" class="estado-box">
        <h3>{{ errorCarga }}</h3>
        <button class="retry-btn" @click="cargarPerfil">Reintentar</button>
      </div>

      <div v-else-if="perfil" class="profile-layout">
        <!-- Tarjeta Resumen / Avatar (iniciales, no depende de servicios externos) -->
        <aside class="profile-card hero-card">
          <div class="avatar-wrapper">
            <div class="avatar-img" :aria-label="perfil.nombre_completo">{{ iniciales }}</div>
            <span class="status-badge" title="Activo"></span>
          </div>
          <h3 class="user-name">{{ perfil.nombre_completo }}</h3>
          <p class="user-role">{{ mostrar(perfil.puesto) }}</p>
          <span class="department-tag">{{ mostrar(perfil.departamento) }}</span>

          <div class="quick-stats">
            <div class="stat-item">
              <span class="stat-value">{{ antiguedad }}</span>
              <span class="stat-label">Antigüedad</span>
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
                <p>{{ perfil.nombre_completo }}</p>
              </div>
              <div class="info-item">
                <label>Correo Electrónico</label>
                <p>{{ perfil.correo }}</p>
              </div>
              <div class="info-item">
                <label>Teléfono de Contacto</label>
                <p :class="{ 'sin-dato': !perfil.telefono }">{{ telefonoTexto }}</p>
              </div>
              <div class="info-item">
                <label>Sucursal</label>
                <p :class="{ 'sin-dato': !perfil.sucursal }">{{ mostrar(perfil.sucursal) }}</p>
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
                <!-- La empresa pertenece siempre al grupo corporativo GEMSO -->
                <p :class="{ 'sin-dato': !perfil.empresa }">{{ mostrar(perfil.empresa) }}</p>
                <span class="grupo-tag">Grupo GEMSO</span>
              </div>
              <div class="info-item">
                <label>Gerente</label>
                <p :class="{ 'sin-dato': !perfil.gerente }">{{ mostrar(perfil.gerente) }}</p>
              </div>
              <div class="info-item">
                <label>Fecha de Ingreso</label>
                <p>{{ fechaIngresoTexto }}</p>
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
import { ref, computed, onMounted } from 'vue';
import AppHeader from '../components/AppHeader.vue';
import SidebarMenu from '../components/SidebarMenu.vue';
import NotificationsDrawer from '../components/NotificationsDrawer.vue';
import { apiFetch } from '../api';
import { mostrar, obtenerIniciales, formatearTelefono, formatearFecha, calcularAntiguedad } from '../utils/perfil';

const isMenuOpen = ref(false);
const isNotificationsOpen = ref(false);

// Datos que devuelve GET /api/perfil (ver server/routes/perfil.js)
const perfil = ref(null);
const cargando = ref(false);
const errorCarga = ref('');

const iniciales = computed(() => obtenerIniciales(perfil.value?.nombre_completo));
const telefonoTexto = computed(() => formatearTelefono(perfil.value?.telefono));
const fechaIngresoTexto = computed(() => formatearFecha(perfil.value?.fecha_ingreso));
const antiguedad = computed(() => calcularAntiguedad(perfil.value?.fecha_ingreso));

const cargarPerfil = async () => {
  cargando.value = true;
  errorCarga.value = '';
  try {
    const res = await apiFetch('/api/perfil');
    const data = await res.json();
    if (!res.ok) {
      errorCarga.value = data.error || 'No se pudo cargar el perfil';
      return;
    }
    perfil.value = data;
  } catch (error) {
    console.error('Error al cargar el perfil:', error);
    errorCarga.value = 'No se pudo conectar con el servidor';
  } finally {
    cargando.value = false;
  }
};

onMounted(cargarPerfil);
</script>

<!-- Estilos compartidos con EditarPerfilView -->
<style scoped src="../assets/perfil.css"></style>
