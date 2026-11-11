// Rutas de Invitaciones (services/invitaciones.js)
//   GET    /api/invitaciones/validar/:token  Público: revisa un enlace y regresa correo y departamento
//   GET    /api/invitaciones                 TyC: últimas invitaciones con su estado
//   POST   /api/invitaciones                 TyC: invitar un correo a un departamento (manda el correo)
//   DELETE /api/invitaciones/:id             TyC: cancelar una invitación pendiente
const express = require('express');
const db = require('../config/db');
const autenticar = require('../middleware/autenticar');
const requierePermiso = require('../middleware/requierePermiso');
const { PERMISO_INVITAR_COLABORADORES } = require('../services/permisos');
const { normalizarCorreo, idValido } = require('../services/validaciones');
const invitaciones = require('../services/invitaciones');

const router = express.Router();

// Forma básica de un correo: algo@algo.algo, sin espacios
const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Lo usa la pantalla de registro al abrir el enlace, antes de que la persona tenga cuenta.
// Para un enlace usado, vencido o inventado se responde lo mismo, sin dar detalles.
router.get('/validar/:token', async (req, res) => {
  try {
    const invitacion = await invitaciones.buscarPendiente(req.params.token);
    if (!invitacion) {
      return res.status(404).json({ error: 'Esta invitación ya se usó, venció o no existe. Pide una nueva a Talento y Cultura.' });
    }
    res.json({
      correo: invitacion.correo,
      departamento: invitacion.departamento,
      fecha_expira: invitacion.fecha_expira
    });
  } catch (error) {
    console.error('Error al validar invitación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// De aquí en adelante solo con sesión y permiso de invitar
router.use(autenticar, requierePermiso(PERMISO_INVITAR_COLABORADORES));

// Últimas 100 invitaciones, las más recientes primero
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT i.id_inv, i.correo, d.nombre AS departamento, i.fecha_creacion, i.fecha_expira,
              i.fecha_uso, u.nombre_completo AS creada_por, ${invitaciones.SQL_ESTADO} AS estado
       FROM invitaciones i
       JOIN departamentos d ON d.id_dep = i.id_departamento
       LEFT JOIN usuarios u ON u.id_usu = i.creada_por
       ORDER BY i.fecha_creacion DESC
       LIMIT 100`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener invitaciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/', async (req, res) => {
  const correo = normalizarCorreo(req.body.correo);
  const idDepartamento = idValido(req.body.id_departamento);

  if (!CORREO_VALIDO.test(correo) || correo.length > 150) {
    return res.status(400).json({ error: 'Escribe un correo válido' });
  }
  if (!idDepartamento) {
    return res.status(400).json({ error: 'Selecciona el departamento' });
  }

  try {
    // Datos para validar y para el correo: el departamento y quién invita
    const datos = await db.query(
      `SELECT
         (SELECT nombre FROM departamentos WHERE id_dep = $1) AS departamento,
         (SELECT nombre_completo FROM usuarios WHERE id_usu = $2) AS invitado_por,
         EXISTS (SELECT 1 FROM usuarios WHERE LOWER(correo) = $3) AS ya_registrado`,
      [idDepartamento, req.usuario.id_usu, correo]
    );
    const { departamento, invitado_por: invitadoPor, ya_registrado: yaRegistrado } = datos.rows[0];

    if (!departamento) {
      return res.status(400).json({ error: 'El departamento no existe' });
    }
    if (yaRegistrado) {
      return res.status(409).json({ error: 'Ese correo ya tiene una cuenta en la app' });
    }

    const { invitacion, token } = await invitaciones.crear({
      correo,
      idDepartamento,
      creadaPor: req.usuario.id_usu
    });

    const enlace = invitaciones.enlaceRegistro(token, req.get('origin'));
    const correoEnviado = await invitaciones.enviarCorreoInvitacion({ correo, departamento, enlace, invitadoPor });

    // El enlace se regresa solo esta vez (no se puede volver a consultar),
    // por si el correo no llega y TyC lo quiere mandar por otro medio.
    res.status(201).json({
      invitacion: { ...invitacion, departamento, estado: 'pendiente' },
      enlace,
      correo_enviado: correoEnviado
    });
  } catch (error) {
    console.error('Error al crear invitación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.delete('/:id', async (req, res) => {
  const id = idValido(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invitación no válida' });

  try {
    const result = await db.query(
      `UPDATE invitaciones i SET fecha_cancelada = NOW()
       WHERE i.id_inv = $1 AND ${invitaciones.SQL_PENDIENTE}
       RETURNING i.id_inv`,
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(409).json({ error: 'Esa invitación ya no está pendiente' });
    }
    res.json({ message: 'Invitación cancelada' });
  } catch (error) {
    console.error('Error al cancelar invitación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
