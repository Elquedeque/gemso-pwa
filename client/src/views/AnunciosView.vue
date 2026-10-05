<template>
  <div class="dashboard-container">
    <!-- Header Institucional -->
    <header class="dashboard-header">
      <!-- Botón del menú de hamburguesa en el header -->
      <button class="icon-btn" @click="isMenuOpen = true" title="Abrir menú">
        <svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>

      <div class="brand-logo">
        <img src="../assets/icon_GEMSO.png" alt="GEMSO" class="header-logo-img" />
      </div>

      <button class="icon-btn" aria-label="Notificaciones">
        <svg viewBox="0 0 24 24" class="svg-icon">
          <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" fill="currentColor"/>
        </svg>
      </button>
    </header>

    <main class="dashboard-main">
      <!-- Saludo de usuario -->
      <section class="user-welcome">
        <h2>Hola, <span>{{ usuarioNombre }}</span></h2>
      </section>

      <!-- Botones de Acción Rápida -->
      <section class="quick-actions">
        <button class="action-card" @click="navegarA('/documentos')">
          <div class="action-icon">
            <svg viewBox="0 0 24 24" class="action-svg">
              <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z" fill="currentColor"/>
            </svg>
          </div>
          <span>Documentos</span>
        </button>

        <button class="action-card" @click="navegarA('/agenda')">
          <div class="action-icon">
            <svg viewBox="0 0 24 24" class="action-svg">
              <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z" fill="currentColor"/>
            </svg>
          </div>
          <span>Agenda</span>
        </button>

        <button class="action-card" @click="navegarA('/anuncios')">
          <div class="action-icon">
            <svg viewBox="0 0 24 24" class="action-svg">
              <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z" fill="currentColor"/>
            </svg>
          </div>
          <span>Mis Avisos</span>
        </button>
      </section>

      <!-- Carrusel / Destacados -->
      <section class="carousel-wrapper" ref="carouselSection">
        <div class="section-title">
          <h3>Avisos Destacados</h3>
          <button class="fullscreen-btn" @click="toggleFullscreen" title="Modo Pantalla Completa / TV">
            <svg viewBox="0 0 24 24" class="tv-icon">
              <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" fill="currentColor"/>
            </svg>
            <span>Modo TV</span>
          </button>
        </div>

        <div class="carousel-viewport">
          <div 
            class="carousel-track" 
            :style="{ transform: `translateX(-${currentIndex * 100}%)` }"
          >
            <div 
              v-for="(item, idx) in avisosDestacados" 
              :key="idx" 
              class="slide-card"
            >
              <div class="media-container">
                <img :src="item.mediaUrl" alt="" class="media-bg-blur" />
                <img :src="item.mediaUrl" :alt="item.titulo" class="media-content" />

                <div class="media-overlay">
                  <span class="category-badge">{{ item.categoria }}</span>
                  <h3>{{ item.titulo }}</h3>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="carousel-dots">
          <span 
            v-for="(_, index) in avisosDestacados" 
            :key="index"
            class="dot"
            :class="{ active: currentIndex === index }"
            @click="selectSlide(index)"
          ></span>
        </div>
      </section>

      <!-- Lista / Feed Secundario de Comunicados -->
      <section class="feed-section">
        <div class="section-title">
          <h3>Comunicados Recientes</h3>
        </div>

        <div class="feed-list">
          <div v-for="(comunicado, index) in comunicadosRecientes" :key="index" class="feed-item">
            <div class="feed-badge" :class="comunicado.tipo.toLowerCase()">{{ comunicado.tipo }}</div>
            <div class="feed-info">
              <h4>{{ comunicado.titulo }}</h4>
              <p>{{ comunicado.fecha }}</p>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- COMPONENTE DEL MENÚ LATERAL AGREGADO -->
    <SidebarMenu 
      :is-open="isMenuOpen" 
      @close="isMenuOpen = false" 
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import SidebarMenu from './SidebarMenu.vue';

const router = useRouter();
const usuarioNombre = ref('Usuario');
const currentIndex = ref(0);

// Variable para controlar la visibilidad del menú lateral
const isMenuOpen = ref(false);
let autoSlideInterval = null;

const avisosDestacados = ref([
  {
    titulo: 'Hermosillo vivió fiesta de autos con Grupo Gemso',
    categoria: 'Autofest 2026',
    mediaUrl: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1200&q=80'
  },
  {
    titulo: 'Nuevos Lineamientos de Comunicación Interna',
    categoria: 'Corporativo',
    mediaUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80'
  }
]);

const comunicadosRecientes = ref([
  { titulo: 'Mantenimiento en Servidores de Correo', fecha: 'Hoy, 10:30 AM', tipo: 'Urgente' },
  { titulo: 'Publicación de Horarios de Capacitación', fecha: 'Ayer', tipo: 'General' },
  { titulo: 'Aviso sobre días festivos oficiales', fecha: '2 Oct, 2026', tipo: 'RH' }
]);

const nextSlide = () => {
  if (avisosDestacados.value.length > 0) {
    currentIndex.value = (currentIndex.value + 1) % avisosDestacados.value.length;
  }
};

const startAutoSlide = () => {
  stopAutoSlide();
  autoSlideInterval = setInterval(() => {
    nextSlide();
  }, 8000);
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

const navegarA = (ruta) => {
  router.push(ruta);
};

onMounted(() => {
  const sesion = localStorage.getItem('usuario');
  if (sesion) {
    const user = JSON.parse(sesion);
    usuarioNombre.value = user.nombre_completo || 'Usuario';
  }

  startAutoSlide();
});

onUnmounted(() => {
  stopAutoSlide();
});

const carouselSection = ref(null);

const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    if (carouselSection.value.requestFullscreen) {
      carouselSection.value.requestFullscreen();
    } else if (carouselSection.value.webkitRequestFullscreen) {
      carouselSection.value.webkitRequestFullscreen();
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
};
</script>

<style scoped>
.dashboard-container {
  min-height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  background-color: #0b1120;
  color: #ffffff;
  box-sizing: border-box;
}

.dashboard-header {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  background-color: #030712;
  border-bottom: 1px solid #1f2937;
  box-sizing: border-box;
}

.icon-btn {
  background: #000080;
  border: none;
  color: #ffffff;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.svg-icon {
  width: 22px;
  height: 22px;
}

.header-logo-img {
  height: 38px;
  width: auto;
  object-fit: contain;
}

.dashboard-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  max-width: 900px;
  width: 100%;
  margin: 0 auto;
  padding: 1.25rem;
  box-sizing: border-box;
}

.user-welcome h2 {
  font-size: 1.4rem;
  font-weight: 400;
  margin: 0;
  color: #f8fafc;
}

.user-welcome span {
  font-weight: 700;
  color: #38bdf8;
}

/* Botones Rápidos */
.quick-actions {
  display: flex;
  gap: 0.75rem;
  width: 100%;
}

.action-card {
  flex: 1;
  min-width: 0;
  background: #ffffff;
  border: none;
  border-radius: 14px;
  padding: 0.85rem 0.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.action-icon {
  color: #000080;
  margin-bottom: 0.3rem;
}

.action-svg {
  width: 26px;
  height: 26px;
}

.action-card span {
  color: #0f172a;
  font-size: 0.8rem;
  font-weight: 700;
}

/* Títulos de sección y Botón Modo TV */
.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.section-title h3 {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
  color: #94a3b8;
}

.fullscreen-btn {
  background: rgba(56, 189, 248, 0.1);
  border: 1px solid #38bdf8;
  color: #38bdf8;
  border-radius: 8px;
  padding: 0.35rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.fullscreen-btn:hover {
  background: #38bdf8;
  color: #020617;
}

.tv-icon {
  width: 16px;
  height: 16px;
}

/* Carrusel Adaptativo Multi-formato */
.carousel-wrapper {
  position: relative;
  width: 100%;
}

.carousel-viewport {
  width: 100%;
  overflow: hidden;
  border-radius: 16px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
  background: #1e293b;
}

.carousel-track {
  display: flex;
  transition: transform 0.4s ease;
}

.slide-card {
  min-width: 100%;
}

.media-container {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10;
  background-color: #000000;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.media-bg-blur {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: blur(16px) brightness(0.45);
  transform: scale(1.15);
  pointer-events: none;
}

.media-content {
  position: relative;
  z-index: 1;
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
}

.media-overlay {
  position: absolute;
  z-index: 2;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 1rem;
  background: linear-gradient(180deg, transparent 0%, rgba(2, 6, 23, 0.92) 100%);
}

.category-badge {
  background-color: #000080;
  color: #ffffff;
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 600;
}

.media-overlay h3 {
  margin: 0.3rem 0 0 0;
  font-size: 1.05rem;
  color: #ffffff;
}

.carousel-dots {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-top: 0.6rem;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #475569;
  cursor: pointer;
}

.dot.active {
  background: #38bdf8;
  width: 20px;
  border-radius: 10px;
}

/* Feed Secundario */
.feed-section {
  width: 100%;
}

.feed-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.feed-item {
  background: #1e293b;
  border-radius: 12px;
  padding: 0.85rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.8rem;
  border: 1px solid #334155;
}

.feed-badge {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  text-transform: uppercase;
}

.feed-badge.urgente { background: #ef4444; color: #ffffff; }
.feed-badge.general { background: #3b82f6; color: #ffffff; }
.feed-badge.rh { background: #10b981; color: #ffffff; }

.feed-info h4 {
  margin: 0;
  font-size: 0.9rem;
  color: #f8fafc;
  font-weight: 500;
}

.feed-info p {
  margin: 0.2rem 0 0 0;
  font-size: 0.75rem;
  color: #94a3b8;
}

/* REGLETA PASO 3: MODO PANTALLA COMPLETA / TELEVISOR */
.carousel-wrapper:fullscreen {
  background-color: #020617;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 2rem;
  box-sizing: border-box;
}

.carousel-wrapper:fullscreen .section-title {
  display: none;
}

.carousel-wrapper:fullscreen .carousel-viewport {
  max-width: 90vw;
  height: 80vh;
}

.carousel-wrapper:fullscreen .media-container {
  height: 80vh;
  aspect-ratio: auto;
}

.carousel-wrapper:fullscreen .media-overlay h3 {
  font-size: 2rem;
}

.carousel-wrapper:fullscreen .category-badge {
  font-size: 1rem;
  padding: 0.4rem 1rem;
}
</style>