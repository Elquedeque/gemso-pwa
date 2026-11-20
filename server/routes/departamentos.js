// Rutas de Departamentos
//   GET    /api/departamentos           Catálogo público (lo usan el registro y la pantalla de Invitaciones)
//   GET    /api/departamentos/gestion   Lista con cuántos colaboradores, invitaciones y avisos tiene cada uno
//   POST   /api/departamentos           Crear: { "nombre": "Refacciones", "solo_por_invitacion": false }
//   PUT    /api/departamentos/:id       Renombrar o cambiar si es solo por invitación (mismo cuerpo)
//   DELETE /api/departamentos/:id       Borrar, solo si nadie lo usa
//
// Reglas:
//   - Crear, editar y borrar piden el permiso gestionar_colaboradores (en la beta, Talento y Cultura):
//     es quien acomoda a los colaboradores en sus departamentos.
//   - El nombre es único sin importar mayúsculas (migración 018).
//   - Talento y Cultura no se puede renombrar, abrir al registro ni borrar: el código lo reconoce
//     por su nombre para dar sus permisos (services/permisos.js) y solo se entra con invitación.
//   - Un departamento con colaboradores (activos o desactivados), invitaciones o avisos no se borra,
//     para no perder a quién pertenecían. Primero hay que mover a esas personas.
//   - solo_por_invitacion: el registro abierto no lo muestra (migración 012).
const express = require('express');
const db = require('../config/db');
const autenticar = require('../middleware/autenticar');
const requierePermiso = require('../middleware/requierePermiso');
const { PERMISO_GESTIONAR_COLABORADORES, DEPARTAMENTO_TYC } = require('../services/permisos');
const { limpiarTexto, idValido } = require('../services/validaciones');

const router = express.Router();
const soloTyC = [autenticar, requierePermiso(PERMISO_GESTIONAR_COLABORADORES)];

const NOMBRE_MIN = 2;
const NOMBRE_MAX = 60;

// Códigos de error de PostgreSQL
const PG_DUPLICADO = '23505';     // choca con el índice único (migración 018)
const PG_EN_USO = '23503';        // otra tabla todavía apunta a este departamento

// Quitar espacios sobrantes, también los repetidos en medio: "  Ventas   Usados " → "Ventas Usados"
const normalizarNombre = (valor) => limpiarTexto(valor).replace(/\s+/g, ' ');

// Revisar el cuerpo de POST y PUT. Regresa { datos } o { error }.
const leerDepartamento = (body = {}) => {
  const nombre = normalizarNombre(body.nombre);
  if (nombre.length < NOMBRE_MIN || nombre.length > NOMBRE_MAX) {
    return { error: `El nombre debe tener entre ${NOMBRE_MIN} y ${NOMBRE_MAX} caracteres` };
  }
  if (typeof body.solo_por_invitacion !== 'boolean') {
    return { error: 'Indica si el departamento es solo por invitación' };
  }
  return { datos: { nombre, soloPorInvitacion: body.solo_por_invitacion } };
};

// ¿Ya existe otro departamento con ese nombre? (sin contar al que se está editando)
const nombreOcupado = async (nombre, idExcluir = null) =>
  (await db.query(
    'SELECT 1 FROM departamentos WHERE LOWER(nombre) = LOWER($1) AND ($2::int IS NULL OR id_dep <> $2)',
    [nombre, idExcluir]
  )).rows.length > 0;

const MENSAJE_DUPLICADO = 'Ya existe un departamento con ese nombre';

// ['a', 'b', 'c'] → "a, b y c"
const unirConY = (partes) =>
  partes.length > 1 ? `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}` : partes.join('');

// ── Catálogo público ──────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT id_dep, nombre, solo_por_invitacion FROM departamentos ORDER BY nombre ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener departamentos:', error);
    res.status(500).json({ error: 'Error al consultar la base de datos' });
  }
});

// ── Lista para administrar ────────────────────────────────────────────
// Los conteos le dicen a TyC qué se puede borrar y a cuántas personas afecta un cambio.
// Invitaciones: solo las pendientes (sin usar, sin cancelar y sin vencer).
router.get('/gestion', soloTyC, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT d.id_dep, d.nombre, d.solo_por_invitacion,
              (d.nombre = $1) AS protegido,
              (SELECT COUNT(*) FROM usuarios u WHERE u.id_departamento = d.id_dep AND u.activo)::int AS activos,
              (SELECT COUNT(*) FROM usuarios u WHERE u.id_departamento = d.id_dep AND NOT u.activo)::int AS desactivados,
              (SELECT COUNT(*) FROM invitaciones i WHERE i.id_departamento = d.id_dep)::int AS invitaciones,
              (SELECT COUNT(*) FROM invitaciones i
                WHERE i.id_departamento = d.id_dep AND i.fecha_uso IS NULL
                  AND i.fecha_cancelada IS NULL AND i.fecha_expira > CURRENT_TIMESTAMP)::int AS invitaciones_pendientes,
              (SELECT COUNT(*) FROM anuncios a WHERE a.id_dep_destino = d.id_dep)::int AS avisos
       FROM departamentos d
       ORDER BY d.nombre`,
      [DEPARTAMENTO_TYC]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener departamentos para administrar:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── Crear ─────────────────────────────────────────────────────────────
router.post('/', soloTyC, async (req, res) => {
  const { datos, error } = leerDepartamento(req.body);
  if (error) return res.status(400).json({ error });

  try {
    if (await nombreOcupado(datos.nombre)) return res.status(409).json({ error: MENSAJE_DUPLICADO });

    const result = await db.query(
      `INSERT INTO departamentos (nombre, solo_por_invitacion)
       VALUES ($1, $2)
       RETURNING id_dep, nombre, solo_por_invitacion`,
      [datos.nombre, datos.soloPorInvitacion]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === PG_DUPLICADO) return res.status(409).json({ error: MENSAJE_DUPLICADO });
    console.error('Error al crear departamento:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── Editar ────────────────────────────────────────────────────────────
// Renombrar no mueve a nadie: los colaboradores, invitaciones y avisos guardan el id,
// así que siguen en el mismo departamento con el nombre nuevo.
router.put('/:id', soloTyC, async (req, res) => {
  const idDep = idValido(req.params.id);
  if (!idDep) return res.status(400).json({ error: 'Departamento no válido' });

  const { datos, error } = leerDepartamento(req.body);
  if (error) return res.status(400).json({ error });

  try {
    const actual = await db.query('SELECT nombre FROM departamentos WHERE id_dep = $1', [idDep]);
    if (actual.rows.length === 0) return res.status(404).json({ error: 'Departamento no encontrado' });

    if (actual.rows[0].nombre === DEPARTAMENTO_TYC) {
      return res.status(400).json({
        error: 'Talento y Cultura no se puede renombrar ni abrir al registro: la app lo usa para dar sus permisos'
      });
    }
    if (await nombreOcupado(datos.nombre, idDep)) return res.status(409).json({ error: MENSAJE_DUPLICADO });

    const result = await db.query(
      `UPDATE departamentos SET nombre = $1, solo_por_invitacion = $2
       WHERE id_dep = $3
       RETURNING id_dep, nombre, solo_por_invitacion`,
      [datos.nombre, datos.soloPorInvitacion, idDep]
    );
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === PG_DUPLICADO) return res.status(409).json({ error: MENSAJE_DUPLICADO });
    console.error('Error al editar departamento:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── Borrar ────────────────────────────────────────────────────────────
// Se explica qué lo detiene. Si algo se agrega entre la revisión y el DELETE,
// la llave foránea de la BD lo impide igual (PG_EN_USO).
router.delete('/:id', soloTyC, async (req, res) => {
  const idDep = idValido(req.params.id);
  if (!idDep) return res.status(400).json({ error: 'Departamento no válido' });

  try {
    const result = await db.query(
      `SELECT d.nombre,
              (SELECT COUNT(*) FROM usuarios u WHERE u.id_departamento = d.id_dep)::int AS colaboradores,
              (SELECT COUNT(*) FROM invitaciones i WHERE i.id_departamento = d.id_dep)::int AS invitaciones,
              (SELECT COUNT(*) FROM anuncios a WHERE a.id_dep_destino = d.id_dep)::int AS avisos
       FROM departamentos d WHERE d.id_dep = $1`,
      [idDep]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Departamento no encontrado' });

    const dep = result.rows[0];
    if (dep.nombre === DEPARTAMENTO_TYC) {
      return res.status(400).json({ error: 'Talento y Cultura no se puede borrar' });
    }

    const motivos = [];
    if (dep.colaboradores) motivos.push(`${dep.colaboradores} ${dep.colaboradores === 1 ? 'colaborador' : 'colaboradores'}`);
    if (dep.invitaciones) motivos.push(`${dep.invitaciones} ${dep.invitaciones === 1 ? 'invitación' : 'invitaciones'}`);
    if (dep.avisos) motivos.push(`${dep.avisos} ${dep.avisos === 1 ? 'aviso' : 'avisos'}`);
    if (motivos.length) {
      return res.status(409).json({
        error: `No se puede borrar: tiene ${unirConY(motivos)}. Puedes renombrarlo o mover primero a sus colaboradores.`
      });
    }

    await db.query('DELETE FROM departamentos WHERE id_dep = $1', [idDep]);
    res.json({ message: 'Departamento borrado' });
  } catch (err) {
    if (err.code === PG_EN_USO) {
      return res.status(409).json({ error: 'No se puede borrar: el departamento todavía está en uso' });
    }
    console.error('Error al borrar departamento:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
