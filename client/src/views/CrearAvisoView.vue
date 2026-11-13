<template>
  <div class="dashboard-container">
    <!-- Header Reutilizable -->
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
          <h2>Crear Comunicado</h2>
          <p class="subtitle">Publica un nuevo aviso para el personal de GEMSO</p>
        </div>
      </header>

      <form class="form-card" @submit.prevent="publicarAviso">
        <!-- Título -->
        <div class="form-group">
          <label for="titulo">Título del Comunicado *</label>
          <input 
            id="titulo"
            type="text" 
            v-model="nuevoAviso.titulo" 
            placeholder="Ej. Hermosillo vivió fiesta de autos con Grupo Gemso" 
            required 
          />
        </div>

        <!-- Categoría y Tipo de Importancia -->
        <div class="form-row">
          <div class="form-group">
            <label for="categoria">Categoría *</label>
            <select id="categoria" v-model="nuevoAviso.categoria" required>
              <option value="" disabled>Selecciona una opción</option>
              <option value="Corporativo">Corporativo</option>
              <option value="Autofest 2026">Autofest 2026</option>
              <option value="Talento y Cultura">Talento y Cultura (TyC)</option>
              <option value="Sistemas / TI">Sistemas / TI</option>
              <option value="General">General</option>
            </select>
          </div>

          <div class="form-group">
            <label for="prioridad">Prioridad *</label>
            <select id="prioridad" v-model="nuevoAviso.prioridad" required>
              <option value="Normal">Normal</option>
              <option value="Urgente">Urgente</option>
            </select>
          </div>
        </div>

        <!-- Destino: toda la empresa, un departamento o una persona -->
        <fieldset class="form-group destino">
          <legend>¿Para quién es? *</legend>
          <div class="destino-opciones" role="radiogroup">
            <label v-for="op in OPCIONES_DESTINO" :key="op.valor" class="destino-opcion" :class="{ activa: nuevoAviso.destino === op.valor }">
              <input type="radio" name="destino" :value="op.valor" v-model="nuevoAviso.destino" />
              <span class="destino-titulo">{{ op.titulo }}</span>
              <span class="destino-sub">{{ op.sub }}</span>
            </label>
          </div>

          <select
            v-if="nuevoAviso.destino === 'departamento'"
            v-model="nuevoAviso.id_dep_destino"
            aria-label="Departamento destino"
            required
          >
            <option value="" disabled>Selecciona el departamento</option>
            <option v-for="dep in departamentos" :key="dep.id_dep" :value="dep.id_dep">{{ dep.nombre }}</option>
          </select>

          <!-- Persona: buscador, porque son más de 200 colaboradores -->
          <div v-if="nuevoAviso.destino === 'persona'" class="persona-destino">
            <div v-if="personaElegida" class="persona-elegida">
              <span>
                <strong>{{ personaElegida.nombre_completo }}</strong>
                <span class="persona-dep"> · {{ personaElegida.departamento }}</span>
              </span>
              <button type="button" class="link-btn" @click="personaElegida = null">Cambiar</button>
            </div>
            <template v-else>
              <input
                v-model="buscarPersona"
                type="search"
                placeholder="Escribe el nombre de la persona"
                aria-label="Buscar persona destino"
              />
              <ul v-if="buscarPersona.trim()" class="persona-resultados">
                <li v-for="p in personasEncontradas" :key="p.id_usu">
                  <button type="button" @click="elegirPersona(p)">
                    {{ p.nombre_completo }} <span class="persona-dep">· {{ p.departamento }}</span>
                  </button>
                </li>
                <li v-if="personasEncontradas.length === 0" class="persona-vacio">Nadie coincide con esa búsqueda.</li>
              </ul>
            </template>
          </div>

          <span class="nota">{{ resumenDestino }}</span>
        </fieldset>

        <!-- Checkbox Destacado en Modo TV -->
        <div class="form-checkbox-card">
          <div class="checkbox-info">
            <label for="esDestacado">Destacar en Carrusel (Modo TV)</label>
            <span>Aparecerá en el carrusel de la pantalla de inicio y en el Modo TV de quienes lo pueden ver.</span>
          </div>
          <input
            id="esDestacado"
            type="checkbox"
            v-model="nuevoAviso.esDestacado"
            class="toggle-switch"
          />
        </div>

        <!-- Contenido / Descripción -->
        <div class="form-group">
          <label for="contenido">Contenido del Aviso *</label>
          <textarea 
            id="contenido" 
            rows="5" 
            v-model="nuevoAviso.contenido" 
            placeholder="Escribe el mensaje o detalles del aviso aquí..."
            required
          ></textarea>
        </div>

        <p v-if="errorMsg" class="error-text" role="alert">{{ errorMsg }}</p>

        <!-- Botones de Acción -->
        <div class="form-actions">
          <button type="button" class="cancel-btn" @click="$router.back()">Cancelar</button>
          <button type="submit" class="submit-btn" :disabled="isSubmitting">
            {{ isSubmitting ? 'Publicando...' : 'Publicar Aviso' }}
          </button>
        </div>
      </form>
    </main>

    <!-- Menú desplegable lateral y notificaciones -->
    <SidebarMenu :is-open="isMenuOpen" @close="isMenuOpen = false" />
    <NotificationsDrawer :is-open="isNotificationsOpen" @close="isNotificationsOpen = false" />
  </div>
</template>

<script setup>
// Pantalla Crear Aviso (solo con permiso 'publicar_avisos'; la sesión la revisa el router)
// Destino: toda la empresa, un departamento o una persona (server/routes/anuncios.js).
// "Destacar" lo manda al carrusel de inicio (migración 014). La imagen y los adjuntos
// quedan para después, cuando se defina dónde se guardan los archivos.
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { apiFetch } from '../api';
import { usuarioTienePermiso } from '../utils/estadisticas';
import AppHeader from '../components/AppHeader.vue';
import SidebarMenu from '../components/SidebarMenu.vue';
import NotificationsDrawer from '../components/NotificationsDrawer.vue';

const router = useRouter();
const isMenuOpen = ref(false);
const isNotificationsOpen = ref(false);
const isSubmitting = ref(false);
const errorMsg = ref('');

const OPCIONES_DESTINO = [
  { valor: 'general', titulo: 'Toda la empresa', sub: 'Todos los colaboradores' },
  { valor: 'departamento', titulo: 'Un departamento', sub: 'Solo sus integrantes' },
  { valor: 'persona', titulo: 'Una persona', sub: 'Solo ella lo verá' }
];
const MAX_RESULTADOS_PERSONA = 8;

const nuevoAviso = ref({
  titulo: '',
  categoria: '',
  prioridad: 'Normal',
  destino: 'general',
  id_dep_destino: '',
  esDestacado: false,
  contenido: ''
});

// Catálogos para el destino
const departamentos = ref([]);
const personas = ref([]);
const buscarPersona = ref('');
const personaElegida = ref(null);

// Búsqueda sin distinguir mayúsculas ni acentos ("jose" encuentra "José")
const normalizar = (texto) => (texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const personasEncontradas = computed(() => {
  const buscado = normalizar(buscarPersona.value.trim());
  return personas.value
    .filter((p) => normalizar(p.nombre_completo).includes(buscado))
    .slice(0, MAX_RESULTADOS_PERSONA);
});

const elegirPersona = (p) => {
  personaElegida.value = p;
  buscarPersona.value = '';
};

// Frase que confirma a quién le llegará, para evitar mandar algo a toda la empresa por error
const resumenDestino = computed(() => {
  const { destino, id_dep_destino } = nuevoAviso.value;
  if (destino === 'departamento') {
    const dep = departamentos.value.find((d) => d.id_dep === id_dep_destino);
    return dep ? `Lo verán solo los integrantes de ${dep.nombre}.` : 'Elige el departamento.';
  }
  if (destino === 'persona') {
    return personaElegida.value ? `Lo verá solo ${personaElegida.value.nombre_completo}.` : 'Busca y elige a la persona.';
  }
  return 'Lo verán todos los colaboradores de GEMSO.';
});

const cargarCatalogos = async () => {
  try {
    const [resDep, resPersonas] = await Promise.all([
      apiFetch('/api/departamentos'),
      apiFetch('/api/anuncios/destinatarios')
    ]);
    if (resDep.ok) departamentos.value = await resDep.json();
    if (resPersonas.ok) personas.value = await resPersonas.json();
  } catch (error) {
    console.error('Error al cargar los destinos:', error);
  }
};

const publicarAviso = async () => {
  errorMsg.value = '';
  const { destino, id_dep_destino } = nuevoAviso.value;
  if (destino === 'persona' && !personaElegida.value) {
    errorMsg.value = 'Elige a la persona a la que va dirigido el aviso.';
    return;
  }

  isSubmitting.value = true;
  try {
    // El autor lo saca el servidor del token de sesión
    const response = await apiFetch('/api/anuncios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titulo: nuevoAviso.value.titulo,
        contenido: nuevoAviso.value.contenido,
        categoria: nuevoAviso.value.categoria,
        urgente: nuevoAviso.value.prioridad === 'Urgente',
        destacado: nuevoAviso.value.esDestacado,
        id_dep_destino: destino === 'departamento' ? id_dep_destino : null,
        id_usu_destino: destino === 'persona' ? personaElegida.value.id_usu : null
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      errorMsg.value = data.error || 'Hubo un error al guardar el comunicado';
      return;
    }

    // A dónde ir después de publicar:
    //   - Para toda la empresa: abrir el aviso, para ver cómo quedó.
    //   - Dirigido: el autor no lo ve en su lista (regla de visibilidad de routes/anuncios.js),
    //     así que se abren sus estadísticas, que además confirman a quién le llegó.
    const id = data.anuncio.id_anu;
    if (destino === 'general') router.push(`/mis-avisos/${id}`);
    else if (usuarioTienePermiso('ver_estadisticas')) router.push(`/estadisticas/${id}`);
    else router.push('/mis-avisos');
  } catch (error) {
    console.error('Error al publicar el aviso:', error);
    errorMsg.value = 'No se pudo conectar con el servidor';
  } finally {
    isSubmitting.value = false;
  }
};

onMounted(cargarCatalogos);
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

/* Header de Página */
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
  color: var(--text-primary, #0f172a);
}

.subtitle {
  font-size: 0.85rem;
  color: var(--text-secondary, #64748b);
  margin: 0.15rem 0 0 0;
}

/* Formulario */
.form-card {
  background: var(--bg-surface, #ffffff);
  border-radius: 16px;
  padding: 1.5rem;
  border: 1px solid var(--border-color, #e2e8f0);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
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
  color: var(--text-primary, #1e293b);
}

input[type="text"],
select,
textarea {
  width: 100%;
  padding: 0.75rem 0.9rem;
  border: 1px solid var(--border-color, #cbd5e1);
  border-radius: 8px;
  font-size: 0.9rem;
  background-color: var(--bg-input, #f8fafc);
  color: var(--text-primary, #0f172a);
  box-sizing: border-box;
  outline: none;
  font-family: inherit; /* el textarea no hereda la letra de la app por defecto */
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

input[type="text"]:focus,
select:focus,
textarea:focus {
  border-color: var(--brand-primary, #000080);
  background-color: var(--bg-surface, #ffffff);
}

/* Toggle switch para destacado */
.form-checkbox-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.9rem 1rem;
  background-color: var(--bg-primary, #f1f5f9);
  border-radius: 10px;
  border: 1px solid var(--border-color, #e2e8f0);
}

.checkbox-info {
  display: flex;
  flex-direction: column;
  padding-right: 1rem;
  flex: 1;
  min-width: 0;
}

.checkbox-info label {
  font-size: 0.875rem;
  font-weight: 600;
}

.checkbox-info span {
  font-size: 0.75rem;
  color: var(--text-secondary, #64748b);
  margin-top: 0.15rem;
}

.toggle-switch {
  width: 22px;
  height: 22px;
  min-width: 22px;
  min-height: 22px;
  flex-shrink: 0;
  accent-color: var(--brand-primary, #000080);
  cursor: pointer;
}

/* Destino */
.destino {
  border: none;
  margin: 0;
  padding: 0;
  min-width: 0;
}

.destino legend {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary, #1e293b);
  padding: 0;
  margin-bottom: 0.4rem;
}

.destino-opciones {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.6rem;
}

@media (max-width: 540px) {
  .destino-opciones {
    grid-template-columns: 1fr;
  }
}

.destino-opcion {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  padding: 0.75rem 0.9rem;
  border: 1px solid var(--border-color, #cbd5e1);
  border-radius: 10px;
  background: var(--bg-input, #f8fafc);
  cursor: pointer;
}

.destino-opcion.activa {
  border-color: var(--brand-primary, #000080);
  background: var(--tint-brand-bg, #e0e7ff);
}

/* El radio queda oculto pero accesible: toda la tarjeta es la opción */
.destino-opcion input {
  position: absolute;
  opacity: 0;
  width: 1px;
  height: 1px;
}

.destino-opcion:focus-within {
  outline: 2px solid var(--brand-primary, #000080);
  outline-offset: 2px;
}

.destino-titulo {
  font-size: 0.875rem;
  font-weight: 600;
}

.destino-sub,
.nota {
  font-size: 0.75rem;
  color: var(--text-secondary, #64748b);
}

.persona-destino input[type="search"] {
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

.persona-destino input[type="search"]:focus {
  border-color: var(--brand-primary, #000080);
  background-color: var(--bg-surface, #ffffff);
}

.persona-resultados {
  list-style: none;
  margin: 0.4rem 0 0;
  padding: 0.25rem;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 8px;
  background: var(--bg-surface, #ffffff);
}

.persona-resultados button {
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  padding: 0.6rem 0.7rem;
  border-radius: 6px;
  font-size: 0.875rem;
  color: var(--text-primary, #0f172a);
  cursor: pointer;
}

.persona-resultados button:hover,
.persona-resultados button:focus-visible {
  background: var(--bg-primary, #f1f5f9);
}

.persona-vacio {
  padding: 0.6rem 0.7rem;
  font-size: 0.8rem;
  color: var(--text-secondary, #64748b);
}

.persona-elegida {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem 0.9rem;
  border: 1px solid var(--brand-primary, #000080);
  border-radius: 8px;
  background: var(--tint-brand-bg, #e0e7ff);
  font-size: 0.875rem;
}

.persona-dep {
  color: var(--text-secondary, #64748b);
  font-size: 0.8rem;
}

.link-btn {
  background: none;
  border: none;
  color: var(--brand-primary, #000080);
  font-weight: 600;
  font-size: 0.8rem;
  cursor: pointer;
  padding: 0;
}

.error-text {
  color: var(--color-danger, #dc2626);
  font-size: 0.85rem;
  font-weight: 600;
  margin: 0;
}

/* Acciones */
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.cancel-btn {
  background: transparent;
  border: 1px solid var(--border-color, #cbd5e1);
  color: var(--text-secondary, #475569);
  padding: 0.75rem 1.25rem;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
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
  transition: opacity 0.2s ease;
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>