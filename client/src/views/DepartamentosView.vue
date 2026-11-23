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
          <h2>Departamentos</h2>
          <p class="subtitle">Crea los departamentos que aparecen en el registro, en Invitaciones y en Colaboradores</p>
        </div>
      </header>

      <!-- Nuevo departamento -->
      <form class="form-card" @submit.prevent="crear">
        <div class="form-group">
          <label for="nombre-nuevo">Nombre del departamento *</label>
          <input
            id="nombre-nuevo"
            type="text"
            v-model="nuevo.nombre"
            :maxlength="NOMBRE_MAX"
            placeholder="Por ejemplo: Refacciones"
            required
          />
        </div>

        <label class="check">
          <input type="checkbox" v-model="nuevo.solo_por_invitacion" />
          <span>Solo por invitación <span class="nota">(no aparece en el registro abierto)</span></span>
        </label>

        <p v-if="errorCrear" class="error-text">{{ errorCrear }}</p>
        <p v-if="mensaje" class="exito-text" aria-live="polite">{{ mensaje }}</p>

        <div class="form-actions">
          <button type="submit" class="submit-btn" :disabled="creando">
            {{ creando ? 'Guardando...' : 'Crear departamento' }}
          </button>
        </div>
      </form>

      <!-- Lista -->
      <section class="lista-card">
        <p v-if="cargando" class="vacio">Cargando...</p>
        <p v-else-if="errorLista" class="error-text">{{ errorLista }}</p>

        <template v-else>
          <p v-if="mensajeLista" class="exito-text" aria-live="polite">{{ mensajeLista }}</p>
          <p class="conteo">{{ departamentos.length }} {{ departamentos.length === 1 ? 'departamento' : 'departamentos' }}</p>
          <ul class="lista">
            <li v-for="dep in departamentos" :key="dep.id_dep" class="fila">
              <!-- Edición en la misma fila -->
              <form v-if="editando?.id_dep === dep.id_dep" class="edicion" @submit.prevent="guardar">
                <input
                  type="text"
                  v-model="editando.nombre"
                  :maxlength="NOMBRE_MAX"
                  :aria-label="`Nuevo nombre para ${dep.nombre}`"
                  required
                />
                <label class="check">
                  <input type="checkbox" v-model="editando.solo_por_invitacion" />
                  <span>Solo por invitación</span>
                </label>
                <p v-if="totalPersonas(dep)" class="nota">
                  Sus {{ totalPersonas(dep) }} {{ totalPersonas(dep) === 1 ? 'colaborador sigue' : 'colaboradores siguen' }}
                  en este departamento con el nombre nuevo.
                </p>
                <p v-if="errorFila" class="error-text">{{ errorFila }}</p>
                <div class="acciones">
                  <button type="button" class="btn-secundario" :disabled="guardando" @click="cancelar">Cancelar</button>
                  <button type="submit" class="submit-btn" :disabled="guardando">{{ guardando ? 'Guardando...' : 'Guardar' }}</button>
                </div>
              </form>

              <!-- Confirmar borrado -->
              <div v-else-if="borrando === dep.id_dep" class="confirmacion">
                <p>¿Borrar <strong>{{ dep.nombre }}</strong>? Esta acción no se puede deshacer.</p>
                <p v-if="errorFila" class="error-text">{{ errorFila }}</p>
                <div class="acciones">
                  <button type="button" class="btn-secundario" :disabled="guardando" @click="cancelar">Cancelar</button>
                  <button type="button" class="btn-peligro" :disabled="guardando" @click="borrar(dep)">
                    {{ guardando ? 'Borrando...' : 'Sí, borrar' }}
                  </button>
                </div>
              </div>

              <!-- Confirmar desactivación (migración 020) -->
              <div v-else-if="desactivando === dep.id_dep" class="confirmacion">
                <p>¿Desactivar <strong>{{ dep.nombre }}</strong>?</p>
                <ul class="efectos">
                  <li>Ya no aparecerá al registrarse, al invitar, al publicar un aviso ni al cambiar el departamento de un colaborador.</li>
                  <li v-if="totalPersonas(dep) === 1">Su colaborador se queda en él y sigue viendo sus avisos.</li>
                  <li v-else-if="totalPersonas(dep) > 1">
                    Sus {{ totalPersonas(dep) }} colaboradores se quedan en él y siguen viendo sus avisos.
                  </li>
                  <li v-if="dep.invitaciones_pendientes">
                    Se {{ dep.invitaciones_pendientes === 1 ? 'cancelará' : 'cancelarán' }}
                    <strong>{{ plural(dep.invitaciones_pendientes, 'invitación pendiente', 'invitaciones pendientes') }}</strong>;
                    si hace falta, vuelve a invitar a esas personas con otro departamento.
                  </li>
                  <li>Puedes volver a activarlo cuando quieras.</li>
                </ul>
                <p v-if="errorFila" class="error-text">{{ errorFila }}</p>
                <div class="acciones">
                  <button type="button" class="btn-secundario" :disabled="guardando" @click="cancelar">Cancelar</button>
                  <button type="button" class="btn-peligro" :disabled="guardando" @click="cambiarEstado(dep, false)">
                    {{ guardando ? 'Desactivando...' : 'Sí, desactivar' }}
                  </button>
                </div>
              </div>

              <!-- Vista normal -->
              <template v-else>
                <div class="fila-info" :class="{ inactivo: !dep.activo }">
                  <span class="fila-nombre">
                    {{ dep.nombre }}
                    <span v-if="!dep.activo" class="etiqueta etiqueta-inactivo">Inactivo</span>
                    <span v-if="dep.solo_por_invitacion" class="etiqueta">Solo por invitación</span>
                  </span>
                  <span class="fila-detalle">{{ resumen(dep) }}</span>
                  <span v-if="!dep.activo" class="fila-detalle">
                    Desactivado el {{ formatearFecha(dep.fecha_desactivado) }}<template v-if="dep.desactivado_por"> por {{ dep.desactivado_por }}</template>
                  </span>
                  <span v-if="dep.protegido" class="fila-detalle">
                    No se puede renombrar, desactivar ni borrar: la app lo usa para dar los permisos de Talento y Cultura.
                  </span>
                </div>
                <div v-if="!dep.protegido" class="acciones">
                  <button type="button" class="btn-secundario" @click="empezarEdicion(dep)">Editar</button>
                  <button
                    v-if="dep.activo"
                    type="button"
                    class="btn-secundario"
                    @click="empezarDesactivacion(dep)"
                  >Desactivar</button>
                  <button
                    v-else
                    type="button"
                    class="btn-secundario"
                    :disabled="guardando"
                    @click="cambiarEstado(dep, true)"
                  >Activar</button>
                  <button
                    type="button"
                    class="btn-peligro"
                    :disabled="enUso(dep)"
                    :title="enUso(dep) ? 'Tiene colaboradores, invitaciones o avisos; no se puede borrar' : ''"
                    @click="empezarBorrado(dep)"
                  >Borrar</button>
                </div>
              </template>
            </li>
          </ul>
          <p class="nota">
            Solo se puede borrar un departamento sin colaboradores, invitaciones ni avisos.
            Si ya no se usa, desactívalo: deja de aparecer en las listas sin perder su historial.
          </p>
        </template>
      </section>
    </main>

    <SidebarMenu :is-open="isMenuOpen" @close="isMenuOpen = false" />
    <NotificationsDrawer :is-open="isNotificationsOpen" @close="isNotificationsOpen = false" />
  </div>
</template>

<script setup>
// Pantalla de Departamentos (solo con permiso 'gestionar_colaboradores', en la beta Talento y Cultura)
// Crear, renombrar, desactivar (migración 020) y borrar departamentos. Las reglas las aplica el servidor
// (server/routes/departamentos.js); aquí solo se muestran y se evita lo que no procede.
import { ref, watch, onMounted } from 'vue';
import { apiFetch } from '../api';
import AppHeader from '../components/AppHeader.vue';
import SidebarMenu from '../components/SidebarMenu.vue';
import NotificationsDrawer from '../components/NotificationsDrawer.vue';

// Mismo límite que el servidor
const NOMBRE_MAX = 60;

const isMenuOpen = ref(false);
const isNotificationsOpen = ref(false);

const departamentos = ref([]);
const cargando = ref(true);
const errorLista = ref('');

const nuevo = ref({ nombre: '', solo_por_invitacion: false });
const creando = ref(false);
const errorCrear = ref('');
const mensaje = ref('');

// Solo una fila a la vez se edita o se confirma para borrar o desactivar
const editando = ref(null); // copia { id_dep, nombre, solo_por_invitacion }
const borrando = ref(null); // id_dep
const desactivando = ref(null); // id_dep
const guardando = ref(false);
const errorFila = ref('');
// Resultado de editar o borrar: se muestra en la lista, que es donde está la persona
const mensajeLista = ref('');

// Los mensajes viejos se quitan en cuanto la persona hace otra cosa
const limpiarMensajes = () => {
  errorCrear.value = '';
  mensaje.value = '';
  mensajeLista.value = '';
};
watch(() => nuevo.value.nombre, () => { errorCrear.value = ''; });

// Mensaje de error que manda el servidor, o uno general
const leerError = async (res, general) => (await res.json().catch(() => ({}))).error || general;

const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

const totalPersonas = (dep) => dep.activos + dep.desactivados;
const enUso = (dep) => totalPersonas(dep) > 0 || dep.invitaciones > 0 || dep.avisos > 0;

// Por ejemplo "3 colaboradores · 1 desactivado · 2 invitaciones pendientes"
const resumen = (dep) => {
  const partes = [plural(dep.activos, 'colaborador', 'colaboradores')];
  if (dep.desactivados) partes.push(plural(dep.desactivados, 'desactivado', 'desactivados'));
  if (dep.invitaciones_pendientes) partes.push(plural(dep.invitaciones_pendientes, 'invitación pendiente', 'invitaciones pendientes'));
  if (dep.avisos) partes.push(plural(dep.avisos, 'aviso dirigido', 'avisos dirigidos'));
  return partes.join(' · ');
};

// "20 de noviembre de 2026"
const formatearFecha = (valor) =>
  new Date(valor).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });

const cargar = async () => {
  errorLista.value = '';
  try {
    const res = await apiFetch('/api/departamentos/gestion');
    if (!res.ok) throw new Error(await leerError(res, 'No se pudieron cargar los departamentos.'));
    departamentos.value = await res.json();
  } catch (err) {
    errorLista.value = err.message;
  } finally {
    cargando.value = false;
  }
};

const crear = async () => {
  limpiarMensajes();
  cancelar();
  creando.value = true;
  try {
    const res = await apiFetch('/api/departamentos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nuevo.value)
    });
    if (!res.ok) throw new Error(await leerError(res, 'No se pudo crear el departamento.'));
    const creado = await res.json();
    mensaje.value = `Se creó el departamento ${creado.nombre}.`;
    nuevo.value = { nombre: '', solo_por_invitacion: false };
    await cargar();
  } catch (err) {
    errorCrear.value = err.message;
  } finally {
    creando.value = false;
  }
};

const cancelar = () => {
  editando.value = null;
  borrando.value = null;
  desactivando.value = null;
  errorFila.value = '';
};

const empezarDesactivacion = (dep) => {
  cancelar();
  limpiarMensajes();
  desactivando.value = dep.id_dep;
};

// Desactivar pide confirmación (empezarDesactivacion); activar se hace directo
const cambiarEstado = async (dep, activo) => {
  limpiarMensajes();
  errorFila.value = '';
  guardando.value = true;
  try {
    const res = await apiFetch(`/api/departamentos/${dep.id_dep}/activo`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo })
    });
    if (!res.ok) throw new Error(await leerError(res, 'No se pudo cambiar el estado del departamento.'));
    const datos = await res.json();
    cancelar();
    mensajeLista.value = activo
      ? `Se activó el departamento ${dep.nombre}.`
      : `Se desactivó el departamento ${dep.nombre}.` +
        (datos.invitaciones_canceladas
          ? ` Se ${datos.invitaciones_canceladas === 1 ? 'canceló' : 'cancelaron'} ${plural(datos.invitaciones_canceladas, 'invitación pendiente', 'invitaciones pendientes')}.`
          : '');
    await cargar();
  } catch (err) {
    // Activar no abre confirmación: el error se muestra arriba de la lista
    if (activo) errorLista.value = err.message;
    else errorFila.value = err.message;
  } finally {
    guardando.value = false;
  }
};

const empezarEdicion = (dep) => {
  cancelar();
  limpiarMensajes();
  editando.value = { id_dep: dep.id_dep, nombre: dep.nombre, solo_por_invitacion: dep.solo_por_invitacion };
};

const empezarBorrado = (dep) => {
  cancelar();
  limpiarMensajes();
  borrando.value = dep.id_dep;
};

const guardar = async () => {
  errorFila.value = '';
  guardando.value = true;
  try {
    const { id_dep, nombre, solo_por_invitacion } = editando.value;
    const res = await apiFetch(`/api/departamentos/${id_dep}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, solo_por_invitacion })
    });
    if (!res.ok) throw new Error(await leerError(res, 'No se pudieron guardar los cambios.'));
    cancelar();
    mensajeLista.value = `Se guardaron los cambios de ${nombre.trim()}.`;
    await cargar();
  } catch (err) {
    errorFila.value = err.message;
  } finally {
    guardando.value = false;
  }
};

const borrar = async (dep) => {
  errorFila.value = '';
  guardando.value = true;
  try {
    const res = await apiFetch(`/api/departamentos/${dep.id_dep}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(await leerError(res, 'No se pudo borrar el departamento.'));
    cancelar();
    mensajeLista.value = `Se borró el departamento ${dep.nombre}.`;
    await cargar();
  } catch (err) {
    errorFila.value = err.message;
  } finally {
    guardando.value = false;
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

.form-card,
.lista-card {
  background: var(--bg-surface, #ffffff);
  border-radius: 16px;
  padding: 1.25rem;
  border: 1px solid var(--border-color, #e2e8f0);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

label {
  font-size: 0.875rem;
  font-weight: 600;
}

input[type="text"] {
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

input[type="text"]:focus {
  border-color: var(--brand-primary, #000080);
  background-color: var(--bg-surface, #ffffff);
}

.check {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  cursor: pointer;
}

.check input {
  width: 18px;
  height: 18px;
  accent-color: var(--brand-primary, #000080);
  flex-shrink: 0;
}

.nota,
.vacio,
.conteo {
  font-size: 0.78rem;
  font-weight: 400;
  color: var(--text-secondary, #64748b);
  margin: 0;
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
}

.submit-btn {
  background: var(--brand-primary, #000080);
  color: #ffffff;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
}

.btn-secundario,
.btn-peligro {
  background: transparent;
  border: 1px solid var(--border-color, #cbd5e1);
  color: var(--text-primary, #0f172a);
  padding: 0.45rem 0.8rem;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.btn-peligro {
  color: var(--color-danger, #dc2626);
  border-color: var(--tint-red-border, #fecaca);
}

.submit-btn:disabled,
.btn-secundario:disabled,
.btn-peligro:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Lista */
.lista {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

/* > para que no alcance a la lista de efectos de la confirmación */
.lista > li + li {
  border-top: 1px solid var(--border-color, #e2e8f0);
}

.fila {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  padding: 0.85rem 0.25rem;
}

.fila-info {
  flex: 1;
  min-width: 180px;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.fila-nombre {
  font-weight: 600;
  font-size: 0.92rem;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.fila-detalle {
  font-size: 0.75rem;
  color: var(--text-secondary, #64748b);
}

.etiqueta {
  font-size: 0.68rem;
  font-weight: 700;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  background: var(--tint-brand-bg, #e0e7ff);
  color: var(--brand-primary, #000080);
}

.acciones {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: flex-end;
}

/* Departamento desactivado (migración 020) */
.etiqueta-inactivo {
  background: var(--bg-primary, #f1f5f9);
  color: var(--text-secondary, #475569);
  border: 1px solid var(--border-color, #cbd5e1);
}

.fila-info.inactivo .fila-nombre {
  color: var(--text-secondary, #64748b);
}

.efectos {
  margin: 0;
  padding-left: 1.1rem;
  font-size: 0.82rem;
  color: var(--text-secondary, #475569);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.edicion,
.confirmacion {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.confirmacion p {
  margin: 0;
  font-size: 0.85rem;
}
</style>
