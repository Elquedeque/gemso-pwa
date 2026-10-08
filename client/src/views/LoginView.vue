<template>
  <div class="login-container">
    <div class="login-card">
      
      <!-- Logotipo de GEMSO desde assets -->
      <div class="logo-container">
        <img :src="logoGemso" alt="Logo GEMSO" class="gemso-logo-img" />
      </div>

      <!-- Encabezado -->
      <h2 class="welcome-title">Bienvenido</h2>
      <p class="subtitle">Inicia Sesión para acceder<br />al portal</p>

      <!-- Formulario -->
      <form @submit.prevent="handleLogin" class="login-form">
        <div class="input-group">
          <input 
            type="text" 
            v-model="correo" 
            placeholder="Usuario" 
            required 
            class="custom-input"
          />
        </div>

        <div class="input-group">
          <input 
            type="password" 
            v-model="contraseña" 
            placeholder="Contraseña" 
            required 
            class="custom-input"
          />
        </div>

        <div class="forgot-container">
          <a href="#" @click.prevent="olvidoContraseña" class="forgot-link">
            ¿Olvidó su contraseña?
          </a>
        </div>

        <p v-if="errorMessage" class="error-msg">{{ errorMessage }}</p>

        <!-- Botones -->
        <div class="button-group">
          <button type="submit" class="btn btn-primary" :disabled="cargando">
            {{ cargando ? 'Iniciando...' : 'Iniciar Sesión' }}
          </button>
          
          <button type="button" class="btn btn-secondary" @click="goRegister">
            Registrarse
          </button>
        </div>
      </form>

    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

// Importación de la imagen desde client/src/assets/icon_GEMSO.png
import logoGemso from '../assets/icon_GEMSO.png';

const router = useRouter();
const correo = ref('');
const contraseña = ref('');
const cargando = ref(false);
const errorMessage = ref('');

const handleLogin = async () => {
  errorMessage.value = '';
  cargando.value = true;

  try {
    const res = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        correo: correo.value,
        contraseña: contraseña.value
      })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Fallo al iniciar sesión');
    }

    // Guardar sesión del usuario localmente
    localStorage.setItem('usuario', JSON.stringify(data.usuario));

    // Redirigir al módulo de anuncios
    router.push('/anuncios');
  } catch (err) {
    errorMessage.value = err.message;
  } finally {
    cargando.value = false;
  }
};

const olvidoContraseña = () => {
  alert('Comunícate con el administrador para restablecer tu contraseña.');
};

const goRegister = () => {
  router.push('/registro');
};
</script>

<style scoped>
/* Contenedor Principal ocupando toda la pantalla */
.login-container {
  min-height: 100vh;
  width: 100vw;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: var(--bg-primary);
  padding: 1.5rem;
  box-sizing: border-box;
}

/* Tarjeta del Formulario */
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

/* Imagen del Logo */
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

/* Encabezados y Títulos */
.welcome-title {
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--text-primary, #0f172a);
  margin: 0.25rem 0;
  letter-spacing: -0.5px;
}

.subtitle {
  font-size: 0.95rem;
  color: var(--text-secondary, #64748b);
  margin: 0 0 1.75rem 0;
  line-height: 1.4;
}

/* Formulario */
.login-form {
  width: 100%;
  display: flex;
  flex-direction: column;
}

.input-group {
  margin-bottom: 1rem;
}

.custom-input {
  width: 100%;
  padding: 0.85rem 1.1rem;
  font-size: 0.95rem;
  border: 1.5px solid var(--border-color, #cbd5e1);
  border-radius: 12px;
  outline: none;
  box-sizing: border-box;
  color: var(--text-primary, #0f172a);
  background-color: var(--bg-surface);
  color: var(--text-primary);
}

.custom-input::placeholder {
  color: #94a3b8;
}

.custom-input:focus {
  border-color: var(--brand-accent, #0284c7);
  box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
}

/* Enlace de recuperación */
.forgot-container {
  text-align: right;
  margin-top: -0.25rem;
  margin-bottom: 1.5rem;
}

.forgot-link {
  color: var(--brand-accent, #0284c7);
  font-size: 0.85rem;
  font-weight: 600;
  text-decoration: none;
  transition: color 0.2s ease;
}

.forgot-link:hover {
  color: var(--brand-primary, #000080);
  text-decoration: underline;
}

/* Mensaje de Error */
.error-msg {
  color: #dc2626;
  font-size: 0.85rem;
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  padding: 0.6rem;
  border-radius: 8px;
  margin-bottom: 1.25rem;
}

/* Botones */
.button-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.btn {
  width: 100%;
  padding: 0.85rem;
  font-size: 0.95rem;
  font-weight: 600;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background-color: var(--brand-primary, #000080);
  color: #ffffff;
  border: none;
  box-shadow: 0 4px 12px rgba(0, 0, 128, 0.25);
}

.btn-primary:hover:not(:disabled) {
  background-color: #000066;
  transform: translateY(-1px);
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