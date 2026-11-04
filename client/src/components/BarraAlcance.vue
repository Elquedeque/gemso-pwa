<template>
  <!-- Barra apilada: confirmaron | abrieron sin confirmar | sin abrir (colores en style.css, --chart-*) -->
  <div
    class="barra"
    :class="{ delgada }"
    role="img"
    :aria-label="descripcion"
  >
    <template v-if="destinatarios > 0">
      <span
        v-for="seg in segmentos"
        :key="seg.clase"
        class="segmento"
        :class="seg.clase"
        :style="{ flexGrow: seg.valor }"
        :title="`${seg.etiqueta}: ${seg.valor} (${porcentaje(seg.valor, destinatarios)}%)`"
      ></span>
    </template>
    <span v-else class="segmento pendiente" style="flex-grow: 1" title="Sin destinatarios"></span>
  </div>

  <!-- Leyenda opcional (el color nunca va solo: cada estado lleva su nombre y su número) -->
  <ul v-if="leyenda" class="leyenda">
    <li><span class="muestra confirmado"></span>Confirmaron <strong>{{ confirmados }}</strong></li>
    <li><span class="muestra visto"></span>Abrieron sin confirmar <strong>{{ vistos - confirmados }}</strong></li>
    <li><span class="muestra pendiente"></span>Sin abrir <strong>{{ destinatarios - vistos }}</strong></li>
  </ul>
</template>

<script setup>
import { computed } from 'vue';
import { porcentaje } from '../utils/estadisticas';

const props = defineProps({
  destinatarios: { type: Number, required: true },
  // "vistos" incluye a los que confirmaron (confirmar también es haberlo visto)
  vistos: { type: Number, required: true },
  confirmados: { type: Number, required: true },
  delgada: { type: Boolean, default: false },
  leyenda: { type: Boolean, default: false }
});

// Solo se dibujan los segmentos con valor, así no quedan huecos vacíos
const segmentos = computed(() => [
  { clase: 'confirmado', etiqueta: 'Confirmaron', valor: props.confirmados },
  { clase: 'visto', etiqueta: 'Abrieron sin confirmar', valor: props.vistos - props.confirmados },
  { clase: 'pendiente', etiqueta: 'Sin abrir', valor: props.destinatarios - props.vistos }
].filter(s => s.valor > 0));

const descripcion = computed(() =>
  props.destinatarios === 0
    ? 'Sin destinatarios'
    : `${props.confirmados} de ${props.destinatarios} confirmaron lectura, ${props.vistos} lo abrieron`
);
</script>

<style scoped>
.barra {
  display: flex;
  gap: 2px; /* separación entre segmentos para distinguirlos sin depender solo del color */
  width: 100%;
  height: 14px;
}

.barra.delgada {
  height: 8px;
}

.segmento {
  flex-basis: 0;
  min-width: 4px;
  border-radius: 4px;
}

.leyenda {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem 1.1rem;
  list-style: none;
  margin: 0.6rem 0 0;
  padding: 0;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.leyenda li {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.leyenda strong {
  color: var(--text-primary);
}

.muestra {
  width: 10px;
  height: 10px;
  border-radius: 3px;
}

.confirmado { background-color: var(--chart-confirmado); }
.visto { background-color: var(--chart-visto); }
.pendiente { background-color: var(--chart-pendiente); }
</style>
