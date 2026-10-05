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
  alert('Módulo de registro en construcción.');
};
</script>

<style scoped>
.login-container {
  height: 100vh;
  width: 100vw;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(180deg, #ffffff 0%, #e2e8f0 100%);
  padding: 1.5rem;
  box-sizing: border-box;
  overflow: hidden; /* Evita que aparezca la barra de desplazamiento */
}

.login-card {
  width: 100%;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

/* Imagen del Logo */
.logo-container {
  margin-bottom: 0.5rem;
  display: flex;
  justify-content: center;
}

.gemso-logo-img {
  width: 220px;
  height: auto;
  object-fit: contain;
}

/* Títulos */
.welcome-title {
  font-size: 2.2rem;
  font-weight: 500;
  color: #000000;
  margin: 0.5rem 0 0.25rem 0;
}

.subtitle {
  font-size: 1.1rem;
  color: #1e293b;
  margin: 0 0 2rem 0;
  line-height: 1.3;
}

/* Formulario */
.login-form {
  width: 100%;
  display: flex;
  flex-direction: column;
}

.input-group {
  margin-bottom: 1.25rem;
}

.custom-input {
  width: 100%;
  padding: 0.85rem 1.2rem;
  font-size: 1.1rem;
  border: 1.5px solid #03256c;
  border-radius: 18px;
  outline: none;
  box-sizing: border-box;
  color: #1e293b;
  background-color: #ffffff;
}

.custom-input::placeholder {
  color: #8b9bb4;
}

.custom-input:focus {
  border-color: #001242;
  box-shadow: 0 0 0 2px rgba(3, 37, 108, 0.15);
}

/* Enlace olvido */
.forgot-container {
  text-align: right;
  margin-top: -0.25rem;
  margin-bottom: 2rem;
}

.forgot-link {
  color: #03256c;
  font-size: 0.95rem;
  font-weight: 600;
  text-decoration: underline;
}

/* Botones */
.button-group {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.btn {
  width: 100%;
  padding: 0.85rem;
  font-size: 1.1rem;
  font-weight: 600;
  border-radius: 25px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.15);
}

.btn-primary {
  background-color: #000080;
  color: #ffffff;
  border: none;
}

.btn-primary:hover {
  background-color: #000066;
}

.btn-secondary {
  background-color: #ffffff;
  color: #000080;
  border: 1.5px solid #cbd5e1;
}

.btn-secondary:hover {
  background-color: #f8fafc;
}

.error-msg {
  color: #dc2626;
  font-size: 0.9rem;
  margin-bottom: 1rem;
}
</style>