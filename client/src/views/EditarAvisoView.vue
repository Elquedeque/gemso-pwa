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
          <h2>Editar Comunicado</h2>
          <p class="subtitle">Corrige un aviso ya publicado</p>
        </div>
      </header>

      <p v-if="cargando" class="estado">Cargando aviso...</p>
      <p v-else-if="errorCarga" class="estado error-text">{{ errorCarga }}</p>
      <p v-else-if="archivado" class="estado">
        Este aviso está archivado. Restáuralo desde sus estadísticas para poder editarlo.
      </p>

      <form v-else class="form-card" @submit.prevent="guardar">
        <!-- El destino no se cambia: cambiaría quién lo ve y sus estadísticas -->
        <div class="destino-fijo">
          <span class="destino-fijo-titulo">Para: {{ destino }}</span>
          <span class="nota">El destino no se puede cambiar. Si te equivocaste de destino, archiva este aviso y publica uno nuevo.</span>
        </div>

        <div class="form-group">
          <label for="titulo">Título del Comunicado *</label>
          <input id="titulo" type="text" v-model="form.titulo" maxlength="200" required />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="categoria">Categoría *</label>
            <select id="categoria" v-model="form.categoria" required>
              <option value="Corporativo">Corporativo</option>
              <option value="Autofest 2026">Autofest 2026</option>
              <option value="Talento y Cultura">Talento y Cultura (TyC)</option>
              <option value="Sistemas / TI">Sistemas / TI</option>
              <option value="General">General</option>
            </select>
          </div>
          <div class="form-group">
            <label for="prioridad">Prioridad *</label>
            <select id="prioridad" v-model="form.prioridad" required>
              <option value="Normal">Normal</option>
              <option value="Urgente">Urgente</option>
            </select>
          </div>
        </div>

        <!-- Imagen: la actual, una nueva o ninguna -->
        <div class="form-group">
          <label for="imagen">Imagen del aviso <span class="opcional">(opcional)</span></label>
          <input id="imagen" type="file" class="archivo-oculto" :accept="REGLAS_ARCHIVOS.imagen.accept" @change="elegirImagen" />
          <div v-if="imagenVista" class="imagen-vista">
            <img :src="imagenVista" alt="Imagen del aviso" />
            <span v-if="imagenNueva" class="imagen-etiqueta">Nueva</span>
            <button type="button" class="quitar-btn" @click="quitarImagen">✕ Quitar</button>
          </div>
          <label v-else for="imagen" class="caja-subir">
            <span class="caja-subir-titulo">{{ quitarImagenActual ? 'Elegir otra imagen' : 'Elegir imagen o banner' }}</span>
            <span class="caja-subir-sub">JPG, PNG o WEBP, hasta 5 MB. Se ve mejor horizontal (16:9)</span>
          </label>
          <span v-if="quitarImagenActual && !imagenNueva" class="nota">La imagen actual se quitará al guardar.</span>
        </div>

        <div class="form-group">
          <label for="contenido">Contenido del Aviso *</label>
          <textarea id="contenido" rows="6" v-model="form.contenido" required></textarea>
        </div>

        <!-- Adjuntos: los que ya tiene (se pueden quitar) y los nuevos -->
        <div class="form-group">
          <label for="adjuntos">Archivos adjuntos <span class="opcional">(opcional, máximo {{ MAX_ADJUNTOS }})</span></label>
          <ul v-if="adjuntosActuales.length || adjuntosNuevos.length" class="lista-adjuntos">
            <li v-for="adj in adjuntosActuales" :key="adj.id_anu_adj" :class="{ 'por-quitar': adjuntosQuitar.includes(adj.id_anu_adj) }">
              <span class="adjunto-ext">{{ adj.tipo_archivo }}</span>
              <span class="adjunto-nombre">{{ adj.nombre_archivo }}</span>
              <span class="adjunto-tamano">{{ formatearTamano(adj.tamano_bytes) }}</span>
              <button type="button" class="link-btn" @click="alternarQuitar(adj.id_anu_adj)">
                {{ adjuntosQuitar.includes(adj.id_anu_adj) ? 'Conservar' : 'Quitar' }}
              </button>
            </li>
            <li v-for="(archivo, i) in adjuntosNuevos" :key="archivo.name + i">
              <span class="adjunto-ext">{{ extensionDe(archivo.name) }}</span>
              <span class="adjunto-nombre">{{ archivo.name }} <span class="adjunto-nuevo">(nuevo)</span></span>
              <span class="adjunto-tamano">{{ formatearTamano(archivo.size) }}</span>
              <button type="button" class="link-btn" @click="adjuntosNuevos.splice(i, 1)">Quitar</button>
            </li>
          </ul>
          <input id="adjuntos" type="file" multiple class="archivo-oculto" :accept="REGLAS_ARCHIVOS.adjunto.accept" @change="elegirAdjuntos" />
          <label v-if="totalAdjuntos < MAX_ADJUNTOS" for="adjuntos" class="caja-subir chica">
            <span class="caja-subir-titulo">+ Agregar archivos</span>
            <span class="caja-subir-sub">PDF, Word, Excel, PowerPoint o imágenes, hasta 10 MB cada uno</span>
          </label>
        </div>

        <p class="nota">
          Quienes ya lo confirmaron no tienen que volver a hacerlo. El aviso mostrará "Editado" con la fecha,
          y no se manda una notificación nueva.
        </p>

        <p v-if="avisoArchivos" class="aviso-archivos" role="status">{{ avisoArchivos }}</p>
        <p v-if="errorMsg" class="error-text" role="alert">{{ errorMsg }}</p>
        <p v-if="progreso" class="nota" aria-live="polite">{{ progreso }}</p>

        <div class="form-actions">
          <button type="button" class="cancel-btn" :disabled="guardando" @click="$router.back()">Cancelar</button>
          <button type="submit" class="submit-btn" :disabled="guardando">
            {{ guardando ? 'Guardando...' : 'Guardar cambios' }}
          </button>
        </div>
      </form>
    </main>

    <SidebarMenu :is-open="isMenuOpen" @close="isMenuOpen = false" />
    <NotificationsDrawer :is-open="isNotificationsOpen" @close="isNotificationsOpen = false" />
  </div>
</template>

<script setup>
// Pantalla Editar Aviso (solo con permiso 'publicar_avisos'; migración 019)
// Carga con GET /api/anuncios/:id/edicion, que no registra vista. Al guardar:
//   1. PUT /api/anuncios/:id con los textos (el servidor marca "Editado" solo si algo cambió)
//   2. Imagen: quitarla (DELETE) o subir la nueva (reemplaza la anterior)
//   3. Adjuntos: quitar los marcados y subir los nuevos
// Los archivos se suben con ?edicion=1 para que cuenten como edición.
// El destino y el carrusel no se cambian aquí (el carrusel tiene su botón en el aviso).
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { apiFetch } from '../api';
import { usuarioTienePermiso } from '../utils/estadisticas';
import {
  REGLAS_ARCHIVOS, MAX_ADJUNTOS, revisarArchivo, subirArchivo, extensionDe, formatearTamano, urlDeArchivo
} from '../utils/archivos';
import AppHeader from '../components/AppHeader.vue';
import SidebarMenu from '../components/SidebarMenu.vue';
import NotificationsDrawer from '../components/NotificationsDrawer.vue';

const route = useRoute();
const router = useRouter();
const idAnu = Number(route.params.id);

const isMenuOpen = ref(false);
const isNotificationsOpen = ref(false);

const cargando = ref(true);
const errorCarga = ref('');
const archivado = ref(false);
const guardando = ref(false);
const errorMsg = ref('');
const progreso = ref('');
const avisoArchivos = ref('');

const form = ref({ titulo: '', categoria: 'General', prioridad: 'Normal', contenido: '' });
const destino = ref('');
const esGeneral = ref(true);

// ── Imagen ────────────────────────────────────────────────────────────
const tieneImagenActual = ref(false);
const urlImagenActual = ref(null);   // blob de la imagen guardada
const quitarImagenActual = ref(false);
const imagenNueva = ref(null);       // archivo elegido
const urlImagenNueva = ref(null);

const imagenVista = computed(() =>
  urlImagenNueva.value || (tieneImagenActual.value && !quitarImagenActual.value ? urlImagenActual.value : null)
);

const liberarNueva = () => {
  if (urlImagenNueva.value) URL.revokeObjectURL(urlImagenNueva.value);
  imagenNueva.value = null;
  urlImagenNueva.value = null;
};

const elegirImagen = (e) => {
  avisoArchivos.value = '';
  const archivo = e.target.files[0];
  e.target.value = '';
  if (!archivo) return;
  const error = revisarArchivo(archivo, 'imagen');
  if (error) {
    avisoArchivos.value = error;
    return;
  }
  liberarNueva();
  imagenNueva.value = archivo;
  urlImagenNueva.value = URL.createObjectURL(archivo);
};

// "Quitar": si había una nueva, se descarta; si se veía la guardada, se marca para quitarla
const quitarImagen = () => {
  if (imagenNueva.value) liberarNueva();
  else quitarImagenActual.value = true;
};

// ── Adjuntos ──────────────────────────────────────────────────────────
const adjuntosActuales = ref([]);
const adjuntosQuitar = ref([]);   // ids marcados para quitar
const adjuntosNuevos = ref([]);   // archivos elegidos

const totalAdjuntos = computed(() =>
  adjuntosActuales.value.length - adjuntosQuitar.value.length + adjuntosNuevos.value.length
);

const alternarQuitar = (id) => {
  const i = adjuntosQuitar.value.indexOf(id);
  if (i >= 0) {
    // Conservarlo de nuevo solo si cabe con los nuevos
    if (totalAdjuntos.value >= MAX_ADJUNTOS) {
      avisoArchivos.value = `Máximo ${MAX_ADJUNTOS} adjuntos: quita uno nuevo primero`;
      return;
    }
    adjuntosQuitar.value.splice(i, 1);
  } else {
    adjuntosQuitar.value.push(id);
  }
};

const elegirAdjuntos = (e) => {
  const errores = [];
  for (const archivo of e.target.files) {
    const error = revisarArchivo(archivo, 'adjunto');
    if (error) errores.push(error);
    else if (totalAdjuntos.value >= MAX_ADJUNTOS) errores.push(`"${archivo.name}": máximo ${MAX_ADJUNTOS} adjuntos`);
    else adjuntosNuevos.value.push(archivo);
  }
  e.target.value = '';
  avisoArchivos.value = errores.join(' · ');
};

// ── Cargar ────────────────────────────────────────────────────────────
const cargar = async () => {
  cargando.value = true;
  errorCarga.value = '';
  try {
    const res = await apiFetch(`/api/anuncios/${idAnu}/edicion`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'No se pudo cargar el aviso');

    archivado.value = Boolean(data.fecha_archivado);
    form.value = {
      titulo: data.titulo,
      categoria: data.categoria,
      prioridad: data.urgente ? 'Urgente' : 'Normal',
      contenido: data.contenido
    };
    esGeneral.value = !data.id_dep_destino && !data.id_usu_destino;
    destino.value = data.departamento_destino
      ? `Departamento de ${data.departamento_destino}`
      : data.persona_destino || 'Toda la empresa';
    adjuntosActuales.value = data.adjuntos;
    tieneImagenActual.value = data.tiene_imagen;
    if (data.tiene_imagen) {
      urlImagenActual.value = await urlDeArchivo(`/api/anuncios/${idAnu}/imagen`).catch(() => null);
    }
  } catch (err) {
    errorCarga.value = err.message;
  } finally {
    cargando.value = false;
  }
};

// ── Guardar ───────────────────────────────────────────────────────────
// Los textos van primero. Si después falla algún archivo, los textos ya quedaron guardados:
// se dice cuál falló y se recarga el aviso para mostrar lo que sí quedó.
const guardar = async () => {
  errorMsg.value = '';
  guardando.value = true;
  progreso.value = 'Guardando cambios...';
  const fallidos = [];
  try {
    const res = await apiFetch(`/api/anuncios/${idAnu}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titulo: form.value.titulo,
        contenido: form.value.contenido,
        categoria: form.value.categoria,
        urgente: form.value.prioridad === 'Urgente'
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'No se pudieron guardar los cambios');

    // Imagen
    if (imagenNueva.value) {
      progreso.value = 'Subiendo la imagen...';
      try {
        await subirArchivo(`/api/anuncios/${idAnu}/imagen?edicion=1`, imagenNueva.value);
      } catch (err) {
        fallidos.push(err.message);
      }
    } else if (quitarImagenActual.value && tieneImagenActual.value) {
      const r = await apiFetch(`/api/anuncios/${idAnu}/imagen`, { method: 'DELETE' });
      if (!r.ok) fallidos.push('No se pudo quitar la imagen');
    }

    // Adjuntos: primero quitar, para que los nuevos quepan en el máximo
    for (const id of adjuntosQuitar.value) {
      const adj = adjuntosActuales.value.find((a) => a.id_anu_adj === id);
      const r = await apiFetch(`/api/anuncios/${idAnu}/adjuntos/${id}`, { method: 'DELETE' });
      if (!r.ok) fallidos.push(`No se pudo quitar "${adj?.nombre_archivo}"`);
    }
    for (const [i, archivo] of adjuntosNuevos.value.entries()) {
      progreso.value = `Subiendo adjunto ${i + 1} de ${adjuntosNuevos.value.length}...`;
      try {
        await subirArchivo(`/api/anuncios/${idAnu}/adjuntos?edicion=1`, archivo);
      } catch (err) {
        fallidos.push(err.message);
      }
    }

    if (fallidos.length) {
      errorMsg.value = `Los textos se guardaron, pero hubo problemas con los archivos: ${fallidos.join(' · ')}`;
      reiniciarArchivos();
      await cargar();
      return;
    }
    irAlAviso();
  } catch (err) {
    errorMsg.value = err.message;
  } finally {
    guardando.value = false;
    progreso.value = '';
  }
};

const reiniciarArchivos = () => {
  liberarNueva();
  quitarImagenActual.value = false;
  if (urlImagenActual.value) URL.revokeObjectURL(urlImagenActual.value);
  urlImagenActual.value = null;
  adjuntosQuitar.value = [];
  adjuntosNuevos.value = [];
};

// Se regresa a la pantalla de donde se llegó (el detalle o las estadísticas), que vuelve a
// cargar el aviso ya editado. Si se abrió el enlace directo, como al publicar: los generales
// en Mis Avisos y los dirigidos a otros en Estadísticas (puede que no salgan en Mis Avisos).
const irAlAviso = () => {
  if (router.options.history.state.back) router.back();
  else if (esGeneral.value) router.push(`/mis-avisos/${idAnu}`);
  else if (usuarioTienePermiso('ver_estadisticas')) router.push(`/estadisticas/${idAnu}`);
  else router.push('/mis-avisos');
};

onMounted(cargar);
onUnmounted(reiniciarArchivos);
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

.estado {
  margin: 0;
  padding: 1.5rem;
  text-align: center;
  background: var(--bg-surface, #ffffff);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 16px;
  font-size: 0.9rem;
}

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

.destino-fijo {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.8rem 1rem;
  border-radius: 10px;
  background: var(--bg-primary, #f1f5f9);
  border: 1px solid var(--border-color, #e2e8f0);
}

.destino-fijo-titulo {
  font-size: 0.875rem;
  font-weight: 600;
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
  font-family: inherit;
}

input[type="text"]:focus,
select:focus,
textarea:focus {
  border-color: var(--brand-primary, #000080);
  background-color: var(--bg-surface, #ffffff);
}

.nota {
  font-size: 0.75rem;
  color: var(--text-secondary, #64748b);
  margin: 0;
}

.opcional {
  font-weight: 400;
  color: var(--text-secondary, #64748b);
}

.error-text {
  color: var(--color-danger, #dc2626);
  font-size: 0.85rem;
  font-weight: 600;
  margin: 0;
}

.archivo-oculto {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.caja-subir {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.2rem;
  min-height: 110px;
  padding: 1rem;
  border: 2px dashed var(--border-color, #cbd5e1);
  border-radius: 12px;
  background: var(--bg-primary, #f8fafc);
  cursor: pointer;
  text-align: center;
}

.caja-subir.chica {
  min-height: 70px;
}

.caja-subir:hover,
.archivo-oculto:focus-visible + .caja-subir {
  border-color: var(--brand-primary, #000080);
  background: var(--tint-brand-bg, #e0e7ff);
}

.caja-subir-titulo {
  font-size: 0.875rem;
  font-weight: 600;
}

.caja-subir-sub {
  font-size: 0.75rem;
  color: var(--text-secondary, #64748b);
}

.imagen-vista {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--border-color, #e2e8f0);
}

.imagen-vista img {
  display: block;
  width: 100%;
  max-height: 260px;
  object-fit: cover;
}

.imagen-etiqueta {
  position: absolute;
  top: 0.6rem;
  left: 0.6rem;
  background: var(--brand-primary, #000080);
  color: #ffffff;
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
  font-size: 0.72rem;
  font-weight: 700;
}

.quitar-btn {
  position: absolute;
  top: 0.6rem;
  right: 0.6rem;
  background: rgba(15, 23, 42, 0.8);
  color: #ffffff;
  border: none;
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
}

.lista-adjuntos {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.lista-adjuntos li {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.55rem 0.75rem;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 8px;
  font-size: 0.85rem;
}

/* Marcado para quitar al guardar */
.lista-adjuntos li.por-quitar .adjunto-nombre {
  text-decoration: line-through;
  color: var(--text-secondary, #64748b);
}

.adjunto-ext {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  background: var(--tint-brand-bg, #e0e7ff);
  color: var(--brand-primary, #000080);
}

.adjunto-nombre {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.adjunto-nuevo {
  color: var(--brand-primary, #000080);
  font-size: 0.75rem;
  font-weight: 600;
}

.adjunto-tamano {
  font-size: 0.75rem;
  color: var(--text-secondary, #64748b);
  white-space: nowrap;
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

.aviso-archivos {
  margin: 0;
  font-size: 0.8rem;
  padding: 0.6rem 0.8rem;
  border-radius: 8px;
  background: var(--tint-red-bg, #fef2f2);
  color: var(--color-danger, #dc2626);
}

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
}

.submit-btn:disabled,
.cancel-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
