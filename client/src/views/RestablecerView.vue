<template>
  <!-- Restablecer la contraseña con el enlace que generó Talento y Cultura (/restablecer?token=...).
       Es pública porque la persona olvidó su contraseña y no puede iniciar sesión.
       El servidor revisa el enlace (routes/restablecer.js); aquí solo se ayuda al usuario. -->
  <div class="login-container">
    <div class="login-card">
      <div class="logo-container">
        <img :src="logoGemso" alt="Logo GEMSO" class="gemso-logo-img" />
      </div>

      <h2 class="welcome-title">Nueva contraseña</h2>

      <p v-if="estado === 'revisando'" class="subtitle">Revisando tu enlace...</p>

      <!-- Enlace usado, vencido, cancelado o mal copiado -->
      <template v-else-if="estado === 'invalido'">
        <p class="subtitle">{{ mensaje }}</p>
        <router-link to="/login" class="btn btn-secondary">Ir a Iniciar Sesión</router-link>
      </template>

      <!-- Listo: ya puede entrar -->
      <template v-else-if="estado === 'listo'">
        <p class="exito-msg" role="status">{{ mensaje }}</p>
        <router-link to="/login" class="btn btn-primary">Iniciar Sesión</router-link>
      </template>

      <template v-else>
        <p class="subtitle">
          Elige una contraseña nueva para<br /><strong class="correo">{{ correo }}</strong>
        </p>

        <form class="login-form" @submit.prevent="restablecer">
          <!-- Campo oculto para que el administrador de contraseñas del navegador sepa de qué cuenta es -->
          <input type="email" :value="correo" autocomplete="username" class="oculto" tabindex="-1" aria-hidden="true" readonly />

          <div class="input-group">
            <label for="restablecer-nueva" class="campo-label">Contraseña nueva</label>
            <input
              id="restablecer-nueva"
              v-model="nueva"
              :type="mostrar ? 'text' : 'password'"
              autocomplete="new-password"
              :minlength="MIN_CARACTERES"
              required
              class="custom-input"
            />
            <span class="hint">Mínimo {{ MIN_CARACTERES }} caracteres.</span>
          </div>
          <div class="input-group">
            <label for="restablecer-confirmar" class="campo-label">Confirmar contraseña</label>
            <input
              id="restablecer-confirmar"
              v-model="confirmar"
              :type="mostrar ? 'text' : 'password'"
              autocomplete="new-password"
              required
              class="custom-input"
            />
          </div>

          <label class="show-toggle">
            <input v-model="mostrar" type="checkbox" />
            Mostrar contraseñas
          </label>

          <p v-if="mensaje" class="error-msg">{{ mensaje }}</p>

          <button type="submit" class="btn btn-primary" :disabled="enviando">
            {{ enviando ? 'Guardando...' : 'Guardar contraseña' }}
          </button>
        </form>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { API_URL } from '../api';
import logoGemso from '../assets/icon_GEMSO.png';

// Igual que MIN_CARACTERES en server/services/contrasenas.js (el servidor vuelve a validarlo)
const MIN_CARACTERES = 8;
const ENLACE_NO_VALIDO = 'Este enlace ya no es válido. Pide uno nuevo a Talento y Cultura.';

const route = useRoute();
const token = typeof route.query.token === 'string' ? route.query.token : '';

// 'revisando' | 'formulario' | 'invalido' | 'listo'
const estado = ref('revisando');
const correo = ref('');
const nueva = ref('');
const confirmar = ref('');
const mostrar = ref(false);
const enviando = ref(false);
const mensaje = ref('');

// Al abrir: revisar que el enlace sirva y saber de qué cuenta es.
// Se usa fetch y no apiFetch porque aquí no hay sesión.
const revisar = async () => {
  if (!token) {
    estado.value = 'invalido';
    mensaje.value = ENLACE_NO_VALIDO;
    return;
  }
  try {
    const res = await fetch(`${API_URL}/api/restablecer/validar/${encodeURIComponent(token)}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || ENLACE_NO_VALIDO);
    correo.value = data.correo;
    estado.value = 'formulario';
  } catch (error) {
    estado.value = 'invalido';
    mensaje.value = error.message;
  }
};

const restablecer = async () => {
  mensaje.value = '';
  if (nueva.value.length < MIN_CARACTERES) {
    mensaje.value = `La contraseña debe tener al menos ${MIN_CARACTERES} caracteres.`;
    return;
  }
  if (nueva.value !== confirmar.value) {
    mensaje.value = 'La confirmación no coincide con la contraseña nueva.';
    return;
  }

  enviando.value = true;
  try {
    const res = await fetch(`${API_URL}/api/restablecer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, nueva: nueva.value })
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 404) {
      estado.value = 'invalido';
      mensaje.value = data.error || ENLACE_NO_VALIDO;
      return;
    }
    if (!res.ok) throw new Error(data.error || 'No se pudo guardar la contraseña.');

    // Si en este navegador había otra sesión abierta, el servidor ya la cerró
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    estado.value = 'listo';
    mensaje.value = data.message;
  } catch (error) {
    mensaje.value = error.message;
  } finally {
    enviando.value = false;
  }
};

onMounted(revisar);
</script>

<style scoped>
/* Mismo diseño que LoginView, para que se reconozca como parte del acceso */
.login-container {
  min-height: 100vh;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: var(--bg-primary);
  padding: 1.5rem;
  box-sizing: border-box;
}

.login-card {
  width: 100%;
  max-width: 400px;
  background-color: var(--bg-surface, #ffffff);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 20px;
  padding: 2.5rem 2rem;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04);
}

.logo-container {
  margin-bottom: 1rem;
  display: flex;
  justify-content: center;
}

.gemso-logo-img {
  width: 190px;
  height: auto;
  object-fit: contain;
}

.welcome-title {
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--text-primary, #0f172a);
  margin: 0.25rem 0 0.5rem;
  letter-spacing: -0.5px;
}

.subtitle {
  font-size: 0.95rem;
  color: var(--text-secondary, #64748b);
  margin: 0 0 1.5rem 0;
  line-height: 1.4;
}

.correo {
  color: var(--text-primary, #0f172a);
  word-break: break-all;
}

.login-form {
  width: 100%;
  display: flex;
  flex-direction: column;
  text-align: left;
}

.oculto {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.input-group {
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.campo-label {
  font-size: 0.825rem;
  font-weight: 600;
  color: var(--text-primary, #0f172a);
}

.custom-input {
  width: 100%;
  padding: 0.85rem 1.1rem;
  font-size: 0.95rem;
  font-family: inherit;
  border: 1.5px solid var(--border-color, #cbd5e1);
  border-radius: 12px;
  outline: none;
  box-sizing: border-box;
  background-color: var(--bg-input, #f8fafc);
  color: var(--text-primary, #0f172a);
}

.custom-input:focus {
  border-color: var(--brand-accent, #0284c7);
  box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
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
  margin-bottom: 1.25rem;
  cursor: pointer;
}

.error-msg {
  color: var(--color-danger, #dc2626);
  font-size: 0.85rem;
  background-color: var(--tint-red-bg, #fef2f2);
  border: 1px solid var(--tint-red-border, #fecaca);
  padding: 0.6rem;
  border-radius: 8px;
  margin: 0 0 1.25rem;
}

.exito-msg {
  color: var(--tint-green-text, #15803d);
  font-size: 0.9rem;
  font-weight: 600;
  background-color: var(--tint-green-bg, #f0fdf4);
  border: 1px solid var(--tint-green-border, #bbf7d0);
  padding: 0.75rem;
  border-radius: 8px;
  margin: 0 0 1.25rem;
}

.btn {
  width: 100%;
  padding: 0.85rem;
  font-size: 0.95rem;
  font-weight: 600;
  font-family: inherit;
  border-radius: 12px;
  cursor: pointer;
  text-decoration: none;
  text-align: center;
  box-sizing: border-box;
  transition: all 0.2s ease;
}

.btn-primary {
  background-color: var(--brand-primary, #000080);
  color: #ffffff;
  border: none;
  box-shadow: 0 4px 12px rgba(0, 0, 128, 0.25);
}

.btn-primary:hover:not(:disabled) {
  background-color: color-mix(in srgb, var(--brand-primary, #000080) 85%, #000000);
}

.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-secondary {
  background-color: transparent;
  color: var(--text-secondary, #475569);
  border: 1.5px solid var(--border-color, #cbd5e1);
}

.btn-secondary:hover {
  background-color: var(--bg-primary, #f1f5f9);
  color: var(--text-primary, #0f172a);
}
</style>
