<template>
  <div class="auth-container">
    <div class="auth-card">
      <header class="auth-header">
        <div class="brand-logo">
          <h1>GEMSO</h1>
        </div>
        <h2>Crear Cuenta</h2>
        <p class="subtitle">Ingresa tus datos para registrarte en el portal</p>
      </header>

      <form class="auth-form" @submit.prevent="handleRegistro">
        <!-- Nombre Completo -->
        <div class="form-group">
          <label for="nombre">Nombre Completo *</label>
          <input 
            id="nombre"
            type="text" 
            v-model="formulario.nombre_completo" 
            maxlength="150"
            placeholder="Ej. Francisco Alberto Salazar" 
            required 
          />
        </div>

        <!-- Correo Electrónico -->
        <div class="form-group">
          <label for="correo">Correo Electrónico *</label>
          <input 
            id="correo"
            type="email" 
            v-model="formulario.correo" 
            maxlength="150"
            placeholder="usuario@gemso.com" 
            required 
          />
        </div>

        <!-- Contraseñas -->
        <div class="form-row">
          <div class="form-group">
            <label for="contrasena">Contraseña *</label>
            <input 
              id="contrasena"
              type="password" 
              v-model="formulario.contraseña" 
              maxlength="255"
              placeholder="••••••••" 
              required 
            />
          </div>

          <div class="form-group">
            <label for="confirmarContrasena">Confirmar *</label>
            <input 
              id="confirmarContrasena"
              type="password" 
              v-model="confirmarPassword" 
              maxlength="255"
              placeholder="••••••••" 
              required 
            />
          </div>
        </div>

        <!-- Puesto y Departamento -->
        <div class="form-row">
          <div class="form-group">
            <label for="puesto">Puesto / Cargo *</label>
            <input 
              id="puesto"
              type="text" 
              v-model="formulario.puesto" 
              maxlength="100"
              placeholder="Ej. Practicante, Analista..." 
              required 
            />
          </div>

          <div class="form-group">
            <label for="departamento">ID Departamento *</label>
            <input 
              id="departamento"
              type="number" 
              v-model.number="formulario.id_departamento" 
              placeholder="Ej. 1" 
              required 
            />
          </div>
        </div>

        <!-- Fechas -->
        <div class="form-row">
          <div class="form-group">
            <label for="fecha_nacimiento">Fecha de Nacimiento *</label>
            <input 
              id="fecha_nacimiento"
              type="date" 
              v-model="formulario.fecha_nacimiento" 
              required 
            />
          </div>

          <div class="form-group">
            <label for="fecha_ingreso">Fecha de Ingreso *</label>
            <input 
              id="fecha_ingreso"
              type="date" 
              v-model="formulario.fecha_ingreso" 
              required 
            />
          </div>
        </div>

        <p v-if="errorMsg" class="error-text">{{ errorMsg }}</p>

        <button type="submit" class="submit-btn" :disabled="isSubmitting">
          {{ isSubmitting ? 'Registrando...' : 'Registrarse' }}
        </button>

        <div class="auth-footer">
          <span>¿Ya tienes una cuenta?</span>
          <!-- Cambiado a la ruta de tu Login (generalmente es '/') -->
          <router-link to="/" class="login-link">Iniciar Sesión</router-link>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const isSubmitting = ref(false);
const errorMsg = ref('');
const confirmarPassword = ref('');

const formulario = ref({
  nombre_completo: '',
  correo: '',
  contraseña: '',
  puesto: '',
  id_departamento: 1,
  fecha_nacimiento: '',
  fecha_ingreso: ''
});

const handleRegistro = async () => {
  errorMsg.value = '';

  if (formulario.value.contraseña !== confirmarPassword.value) {
    errorMsg.value = 'Las contraseñas no coinciden.';
    return;
  }

  isSubmitting.value = true;

  try {
    // CAMBIA 'http://localhost:3000/api/usuarios' POR LA URL Y PUERTO REAL DE TU BACKEND
    const response = await fetch('http://localhost:3000/api/usuarios', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formulario.value)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error al guardar el usuario en la base de datos');
    }

    alert('¡Usuario registrado con éxito!');
    
    // Redirigir a la ruta raíz '/' si allí está tu vista de Login
    router.push('/'); 
  } catch (error) {
    console.error('Error durante el registro:', error);
    errorMsg.value = error.message || 'No se pudo conectar con el servidor backend.';
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<style scoped>
.auth-container {
  min-height: 100vh;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f1f5f9;
  padding: 1.5rem 1rem;
  box-sizing: border-box;
}

.auth-card {
  width: 100%;
  max-width: 520px;
  background: #ffffff;
  border-radius: 20px;
  padding: 2rem 1.75rem;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
}

.auth-header {
  text-align: center;
  margin-bottom: 1.5rem;
}

.brand-logo h1 {
  font-size: 1.8rem;
  font-weight: 900;
  color: #000080;
  letter-spacing: 2px;
  margin: 0 0 0.5rem 0;
}

.auth-header h2 {
  font-size: 1.35rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.subtitle {
  font-size: 0.825rem;
  color: #64748b;
  margin: 0.25rem 0 0 0;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.85rem;
}

@media (max-width: 480px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}

label {
  font-size: 0.825rem;
  font-weight: 600;
  color: #334155;
}

input[type="text"],
input[type="email"],
input[type="password"],
input[type="number"],
input[type="date"] {
  width: 100%;
  padding: 0.7rem 0.85rem;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  font-size: 0.875rem;
  background-color: #f8fafc;
  color: #0f172a;
  box-sizing: border-box;
  outline: none;
  transition: all 0.2s ease;
}

input:focus {
  border-color: #000080;
  background-color: #ffffff;
  box-shadow: 0 0 0 3px rgba(0, 0, 128, 0.1);
}

.error-text {
  color: #ef4444;
  font-size: 0.8rem;
  font-weight: 600;
  margin: 0;
  text-align: center;
}

.submit-btn {
  background: #000080;
  color: #ffffff;
  border: none;
  padding: 0.85rem;
  border-radius: 10px;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  margin-top: 0.5rem;
}

.submit-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.auth-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  margin-top: 0.75rem;
  font-size: 0.85rem;
  color: #64748b;
}

.login-link {
  color: #000080;
  font-weight: 700;
  text-decoration: none;
}
</style>