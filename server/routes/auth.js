// Rutas de Inicio de Sesión y Registro
//   POST /api/login     Iniciar sesión (regresa usuario, permisos y token)
//   POST /api/usuarios  Registrar un usuario nuevo (abierto, o con invitación para TyC)
const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { JWT_SECRET, DURACION_SESION } = require('../config/auth');
const { PERMISOS_TYC, obtenerPermisos } = require('../services/permisos');
const {
  normalizarCorreo,
  normalizarTelefono,
  TELEFONO_VALIDO,
  idValido
} = require('../services/validaciones');
const { cifrar, verificar, validarNueva } = require('../services/contrasenas');
const { huella, buscarPendiente, SQL_PENDIENTE } = require('../services/invitaciones');

const router = express.Router();

// Endpoint de Inicio de Sesión
// Se busca al usuario solo por correo y luego bcrypt compara la contraseña
// escrita contra el hash guardado (services/contrasenas.js).
router.post('/login', async (req, res) => {
  const { contraseña } = req.body;
  const correo = normalizarCorreo(req.body.correo);

  if (!correo || typeof contraseña !== 'string' || !contraseña) {
    return res.status(400).json({ error: 'Debes proporcionar correo y contraseña' });
  }

  try {
    const query = `
      SELECT u.id_usu, u.nombre_completo, u.correo, u.puesto, d.nombre AS departamento,
             u.contraseña AS hash, u.activo
      FROM usuarios u
      LEFT JOIN departamentos d ON u.id_departamento = d.id_dep
      WHERE LOWER(u.correo) = $1
    `;

    const result = await db.query(query, [correo]);
    const encontrado = result.rows[0];

    // Si el correo no existe se compara igual (contra un hash ficticio), para que
    // la respuesta tarde lo mismo y no revele qué correos están registrados.
    const valida = await verificar(contraseña, encontrado ? encontrado.hash : null);
    if (!valida) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    // Cuenta desactivada por Talento y Cultura (migración 013). Se revisa después de la
    // contraseña, para no revelarle a cualquiera qué cuentas existen y están desactivadas.
    if (!encontrado.activo) {
      return res.status(403).json({ error: 'Tu cuenta está desactivada. Comunícate con Talento y Cultura.' });
    }

    // El hash nunca sale del servidor
    const { hash, activo, ...usuario } = encontrado;
    usuario.permisos = await obtenerPermisos(usuario.id_usu);

    const token = jwt.sign({ id_usu: usuario.id_usu }, JWT_SECRET, { expiresIn: DURACION_SESION });

    res.json({
      message: 'Inicio de sesión exitoso',
      token,
      usuario
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint de Registro de Usuarios
// Hay dos formas de registrarse:
//   - Abierta: la persona escribe su correo y elige su departamento, menos los marcados
//     como "solo por invitación" (departamentos.solo_por_invitacion, hoy Talento y Cultura).
//   - Con invitación (campo "invitacion", routes/invitaciones.js): el correo y el
//     departamento se toman de la invitación, no de lo que mande el formulario.
// Así nadie puede elegir por su cuenta Talento y Cultura y quedarse con sus permisos.
router.post('/usuarios', async (req, res) => {
  const token = typeof req.body.invitacion === 'string' && req.body.invitacion ? req.body.invitacion : null;
  const correoFormulario = normalizarCorreo(req.body.correo);
  const idDepartamento = idValido(req.body.id_departamento);
  const telefono = normalizarTelefono(req.body.telefono);
  const idSucursal = idValido(req.body.id_sucursal);
  const idEmpresa = idValido(req.body.id_empresa);
  const {
    nombre_completo,
    contraseña,
    puesto,
    fecha_nacimiento,
    fecha_ingreso
  } = req.body;

  // Validación básica de campos requeridos (correo y departamento solo sin invitación)
  if (!nombre_completo || !telefono || !contraseña || !puesto ||
      !idSucursal || !idEmpresa || !fecha_nacimiento || !fecha_ingreso ||
      (!token && (!correoFormulario || !idDepartamento))) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }
  if (!TELEFONO_VALIDO.test(telefono)) {
    return res.status(400).json({ error: 'El teléfono debe tener 10 dígitos' });
  }
  const errorContraseña = validarNueva(contraseña);
  if (errorContraseña) {
    return res.status(400).json({ error: errorContraseña });
  }

  try {
    // 1. Revisar de dónde salen el correo y el departamento, para dar un mensaje claro
    let correo = correoFormulario;
    if (token) {
      const invitacion = await buscarPendiente(token);
      if (!invitacion) {
        return res.status(403).json({ error: 'Esta invitación ya se usó, venció o no existe. Pide una nueva a Talento y Cultura.' });
      }
      correo = invitacion.correo;
    } else {
      const dep = await db.query('SELECT solo_por_invitacion FROM departamentos WHERE id_dep = $1', [idDepartamento]);
      if (dep.rows.length === 0) {
        return res.status(400).json({ error: 'El departamento no existe' });
      }
      if (dep.rows[0].solo_por_invitacion) {
        return res.status(403).json({ error: 'A este departamento solo se entra con una invitación de Talento y Cultura' });
      }
    }

    // 2. Verificar si el correo ya existe
    const checkEmail = await db.query('SELECT id_usu FROM usuarios WHERE LOWER(correo) = $1', [correo]);
    if (checkEmail.rows.length > 0) {
      // TODO: aqui regreso 'message' y en el login 'error'... unificar a 'error' en todos
      return res.status(400).json({ message: 'El correo electrónico ya está registrado.' });
    }

    // 3. Todo en una sola consulta, que PostgreSQL hace completa o no hace:
    //    - "usada" (solo con invitación) la marca como usada si sigue pendiente. Si dos
    //      personas mandan el mismo enlace al mismo tiempo, la segunda ya no la encuentra.
    //    - "origen" junta el correo y el departamento: de la invitación, o del formulario
    //      si el departamento está abierto. Si ninguno aplica, queda vacío y no se inserta nada.
    //    - "nuevo" crea al usuario con esos datos.
    //    - "permiso_tyc": si es de Talento y Cultura se le dan sus permisos (así quedó para la beta).
    //    Si algo falla (por ejemplo, el correo ya existe), la invitación queda sin usar.
    //    El gerente no se pide aquí, ese lo asigna Talento y Cultura.
    const query = `
      WITH usada AS (
        UPDATE invitaciones i SET fecha_uso = NOW()
        WHERE $4::char(64) IS NOT NULL AND i.token_hash = $4 AND ${SQL_PENDIENTE}
        RETURNING i.correo, i.id_departamento
      ),
      origen AS (
        SELECT correo, id_departamento FROM usada
        UNION ALL
        SELECT $11::varchar, d.id_dep
        FROM departamentos d
        WHERE $4::char(64) IS NULL AND d.id_dep = $12::int AND NOT d.solo_por_invitacion
      ),
      nuevo AS (
        INSERT INTO usuarios (
          nombre_completo,
          correo,
          contraseña,
          puesto,
          id_departamento,
          fecha_nacimiento,
          fecha_ingreso,
          telefono,
          id_sucursal,
          id_empresa
        )
        -- Con INSERT ... SELECT, PostgreSQL no deduce el tipo de los parámetros: se indica con ::
        SELECT $1::varchar, origen.correo, $2::varchar, $3::varchar, origen.id_departamento,
               $5::date, $6::date, $8::varchar, $9::int, $10::int
        FROM origen
        RETURNING id_usu, nombre_completo, correo, id_departamento
      ),
      permiso_tyc AS (
        INSERT INTO usuario_permisos (id_usu, id_per)
        SELECT nuevo.id_usu, p.id_per
        FROM nuevo
        JOIN departamentos d ON d.id_dep = nuevo.id_departamento
        JOIN permisos p ON p.nombre = ANY($7::text[])
        WHERE d.nombre = 'Talento y Cultura'
      )
      SELECT id_usu, nombre_completo, correo FROM nuevo;
    `;

    // Se guarda el hash, nunca la contraseña tal cual
    const values = [
      nombre_completo,
      await cifrar(contraseña),
      puesto,
      token ? huella(token) : null,
      fecha_nacimiento,
      fecha_ingreso,
      PERMISOS_TYC,
      telefono,
      idSucursal,
      idEmpresa,
      token ? null : correo,
      token ? null : idDepartamento
    ];

    const result = await db.query(query, values);

    // Entre el paso 1 y el 3 alguien más usó la invitación (o cerraron el departamento)
    if (result.rows.length === 0) {
      return res.status(403).json({
        error: token
          ? 'Esta invitación ya se usó. Pide una nueva a Talento y Cultura.'
          : 'A este departamento solo se entra con una invitación de Talento y Cultura'
      });
    }

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      usuario: result.rows[0]
    });
  } catch (error) {
    // Error 23505: correo repetido (por si dos se registran al mismo tiempo)
    if (error.code === '23505') {
      return res.status(400).json({ message: 'El correo electrónico ya está registrado.' });
    }
    // Error 23503: la sucursal o la empresa no existe
    if (error.code === '23503') {
      return res.status(400).json({ message: 'La sucursal o la empresa no existe.' });
    }
    console.error('Error al registrar usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor al intentar registrar.' });
  }
});

module.exports = router;
