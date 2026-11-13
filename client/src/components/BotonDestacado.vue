<template>
  <!-- Destacar o quitar del carrusel un aviso ya publicado (PUT /api/anuncios/:id/destacado) -->
  <div class="destacado-box" :class="{ activo: destacado }">
    <div class="destacado-info">
      <span class="destacado-titulo">{{ destacado ? 'En el carrusel de inicio' : 'No está en el carrusel' }}</span>
      <span class="destacado-sub">
        {{ destacado
          ? 'Aparece en "Aviso Destacado" y en el Modo TV de quienes lo pueden ver.'
          : 'Destácalo para que aparezca en la pantalla de inicio y en el Modo TV.' }}
      </span>
      <span v-if="error" class="destacado-error" role="alert">{{ error }}</span>
    </div>
    <button type="button" :class="destacado ? 'btn-quitar' : 'btn-destacar'" :disabled="guardando" @click="cambiar">
      {{ guardando ? 'Guardando...' : (destacado ? 'Quitar del carrusel' : 'Destacar') }}
    </button>
  </div>
</template>

<script setup>
// Lo usan DetalleAvisoView y EstadisticaAvisoView, solo para quien tiene 'publicar_avisos'.
// Avisa al padre con 'cambio' para que actualice su copia del aviso.
import { ref } from 'vue';
import { apiFetch } from '../api';

const props = defineProps({
  idAnu: { type: Number, required: true },
  destacado: { type: Boolean, default: false }
});
const emit = defineEmits(['cambio']);

const guardando = ref(false);
const error = ref('');

const cambiar = async () => {
  error.value = '';
  guardando.value = true;
  try {
    const res = await apiFetch(`/api/anuncios/${props.idAnu}/destacado`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destacado: !props.destacado })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'No se pudo guardar el cambio');
    emit('cambio', data.destacado);
  } catch (err) {
    error.value = err.message;
  } finally {
    guardando.value = false;
  }
};
</script>

<style scoped>
.destacado-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.9rem 1rem;
  border-radius: 12px;
  border: 1px solid var(--border-color, #e2e8f0);
  background: var(--bg-surface, #ffffff);
}

.destacado-box.activo {
  border-color: var(--brand-primary, #000080);
  background: var(--tint-brand-bg, #e0e7ff);
}

.destacado-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.destacado-titulo {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--text-primary, #0f172a);
}

.destacado-sub {
  font-size: 0.75rem;
  color: var(--text-secondary, #64748b);
}

.destacado-error {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--color-danger, #dc2626);
}

.btn-destacar,
.btn-quitar {
  flex-shrink: 0;
  padding: 0.55rem 1rem;
  border-radius: 10px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.btn-destacar {
  background: var(--brand-primary, #000080);
  color: #ffffff;
  border: none;
}

.btn-quitar {
  background: var(--bg-surface, #ffffff);
  color: var(--color-danger, #dc2626);
  border: 1px solid var(--tint-red-border, #fecaca);
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 480px) {
  .destacado-box {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
