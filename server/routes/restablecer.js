// Rutas públicas para restablecer la contraseña (services/restablecimientos.js)
//   GET  /api/restablecer/validar/:token  Revisa un enlace y regresa a quién pertenece
//   POST /api/restablecer                 Poner la contraseña nueva: { token, nueva }
//
// Son públicas porque la persona olvidó su contraseña y no puede iniciar sesión.
// El enlace lo genera Talento y Cultura en POST /api/colaboradores/:id/restablecer.
// Para un enlace usado, vencido, cancelado o inventado se responde lo mismo, sin detalles.
// No se limita por intentos: el token tiene 256 bits aleatorios, no se puede adivinar.
const express = require('express');
const { validarNueva } = require('../services/contrasenas');
const restablecimientos = require('../services/restablecimientos');

const router = express.Router();

const ENLACE_NO_VALIDO = 'Este enlace ya no es válido. Pide uno nuevo a Talento y Cultura.';

// Lo usa la pantalla /restablecer al abrir el enlace, para mostrar de qué cuenta es
router.get('/validar/:token', async (req, res) => {
  try {
    const pendiente = await restablecimientos.buscarPendiente(req.params.token);
    if (!pendiente) return res.status(404).json({ error: ENLACE_NO_VALIDO });
    res.json({ correo: pendiente.correo, nombre_completo: pendiente.nombre_completo });
  } catch (error) {
    console.error('Error al validar el enlace de restablecimiento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/', async (req, res) => {
  const { token, nueva } = req.body || {};
  const errorNueva = validarNueva(nueva);
  if (errorNueva) return res.status(400).json({ error: errorNueva });

  try {
    const cambiada = await restablecimientos.usar({ token, nueva });
    if (!cambiada) return res.status(404).json({ error: ENLACE_NO_VALIDO });
    res.json({ message: 'Contraseña restablecida. Ya puedes iniciar sesión.' });
  } catch (error) {
    console.error('Error al restablecer la contraseña:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
