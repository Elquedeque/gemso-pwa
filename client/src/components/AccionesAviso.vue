<template>
  <!-- Editar, archivar o restaurar un aviso (migración 019). Solo para quien tiene 'publicar_avisos' -->
  <div class="acciones-box" :class="{ archivado }">
    <template v-if="!confirmando">
      <div class="acciones-info">
        <span class="acciones-titulo">{{ archivado ? 'Aviso archivado' : 'Administrar aviso' }}</span>
        <span class="acciones-sub">
          {{ archivado
            ? 'Los colaboradores no lo ven. Sus confirmaciones y estadísticas se conservan.'
            : 'Corrige el texto, la imagen o los adjuntos, o archívalo si ya no debe verse.' }}
        </span>
        <span v-if="error" class="acciones-error" role="alert">{{ error }}</span>
      </div>
      <div class="acciones-botones">
        <template v-if="!archivado">
          <router-link :to="`/avisos/${idAnu}/editar`" class="btn-editar">Editar</router-link>
          <button type="button" class="btn-archivar" @click="confirmando = true">Archivar</button>
        </template>
        <button v-else type="button" class="btn-editar" :disabled="guardando" @click="cambiar(false)">
          {{ guardando ? 'Restaurando...' : 'Restaurar' }}
        </button>
      </div>
    </template>

    <!-- Confirmación en el mismo recuadro, sin el confirm() del navegador -->
    <div v-else class="acciones-confirmar">
      <p>
        <strong>¿Archivar este aviso?</strong> Dejará de verse en Inicio, Mis Avisos y la campana,
        y saldrá del carrusel. Sus confirmaciones se conservan y lo puedes restaurar desde Estadísticas.
      </p>
      <span v-if="error" class="acciones-error" role="alert">{{ error }}</span>
      <div class="acciones-botones">
        <button type="button" class="btn-editar" :disabled="guardando" @click="confirmando = false">Cancelar</button>
        <button type="button" class="btn-archivar" :disabled="guardando" @click="cambiar(true)">
          {{ guardando ? 'Archivando...' : 'Sí, archivar' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
// Lo usan DetalleAvisoView y EstadisticaAvisoView (PUT /api/anuncios/:id/archivado).
// Avisa al padre con 'cambio' (true = se archivó) para que actualice su copia o se vaya.
import { ref } from 'vue';
import { apiFetch } from '../api';

const props = defineProps({
  idAnu: { type: Number, required: true },
  archivado: { type: Boolean, default: false }
});
const emit = defineEmits(['cambio']);

const confirmando = ref(false);
const guardando = ref(false);
const error = ref('');

const cambiar = async (archivar) => {
  error.value = '';
  guardando.value = true;
  try {
    const res = await apiFetch(`/api/anuncios/${props.idAnu}/archivado`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archivado: archivar })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'No se pudo guardar el cambio');
    confirmando.value = false;
    emit('cambio', data.archivado);
  } catch (err) {
    error.value = err.message;
  } finally {
    guardando.value = false;
  }
};
</script>

<style scoped>
.acciones-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem 1rem;
  padding: 0.9rem 1rem;
  border-radius: 12px;
  border: 1px solid var(--border-color, #e2e8f0);
  background: var(--bg-surface, #ffffff);
}

.acciones-box.archivado {
  border-color: var(--tint-red-border, #fecaca);
  background: var(--tint-red-bg, #fef2f2);
}

.acciones-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  flex: 1;
  min-width: 200px;
}

.acciones-titulo {
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--text-primary, #0f172a);
}

.acciones-sub {
  font-size: 0.78rem;
  color: var(--text-secondary, #64748b);
}

.acciones-error {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-danger, #dc2626);
}

.acciones-botones {
  display: flex;
  gap: 0.5rem;
  margin-left: auto;
}

.acciones-confirmar {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  width: 100%;
}

.acciones-confirmar p {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-primary, #0f172a);
}

.btn-editar,
.btn-archivar {
  padding: 0.5rem 0.9rem;
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  text-decoration: none;
  background: transparent;
  border: 1px solid var(--border-color, #cbd5e1);
  color: var(--text-primary, #0f172a);
}

.btn-archivar {
  color: var(--color-danger, #dc2626);
  border-color: var(--tint-red-border, #fecaca);
}

.btn-editar:disabled,
.btn-archivar:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
