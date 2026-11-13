<template>
  <div class="dashboard-container">
    <!-- Header Reutilizable -->
    <AppHeader 
      @toggle-menu="isMenuOpen = true" 
      @toggle-notifications="isNotificationsOpen = true" 
    />

    <!-- Contenido Principal -->
    <main class="dashboard-main">
      <!-- Botón para regresar al listado -->
      <button class="back-link" @click="goBack">
        <svg viewBox="0 0 24 24" class="back-icon">
          <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor"/>
        </svg>
        <span>Volver a Mis Avisos</span>
      </button>

      <!-- Estado de Carga / Error -->
      <div v-if="cargando" class="estado-box">
        <p>Cargando aviso...</p>
      </div>

      <div v-else-if="errorCarga" class="estado-box">
        <h3>{{ errorCarga }}</h3>
        <button class="back-link" @click="goBack">Regresar a la lista</button>
      </div>

      <template v-else-if="aviso">
      <!-- Encabezado de la Noticia / Aviso -->
      <header class="aviso-header">
        <span class="section-label">{{ aviso.urgente ? 'Aviso Urgente' : 'Aviso' }}</span>
        <h1 class="aviso-title">{{ aviso.titulo }}</h1>
        <p class="aviso-origen">{{ aviso.origen }}</p>
      </header>

      <!-- Solo para quien publica avisos (en la beta, Talento y Cultura) -->
      <BotonDestacado
        v-if="puedePublicar"
        :id-anu="aviso.id"
        :destacado="aviso.destacado"
        @cambio="aviso.destacado = $event"
      />

      <!-- Imagen del aviso (si tiene) -->
      <img v-if="imagenUrl" :src="imagenUrl" :alt="`Imagen del aviso: ${aviso.titulo}`" class="aviso-imagen" />

      <!-- Cuerpo del Aviso -->
      <article class="aviso-content">
        <p v-for="(paragraph, index) in aviso.contenido" :key="index">
          {{ paragraph }}
        </p>
      </article>

      <!-- Caja de Archivos Adjuntos (Si existen) -->
      <section v-if="aviso.adjuntos && aviso.adjuntos.length > 0" class="attachments-card">
        <div 
          v-for="adjunto in aviso.adjuntos" 
          :key="adjunto.id" 
          class="attachment-item"
        >
          <!-- Icono según el tipo de archivo -->
          <div class="file-icon-wrapper">
            <!-- Icono PDF -->
            <svg v-if="adjunto.tipo === 'pdf'" class="file-svg pdf" viewBox="0 0 24 24">
              <path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm12 6V9c0-.55-.45-1-1-1h-3v8h1.5v-2.5H15c.55 0 1-.45 1-1zm-2.5-1.5H15V11h-1.5V10.5z" fill="currentColor"/>
            </svg>
            <!-- Icono DOCX / WORD -->
            <svg v-else-if="adjunto.tipo === 'docx' || adjunto.tipo === 'doc'" class="file-svg word" viewBox="0 0 24 24">
              <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" fill="currentColor"/>
            </svg>
            <!-- Icono Imagen (PNG/JPG) -->
            <svg v-else-if="['jpg', 'jpeg', 'png'].includes(adjunto.tipo)" class="file-svg image" viewBox="0 0 24 24">
              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" fill="currentColor"/>
            </svg>
            <!-- Icono de documento (Excel, PowerPoint) -->
            <svg v-else class="file-svg word" viewBox="0 0 24 24">
              <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13z" fill="currentColor"/>
            </svg>
          </div>

          <!-- Nombre y tamaño del Archivo -->
          <span class="file-name">
            {{ adjunto.nombre }}
            <span v-if="adjunto.tamano" class="file-size">{{ adjunto.tamano }}</span>
          </span>

          <!-- Acciones del Archivo: Descargar y Ver -->
          <div class="file-actions">
            <button class="action-btn" :title="`Descargar ${adjunto.nombre}`" :aria-label="`Descargar ${adjunto.nombre}`" @click="descargarAdjunto(adjunto)">
              <svg viewBox="0 0 24 24" class="action-svg">
                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" fill="currentColor"/>
              </svg>
            </button>
            <button v-if="sePuedeVer(adjunto)" class="action-btn" :title="`Ver ${adjunto.nombre}`" :aria-label="`Ver ${adjunto.nombre}`" @click="verAdjunto(adjunto)">
              <svg viewBox="0 0 24 24" class="action-svg">
                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="currentColor"/>
              </svg>
            </button>
          </div>
        </div>
      </section>

      <p v-if="errorAdjunto" class="error-adjunto" role="alert">{{ errorAdjunto }}</p>

      <!-- Botón Inferior: Confirmar Lectura -->
      <footer class="action-footer">
        <button 
          class="btn-confirm-read" 
          :class="{ 'is-read': aviso.leido }"
          :disabled="aviso.leido || confirmando"
          @click="confirmarLectura"
        >
          {{ aviso.leido ? 'Lectura Confirmada' : confirmando ? 'Confirmando...' : 'Confirmar Lectura' }}
        </button>
      </footer>
      </template>
    </main>

    <!-- Sidebar Menu -->
    <SidebarMenu 
      :is-open="isMenuOpen" 
      @close="isMenuOpen = false" 
    />

    <!-- Notifications Drawer -->
    <NotificationsDrawer 
      :is-open="isNotificationsOpen" 
      @close="isNotificationsOpen = false" 
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { urlDeArchivo, descargarArchivo, abrirArchivo, formatearTamano } from '../utils/archivos';
import { useRoute, useRouter } from 'vue-router';
import { apiFetch } from '../api';
import { quitarDeCampana } from '../utils/campana';
import { usuarioTienePermiso } from '../utils/estadisticas';
import BotonDestacado from '../components/BotonDestacado.vue';

// Quien publica avisos puede destacar o quitar este aviso del carrusel
const puedePublicar = usuarioTienePermiso('publicar_avisos');
import AppHeader from '../components/AppHeader.vue';
import SidebarMenu from '../components/SidebarMenu.vue';
import NotificationsDrawer from '../components/NotificationsDrawer.vue';

const route = useRoute();
const router = useRouter();

// Modales del Sidebar
const isMenuOpen = ref(false);
const isNotificationsOpen = ref(false);

const aviso = ref(null);
const cargando = ref(false);
const errorCarga = ref('');
const confirmando = ref(false);
let usuario = null;

const formatearFecha = (fecha) =>
  new Date(fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });

// Tipo para elegir el icono: se toma de la extensión del nombre del archivo
const tipoDeArchivo = (nombre) => (nombre.split('.').pop() || '').toLowerCase();

// Convierte la respuesta de la API al formato que usa la plantilla
const mapearAviso = (a) => ({
  id: a.id_anu,
  titulo: a.titulo,
  urgente: a.urgente,
  destacado: a.destacado,
  tieneImagen: a.tiene_imagen,
  origen: [
    a.autor,
    a.departamento_destino ? `Para: ${a.departamento_destino}` : null,
    formatearFecha(a.fecha_creacion)
  ].filter(Boolean).join(' · '),
  leido: a.leido,
  // Cada salto de línea del contenido se muestra como un párrafo
  contenido: a.contenido.split(/\n+/).map(p => p.trim()).filter(Boolean),
  adjuntos: a.adjuntos.map(adj => ({
    id: adj.id_anu_adj,
    nombre: adj.nombre_archivo,
    tipo: tipoDeArchivo(adj.nombre_archivo),
    tamano: formatearTamano(adj.tamano_bytes)
  }))
});

const cargarAviso = async () => {
  cargando.value = true;
  errorCarga.value = '';
  try {
    const res = await apiFetch(`/api/anuncios/${route.params.id}`);
    const data = await res.json();
    if (!res.ok) {
      errorCarga.value = data.error || 'No se pudo cargar el aviso';
      return;
    }
    aviso.value = mapearAviso(data);
    cargarImagen();
    // Abrirlo lo registra como visto: ya no va en la campana
    quitarDeCampana(data.id_anu);
  } catch (error) {
    console.error('Error al cargar el aviso:', error);
    errorCarga.value = 'No se pudo conectar con el servidor';
  } finally {
    cargando.value = false;
  }
};

// Métodos de interacción
const goBack = () => {
  router.push('/mis-avisos');
};

const confirmarLectura = async () => {
  if (aviso.value.leido || confirmando.value) return;
  confirmando.value = true;
  try {
    const res = await apiFetch(`/api/anuncios/${aviso.value.id}/leido`, { method: 'POST' });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || 'No se pudo confirmar la lectura');
      return;
    }
    aviso.value.leido = true;
  } catch (error) {
    console.error('Error al confirmar lectura:', error);
    alert('No se pudo conectar con el servidor');
  } finally {
    confirmando.value = false;
  }
};

// Adjuntos (migración 016): se piden al servidor con la sesión, que revisa que el usuario
// pueda ver el aviso (utils/archivos.js). Los archivos están en la carpeta de OneDrive.
const errorAdjunto = ref('');
const rutaAdjunto = (adjunto) => `/api/anuncios/${aviso.value.id}/adjuntos/${adjunto.id}`;
// El navegador solo sabe mostrar PDF e imágenes; Word, Excel y PowerPoint se descargan
const sePuedeVer = (adjunto) => ['pdf', 'jpg', 'jpeg', 'png'].includes(adjunto.tipo);

const descargarAdjunto = async (adjunto) => {
  errorAdjunto.value = '';
  try {
    await descargarArchivo(`${rutaAdjunto(adjunto)}?descargar=1`, adjunto.nombre);
  } catch {
    errorAdjunto.value = `No se pudo descargar "${adjunto.nombre}". Intenta de nuevo.`;
  }
};

const verAdjunto = async (adjunto) => {
  errorAdjunto.value = '';
  try {
    await abrirArchivo(rutaAdjunto(adjunto));
  } catch {
    errorAdjunto.value = `No se pudo abrir "${adjunto.nombre}". Intenta de nuevo.`;
  }
};

// Imagen del aviso
const imagenUrl = ref(null);
const cargarImagen = async () => {
  if (!aviso.value?.tieneImagen) return;
  try {
    imagenUrl.value = await urlDeArchivo(`/api/anuncios/${aviso.value.id}/imagen`);
  } catch {
    imagenUrl.value = null; // sin imagen el aviso se sigue leyendo bien
  }
};
onUnmounted(() => {
  if (imagenUrl.value) URL.revokeObjectURL(imagenUrl.value);
});

onMounted(() => {
  const sesion = localStorage.getItem('usuario');
  usuario = sesion ? JSON.parse(sesion) : null;

  if (!usuario?.id_usu) {
    router.push('/login');
    return;
  }

  cargarAviso();
});
</script>

<style scoped>
.dashboard-container {
  min-height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-primary, #f1f5f9);
  color: var(--text-primary, #0f172a);
}

.dashboard-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  max-width: 500px;
  width: 100%;
  margin: 0 auto;
  padding: 1rem 1.25rem 2rem;
  box-sizing: border-box;
  gap: 1.25rem;
}

/* Enlace/Botón Regresar */
.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: none;
  border: none;
  color: var(--brand-primary, #000080);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  align-self: flex-start;
}

.back-icon {
  width: 18px;
  height: 18px;
}

/* Encabezado */
.aviso-header {
  text-align: center;
}

.section-label {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary, #0f172a);
}

.aviso-title {
  font-size: 1.75rem;
  font-weight: 800;
  margin: 0.2rem 0;
  color: var(--text-primary, #0f172a);
}

.aviso-origen {
  font-size: 1rem;
  color: var(--text-secondary, #475569);
  margin: 0;
}

/* Cuerpo de Texto */
.aviso-content {
  font-size: 0.95rem;
  line-height: 1.5;
  color: var(--text-primary, #1e293b);
  text-align: justify;
}

.aviso-content p {
  margin: 0 0 1rem 0;
}

/* Tarjeta de Adjuntos */
.attachments-card {
  background: var(--bg-primary, #e2e8f0);
  border: 1px solid var(--border-color, #94a3b8);
  border-radius: 12px;
  padding: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.aviso-imagen {
  display: block;
  width: 100%;
  max-height: 420px;
  object-fit: cover;
  border-radius: 14px;
  border: 1px solid var(--border-color, #e2e8f0);
}

.file-size {
  display: block;
  font-size: 0.72rem;
  font-weight: 400;
  color: var(--text-secondary, #64748b);
}

.error-adjunto {
  margin: 0;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-danger, #dc2626);
}

.attachment-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.file-icon-wrapper {
  display: flex;
  align-items: center;
}

.file-svg {
  width: 28px;
  height: 28px;
  color: var(--text-primary, #0f172a);
}

.file-name {
  flex: 1;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary, #0f172a);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.action-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.2rem;
  color: var(--text-primary, #0f172a);
  transition: transform 0.15 ease;
}

.action-btn:hover {
  transform: scale(1.15);
}

.action-svg {
  width: 26px;
  height: 26px;
}

/* Footer & Botón de Confirmación */
.action-footer {
  display: flex;
  justify-content: center;
  margin-top: auto;
  padding-top: 1rem;
}

.btn-confirm-read {
  background-color: var(--brand-primary, #000080);
  color: #ffffff;
  border: none;
  border-radius: 25px;
  padding: 0.85rem 2.5rem;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(0, 0, 128, 0.25);
  transition: all 0.2s ease;
  width: 100%;
  max-width: 300px;
}

.btn-confirm-read.is-read {
  background-color: #059669;
}

.btn-confirm-read:hover:not(:disabled) {
  opacity: 0.95;
  transform: translateY(-1px);
}

.btn-confirm-read:disabled {
  cursor: default;
}

/* Estados de carga / error */
.estado-box {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--text-secondary, #475569);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.estado-box h3 {
  margin: 0;
  color: var(--text-primary, #0f172a);
}
</style>