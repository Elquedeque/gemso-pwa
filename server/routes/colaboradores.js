// Rutas de Colaboradores (solo con permiso gestionar_colaboradores; en la beta, Talento y Cultura)
//   GET /api/colaboradores             Lista con búsqueda: ?buscar=&id_departamento=&estado=activos|desactivados|todos
//   GET /api/colaboradores/opciones    Catálogos para el formulario (departamentos, sucursales, empresas, gerentes)
//   GET /api/colaboradores/:id         Datos de un colaborador y su historial de cambios
//   PUT /api/colaboradores/:id         Corregir sus datos
//   PUT /api/colaboradores/:id/estado  Desactivar o reactivar: { "activo": false }
//
// Reglas:
//   - El servidor decide qué campos se pueden cambiar; la contraseña nunca se ve ni se cambia aquí.
//   - Cada dato cambiado queda en cambios_colaboradores (quién, cuándo, antes y después).
//   - Al pasar a alguien a Talento y Cultura recibe sus permisos (PERMISOS_TYC); al sacarlo, los pierde.
//   - Nadie puede cambiar su propio departamento ni desactivarse, para que TyC no se quede sin acceso.
//   - Desactivar no borra nada: la persona deja de poder entrar y de recibir notificaciones (migración 013).
const express = require('express');
const db = require('../config/db');
const autenticar = require('../middleware/autenticar');
const requierePermiso = require('../middleware/requierePermiso');
const { PERMISO_GESTIONAR_COLABORADORES, PERMISOS_TYC } = require('../services/permisos');
const { fechaLocal } = require('../services/fechas');
const {
  normalizarCorreo,
  normalizarTelefono,
  TELEFONO_VALIDO,
  CORREO_VALIDO,
  limpiarTexto,
  idValido,
  fechaValida
} = require('../services/validaciones');

const router = express.Router();
router.use(autenticar, requierePermiso(PERMISO_GESTIONAR_COLABORADORES));

const DEPARTAMENTO_TYC = 'Talento y Cultura';

// Edad mínima para trabajar en México (Ley Federal del Trabajo)
const EDAD_MINIMA_INGRESO = 15;

// Datos completos de un colaborador, con los nombres de los catálogos.
// Las fechas van como texto 'YYYY-MM-DD' para que no se recorran por la zona horaria.
const CONSULTA_COLABORADOR = `
  SELECT
    u.id_usu, u.nombre_completo, u.correo, u.telefono, u.puesto,
    TO_CHAR(u.fecha_nacimiento, 'YYYY-MM-DD') AS fecha_nacimiento,
    TO_CHAR(u.fecha_ingreso, 'YYYY-MM-DD') AS fecha_ingreso,
    u.id_departamento, d.nombre AS departamento,
    u.id_sucursal, s.nombre AS sucursal,
    u.id_empresa, e.nombre AS empresa,
    u.id_gerente, g.nombre_completo AS gerente,
    u.activo, u.fecha_desactivacion, dp.nombre_completo AS desactivado_por,
    u.fecha_creacion
  FROM usuarios u
  LEFT JOIN departamentos d ON d.id_dep = u.id_departamento
  LEFT JOIN sucursales s ON s.id_suc = u.id_sucursal
  LEFT JOIN empresas e ON e.id_emp = u.id_empresa
  LEFT JOIN usuarios g ON g.id_usu = u.id_gerente
  LEFT JOIN usuarios dp ON dp.id_usu = u.desactivado_por
  WHERE u.id_usu = $1
`;

// Campos que se comparan para el historial: [nombre en el historial, columna legible]
// Departamento, sucursal, empresa y gerente se guardan con su nombre, no con el id.
const CAMPOS_HISTORIAL = [
  'nombre_completo', 'correo', 'telefono', 'puesto', 'fecha_nacimiento', 'fecha_ingreso',
  'departamento', 'sucursal', 'empresa', 'gerente'
];

// Último historial de un colaborador (los 50 cambios más recientes)
const obtenerHistorial = async (idUsu) =>
  (await db.query(
    `SELECT c.id_cam, c.campo, c.valor_anterior, c.valor_nuevo, c.fecha,
            u.nombre_completo AS cambiado_por
     FROM cambios_colaboradores c
     LEFT JOIN usuarios u ON u.id_usu = c.cambiado_por
     WHERE c.id_usu = $1
     ORDER BY c.fecha DESC, c.id_cam DESC
     LIMIT 50`,
    [idUsu]
  )).rows;

// Responder con un error 400 y un mensaje para la pantalla
class ErrorValidacion extends Error {}

// ── Lista ─────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const buscar = limpiarTexto(req.query.buscar);
  const idDepartamento = idValido(req.query.id_departamento);
  const estado = ['activos', 'desactivados', 'todos'].includes(req.query.estado) ? req.query.estado : 'activos';

  try {
    const result = await db.query(
      `SELECT u.id_usu, u.nombre_completo, u.correo, u.puesto, d.nombre AS departamento,
              u.activo, TO_CHAR(u.fecha_ingreso, 'YYYY-MM-DD') AS fecha_ingreso
       FROM usuarios u
       LEFT JOIN departamentos d ON d.id_dep = u.id_departamento
       WHERE ($1::text = '' OR u.nombre_completo ILIKE '%' || $1 || '%' OR u.correo ILIKE '%' || $1 || '%')
         AND ($2::int IS NULL OR u.id_departamento = $2)
         AND ($3 = 'todos' OR u.activo = ($3 = 'activos'))
       ORDER BY u.nombre_completo`,
      [buscar, idDepartamento, estado]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener colaboradores:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── Catálogos para el formulario ──────────────────────────────────────
// Como gerente solo se puede elegir a alguien activo.
router.get('/opciones', async (req, res) => {
  try {
    const [departamentos, sucursales, empresas, gerentes] = await Promise.all([
      db.query('SELECT id_dep, nombre FROM departamentos ORDER BY nombre'),
      db.query('SELECT id_suc, nombre FROM sucursales ORDER BY nombre'),
      db.query('SELECT id_emp, nombre FROM empresas ORDER BY nombre'),
      db.query('SELECT id_usu, nombre_completo FROM usuarios WHERE activo ORDER BY nombre_completo')
    ]);
    res.json({
      departamentos: departamentos.rows,
      sucursales: sucursales.rows,
      empresas: empresas.rows,
      gerentes: gerentes.rows
    });
  } catch (error) {
    console.error('Error al obtener opciones de colaboradores:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── Detalle ───────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const idUsu = idValido(req.params.id);
  if (!idUsu) return res.status(400).json({ error: 'Colaborador no válido' });

  try {
    const result = await db.query(CONSULTA_COLABORADOR, [idUsu]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Colaborador no encontrado' });
    res.json({ colaborador: result.rows[0], historial: await obtenerHistorial(idUsu) });
  } catch (error) {
    console.error('Error al obtener colaborador:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── Corregir datos ────────────────────────────────────────────────────
// Se manda el formulario completo; solo se registran en el historial los campos que cambiaron.
router.put('/:id', async (req, res) => {
  const idUsu = idValido(req.params.id);
  if (!idUsu) return res.status(400).json({ error: 'Colaborador no válido' });

  const datos = {
    nombre_completo: limpiarTexto(req.body.nombre_completo),
    correo: normalizarCorreo(req.body.correo),
    telefono: normalizarTelefono(req.body.telefono),
    puesto: limpiarTexto(req.body.puesto),
    fecha_nacimiento: fechaValida(req.body.fecha_nacimiento),
    fecha_ingreso: fechaValida(req.body.fecha_ingreso),
    id_departamento: idValido(req.body.id_departamento),
    id_sucursal: idValido(req.body.id_sucursal),
    id_empresa: idValido(req.body.id_empresa),
    // El gerente es opcional: vacío lo quita
    id_gerente: req.body.id_gerente === null || req.body.id_gerente === '' ? null : idValido(req.body.id_gerente)
  };

  try {
    // 1. Validaciones que no necesitan la BD
    if (!datos.nombre_completo || !datos.correo || !datos.telefono || !datos.puesto ||
        !datos.id_departamento || !datos.id_sucursal || !datos.id_empresa) {
      throw new ErrorValidacion('Todos los campos son obligatorios, menos el gerente');
    }
    if (!datos.fecha_nacimiento || !datos.fecha_ingreso) {
      throw new ErrorValidacion('Las fechas de nacimiento e ingreso deben ser válidas');
    }
    if (req.body.id_gerente && !datos.id_gerente) throw new ErrorValidacion('El gerente no es válido');
    if (!CORREO_VALIDO.test(datos.correo)) throw new ErrorValidacion('El correo no es válido');
    if (!TELEFONO_VALIDO.test(datos.telefono)) throw new ErrorValidacion('El teléfono debe tener 10 dígitos');

    const hoy = fechaLocal();
    if (datos.fecha_nacimiento >= hoy) throw new ErrorValidacion('La fecha de nacimiento no puede ser hoy ni futura');
    if (datos.fecha_ingreso > hoy) throw new ErrorValidacion('La fecha de ingreso no puede ser futura');
    // Las fechas son texto 'YYYY-MM-DD', así que se pueden comparar como texto
    const anioMinimo = Number(datos.fecha_nacimiento.slice(0, 4)) + EDAD_MINIMA_INGRESO;
    if (datos.fecha_ingreso < `${anioMinimo}${datos.fecha_nacimiento.slice(4)}`) {
      throw new ErrorValidacion(`La fecha de ingreso debe ser al menos ${EDAD_MINIMA_INGRESO} años después del nacimiento`);
    }
    if (datos.id_gerente === idUsu) throw new ErrorValidacion('Un colaborador no puede ser su propio gerente');

    const resultado = await db.transaccion(async (cliente) => {
      // 2. Datos actuales (FOR UPDATE: si dos personas de TyC guardan a la vez, la segunda espera)
      const antes = (await cliente.query(`${CONSULTA_COLABORADOR} FOR UPDATE OF u`, [idUsu])).rows[0];
      if (!antes) return null;

      // 3. Validaciones contra la BD
      if (idUsu === req.usuario.id_usu && datos.id_departamento !== antes.id_departamento) {
        throw new ErrorValidacion('No puedes cambiar tu propio departamento. Pídeselo a otra persona de Talento y Cultura.');
      }
      const correoUsado = await cliente.query(
        'SELECT 1 FROM usuarios WHERE LOWER(correo) = $1 AND id_usu <> $2',
        [datos.correo, idUsu]
      );
      if (correoUsado.rows.length > 0) throw new ErrorValidacion('El correo ya es de otro colaborador');

      if (datos.id_gerente && datos.id_gerente !== antes.id_gerente) {
        const gerente = await cliente.query('SELECT activo FROM usuarios WHERE id_usu = $1', [datos.id_gerente]);
        if (gerente.rows.length === 0) throw new ErrorValidacion('El gerente no existe');
        if (!gerente.rows[0].activo) throw new ErrorValidacion('El gerente está desactivado');
      }

      // 4. Guardar (si un catálogo no existe, PostgreSQL responde 23503)
      await cliente.query(
        `UPDATE usuarios
         SET nombre_completo = $1, correo = $2, telefono = $3, puesto = $4,
             fecha_nacimiento = $5, fecha_ingreso = $6, id_departamento = $7,
             id_sucursal = $8, id_empresa = $9, id_gerente = $10
         WHERE id_usu = $11`,
        [datos.nombre_completo, datos.correo, datos.telefono, datos.puesto,
          datos.fecha_nacimiento, datos.fecha_ingreso, datos.id_departamento,
          datos.id_sucursal, datos.id_empresa, datos.id_gerente, idUsu]
      );
      const despues = (await cliente.query(CONSULTA_COLABORADOR, [idUsu])).rows[0];

      // 5. Historial: una fila por cada dato que cambió
      const cambios = CAMPOS_HISTORIAL.filter((campo) => (antes[campo] ?? null) !== (despues[campo] ?? null));
      for (const campo of cambios) {
        await cliente.query(
          `INSERT INTO cambios_colaboradores (id_usu, campo, valor_anterior, valor_nuevo, cambiado_por)
           VALUES ($1, $2, $3, $4, $5)`,
          [idUsu, campo, antes[campo], despues[campo], req.usuario.id_usu]
        );
      }

      // 6. Permisos de Talento y Cultura según el departamento nuevo
      const eraTyC = antes.departamento === DEPARTAMENTO_TYC;
      const esTyC = despues.departamento === DEPARTAMENTO_TYC;
      if (!eraTyC && esTyC) {
        await cliente.query(
          `INSERT INTO usuario_permisos (id_usu, id_per)
           SELECT $1, id_per FROM permisos WHERE nombre = ANY($2::text[])
           ON CONFLICT (id_usu, id_per) DO NOTHING`,
          [idUsu, PERMISOS_TYC]
        );
      } else if (eraTyC && !esTyC) {
        await cliente.query(
          `DELETE FROM usuario_permisos
           WHERE id_usu = $1 AND id_per IN (SELECT id_per FROM permisos WHERE nombre = ANY($2::text[]))`,
          [idUsu, PERMISOS_TYC]
        );
      }

      return { colaborador: despues, cambios: cambios.length };
    });

    if (!resultado) return res.status(404).json({ error: 'Colaborador no encontrado' });

    res.json({
      message: resultado.cambios ? 'Datos actualizados' : 'No hubo cambios',
      colaborador: resultado.colaborador,
      historial: await obtenerHistorial(idUsu)
    });
  } catch (error) {
    if (error instanceof ErrorValidacion) return res.status(400).json({ error: error.message });
    // Error 23505: correo repetido (por si dos lo cambian al mismo tiempo)
    if (error.code === '23505') return res.status(400).json({ error: 'El correo ya es de otro colaborador' });
    // Error 23503: el departamento, la sucursal, la empresa o el gerente no existe
    if (error.code === '23503') return res.status(400).json({ error: 'El departamento, la sucursal, la empresa o el gerente no existe' });
    // Error 22001: algún texto es más largo de lo que acepta la columna
    if (error.code === '22001') return res.status(400).json({ error: 'Alguno de los campos excede la longitud permitida' });
    console.error('Error al actualizar colaborador:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── Desactivar o reactivar ────────────────────────────────────────────
// Al desactivar también se borran sus suscripciones push, para que deje de recibir
// notificaciones aunque tenga la app instalada. Al reactivar las vuelve a encender él.
router.put('/:id/estado', async (req, res) => {
  const idUsu = idValido(req.params.id);
  const activo = req.body?.activo;
  if (!idUsu) return res.status(400).json({ error: 'Colaborador no válido' });
  if (typeof activo !== 'boolean') return res.status(400).json({ error: 'activo debe ser verdadero o falso' });
  if (idUsu === req.usuario.id_usu) return res.status(400).json({ error: 'No puedes desactivar tu propia cuenta' });

  try {
    const resultado = await db.transaccion(async (cliente) => {
      const actual = await cliente.query('SELECT activo FROM usuarios WHERE id_usu = $1 FOR UPDATE', [idUsu]);
      if (actual.rows.length === 0) return null;
      if (actual.rows[0].activo === activo) return 'sin-cambio';

      await cliente.query(
        `UPDATE usuarios
         SET activo = $1,
             fecha_desactivacion = CASE WHEN $1 THEN NULL ELSE NOW() END,
             desactivado_por = CASE WHEN $1 THEN NULL ELSE $2::int END
         WHERE id_usu = $3`,
        [activo, req.usuario.id_usu, idUsu]
      );
      await cliente.query(
        `INSERT INTO cambios_colaboradores (id_usu, campo, valor_anterior, valor_nuevo, cambiado_por)
         VALUES ($1, 'activo', $2, $3, $4)`,
        [idUsu, activo ? 'Desactivado' : 'Activo', activo ? 'Activo' : 'Desactivado', req.usuario.id_usu]
      );
      if (!activo) await cliente.query('DELETE FROM suscripciones_push WHERE id_usu = $1', [idUsu]);
      return 'cambiado';
    });

    if (!resultado) return res.status(404).json({ error: 'Colaborador no encontrado' });

    const colaborador = (await db.query(CONSULTA_COLABORADOR, [idUsu])).rows[0];
    res.json({
      message: resultado === 'sin-cambio'
        ? 'No hubo cambios'
        : (activo ? 'Colaborador reactivado' : 'Colaborador desactivado'),
      colaborador,
      historial: await obtenerHistorial(idUsu)
    });
  } catch (error) {
    console.error('Error al cambiar el estado del colaborador:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
