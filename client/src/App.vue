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
  background-color: var(--bg-primary); /* cambia con el tema (style.css) */
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