<template>
  <!-- Cambiar la contraseña con la sesión iniciada.
       Se usa en Ajustes y en Mi Perfil: es el mismo componente para no repetir código.
       El servidor (PUT /api/perfil/contrasena) pide la actual, cierra las sesiones de los
       otros dispositivos y regresa un token nuevo para que este siga dentro. -->
  <article class="password-card">
    <div class="card-header">
      <svg class="section-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
      </svg>
      <div>
        <h3>Cambiar contraseña</h3>
        <p class="card-desc">Al cambiarla se cierra tu sesión en los demás dispositivos</p>
      </div>
    </div>

    <form class="password-form" @submit.prevent="cambiar">
      <div class="form-group">
        <label :for="`${idBase}-actual`">Contraseña actual</label>
        <input
          :id="`${idBase}-actual`"
          v-model="actual"
          :type="mostrar ? 'text' : 'password'"
          autocomplete="current-password"
          class="form-input"
          required
        />
      </div>
      <div class="form-group">
        <label :for="`${idBase}-nueva`">Contraseña nueva</label>
        <input
          :id="`${idBase}-nueva`"
          v-model="nueva"
          :type="mostrar ? 'text' : 'password'"
          autocomplete="new-password"
          class="form-input"
          :minlength="MIN_CARACTERES"
          required
        />
        <span class="hint">Mínimo {{ MIN_CARACTERES }} caracteres.</span>
      </div>
      <div class="form-group">
        <label :for="`${idBase}-confirmar`">Confirmar contraseña nueva</label>
        <input
          :id="`${idBase}-confirmar`"
          v-model="confirmar"
          :type="mostrar ? 'text' : 'password'"
          autocomplete="new-password"
          class="form-input"
          required
        />
      </div>

      <label class="show-toggle">
        <input v-model="mostrar" type="checkbox" />
        Mostrar contraseñas
      </label>

      <p v-if="mensaje" class="mensaje" :class="{ error: esError }" role="status">{{ mensaje }}</p>

      <button type="submit" class="submit-btn" :disabled="enviando">
        {{ enviando ? 'Guardando...' : 'Cambiar contraseña' }}
      </button>
    </form>
  </article>
</template>

<script setup>
import { ref } from 'vue';
import { apiFetch } from '../api';

// Prefijo de los id del formulario, por si el componente aparece dos veces en una pantalla
defineProps({ idBase: { type: String, default: 'contrasena' } });

// Igual que MIN_CARACTERES en server/services/contrasenas.js (el servidor vuelve a validarlo)
const MIN_CARACTERES = 8;

const actual = ref('');
const nueva = ref('');
const confirmar = ref('');
const mostrar = ref(false);
const enviando = ref(false);
const mensaje = ref('');
const esError = ref(false);

const avisar = (texto, error = false) => {
  mensaje.value = texto;
  esError.value = error;
};

const cambiar = async () => {
  if (nueva.value.length < MIN_CARACTERES) {
    return avisar(`La contraseña nueva debe tener al menos ${MIN_CARACTERES} caracteres.`, true);
  }
  if (nueva.value !== confirmar.value) {
    return avisar('La confirmación no coincide con la contraseña nueva.', true);
  }

  enviando.value = true;
  avisar('');
  try {
    const res = await apiFetch('/api/perfil/contrasena', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actual: actual.value, nueva: nueva.value })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'No se pudo cambiar la contraseña');

    // El token anterior ya no sirve (se emitió antes del cambio): se guarda el nuevo
    localStorage.setItem('token', data.token);
    actual.value = '';
    nueva.value = '';
    confirmar.value = '';
    mostrar.value = false;
    avisar(data.message);
  } catch (error) {
    avisar(error.message, true);
  } finally {
    enviando.value = false;
  }
};
</script>

<style scoped>
.password-card {
  background: var(--bg-surface, #ffffff);
  border-radius: 16px;
  padding: 1.25rem 1.5rem;
  border: 1px solid var(--border-color, #e2e8f0);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border-color, #e2e8f0);
}

.section-icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  color: var(--brand-primary, #000080);
}

.card-header h3 {
  font-size: 1.05rem;
  font-weight: 700;
  margin: 0;
}

.card-desc {
  font-size: 0.775rem;
  color: var(--text-secondary, #64748b);
  margin: 0.1rem 0 0 0;
}

.password-form {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  max-width: 420px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-group label {
  font-size: 0.825rem;
  font-weight: 600;
  color: var(--text-primary, #0f172a);
}

.form-input {
  width: 100%;
  padding: 0.7rem 0.85rem;
  border-radius: 10px;
  border: 1px solid var(--border-color, #cbd5e1);
  background-color: var(--bg-input, #f8fafc);
  color: var(--text-primary, #0f172a);
  font-size: 0.9rem;
  font-family: inherit;
  box-sizing: border-box;
  outline: none;
}

.form-input:focus {
  border-color: var(--brand-primary, #000080);
}

.hint {
  font-size: 0.75rem;
  color: var(--text-secondary, #64748b);
}

.show-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.825rem;
  color: var(--text-secondary, #64748b);
  cursor: pointer;
}

.mensaje {
  margin: 0;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--tint-green-text, #15803d);
}

.mensaje.error {
  color: var(--color-danger, #dc2626);
}

.submit-btn {
  align-self: flex-start;
  background: var(--brand-primary, #000080);
  color: #ffffff;
  border: none;
  padding: 0.7rem 1.4rem;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.submit-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
