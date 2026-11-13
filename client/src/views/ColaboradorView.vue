<template>
  <div class="dashboard-container">
    <AppHeader
      @toggle-menu="isMenuOpen = true"
      @toggle-notifications="isNotificationsOpen = true"
    />

    <main class="dashboard-main">
      <header class="page-header">
        <button class="back-btn" @click="$router.push('/colaboradores')" title="Regresar a Colaboradores">
          <svg viewBox="0 0 24 24" class="svg-icon">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor"/>
          </svg>
        </button>
        <div class="encabezado-texto">
          <h2>{{ colaborador?.nombre_completo || 'Colaborador' }}</h2>
          <p v-if="colaborador" class="subtitle">
            Se registró el {{ formatearFecha(colaborador.fecha_creacion) }}
            <span v-if="!colaborador.activo" class="estado desactivado">Desactivado</span>
          </p>
        </div>
      </header>

      <p v-if="cargando" class="vacio">Cargando...</p>
      <p v-else-if="errorCarga" class="error-text">{{ errorCarga }}</p>

      <template v-else-if="colaborador">
        <!-- Aviso de cuenta desactivada -->
        <section v-if="!colaborador.activo" class="aviso-desactivado">
          Desactivado el {{ formatearFecha(colaborador.fecha_desactivacion) }}
          <template v-if="colaborador.desactivado_por">por {{ colaborador.desactivado_por }}</template>.
          No puede iniciar sesión ni recibe notificaciones.
        </section>

        <!-- Datos -->
        <form class="form-card" @submit.prevent="guardar">
          <h3>Datos personales</h3>
          <div class="form-row">
            <div class="form-group">
              <label for="nombre">Nombre completo *</label>
              <input id="nombre" type="text" v-model="form.nombre_completo" maxlength="150" required />
            </div>
            <div class="form-group">
              <label for="correo">Correo *</label>
              <input
                id="correo"
                type="email"
                v-model="form.correo"
                maxlength="150"
                autocapitalize="none"
                autocorrect="off"
                spellcheck="false"
                required
              />
            </div>
            <div class="form-group">
              <label for="telefono">Teléfono *</label>
              <input id="telefono" type="tel" v-model="form.telefono" inputmode="numeric" maxlength="14" placeholder="10 dígitos" required />
            </div>
            <div class="form-group">
              <label for="nacimiento">Fecha de nacimiento *</label>
              <input id="nacimiento" type="date" v-model="form.fecha_nacimiento" :max="hoy" required />
            </div>
          </div>

          <h3>Datos laborales</h3>
          <div class="form-row">
            <div class="form-group">
              <label for="puesto">Puesto *</label>
              <input id="puesto" type="text" v-model="form.puesto" maxlength="100" required />
            </div>
            <div class="form-group">
              <label for="ingreso">Fecha de ingreso *</label>
              <input id="ingreso" type="date" v-model="form.fecha_ingreso" :max="hoy" required />
            </div>
            <div class="form-group">
              <label for="departamento">Departamento *</label>
              <select id="departamento" v-model="form.id_departamento" :disabled="esUnoMismo" required>
                <option v-for="d in opciones.departamentos" :key="d.id_dep" :value="d.id_dep">{{ d.nombre }}</option>
              </select>
              <span v-if="esUnoMismo" class="nota">No puedes cambiar tu propio departamento.</span>
            </div>
            <div class="form-group">
              <label for="sucursal">Sucursal *</label>
              <select id="sucursal" v-model="form.id_sucursal" required>
                <option v-for="s in opciones.sucursales" :key="s.id_suc" :value="s.id_suc">{{ s.nombre }}</option>
              </select>
            </div>
            <div class="form-group">
              <label for="empresa">Empresa *</label>
              <select id="empresa" v-model="form.id_empresa" required>
                <option v-for="e in opciones.empresas" :key="e.id_emp" :value="e.id_emp">{{ e.nombre }}</option>
              </select>
            </div>
            <div class="form-group">
              <label for="gerente">Gerente</label>
              <select id="gerente" v-model="form.id_gerente">
                <option :value="null">Sin gerente</option>
                <option v-for="g in gerentesDisponibles" :key="g.id_usu" :value="g.id_usu">{{ g.nombre_completo }}</option>
              </select>
            </div>
          </div>

          <!-- Qué pasa con los permisos al cambiar de departamento -->
          <p v-if="cambioTyC === 'entra'" class="aviso-permisos">
            Al pasar a Talento y Cultura podrá publicar avisos, ver estadísticas, recibir recordatorios,
            invitar a otras personas y gestionar colaboradores.
          </p>
          <p v-else-if="cambioTyC === 'sale'" class="aviso-permisos">
            Al salir de Talento y Cultura perderá los permisos de publicar avisos, ver estadísticas,
            recibir recordatorios, invitar y gestionar colaboradores.
          </p>

          <p v-if="errorMsg" class="error-text">{{ errorMsg }}</p>
          <p v-if="exitoMsg" class="exito-text" aria-live="polite">{{ exitoMsg }}</p>

          <div class="form-actions">
            <button type="button" class="btn-secundario" :disabled="!hayCambios || guardando" @click="descartar">Descartar</button>
            <button type="submit" class="submit-btn" :disabled="!hayCambios || guardando">
              {{ guardando ? 'Guardando...' : 'Guardar cambios' }}
            </button>
          </div>
        </form>

        <!-- Estado de la cuenta -->
        <section v-if="!esUnoMismo" class="form-card">
          <h3>Cuenta</h3>
          <template v-if="!confirmandoEstado">
            <p class="nota">
              {{ colaborador.activo
                ? 'Desactívala si la persona ya no trabaja en GEMSO o no debería tener acceso. No se borra nada y se puede reactivar.'
                : 'Al reactivarla podrá volver a iniciar sesión. Tendrá que encender otra vez las notificaciones en Ajustes.' }}
            </p>
            <div class="form-actions">
              <button
                type="button"
                :class="colaborador.activo ? 'btn-peligro' : 'submit-btn'"
                @click="confirmandoEstado = true"
              >{{ colaborador.activo ? 'Desactivar cuenta' : 'Reactivar cuenta' }}</button>
            </div>
          </template>

          <!-- Confirmación en la misma pantalla (sin ventanas del navegador) -->
          <div v-else class="confirmacion">
            <p>
              <template v-if="colaborador.activo">
                ¿Desactivar a <strong>{{ colaborador.nombre_completo }}</strong>? Se cerrará su sesión en todos sus
                dispositivos y dejará de recibir notificaciones.
              </template>
              <template v-else>¿Reactivar a <strong>{{ colaborador.nombre_completo }}</strong>?</template>
            </p>
            <p v-if="errorEstado" class="error-text">{{ errorEstado }}</p>
            <div class="form-actions">
              <button type="button" class="btn-secundario" :disabled="cambiandoEstado" @click="confirmandoEstado = false">Cancelar</button>
              <button
                type="button"
                :class="colaborador.activo ? 'btn-peligro-lleno' : 'submit-btn'"
                :disabled="cambiandoEstado"
                @click="cambiarEstado"
              >{{ cambiandoEstado ? 'Guardando...' : (colaborador.activo ? 'Sí, desactivar' : 'Sí, reactivar') }}</button>
            </div>
          </div>
        </section>

        <!-- Historial -->
        <section class="form-card">
          <h3>Historial de cambios</h3>
          <p v-if="historial.length === 0" class="nota">Nadie ha corregido sus datos todavía.</p>
          <ul v-else class="historial">
            <li v-for="h in historial" :key="h.id_cam">
              <span class="historial-campo">{{ ETIQUETAS_CAMPO[h.campo] || h.campo }}</span>
              <span class="historial-valores">
                <span class="valor-anterior">{{ mostrarValor(h.campo, h.valor_anterior) }}</span>
                →
                <span>{{ mostrarValor(h.campo, h.valor_nuevo) }}</span>
              </span>
              <span class="historial-quien">{{ h.cambiado_por || 'Usuario borrado' }} · {{ formatearFechaHora(h.fecha) }}</span>
            </li>
          </ul>
        </section>
      </template>
    </main>

    <SidebarMenu :is-open="isMenuOpen" @close="isMenuOpen = false" />
    <NotificationsDrawer :is-open="isNotificationsOpen" @close="isNotificationsOpen = false" />
  </div>
</template>

<script setup>
// Detalle de un Colaborador (solo con permiso 'gestionar_colaboradores', en la beta Talento y Cultura)
// TyC corrige sus datos, lo desactiva o reactiva y ve quién cambió qué y cuándo.
// Las validaciones de verdad las hace el servidor (routes/colaboradores.js); aquí solo se ayuda al usuario.
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { apiFetch } from '../api';
import { formatearFecha, formatearFechaHora } from '../utils/estadisticas';
import { formatearFecha as formatearDia } from '../utils/perfil';
import AppHeader from '../components/AppHeader.vue';
import SidebarMenu from '../components/SidebarMenu.vue';
import NotificationsDrawer from '../components/NotificationsDrawer.vue';

const DEPARTAMENTO_TYC = 'Talento y Cultura';

// Nombres de los campos del historial (columna "campo" de cambios_colaboradores)
const ETIQUETAS_CAMPO = {
  nombre_completo: 'Nombre',
  correo: 'Correo',
  telefono: 'Teléfono',
  puesto: 'Puesto',
  fecha_nacimiento: 'Fecha de nacimiento',
  fecha_ingreso: 'Fecha de ingreso',
  departamento: 'Departamento',
  sucursal: 'Sucursal',
  empresa: 'Empresa',
  gerente: 'Gerente',
  activo: 'Cuenta'
};

const route = useRoute();
const isMenuOpen = ref(false);
const isNotificationsOpen = ref(false);

const colaborador = ref(null);
const historial = ref([]);
const opciones = ref({ departamentos: [], sucursales: [], empresas: [], gerentes: [] });
const form = ref({});
const cargando = ref(true);
const errorCarga = ref('');

const guardando = ref(false);
const errorMsg = ref('');
const exitoMsg = ref('');

const confirmandoEstado = ref(false);
const cambiandoEstado = ref(false);
const errorEstado = ref('');

// Fecha de hoy 'YYYY-MM-DD' (hora local) para no elegir fechas futuras
const hoy = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
})();

// ¿Es la persona que tiene la sesión? No puede cambiar su departamento ni desactivarse
const idSesion = (() => {
  try {
    return JSON.parse(localStorage.getItem('usuario'))?.id_usu ?? null;
  } catch {
    return null;
  }
})();
const esUnoMismo = computed(() => colaborador.value?.id_usu === idSesion);

// Campos del formulario, en el formato que espera PUT /api/colaboradores/:id
const CAMPOS_FORM = [
  'nombre_completo', 'correo', 'telefono', 'puesto', 'fecha_nacimiento', 'fecha_ingreso',
  'id_departamento', 'id_sucursal', 'id_empresa', 'id_gerente'
];
const llenarFormulario = (c) => {
  form.value = Object.fromEntries(CAMPOS_FORM.map((campo) => [campo, c[campo] ?? (campo === 'id_gerente' ? null : '')]));
};

const hayCambios = computed(() =>
  colaborador.value && CAMPOS_FORM.some((campo) => (form.value[campo] ?? null) !== (colaborador.value[campo] ?? null))
);

// Gerentes: los activos, sin la propia persona. Si su gerente actual está desactivado,
// se agrega para que el campo no aparezca vacío.
const gerentesDisponibles = computed(() => {
  const lista = opciones.value.gerentes.filter((g) => g.id_usu !== colaborador.value?.id_usu);
  const actual = colaborador.value;
  if (actual?.id_gerente && !lista.some((g) => g.id_usu === actual.id_gerente)) {
    lista.unshift({ id_usu: actual.id_gerente, nombre_completo: `${actual.gerente} (desactivado)` });
  }
  return lista;
});

// 'entra' | 'sale' | null: para avisar del cambio de permisos antes de guardar
const nombreDepartamento = (id) => opciones.value.departamentos.find((d) => d.id_dep === id)?.nombre;
const cambioTyC = computed(() => {
  if (!colaborador.value) return null;
  const antes = colaborador.value.departamento === DEPARTAMENTO_TYC;
  const despues = nombreDepartamento(form.value.id_departamento) === DEPARTAMENTO_TYC;
  if (!antes && despues) return 'entra';
  if (antes && !despues) return 'sale';
  return null;
});

// Valores del historial: las fechas se muestran como "15 ene 2020"
const mostrarValor = (campo, valor) => {
  if (valor === null || valor === '') return 'Vacío';
  return campo.startsWith('fecha_') ? formatearDia(valor) : valor;
};

const leerError = async (res, porDefecto) => {
  try {
    return (await res.json()).error || porDefecto;
  } catch {
    return porDefecto;
  }
};

// Respuesta de GET, PUT y PUT /estado: { colaborador, historial }
const aplicarRespuesta = (data) => {
  colaborador.value = data.colaborador;
  historial.value = data.historial;
  llenarFormulario(data.colaborador);
};

const cargar = async () => {
  try {
    const [resColaborador, resOpciones] = await Promise.all([
      apiFetch(`/api/colaboradores/${route.params.id}`),
      apiFetch('/api/colaboradores/opciones')
    ]);
    if (!resColaborador.ok) throw new Error(await leerError(resColaborador, 'No se pudo cargar el colaborador.'));
    if (!resOpciones.ok) throw new Error(await leerError(resOpciones, 'No se pudieron cargar los catálogos.'));
    opciones.value = await resOpciones.json();
    aplicarRespuesta(await resColaborador.json());
  } catch (err) {
    errorCarga.value = err.message;
  } finally {
    cargando.value = false;
  }
};

const guardar = async () => {
  errorMsg.value = '';
  exitoMsg.value = '';
  guardando.value = true;
  try {
    const res = await apiFetch(`/api/colaboradores/${colaborador.value.id_usu}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form.value)
    });
    if (!res.ok) throw new Error(await leerError(res, 'No se pudieron guardar los cambios.'));
    const data = await res.json();
    aplicarRespuesta(data);
    exitoMsg.value = data.message;
  } catch (err) {
    errorMsg.value = err.message;
  } finally {
    guardando.value = false;
  }
};

const descartar = () => {
  llenarFormulario(colaborador.value);
  errorMsg.value = '';
  exitoMsg.value = '';
};

const cambiarEstado = async () => {
  errorEstado.value = '';
  cambiandoEstado.value = true;
  try {
    const res = await apiFetch(`/api/colaboradores/${colaborador.value.id_usu}/estado`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: !colaborador.value.activo })
    });
    if (!res.ok) throw new Error(await leerError(res, 'No se pudo cambiar el estado de la cuenta.'));
    aplicarRespuesta(await res.json());
    confirmandoEstado.value = false;
  } catch (err) {
    errorEstado.value = err.message;
  } finally {
    cambiandoEstado.value = false;
  }
};

onMounted(cargar);
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

.encabezado-texto {
  min-width: 0;
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
  overflow-wrap: anywhere;
}

.subtitle {
  font-size: 0.85rem;
  color: var(--text-secondary, #64748b);
  margin: 0.15rem 0 0 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.form-card {
  background: var(--bg-surface, #ffffff);
  border-radius: 16px;
  padding: 1.5rem;
  border: 1px solid var(--border-color, #e2e8f0);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-card h3 {
  margin: 0;
  font-size: 1.05rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

@media (max-width: 540px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  min-width: 0;
}

label {
  font-size: 0.875rem;
  font-weight: 600;
}

input,
select {
  width: 100%;
  padding: 0.75rem 0.9rem;
  border: 1px solid var(--border-color, #cbd5e1);
  border-radius: 8px;
  font-size: 0.9rem;
  font-family: inherit;
  background-color: var(--bg-input, #f8fafc);
  color: var(--text-primary, #0f172a);
  box-sizing: border-box;
  outline: none;
}

input:focus,
select:focus {
  border-color: var(--brand-primary, #000080);
  background-color: var(--bg-surface, #ffffff);
}

select:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.nota,
.vacio {
  font-size: 0.78rem;
  color: var(--text-secondary, #64748b);
  margin: 0;
}

.aviso-permisos {
  font-size: 0.8rem;
  margin: 0;
  padding: 0.7rem 0.9rem;
  border-radius: 8px;
  background: var(--tint-brand-bg, #e0e7ff);
  color: var(--text-primary, #0f172a);
}

.aviso-desactivado {
  font-size: 0.85rem;
  padding: 0.9rem 1rem;
  border-radius: 12px;
  border: 1px solid var(--tint-red-border, #fecaca);
  background: var(--tint-red-bg, #fef2f2);
}

.error-text {
  color: var(--color-danger, #dc2626);
  font-size: 0.85rem;
  font-weight: 600;
  margin: 0;
}

.exito-text {
  color: var(--tint-green-text, #15803d);
  font-size: 0.85rem;
  font-weight: 600;
  margin: 0;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.submit-btn,
.btn-peligro-lleno {
  background: var(--brand-primary, #000080);
  color: #ffffff;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
}

.btn-peligro-lleno {
  background: var(--color-danger, #dc2626);
}

.btn-secundario,
.btn-peligro {
  background: transparent;
  border: 1px solid var(--border-color, #cbd5e1);
  color: var(--text-primary, #0f172a);
  padding: 0.75rem 1.25rem;
  border-radius: 10px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-peligro {
  color: var(--color-danger, #dc2626);
  border-color: var(--tint-red-border, #fecaca);
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.confirmacion {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.confirmacion p {
  margin: 0;
  font-size: 0.875rem;
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

/* Historial */
.historial {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.historial li {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.7rem 0;
  border-top: 1px solid var(--border-color, #e2e8f0);
}

.historial li:first-child {
  border-top: none;
  padding-top: 0;
}

.historial-campo {
  font-weight: 600;
  font-size: 0.85rem;
}

.historial-valores {
  font-size: 0.85rem;
  overflow-wrap: anywhere;
}

.valor-anterior {
  color: var(--text-secondary, #64748b);
  text-decoration: line-through;
}

.historial-quien {
  font-size: 0.75rem;
  color: var(--text-secondary, #64748b);
}
</style>
