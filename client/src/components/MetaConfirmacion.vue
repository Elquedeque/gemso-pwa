<template>
  <!-- Meta de confirmación compartida por Talento y Cultura (se guarda en la BD) -->
  <div class="meta">
    <template v-if="!editando">
      <span class="meta-texto">Meta: <strong>{{ datos.meta }}%</strong></span>
      <button v-if="editable" class="btn-link" @click="empezarEdicion">Cambiar</button>
    </template>

    <form v-else class="meta-form" @submit.prevent="guardar">
      <label class="meta-label" for="input-meta">Meta</label>
      <input
        id="input-meta"
        ref="input"
        v-model.number="valor"
        class="meta-input"
        type="number"
        min="1"
        max="100"
        step="1"
        inputmode="numeric"
        :disabled="guardando"
      />
      <span>%</span>
      <button class="btn-guardar" type="submit" :disabled="guardando">
        {{ guardando ? 'Guardando...' : 'Guardar' }}
      </button>
      <button class="btn-link" type="button" :disabled="guardando" @click="cancelar">Cancelar</button>
    </form>

    <p v-if="error" class="meta-error" role="alert">{{ error }}</p>
    <p v-else-if="datos.actualizado_por && !editando" class="meta-autor">
      Cambiada por {{ datos.actualizado_por }} · {{ formatearFecha(datos.fecha_actualizacion) }}
    </p>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue';
import { apiFetch } from '../api';
import { formatearFecha } from '../utils/estadisticas';

const props = defineProps({
  // { meta, actualizado_por, fecha_actualizacion } como lo regresa GET /api/estadisticas/meta
  datos: { type: Object, required: true },
  editable: { type: Boolean, default: false }
});

const emit = defineEmits(['actualizada']);

const editando = ref(false);
const guardando = ref(false);
const valor = ref(props.datos.meta);
const error = ref('');
const input = ref(null);

const empezarEdicion = async () => {
  valor.value = props.datos.meta;
  error.value = '';
  editando.value = true;
  await nextTick();
  input.value?.select();
};

const cancelar = () => {
  editando.value = false;
  error.value = '';
};

const guardar = async () => {
  if (!Number.isInteger(valor.value) || valor.value < 1 || valor.value > 100) {
    error.value = 'Escribe un número entero entre 1 y 100';
    return;
  }
  guardando.value = true;
  error.value = '';
  try {
    const res = await apiFetch('/api/estadisticas/meta', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ meta: valor.value })
    });
    const data = await res.json();
    if (!res.ok) {
      error.value = data.error || 'No se pudo guardar la meta';
      return;
    }
    emit('actualizada', data);
    editando.value = false;
  } catch (e) {
    console.error('Error al guardar la meta:', e);
    error.value = 'No se pudo conectar con el servidor';
  } finally {
    guardando.value = false;
  }
};
</script>

<style scoped>
.meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.25rem 0.5rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.meta-texto strong {
  color: var(--text-primary);
}

.meta-form {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.meta-label {
  font-weight: 600;
}

.meta-input {
  width: 4.5rem;
  padding: 0.3rem 0.5rem;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-input);
  color: var(--text-primary);
  font-size: 0.9rem;
  font-variant-numeric: tabular-nums;
}

.btn-link {
  background: none;
  border: none;
  padding: 0.2rem;
  color: var(--brand-primary);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-guardar {
  background: var(--brand-primary);
  color: #ffffff;
  border: none;
  padding: 0.35rem 0.8rem;
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-guardar:disabled,
.btn-link:disabled {
  opacity: 0.6;
  cursor: default;
}

.meta-autor,
.meta-error {
  flex-basis: 100%;
  margin: 0;
  text-align: right;
  font-size: 0.72rem;
}

.meta-error {
  color: var(--color-danger);
}
</style>
