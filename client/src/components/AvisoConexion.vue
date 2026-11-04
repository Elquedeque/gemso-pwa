<template>
  <!-- Franja que aparece cuando el dispositivo se queda sin internet -->
  <div v-if="sinConexion" class="aviso-conexion" role="status">
    Sin conexión. Estás viendo la última información guardada.
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const sinConexion = ref(!navigator.onLine);

const actualizar = () => {
  sinConexion.value = !navigator.onLine;
};

onMounted(() => {
  window.addEventListener('online', actualizar);
  window.addEventListener('offline', actualizar);
});

onUnmounted(() => {
  window.removeEventListener('online', actualizar);
  window.removeEventListener('offline', actualizar);
});
</script>

<style scoped>
.aviso-conexion {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 2000;
  padding: 10px 16px;
  text-align: center;
  font-size: 0.9rem;
  color: #ffffff;
  background: #475569;
  padding-bottom: calc(10px + env(safe-area-inset-bottom));
}
</style>
