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
          <h2>Invitaciones</h2>
          <p class="subtitle">Las cuentas de Talento y Cultura solo se crean por invitación. Los demás colaboradores se registran solos</p>
        </div>
      </header>

      <!-- Nueva invitación -->
      <form class="form-card" @submit.prevent="invitar">
        <div class="form-row">
          <div class="form-group">
            <label for="correo">Correo de la persona *</label>
            <input
              id="correo"
              type="email"
              v-model="nueva.correo"
              maxlength="150"
              autocapitalize="none"
              autocorrect="off"
              spellcheck="false"
              placeholder="nombre@gemso.com.mx"
              required
            />
          </div>
          <div class="form-group">
            <label for="departamento">Departamento *</label>
            <select id="departamento" v-model="nueva.id_departamento" required>
              <option value="" disabled>Selecciona departamento</option>
              <option v-for="dep in departamentos" :key="dep.id_dep" :value="dep.id_dep">
                {{ dep.nombre }}
              </option>
            </select>
          </div>
        </div>

        <p v-if="esTalentoYCultura" class="aviso-permisos">
          Quien entre a Talento y Cultura podrá publicar avisos, ver estadísticas e invitar a otras personas.
        </p>

        <p class="nota">
          Le llegará un correo con un enlace de un solo uso que vence en 7 días.
          Si ese correo ya tenía una invitación pendiente, la anterior deja de servir.
        </p>

        <p v-if="errorMsg" class="error-text">{{ errorMsg }}</p>

        <div class="form-actions">
          <button type="submit" class="submit-btn" :disabled="enviando">
            {{ enviando ? 'Enviando...' : 'Enviar invitación' }}
          </button>
        </div>
      </form>

      <!-- Resultado de la última invitación -->
      <section v-if="ultima" class="resultado" :class="{ 'sin-correo': !ultima.correo_enviado }" aria-live="polite">
        <p v-if="ultima.correo_enviado">
          Se envió la invitación a <strong>{{ ultima.correo }}</strong>.
        </p>
        <p v-else>
          La invitación para <strong>{{ ultima.correo }}</strong> quedó lista, pero <strong>no se pudo enviar el correo</strong>.
          Copia el enlace y mándaselo por otro medio.
        </p>
        <div class="enlace-fila">
          <input type="text" :value="ultima.enlace" readonly aria-label="Enlace de invitación" @focus="$event.target.select()" />
          <button type="button" class="btn-secundario" @click="copiarEnlace">{{ copiado ? 'Copiado' : 'Copiar' }}</button>
        </div>
        <p class="nota">Este enlace solo se muestra ahora. Si lo pierdes, envía una invitación nueva.</p>
      </section>

      <!-- Lista de invitaciones -->
      <section class="lista-card">
        <div class="lista-encabezado">
          <h3>Enviadas</h3>
          <select v-model="filtro" aria-label="Filtrar por estado">
            <option value="todas">Todas</option>
            <option v-for="(info, clave) in ESTADOS_INVITACION" :key="clave" :value="clave">{{ info.plural }}</option>
          </select>
        </div>

        <p v-if="cargando" class="vacio">Cargando...</p>
        <p v-else-if="errorLista" class="error-text">{{ errorLista }}</p>
        <p v-else-if="filtradas.length === 0" class="vacio">No hay invitaciones {{ filtro === 'todas' ? 'todavía' : 'con ese estado' }}.</p>

        <ul v-else class="lista">
          <li v-for="inv in filtradas" :key="inv.id_inv" class="fila">
            <div class="fila-info">
              <span class="fila-correo">{{ inv.correo }}</span>
              <span class="fila-detalle">
                {{ inv.departamento }} · {{ detalleFecha(inv) }}
              </span>
            </div>
            <span class="estado" :class="inv.estado">{{ ESTADOS_INVITACION[inv.estado].etiqueta }}</span>
            <div class="fila-acciones">
              <button
                v-if="inv.estado !== 'usada'"
                type="button"
                class="btn-secundario"
                :disabled="enviando"
                @click="reenviar(inv)"
              >Reenviar</button>
              <button
                v-if="inv.estado === 'pendiente'"
                type="button"
                class="btn-peligro"
                :disabled="cancelandoId === inv.id_inv"
                @click="cancelar(inv)"
              >Cancelar</button>
            </div>
          </li>
        </ul>
      </section>
    </main>

    <SidebarMenu :is-open="isMenuOpen" @close="isMenuOpen = false" />
    <NotificationsDrawer :is-open="isNotificationsOpen" @close="isNotificationsOpen = false" />
  </div>
</template>

<script setup>
// Pantalla de Invitaciones (solo con permiso 'invitar_colaboradores', en la beta Talento y Cultura)
// Sirve sobre todo para dar de alta a alguien en un departamento "solo por invitación"
// (hoy Talento y Cultura), que no aparece en el registro abierto.
// Usa las rutas de server/routes/invitaciones.js
import { ref, computed, onMounted } from 'vue';
import { apiFetch } from '../api';
import { formatearFecha } from '../utils/estadisticas';
import AppHeader from '../components/AppHeader.vue';
import SidebarMenu from '../components/SidebarMenu.vue';
import NotificationsDrawer from '../components/NotificationsDrawer.vue';

const isMenuOpen = ref(false);
const isNotificationsOpen = ref(false);

// Estados que calcula el servidor (SQL_ESTADO en services/invitaciones.js)
const ESTADOS_INVITACION = {
  pendiente: { etiqueta: 'Pendiente', plural: 'Pendientes' },
  usada: { etiqueta: 'Registrada', plural: 'Registradas' },
  vencida: { etiqueta: 'Vencida', plural: 'Vencidas' },
  cancelada: { etiqueta: 'Cancelada', plural: 'Canceladas' }
};

const departamentos = ref([]);
const invitaciones = ref([]);
const filtro = ref('todas');
const cargando = ref(true);
const errorLista = ref('');

const nueva = ref({ correo: '', id_departamento: '' });
const enviando = ref(false);
const errorMsg = ref('');
const ultima = ref(null); // { correo, enlace, correo_enviado }
const copiado = ref(false);
const cancelandoId = ref(null);

const esTalentoYCultura = computed(() =>
  departamentos.value.find((d) => d.id_dep === nueva.value.id_departamento)?.nombre === 'Talento y Cultura'
);

const filtradas = computed(() =>
  filtro.value === 'todas' ? invitaciones.value : invitaciones.value.filter((i) => i.estado === filtro.value)
);

// Fecha que le importa a TyC según el estado
const detalleFecha = (inv) => {
  if (inv.estado === 'usada') return `se registró el ${formatearFecha(inv.fecha_uso)}`;
  if (inv.estado === 'pendiente') return `vence el ${formatearFecha(inv.fecha_expira)}`;
  return `enviada el ${formatearFecha(inv.fecha_creacion)}`;
};

// Leer el mensaje de error de la API
const leerError = async (res, porDefecto) => {
  try {
    return (await res.json()).error || porDefecto;
  } catch {
    return porDefecto;
  }
};

const cargarInvitaciones = async () => {
  errorLista.value = '';
  try {
    const res = await apiFetch('/api/invitaciones');
    if (!res.ok) throw new Error(await leerError(res, 'No se pudieron cargar las invitaciones.'));
    invitaciones.value = await res.json();
  } catch (err) {
    errorLista.value = err.message;
  } finally {
    cargando.value = false;
  }
};

const cargarDepartamentos = async () => {
  try {
    const res = await apiFetch('/api/departamentos');
    if (res.ok) departamentos.value = await res.json();
    // Se preselecciona el departamento cerrado (Talento y Cultura), que es el caso común
    const cerrado = departamentos.value.find((d) => d.solo_por_invitacion);
    if (cerrado && !nueva.value.id_departamento) nueva.value.id_departamento = cerrado.id_dep;
  } catch (err) {
    console.error('Error al obtener departamentos:', err);
  }
};

// Mandar la invitación al servidor (la usan el formulario y "Reenviar")
const enviarInvitacion = async (correo, idDepartamento) => {
  errorMsg.value = '';
  copiado.value = false;
  enviando.value = true;
  try {
    const res = await apiFetch('/api/invitaciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo, id_departamento: idDepartamento })
    });
    if (!res.ok) throw new Error(await leerError(res, 'No se pudo crear la invitación.'));
    const data = await res.json();
    ultima.value = { correo: data.invitacion.correo, enlace: data.enlace, correo_enviado: data.correo_enviado };
    await cargarInvitaciones();
    return true;
  } catch (err) {
    errorMsg.value = err.message;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return false;
  } finally {
    enviando.value = false;
  }
};

const invitar = async () => {
  if (await enviarInvitacion(nueva.value.correo, nueva.value.id_departamento)) {
    nueva.value = { correo: '', id_departamento: nueva.value.id_departamento };
  }
};

// Reenviar crea un enlace nuevo con el mismo correo y departamento
const reenviar = (inv) => {
  const dep = departamentos.value.find((d) => d.nombre === inv.departamento);
  if (!dep) {
    errorMsg.value = 'El departamento de esa invitación ya no existe.';
    return;
  }
  enviarInvitacion(inv.correo, dep.id_dep);
};

const cancelar = async (inv) => {
  cancelandoId.value = inv.id_inv;
  try {
    const res = await apiFetch(`/api/invitaciones/${inv.id_inv}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(await leerError(res, 'No se pudo cancelar la invitación.'));
    await cargarInvitaciones();
  } catch (err) {
    errorLista.value = err.message;
  } finally {
    cancelandoId.value = null;
  }
};

const copiarEnlace = async () => {
  try {
    await navigator.clipboard.writeText(ultima.value.enlace);
    copiado.value = true;
  } catch {
    // Sin HTTPS el portapapeles puede no estar disponible: el campo se puede copiar a mano
    copiado.value = false;
  }
};

onMounted(() => {
  cargarDepartamentos();
  cargarInvitaciones();
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

.form-card,
.lista-card,
.resultado {
  background: var(--bg-surface, #ffffff);
  border-radius: 16px;
  padding: 1.5rem;
  border: 1px solid var(--border-color, #e2e8f0);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
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

label {
  font-size: 0.875rem;
  font-weight: 600;
}

input[type="email"],
input[type="text"],
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

input:focus,
select:focus {
  border-color: var(--brand-primary, #000080);
  background-color: var(--bg-surface, #ffffff);
}

.nota {
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

.error-text {
  color: var(--color-danger, #dc2626);
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

.submit-btn:disabled,
.btn-secundario:disabled,
.btn-peligro:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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

/* Resultado */
.resultado {
  border-color: var(--tint-green-border, #bbf7d0);
  background: var(--tint-green-bg, #f0fdf4);
}

.resultado.sin-correo {
  border-color: var(--tint-red-border, #fecaca);
  background: var(--tint-red-bg, #fef2f2);
}

.resultado p {
  margin: 0;
  font-size: 0.875rem;
}

.enlace-fila {
  display: flex;
  gap: 0.5rem;
}

.enlace-fila input {
  flex: 1;
  min-width: 0;
  font-size: 0.8rem;
}

/* Lista */
.lista-encabezado {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.lista-encabezado h3 {
  margin: 0;
  font-size: 1.05rem;
}

.lista-encabezado select {
  width: auto;
  padding: 0.45rem 0.7rem;
  font-size: 0.8rem;
}

.vacio {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-secondary, #64748b);
}

.lista {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.fila {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 0.75rem;
  padding: 0.8rem 0;
  border-top: 1px solid var(--border-color, #e2e8f0);
}

.fila:first-child {
  border-top: none;
}

.fila-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.fila-correo {
  font-weight: 600;
  font-size: 0.9rem;
  overflow-wrap: anywhere;
}

.fila-detalle {
  font-size: 0.75rem;
  color: var(--text-secondary, #64748b);
}

.fila-acciones {
  display: flex;
  gap: 0.4rem;
}

.estado {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  white-space: nowrap;
  background: var(--bg-primary, #f1f5f9);
  color: var(--text-secondary, #64748b);
}

.estado.pendiente {
  background: var(--tint-blue-bg, #eff6ff);
  color: var(--tint-blue-text, #2563eb);
}

.estado.usada {
  background: var(--tint-green-bg, #f0fdf4);
  color: var(--tint-green-text, #15803d);
}

/* En celular el estado y los botones bajan debajo del correo */
@media (max-width: 540px) {
  .fila {
    grid-template-columns: 1fr auto;
  }

  .fila-acciones {
    grid-column: 1 / -1;
  }
}
</style>
