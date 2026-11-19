// Restablecer la contraseña con un enlace de un solo uso (tabla restablecimientos, migración 017)
// Mientras no haya correo real, Talento y Cultura genera el enlace desde la ficha del
// colaborador y se lo manda por otro medio (WhatsApp, Teams). TyC nunca ve ni escribe
// la contraseña: la persona la elige al abrir el enlace.
//
// Reglas:
//   - Solo sirve el enlace más reciente: al generar uno nuevo se cancelan los anteriores.
//   - Vence en HORAS_VIGENCIA horas y sirve una sola vez.
//   - No sirve si la cuenta está desactivada.
//   - Al usarlo se cierran todas las sesiones abiertas (usuarios.contrasena_cambiada).
const db = require('../config/db');
const { cifrar } = require('./contrasenas');
const { generarToken, huella, tokenValido, direccionApp } = require('./enlaces');

// 24 horas: el enlace pasa por otra persona (TyC) antes de llegar al colaborador,
// así que no conviene que sirva por días como una invitación.
const HORAS_VIGENCIA = 24;

// Condición de "todavía sirve"
const SQL_PENDIENTE = 'r.fecha_uso IS NULL AND r.fecha_cancelada IS NULL AND r.fecha_expira > NOW()';

const enlaceRestablecer = (token, origen) => `${direccionApp(origen)}/restablecer?token=${token}`;

// Crear un enlace para un colaborador. Cancela los pendientes que tuviera.
// Regresa { token, fecha_expira }. El token solo existe aquí: en la BD va su huella.
const crear = async ({ idUsu, creadoPor }) => {
  const token = generarToken();
  const result = await db.transaccion(async (cliente) => {
    await cliente.query(
      `UPDATE restablecimientos r SET fecha_cancelada = NOW()
       WHERE r.id_usu = $1 AND ${SQL_PENDIENTE}`,
      [idUsu]
    );
    const insertado = await cliente.query(
      `INSERT INTO restablecimientos (id_usu, token_hash, creado_por, fecha_expira)
       VALUES ($1, $2, $3, NOW() + make_interval(hours => $4))
       RETURNING fecha_expira`,
      [idUsu, huella(token), creadoPor, HORAS_VIGENCIA]
    );
    // Queda en el historial del colaborador, sin ningún dato de la contraseña
    await cliente.query(
      `INSERT INTO cambios_colaboradores (id_usu, campo, valor_anterior, valor_nuevo, cambiado_por)
       VALUES ($1, 'contraseña', NULL, 'Enlace para restablecer generado', $2)`,
      [idUsu, creadoPor]
    );
    return insertado.rows[0];
  });
  return { token, fecha_expira: result.fecha_expira };
};

// Buscar un enlace que todavía sirve, de una cuenta activa.
// Regresa { id_res, id_usu, correo, nombre_completo } o null.
const buscarPendiente = async (token) => {
  if (!tokenValido(token)) return null;
  const result = await db.query(
    `SELECT r.id_res, r.id_usu, u.correo, u.nombre_completo
     FROM restablecimientos r
     JOIN usuarios u ON u.id_usu = r.id_usu
     WHERE r.token_hash = $1 AND ${SQL_PENDIENTE} AND u.activo`,
    [huella(token)]
  );
  return result.rows[0] || null;
};

// Usar el enlace para poner la contraseña nueva (ya validada con validarNueva).
// Regresa true si se cambió, false si el enlace ya no sirve.
const usar = async ({ token, nueva }) => {
  if (!tokenValido(token)) return false;
  const hash = await cifrar(nueva); // fuera de la transacción: tarda ~100 ms

  return db.transaccion(async (cliente) => {
    // FOR UPDATE: si alguien abre el mismo enlace dos veces a la vez, solo uno lo usa
    const encontrado = await cliente.query(
      `SELECT r.id_res, r.id_usu
       FROM restablecimientos r
       JOIN usuarios u ON u.id_usu = r.id_usu
       WHERE r.token_hash = $1 AND ${SQL_PENDIENTE} AND u.activo
       FOR UPDATE OF r`,
      [huella(token)]
    );
    if (encontrado.rows.length === 0) return false;
    const { id_res: idRes, id_usu: idUsu } = encontrado.rows[0];

    await cliente.query(
      'UPDATE usuarios SET contraseña = $1, contrasena_cambiada = NOW() WHERE id_usu = $2',
      [hash, idUsu]
    );
    await cliente.query('UPDATE restablecimientos SET fecha_uso = NOW() WHERE id_res = $1', [idRes]);
    // Por si quedara otro pendiente (no debería, pero no cuesta nada)
    await cliente.query(
      `UPDATE restablecimientos r SET fecha_cancelada = NOW()
       WHERE r.id_usu = $1 AND ${SQL_PENDIENTE}`,
      [idUsu]
    );
    await cliente.query(
      `INSERT INTO cambios_colaboradores (id_usu, campo, valor_anterior, valor_nuevo, cambiado_por)
       VALUES ($1, 'contraseña', NULL, 'Restablecida con enlace', $1)`,
      [idUsu]
    );
    return true;
  });
};

module.exports = { HORAS_VIGENCIA, enlaceRestablecer, crear, buscarPendiente, usar };
