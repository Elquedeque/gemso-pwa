<template>
  <div class="dashboard-container">
    <AppHeader
      @toggle-menu="isMenuOpen = true"
      @toggle-notifications="isNotificationsOpen = true"
    />

    <main class="dashboard-main">
      <header class="page-header">
        <button class="back-btn" @click="$router.back()" title="Regresar">
          <svg viewBox="0 0 24 24" class="svg-icon">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor"/>
          </svg>
        </button>
        <div>
          <h2>Colaboradores</h2>
          <p class="subtitle">Revisa y corrige los datos de quienes se registraron, o desactiva a quien ya no trabaja en GEMSO</p>
        </div>
      </header>

      <!-- Filtros -->
      <section class="filtros-card">
        <input
          v-model="buscar"
          type="search"
          class="buscador"
          placeholder="Buscar por nombre o correo"
          aria-label="Buscar por nombre o correo"
        />
        <div class="filtros-fila">
          <select v-model="idDepartamento" aria-label="Filtrar por departamento">
            <option value="">Todos los departamentos</option>
            <option v-for="dep in departamentos" :key="dep.id_dep" :value="dep.id_dep">{{ dep.nombre }}</option>
          </select>
          <select v-model="estado" aria-label="Filtrar por estado">
            <option value="activos">Activos</option>
            <option value="desactivados">Desactivados</option>
            <option value="todos">Todos</option>
          </select>
        </div>
      </section>

      <!-- Lista -->
      <section class="lista-card">
        <p v-if="cargando" class="vacio">Cargando...</p>
        <p v-else-if="errorMsg" class="error-text">{{ errorMsg }}</p>
        <p v-else-if="colaboradores.length === 0" class="vacio">No hay colaboradores con esos filtros.</p>

        <template v-else>
          <p class="conteo">{{ colaboradores.length }} {{ colaboradores.length === 1 ? 'colaborador' : 'colaboradores' }}</p>
          <ul class="lista">
            <li v-for="c in colaboradores" :key="c.id_usu">
              <router-link :to="`/colaboradores/${c.id_usu}`" class="fila">
                <span class="avatar" aria-hidden="true">{{ obtenerIniciales(c.nombre_completo) }}</span>
                <span class="fila-info">
                  <span class="fila-nombre">{{ c.nombre_completo }}</span>
                  <span class="fila-detalle">{{ c.puesto || 'Sin puesto' }} · {{ c.departamento }}</span>
                  <span class="fila-detalle">{{ c.correo }}</span>
                </span>
                <span v-if="!c.activo" class="estado desactivado">Desactivado</span>
                <svg viewBox="0 0 24 24" class="flecha" aria-hidden="true">
                  <path d="M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" fill="currentColor"/>
                </svg>
              </router-link>
            </li>
          </ul>
        </template>
      </section>
    </main>

    <SidebarMenu :is-open="isMenuOpen" @close="isMenuOpen = false" />
    <NotificationsDrawer :is-open="isNotificationsOpen" @close="isNotificationsOpen = false" />
  </div>
</template>

<script setup>
// Pantalla de Colaboradores (solo con permiso 'gestionar_colaboradores', en la beta Talento y Cultura)
// Lista con búsqueda y filtros; al tocar a alguien se abre ColaboradorView para corregir sus datos.
// Usa las rutas de server/routes/colaboradores.js
import { ref, watch, onMounted } from 'vue';
import { apiFetch } from '../api';
import { obtenerIniciales } from '../utils/perfil';
import AppHeader from '../components/AppHeader.vue';
import SidebarMenu from '../components/SidebarMenu.vue';
import NotificationsDrawer from '../components/NotificationsDrawer.vue';

const isMenuOpen = ref(false);
const isNotificationsOpen = ref(false);

const colaboradores = ref([]);
const departamentos = ref([]);
const cargando = ref(true);
const errorMsg = ref('');

// Filtros: el servidor hace la búsqueda (ILIKE), así funciona igual con 200+ colaboradores
const buscar = ref('');
const idDepartamento = ref('');
const estado = ref('activos');

const cargarColaboradores = async () => {
  errorMsg.value = '';
  cargando.value = true;
  try {
    const params = new URLSearchParams({ estado: estado.value });
    if (buscar.value.trim()) params.set('buscar', buscar.value.trim());
    if (idDepartamento.value) params.set('id_departamento', idDepartamento.value);

    const res = await apiFetch(`/api/colaboradores?${params}`);
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'No se pudieron cargar los colaboradores.');
    colaboradores.value = await res.json();
  } catch (err) {
    errorMsg.value = err.message;
  } finally {
    cargando.value = false;
  }
};

const cargarDepartamentos = async () => {
  try {
    const res = await apiFetch('/api/departamentos');
    if (res.ok) departamentos.value = await res.json();
  } catch (err) {
    console.error('Error al obtener departamentos:', err);
  }
};

// Al escribir se espera un momento antes de buscar, para no consultar con cada letra
let espera = null;
watch(buscar, () => {
  clearTimeout(espera);
  espera = setTimeout(cargarColaboradores, 300);
});
watch([idDepartamento, estado], cargarColaboradores);

onMounted(() => {
  cargarDepartamentos();
  cargarColaboradores();
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
  max-width: 720px;
  margin: 0 auto;
  padding: 1.5rem 1.25rem 2.5rem;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.back-btn {
  background: var(--bg-surface, #ffffff);
  border: 1px solid var(--border-color, #e2e8f0);
  color: var(--text-secondary, #475569);
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
}

.back-btn .svg-icon {
  width: 20px;
  height: 20px;
}

.page-header h2 {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
}

.subtitle {
  font-size: 0.85rem;
  color: var(--text-secondary, #64748b);
  margin: 0.15rem 0 0 0;
}

.filtros-card,
.lista-card {
  background: var(--bg-surface, #ffffff);
  border-radius: 16px;
  padding: 1.25rem;
  border: 1px solid var(--border-color, #e2e8f0);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.filtros-fila {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

@media (max-width: 540px) {
  .filtros-fila {
    grid-template-columns: 1fr;
  }
}

.buscador,
select {
  width: 100%;
  padding: 0.75rem 0.9rem;
  border: 1px solid var(--border-color, #cbd5e1);
  border-radius: 8px;
  font-size: 0.9rem;
  background-color: var(--bg-input, #f8fafc);
  color: var(--text-primary, #0f172a);
  box-sizing: border-box;
  outline: none;
}

.buscador:focus,
select:focus {
  border-color: var(--brand-primary, #000080);
  background-color: var(--bg-surface, #ffffff);
}

.vacio,
.conteo {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-secondary, #64748b);
}

.error-text {
  color: var(--color-danger, #dc2626);
  font-size: 0.85rem;
  font-weight: 600;
  margin: 0;
}

.lista {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.lista li + li {
  border-top: 1px solid var(--border-color, #e2e8f0);
}

.fila {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.8rem 0.25rem;
  color: inherit;
  text-decoration: none;
  border-radius: 8px;
}

.fila:hover,
.fila:focus-visible {
  background: var(--bg-primary, #f8fafc);
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--tint-brand-bg, #e0e7ff);
  color: var(--brand-primary, #000080);
  font-weight: 700;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.fila-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.fila-nombre {
  font-weight: 600;
  font-size: 0.92rem;
}

.fila-detalle {
  font-size: 0.75rem;
  color: var(--text-secondary, #64748b);
  overflow-wrap: anywhere;
}

.estado {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  white-space: nowrap;
}

.estado.desactivado {
  background: var(--tint-red-bg, #fef2f2);
  color: var(--color-danger, #dc2626);
}

.flecha {
  width: 20px;
  height: 20px;
  color: var(--text-secondary, #94a3b8);
  flex-shrink: 0;
}
</style>
