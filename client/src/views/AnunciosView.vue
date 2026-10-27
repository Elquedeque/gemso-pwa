<template>
  <div class="dashboard-container">
    <!-- Header reutilizable -->
    <AppHeader 
      @toggle-menu="isMenuOpen = true" 
      @toggle-notifications="isNotificationsOpen = true" 
    />

    <main class="dashboard-main">
      <!-- Encabezado Limpio con Saludo -->
      <section class="user-greeting">
        <div class="greeting-text">
          <h2>Hola, <span>{{ usuarioNombre }}</span></h2>
          <p>Bienvenido al portal de avisos de GEMSO</p>
        </div>

        <button class="tv-mode-btn" @click="toggleFullscreen" title="Modo Pantalla Completa / TV">
          <svg viewBox="0 0 24 24" class="svg-icon">
            <path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 1.99-.9 1.99-2L23 5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z" fill="currentColor"/>
          </svg>
          <span class="btn-text">Modo TV</span>
        </button>
      </section>

      <!-- Accesos Rápidos -->
      <section class="quick-nav">
        <button class="nav-card" @click="navegarA('/documentos')">
          <div class="nav-icon-box doc-color">
            <svg viewBox="0 0 24 24" class="svg-icon">
              <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" fill="currentColor"/>
            </svg>
          </div>
          <div class="nav-info">
            <span class="nav-title">Documentos</span>
            <span class="nav-sub">Expediente y formatos</span>
          </div>
        </button>

        <button class="nav-card" @click="navegarA('/mis-avisos')">
          <div class="nav-icon-box avisos-color">
            <svg viewBox="0 0 24 24" class="svg-icon">
              <path d="M20 12l-8.5-6v12L20 12zM4 9v6h4l5 5V4L8 9H4z" fill="currentColor"/>
            </svg>
          </div>
          <div class="nav-info">
            <span class="nav-title">Mis Avisos</span>
            <span class="nav-sub">Ver feed completo</span>
          </div>
        </button>
      </section>

      <!-- Destacado Principal (Contenedor que se vuelve TV) -->
      <section class="featured-section" ref="carouselSection">
        <!-- Botón flotante fijado en la esquina superior derecha (solo en Modo TV) -->
        <button class="tv-exit-btn" @click.stop="toggleFullscreen" title="Salir de Modo TV">
          ✕ Salir
        </button>

        <!-- Encabezado (se oculta en Modo TV) -->
        <div class="section-header">
          <h3>Aviso Destacado</h3>
          <span class="badge-live">Oficial</span>
        </div>

        <div 
          class="featured-card"
          @touchstart="onTouchStart"
          @touchend="onTouchEnd"
          @click="navegarA('/mis-avisos')"
        >
          <div class="card-image-wrapper">
            <img 
              :src="avisosDestacados[currentIndex].mediaUrl" 
              :alt="avisosDestacados[currentIndex].titulo" 
              class="featured-image"
            />
            
            <!-- Badge para Móvil / Desktop normal -->
            <span class="category-tag">
              {{ avisosDestacados[currentIndex].categoria }}
            </span>

            <!-- Capa Informativa para Modo TV -->
            <div class="tv-info-overlay">
              <div class="tv-badge-group">
                <span class="tv-tag">{{ avisosDestacados[currentIndex].categoria }}</span>
                <span class="tv-author-badge">{{ avisosDestacados[currentIndex].autor }}</span>
              </div>
              <h2 class="tv-title">{{ avisosDestacados[currentIndex].titulo }}</h2>
              <p class="tv-date">Publicado: {{ avisosDestacados[currentIndex].fecha }}</p>
            </div>
          </div>

          <!-- Contenido estándar para vista Móvil / Web -->
          <div class="card-content">
            <h4 class="featured-title">{{ avisosDestacados[currentIndex].titulo }}</h4>
            <div class="meta-row">
              <span class="meta-date">{{ avisosDestacados[currentIndex].fecha }}</span>
              <span class="meta-dot">•</span>
              <span class="meta-author">{{ avisosDestacados[currentIndex].autor }}</span>
            </div>
          </div>
        </div>

        <!-- Indicadores / Dots -->
        <div class="carousel-dots" v-if="avisosDestacados.length > 1">
          <button 
            v-for="(_, index) in avisosDestacados" 
            :key="index"
            class="dot-btn"
            :class="{ active: currentIndex === index }"
            @click.stop="selectSlide(index)"
          ></button>
        </div>
      </section>

      <!-- Lista Secundaria de Comunicados -->
      <section class="comunicados-section">
        <div class="section-header">
          <h3>Comunicados Recientes</h3>
          <router-link to="/mis-avisos" class="link-more">Ver todos</router-link>
        </div>

        <p v-if="cargandoRecientes" class="comunicados-estado">Cargando comunicados...</p>

        <p v-else-if="errorRecientes" class="comunicados-estado">
          {{ errorRecientes }}
          <button class="link-more" @click="cargarRecientes">Reintentar</button>
        </p>

        <p v-else-if="comunicadosRecientes.length === 0" class="comunicados-estado">
          No hay comunicados por el momento.
        </p>

        <div v-else class="comunicados-list">
          <article
            v-for="item in comunicadosRecientes"
            :key="item.id"
            class="comunicado-item"
            @click="navegarA(`/mis-avisos/${item.id}`)"
          >
            <div class="status-indicator" :class="item.clase"></div>

            <div class="comunicado-body">
              <div class="comunicado-top">
                <span class="type-badge" :class="item.clase">{{ item.etiqueta }}</span>
                <span class="comunicado-date">{{ item.fecha }}</span>
              </div>
              <h4 class="comunicado-title">{{ item.titulo }}</h4>
            </div>

            <svg viewBox="0 0 24 24" class="arrow-icon">
              <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" fill="currentColor"/>
            </svg>
          </article>
        </div>
      </section>
    </main>

    <!-- Drawer y Menu -->
    <SidebarMenu :is-open="isMenuOpen" @close="isMenuOpen = false" />
    <NotificationsDrawer :is-open="isNotificationsOpen" @close="isNotificationsOpen = false" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { API_URL } from '../api';
import AppHeader from '../components/AppHeader.vue';
import SidebarMenu from '../components/SidebarMenu.vue';
import NotificationsDrawer from '../components/NotificationsDrawer.vue';

const router = useRouter();
const usuarioNombre = ref('Usuario');
const currentIndex = ref(0);

const isMenuOpen = ref(false);
const isNotificationsOpen = ref(false);

let autoSlideInterval = null;
const carouselSection = ref(null);

let touchStartX = 0;
let touchEndX = 0;

const avisosDestacados = ref([
  {
    titulo: 'Hermosillo vivió fiesta de autos con Grupo Gemso',
    categoria: 'Autofest 2026',
    fecha: 'Hace 2 horas',
    autor: 'Comunicación Corporativa',
    mediaUrl: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1200&q=80'
  },
  {
    titulo: 'Nuevos Lineamientos de Comunicación Interna',
    categoria: 'Corporativo',
    fecha: 'Ayer',
    autor: 'Talento y Cultura',
    mediaUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80'
  }
]);

// Comunicados Recientes (desde la BD, respetando la regla de visibilidad)
const LIMITE_RECIENTES = 5;
const comunicadosRecientes = ref([]);
const cargandoRecientes = ref(false);
const errorRecientes = ref('');
let idUsuario = null;

// "10:30" si es de hoy, "Ayer", o "02 oct" para fechas anteriores
const formatearFechaCorta = (fecha) => {
  const f = new Date(fecha);
  const hoy = new Date();
  const ayer = new Date();
  ayer.setDate(hoy.getDate() - 1);

  if (f.toDateString() === hoy.toDateString()) {
    return f.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  }
  if (f.toDateString() === ayer.toDateString()) return 'Ayer';
  return f.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
};

// Color del indicador: urgente (rojo), Talento y Cultura (verde) o general (azul)
const claseDeAviso = (a) => {
  if (a.urgente) return 'urgente';
  if (a.categoria === 'Talento y Cultura') return 'tyc';
  return 'general';
};

const cargarRecientes = async () => {
  if (!idUsuario) return;
  cargandoRecientes.value = true;
  errorRecientes.value = '';
  try {
    const res = await fetch(`${API_URL}/api/anuncios?id_usu=${idUsuario}&limite=${LIMITE_RECIENTES}`);
    const data = await res.json();
    if (!res.ok) {
      errorRecientes.value = data.error || 'No se pudieron cargar los comunicados';
      return;
    }
    comunicadosRecientes.value = data.map(a => ({
      id: a.id_anu,
      titulo: a.titulo,
      fecha: formatearFechaCorta(a.fecha_creacion),
      etiqueta: a.urgente ? 'Urgente' : a.categoria,
      clase: claseDeAviso(a)
    }));
  } catch (error) {
    console.error('Error al cargar comunicados recientes:', error);
    errorRecientes.value = 'No se pudo conectar con el servidor';
  } finally {
    cargandoRecientes.value = false;
  }
};

const nextSlide = () => {
  if (avisosDestacados.value.length > 0) {
    currentIndex.value = (currentIndex.value + 1) % avisosDestacados.value.length;
  }
};

const prevSlide = () => {
  if (avisosDestacados.value.length > 0) {
    currentIndex.value = (currentIndex.value - 1 + avisosDestacados.value.length) % avisosDestacados.value.length;
  }
};

const startAutoSlide = () => {
  stopAutoSlide();
  autoSlideInterval = setInterval(nextSlide, 7000);
};

const stopAutoSlide = () => {
  if (autoSlideInterval) {
    clearInterval(autoSlideInterval);
    autoSlideInterval = null;
  }
};

const selectSlide = (index) => {
  currentIndex.value = index;
  startAutoSlide();
};

const onTouchStart = (e) => {
  touchStartX = e.changedTouches[0].screenX;
};

const onTouchEnd = (e) => {
  touchEndX = e.changedTouches[0].screenX;
  if (touchStartX - touchEndX > 40) nextSlide();
  if (touchEndX - touchStartX > 40) prevSlide();
};

// Evita la navegación si la app se encuentra en Modo TV / Fullscreen
const navegarA = (ruta) => {
  if (document.fullscreenElement) {
    return;
  }
  router.push(ruta);
};

const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    carouselSection.value?.requestFullscreen?.();
  } else {
    document.exitFullscreen?.();
  }
};

onMounted(() => {
  const sesion = localStorage.getItem('usuario');
  if (sesion) {
    try {
      const user = JSON.parse(sesion);
      usuarioNombre.value = user.nombre_completo || user.nombre || 'Usuario';
      idUsuario = user.id_usu || null;
    } catch (e) {
      console.error(e);
    }
  }

  if (idUsuario) {
    cargarRecientes();
  } else {
    errorRecientes.value = 'Inicia sesión para ver los comunicados';
  }
  startAutoSlide();
});

onUnmounted(() => {
  stopAutoSlide();
});
</script>

<style scoped>
/* Layout Base */
.dashboard-container {
  min-height: 100vh;
  width: 100%;
  background-color: #f8fafc;
  color: #0f172a;
  display: flex;
  flex-direction: column;
}

.dashboard-main {
  flex: 1;
  width: 100%;
  max-width: 640px;
  margin: 0 auto;
  padding: 1.25rem 1rem 2rem;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Encabezado */
.user-greeting {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.greeting-text h2 {
  font-size: 1.35rem;
  font-weight: 700;
  margin: 0;
  color: #0f172a;
}

.greeting-text span {
  color: #000080;
}

.greeting-text p {
  margin: 0.15rem 0 0 0;
  font-size: 0.825rem;
  color: #64748b;
}

.tv-mode-btn {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  color: #475569;
  padding: 0.45rem 0.75rem;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
}

.tv-mode-btn .svg-icon {
  width: 16px;
  height: 16px;
}

/* Accesos Rápidos */
.quick-nav {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.nav-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  text-align: left;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
  transition: transform 0.15s ease, border-color 0.15s ease;
}

.nav-card:active {
  transform: scale(0.98);
}

.nav-icon-box {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.nav-icon-box .svg-icon {
  width: 20px;
  height: 20px;
}

.doc-color { background-color: #eff6ff; color: #2563eb; }
.avisos-color { background-color: #f0fdf4; color: #16a34a; }

.nav-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.nav-title {
  font-size: 0.875rem;
  font-weight: 700;
  color: #0f172a;
}

.nav-sub {
  font-size: 0.7rem;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Encabezados de Sección */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.65rem;
}

.section-header h3 {
  font-size: 1rem;
  font-weight: 700;
  margin: 0;
  color: #0f172a;
}

.badge-live {
  background: #000080;
  color: #ffffff;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  text-transform: uppercase;
}

.link-more {
  font-size: 0.8rem;
  font-weight: 600;
  color: #000080;
  text-decoration: none;
}

/* Card Destacada */
.featured-section {
  position: relative;
}

.featured-card {
  position: relative;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  cursor: pointer;
}

.card-image-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background-color: #000000;
}

.featured-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.category-tag {
  position: absolute;
  top: 0.75rem;
  left: 0.75rem;
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(4px);
  color: #ffffff;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
}

/* Elementos ocultos en modo normal */
.tv-info-overlay, .tv-exit-btn {
  display: none;
}

.card-content {
  padding: 1rem;
}

.featured-title {
  margin: 0 0 0.5rem 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.35;
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.75rem;
  color: #64748b;
}

.meta-dot {
  color: #cbd5e1;
}

/* Dots */
.carousel-dots {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-top: 0.75rem;
}

.dot-btn {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  border: none;
  background: #cbd5e1;
  cursor: pointer;
  padding: 0;
  transition: all 0.2s ease;
}

.dot-btn.active {
  background: #000080;
  width: 18px;
  border-radius: 10px;
}

/* Lista de Comunicados Recientes */
.comunicados-estado {
  text-align: center;
  font-size: 0.85rem;
  color: #64748b;
  padding: 1.25rem 0.5rem;
  margin: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
}

.comunicados-estado .link-more {
  background: none;
  border: none;
  cursor: pointer;
}

.comunicados-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.comunicado-item {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 0.85rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.85rem;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
}

.status-indicator {
  width: 4px;
  height: 36px;
  border-radius: 4px;
  flex-shrink: 0;
}

.status-indicator.urgente { background-color: #ef4444; }
.status-indicator.general { background-color: #3b82f6; }
.status-indicator.tyc { background-color: #10b981; }

.comunicado-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.comunicado-top {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.type-badge {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
}

.type-badge.urgente { color: #dc2626; }
.type-badge.general { color: #2563eb; }
.type-badge.tyc { color: #059669; }

.comunicado-date {
  font-size: 0.7rem;
  color: #94a3b8;
}

.comunicado-title {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.arrow-icon {
  width: 18px;
  height: 18px;
  color: #94a3b8;
  flex-shrink: 0;
}

/* ======================================================== */
/* ESTILOS EXCLUSIVOS PARA MODO PANTALLA COMPLETA / MODO TV */
/* ======================================================== */
.featured-section:fullscreen {
  background-color: #080c14;
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 1.5rem;
  box-sizing: border-box;
  position: relative;
}

.featured-section:fullscreen .section-header {
  display: none;
}

.featured-section:fullscreen .featured-card {
  width: 92vw;
  max-width: 1400px;
  height: 86vh;
  border: none;
  background: #000000;
  border-radius: 20px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.8);
  cursor: default; /* Quita el cursor de pointer en modo TV */
}

.featured-section:fullscreen .card-image-wrapper {
  height: 100%;
  aspect-ratio: auto;
}

.featured-section:fullscreen .featured-image {
  object-fit: contain;
}

.featured-section:fullscreen .category-tag,
.featured-section:fullscreen .card-content {
  display: none;
}

/* Capa de Información del Anuncio */
.featured-section:fullscreen .tv-info-overlay {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 3rem 2.5rem 2rem;
  background: linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.95) 100%);
  color: #ffffff;
  z-index: 10;
  pointer-events: none; /* Permite ignorar clics accidentales sobre el texto */
}

.featured-section:fullscreen .tv-badge-group {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.featured-section:fullscreen .tv-tag {
  background: #000080;
  color: #ffffff;
  padding: 0.35rem 1rem;
  border-radius: 20px;
  font-size: 0.95rem;
  font-weight: 700;
  text-transform: uppercase;
}

.featured-section:fullscreen .tv-author-badge {
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(8px);
  color: #e2e8f0;
  padding: 0.35rem 1rem;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 600;
}

.featured-section:fullscreen .tv-title {
  margin: 0;
  font-size: 2.2rem;
  font-weight: 800;
  line-height: 1.25;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

.featured-section:fullscreen .tv-date {
  margin: 0;
  font-size: 1rem;
  color: #cbd5e1;
}

/* Botón "Salir" ubicado exactamente en la esquina superior derecha del viewport */
.featured-section:fullscreen .tv-exit-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 99;
  background: rgba(15, 23, 42, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.25);
  color: #ffffff;
  padding: 0.55rem 1.1rem;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  transition: all 0.2s ease;
}

.featured-section:fullscreen .tv-exit-btn:hover {
  background: #ef4444;
  border-color: #ef4444;
}

.featured-section:fullscreen .carousel-dots {
  position: absolute;
  bottom: 1.25rem;
  z-index: 15;
}

.featured-section:fullscreen .dot-btn {
  width: 10px;
  height: 10px;
}

.featured-section:fullscreen .dot-btn.active {
  width: 28px;
  background: #ffffff;
}
</style>