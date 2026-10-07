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
              <option value="Recursos Humanos">Recursos Humanos</option>
              <option value="Sistemas / TI">Sistemas / TI</option>
              <option value="General">General</option>
            </select>
          </div>

          <div class="form-group">
            <label for="tipo">Prioridad / Tipo *</label>
            <select id="tipo" v-model="nuevoAviso.tipo" required>
              <option value="General">General</option>
              <option value="Urgente">Urgente</option>
              <option value="RH">RH</option>
            </select>
          </div>
        </div>

        <!-- Checkbox Destacado en Modo TV -->
        <div class="form-checkbox-card">
          <div class="checkbox-info">
            <label for="esDestacado">Destacar en Carrusel (Modo TV)</label>
            <span>Aparecerá en la pantalla principal del portal y en la vista de TV corporativa.</span>
          </div>
          <input 
            id="esDestacado" 
            type="checkbox" 
            v-model="nuevoAviso.esDestacado" 
            class="toggle-switch" 
          />
        </div>

        <!-- Carga de Imagen -->
        <div class="form-group">
          <label>Imagen del Aviso</label>
          <div 
            class="image-upload-box" 
            :class="{ 'has-image': imagePreview }"
            @click="triggerFileInput"
          >
            <input 
              type="file" 
              ref="fileInput" 
              accept="image/*" 
              class="hidden-file-input" 
              @change="handleImageUpload" 
            />

            <template v-if="!imagePreview">
              <svg viewBox="0 0 24 24" class="upload-icon">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/>
              </svg>
              <span class="upload-text">Subir imagen o banner</span>
              <span class="upload-sub">Formatos JPG, PNG (Recomendado 16:9)</span>
            </template>

            <template v-else>
              <img :src="imagePreview" alt="Previsualización" class="preview-img" />
              <button type="button" class="remove-img-btn" @click.stop="removeImage">
                ✕ Eliminar
              </button>
            </template>
          </div>
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
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import AppHeader from '../components/AppHeader.vue';
import SidebarMenu from '../components/SidebarMenu.vue';
import NotificationsDrawer from '../components/NotificationsDrawer.vue';

const router = useRouter();
const isMenuOpen = ref(false);
const isNotificationsOpen = ref(false);
const isSubmitting = ref(false);

const fileInput = ref(null);
const imagePreview = ref(null);

const nuevoAviso = ref({
  titulo: '',
  categoria: '',
  tipo: 'General',
  esDestacado: false,
  contenido: '',
  imagen: null
});

const triggerFileInput = () => {
  fileInput.value?.click();
};

const handleImageUpload = (e) => {
  const file = e.target.files[0];
  if (file) {
    nuevoAviso.value.imagen = file;
    imagePreview.value = URL.createObjectURL(file);
  }
};

const removeImage = () => {
  nuevoAviso.value.imagen = null;
  imagePreview.value = null;
  if (fileInput.value) fileInput.value.value = '';
};

const publicarAviso = async () => {
  isSubmitting.value = true;
  
  // Aquí integrarías la petición HTTP (fetch / axios / Supabase / PostgreSQL)
  try {
    console.log('Datos del nuevo aviso:', nuevoAviso.value);
    
    // Simulación de respuesta exitosa
    await new Promise(resolve => setTimeout(resolve, 800));
    
    alert('¡Aviso publicado con éxito!');
    router.push('/mis-avisos');
  } catch (error) {
    console.error('Error al publicar el aviso:', error);
    alert('Hubo un error al guardar el comunicado');
  } finally {
    isSubmitting.value = false;
  }
};
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
  background: #ffffff;
  border: 1px solid #e2e8f0;
  color: #475569;
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
  color: #1e293b;
}

input[type="text"],
select,
textarea {
  width: 100%;
  padding: 0.75rem 0.9rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 0.9rem;
  background-color: #f8fafc;
  color: #0f172a;
  box-sizing: border-box;
  outline: none;
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

input[type="text"]:focus,
select:focus,
textarea:focus {
  border-color: var(--brand-primary, #000080);
  background-color: #ffffff;
}

/* Toggle switch para destacado */
.form-checkbox-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.9rem 1rem;
  background-color: #f1f5f9;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
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
  color: #64748b;
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

/* Carga de Imagen */
.hidden-file-input {
  display: none;
}

.image-upload-box {
  border: 2px dashed #cbd5e1;
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
  cursor: pointer;
  position: relative;
  min-height: 140px;
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

.image-upload-box:hover {
  border-color: var(--brand-primary, #000080);
  background-color: #f0f4ff;
}

.image-upload-box.has-image {
  padding: 0;
  border-style: solid;
  overflow: hidden;
}

.upload-icon {
  width: 32px;
  height: 32px;
  color: #64748b;
}

.upload-text {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1e293b;
  margin-top: 0.4rem;
}

.upload-sub {
  font-size: 0.725rem;
  color: #94a3b8;
  margin-top: 0.1rem;
}

.preview-img {
  width: 100%;
  max-height: 240px;
  object-fit: cover;
}

.remove-img-btn {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  background: rgba(15, 23, 42, 0.8);
  color: #ffffff;
  border: none;
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
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
  border: 1px solid #cbd5e1;
  color: #475569;
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