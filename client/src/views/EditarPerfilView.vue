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
          <h2>Editar Perfil</h2>
          <p class="subtitle">Actualiza tus datos personales</p>
        </div>
      </header>

      <!-- Estado de Carga / Error -->
      <div v-if="cargando" class="estado-box">
        <p>Cargando perfil...</p>
      </div>

      <div v-else-if="errorCarga" class="estado-box">
        <h3>{{ errorCarga }}</h3>
        <button class="retry-btn" @click="cargarDatos">Reintentar</button>
      </div>

      <!-- Misma distribución que PerfilView, con inputs en los campos editables -->
      <form v-else-if="perfil" class="profile-layout" @submit.prevent="guardar">
        <!-- Tarjeta Resumen / Avatar (se actualiza mientras se escribe el nombre) -->
        <aside class="profile-card hero-card">
          <div class="avatar-wrapper">
            <div class="avatar-img" :aria-label="formulario.nombre_completo">{{ iniciales }}</div>
            <span class="status-badge" title="Activo"></span>
          </div>
          <h3 class="user-name">{{ formulario.nombre_completo || 'Sin nombre' }}</h3>
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
          <!-- Datos Personales (editables, salvo la sucursal) -->
          <article class="profile-card">
            <div class="card-header">
              <svg class="section-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
              <h3>Datos Personales</h3>
            </div>
            <div class="info-grid">
              <div class="info-item">
                <label for="nombre">Nombre Completo *</label>
                <input
                  id="nombre"
                  type="text"
                  class="field-input"
                  v-model="formulario.nombre_completo"
                  maxlength="150"
                  autocomplete="name"
                  required
                />
              </div>
              <div class="info-item">
                <label for="correo">Correo Electrónico *</label>
                <input
                  id="correo"
                  type="email"
                  class="field-input"
                  v-model="formulario.correo"
                  maxlength="150"
                  autocomplete="email"
                  autocapitalize="none"
                  autocorrect="off"
                  spellcheck="false"
                  required
                />
              </div>
              <div class="info-item">
                <label for="telefono">Teléfono de Contacto *</label>
                <input
                  id="telefono"
                  type="tel"
                  class="field-input"
                  v-model="formulario.telefono"
                  inputmode="numeric"
                  autocomplete="tel-national"
                  maxlength="10"
                  pattern="[0-9]{10}"
                  title="10 dígitos, sin espacios ni guiones"
                  placeholder="Ej. 6621234567"
                  @input="formulario.telefono = formulario.telefono.replace(/\D/g, '')"
                  required
                />
              </div>
              <div class="info-item">
                <label>Sucursal</label>
                <p :class="{ 'sin-dato': !perfil.sucursal }">{{ mostrar(perfil.sucursal) }}</p>
                <span class="locked-note">Lo actualiza Talento y Cultura</span>
              </div>
            </div>
          </article>

          <!-- Información Organizacional (solo la empresa es editable) -->
          <article class="profile-card">
            <div class="card-header">
              <svg class="section-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z"/>
              </svg>
              <h3>Información Organizacional</h3>
            </div>
            <div class="info-grid">
              <div class="info-item">
                <label for="empresa">Empresa *</label>
                <select id="empresa" class="field-input" v-model="formulario.id_empresa" required>
                  <option value="" disabled>Selecciona empresa</option>
                  <option v-for="emp in empresas" :key="emp.id_emp" :value="emp.id_emp">
                    {{ emp.nombre }}
                  </option>
                </select>
                <span class="grupo-tag">Grupo GEMSO</span>
              </div>
              <div class="info-item">
                <label>Gerente</label>
                <p :class="{ 'sin-dato': !perfil.gerente }">{{ mostrar(perfil.gerente) }}</p>
                <span class="locked-note">Lo actualiza Talento y Cultura</span>
              </div>
              <div class="info-item">
                <label>Fecha de Ingreso</label>
                <p>{{ fechaIngresoTexto }}</p>
                <span class="locked-note">Lo actualiza Talento y Cultura</span>
              </div>
            </div>
          </article>

          <p v-if="errorGuardar" class="error-text">{{ errorGuardar }}</p>

          <div class="form-actions">
            <router-link to="/perfil" class="cancel-btn">Cancelar</router-link>
            <button type="submit" class="save-btn" :disabled="guardando">
              {{ guardando ? 'Guardando...' : 'Guardar cambios' }}
            </button>
          </div>
        </section>
      </form>
    </main>

    <!-- Menú desplegable lateral y notificaciones -->
    <SidebarMenu :is-open="isMenuOpen" @close="isMenuOpen = false" />
    <NotificationsDrawer :is-open="isNotificationsOpen" @close="isNotificationsOpen = false" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import AppHeader from '../components/AppHeader.vue';
import SidebarMenu from '../components/SidebarMenu.vue';
import NotificationsDrawer from '../components/NotificationsDrawer.vue';
import { apiFetch } from '../api';
import { mostrar, obtenerIniciales, formatearFecha, calcularAntiguedad } from '../utils/perfil';

const router = useRouter();
const isMenuOpen = ref(false);
const isNotificationsOpen = ref(false);

// Perfil actual (GET /api/perfil) y catálogo de empresas (GET /api/empresas)
const perfil = ref(null);
const empresas = ref([]);
const cargando = ref(false);
const errorCarga = ref('');

// Campos editables; el resto se muestra bloqueado
const formulario = ref({ nombre_completo: '', correo: '', telefono: '', id_empresa: '' });
const guardando = ref(false);
const errorGuardar = ref('');

const iniciales = computed(() => obtenerIniciales(formulario.value.nombre_completo));
const fechaIngresoTexto = computed(() => formatearFecha(perfil.value?.fecha_ingreso));
const antiguedad = computed(() => calcularAntiguedad(perfil.value?.fecha_ingreso));

const cargarDatos = async () => {
  cargando.value = true;
  errorCarga.value = '';
  try {
    const [resPerfil, resEmpresas] = await Promise.all([
      apiFetch('/api/perfil'),
      apiFetch('/api/empresas')
    ]);
    const datos = await resPerfil.json();
    if (!resPerfil.ok) {
      errorCarga.value = datos.error || 'No se pudo cargar el perfil';
      return;
    }
    if (resEmpresas.ok) empresas.value = await resEmpresas.json();

    perfil.value = datos;
    formulario.value = {
      nombre_completo: datos.nombre_completo || '',
      correo: datos.correo || '',
      telefono: datos.telefono || '',
      id_empresa: datos.id_empresa || ''
    };
  } catch (error) {
    console.error('Error al cargar el perfil:', error);
    errorCarga.value = 'No se pudo conectar con el servidor';
  } finally {
    cargando.value = false;
  }
};

// Mantiene al día la sesión guardada por LoginView (el nombre se muestra en otras vistas)
const actualizarSesionLocal = (actualizado) => {
  try {
    const sesion = JSON.parse(localStorage.getItem('usuario'));
    if (!sesion) return;
    sesion.nombre_completo = actualizado.nombre_completo;
    sesion.correo = actualizado.correo;
    localStorage.setItem('usuario', JSON.stringify(sesion));
  } catch (error) {
    console.error('No se pudo actualizar la sesión local:', error);
  }
};

const guardar = async () => {
  errorGuardar.value = '';
  if (!/^\d{10}$/.test(formulario.value.telefono)) {
    errorGuardar.value = 'El teléfono debe tener 10 dígitos.';
    return;
  }

  guardando.value = true;
  try {
    const res = await apiFetch('/api/perfil', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formulario.value)
    });
    const data = await res.json();
    if (!res.ok) {
      errorGuardar.value = data.error || 'No se pudo guardar el perfil';
      return;
    }
    actualizarSesionLocal(data.perfil);
    router.push('/perfil');
  } catch (error) {
    console.error('Error al guardar el perfil:', error);
    errorGuardar.value = 'No se pudo conectar con el servidor';
  } finally {
    guardando.value = false;
  }
};

onMounted(cargarDatos);
</script>

<!-- Mismo diseño que PerfilView -->
<style scoped src="../assets/perfil.css"></style>

<!-- Solo lo propio de la edición: inputs (mismo estilo que el registro) y botones -->
<style scoped>
.field-input {
  width: 100%;
  padding: 0.7rem 0.85rem;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  font-size: 0.875rem;
  background-color: #f8fafc;
  color: #0f172a;
  box-sizing: border-box;
  outline: none;
  transition: all 0.2s ease;
}

.field-input:focus {
  border-color: #000080;
  background-color: #ffffff;
  box-shadow: 0 0 0 3px rgba(0, 0, 128, 0.1);
}

.locked-note {
  display: block;
  margin-top: 0.2rem;
  font-size: 0.72rem;
  color: var(--text-secondary, #64748b);
}

.error-text {
  margin: 0;
  color: #dc2626;
  font-size: 0.85rem;
  font-weight: 500;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.cancel-btn,
.save-btn {
  padding: 0.7rem 1.4rem;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  text-decoration: none;
  text-align: center;
}

.cancel-btn {
  background: var(--bg-surface, #ffffff);
  color: var(--text-primary, #0f172a);
  border: 1px solid var(--border-color, #cbd5e1);
}

.save-btn {
  background: #000080;
  color: #ffffff;
  border: none;
}

.save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
