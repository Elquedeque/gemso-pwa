<template>
  <!-- Ranking de departamentos por % de confirmación, del más bajo al más alto.
       Cada barra muestra cuánto confirmó el departamento y la línea punteada marca la meta. -->
  <ol class="ranking">
    <li
      v-for="dep in filas"
      :key="dep.clave"
      class="fila"
      :class="{ seleccionable, seleccionada: seleccionable && dep.id_dep === seleccionado }"
      :tabindex="seleccionable ? 0 : undefined"
      @click="seleccionar(dep)"
      @keydown.enter="seleccionar(dep)"
    >
      <div class="fila-top">
        <span class="nombre">{{ dep.departamento }}</span>
        <span class="valor">{{ dep.pctConfirmados }}% confirmó</span>
        <!-- Estado con ícono + texto, nunca solo color -->
        <span v-if="dep.bajoMeta" class="estado bajo">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
          </svg>
          Bajo meta
        </span>
        <span v-else class="estado ok">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
          </svg>
          En meta
        </span>
      </div>

      <div
        class="pista"
        role="img"
        :aria-label="`${dep.departamento}: ${dep.pctConfirmados}% confirmó, la meta es ${meta}%`"
      >
        <span class="relleno" :style="{ width: `${dep.pctConfirmados}%` }"></span>
        <span class="marca-meta" :style="{ left: `${meta}%` }" :title="`Meta: ${meta}%`"></span>
      </div>

      <p class="detalle">
        {{ dep.pctVistos }}% lo abrió ·
        <strong>{{ dep.pendientes }}</strong> {{ dep.pendientes === 1 ? 'lectura pendiente' : 'lecturas pendientes' }}
        <template v-if="dep.personas"> · {{ dep.personas }} {{ dep.personas === 1 ? 'persona' : 'personas' }}</template>
        <template v-if="dep.horas_confirmacion !== null && dep.horas_confirmacion !== undefined">
          · confirman en ~{{ formatearHoras(dep.horas_confirmacion) }}
        </template>
      </p>
    </li>
  </ol>

  <p class="nota-meta">
    <span class="muestra-meta" aria-hidden="true"></span>
    La línea punteada es la meta ({{ meta }}%).
    <template v-if="seleccionable"> Toca un departamento para ver solo sus avisos.</template>
  </p>
</template>

<script setup>
import { computed } from 'vue';
import { porcentaje, formatearHoras } from '../utils/estadisticas';

// Cada departamento trae: departamento, envios (lecturas esperadas), vistos, confirmados
// y opcionalmente id_dep, personas y horas_confirmacion
const props = defineProps({
  departamentos: { type: Array, required: true },
  meta: { type: Number, required: true },           // % de confirmación esperado
  seleccionable: { type: Boolean, default: false }, // si al tocar una fila se filtra
  seleccionado: { type: [Number, String], default: null } // id_dep (o nombre) del filtro activo
});

const emit = defineEmits(['seleccionar']);

// Agregar porcentajes y estado, y ordenar del más bajo al más alto en confirmación
const filas = computed(() =>
  props.departamentos
    .map(dep => {
      const pctConfirmados = porcentaje(dep.confirmados, dep.envios);
      return {
        ...dep,
        clave: dep.id_dep ?? dep.departamento,
        pctConfirmados,
        pctVistos: porcentaje(dep.vistos, dep.envios),
        pendientes: dep.envios - dep.confirmados,
        bajoMeta: pctConfirmados < props.meta
      };
    })
    .sort((a, b) => a.pctConfirmados - b.pctConfirmados || a.departamento.localeCompare(b.departamento, 'es'))
);

const seleccionar = (dep) => {
  if (props.seleccionable) emit('seleccionar', dep.id_dep);
};
</script>

<style scoped>
.ranking {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.fila {
  padding: 0.7rem 0.75rem;
  border-radius: 12px;
  border: 1px solid transparent;
}

.fila.seleccionable {
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.fila.seleccionable:hover,
.fila.seleccionable:focus-visible {
  background-color: var(--bg-primary);
  outline: none;
}

.fila.seleccionada {
  background-color: var(--tint-brand-bg);
  border-color: var(--brand-primary);
}

.fila-top {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.35rem 0.75rem;
  margin-bottom: 0.45rem;
}

.nombre {
  font-weight: 700;
  font-size: 0.95rem;
  margin-right: auto;
}

.valor {
  font-weight: 700;
  font-size: 0.95rem;
  font-variant-numeric: tabular-nums;
}

.estado {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.55rem;
  border-radius: 20px;
  font-size: 0.72rem;
  font-weight: 700;
  white-space: nowrap;
}

.estado svg {
  width: 14px;
  height: 14px;
}

.estado.bajo {
  background-color: var(--tint-red-bg);
  color: var(--color-danger);
}

.estado.ok {
  background-color: var(--tint-green-bg);
  color: var(--tint-green-text);
}

/* Barra: pista gris de 0 a 100%, relleno con lo confirmado y una marca en la meta */
.pista {
  position: relative;
  height: 12px;
  border-radius: 6px;
  background-color: var(--chart-pendiente);
}

.relleno {
  position: absolute;
  inset: 0 auto 0 0;
  min-width: 4px;
  border-radius: 6px;
  background-color: var(--chart-confirmado);
}

.marca-meta {
  position: absolute;
  top: -4px;
  bottom: -4px;
  width: 0;
  border-left: 2px dashed var(--text-primary);
  transform: translateX(-1px);
}

.detalle {
  margin: 0.45rem 0 0;
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.detalle strong {
  color: var(--text-primary);
}

.nota-meta {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin: 0.6rem 0 0;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.muestra-meta {
  height: 14px;
  border-left: 2px dashed var(--text-primary);
}
</style>
