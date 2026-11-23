<template>
  <div id="app-container">
    <!-- Se eliminó el <header> genérico global -->
    <main class="app-main">
      <router-view />
    </main>
    <AvisoConexion />
  </div>
</template>

<script setup>
import AvisoConexion from './components/AvisoConexion.vue';
</script>

<style>
/* Sin height: 100% ni overflow-x: hidden. Con esas dos reglas el body se volvía una caja
   con desplazamiento propio dentro de la ventana y en escritorio salían dos barras
   verticales (en Crear y Editar aviso, los campos de archivo ocultos estiraban también
   el html). Ahora solo se desplaza la ventana. */
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  background-color: var(--bg-primary); /* cambia con el tema (style.css) */
}

/* 100% y no 100vw: 100vw incluye el ancho de la barra de desplazamiento y hacía la
   página unos 15 px más ancha que la ventana (por eso estaba el overflow-x: hidden). */
#app-container {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  min-height: 100vh;
  width: 100%;
}

.app-main {
  width: 100%;
  min-height: 100vh;
}
</style>