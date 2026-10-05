<template>
  <div id="app-container">
    <!-- Se eliminó el <header> genérico global -->
    <main class="app-main">
      <router-view />
    </main>
  </div>
</template>

<script setup>
</script>

<style>
html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
  background-color: #0f172a; /* Mismo fondo oscuro para evitar bordes o destellos blancos */
  overflow-x: hidden;
}

#app-container {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  min-height: 100vh;
  width: 100vw;
}

.app-main {
  width: 100%;
  min-height: 100vh;
}
</style>