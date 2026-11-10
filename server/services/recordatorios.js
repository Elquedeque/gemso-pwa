// Recordatorios para Talento y Cultura
// Los reciben los usuarios con el permiso 'recibir_recordatorios' (migración 011):
//
//   Qué                         Canal    Cuándo
//   Cumpleaños y aniversarios   push     el mismo día, desde las 8:00
//   Avisos bajo la meta         push     cuando un aviso lleva 3 días publicado y va bajo la meta (una vez por aviso)
//   Cumpleaños y aniversarios   correo   resumen semanal, el lunes (lo de lunes a domingo)
//   Estadísticas de avisos      correo   resumen mensual, el día 1 (lo del mes anterior)
//
// Cada envío se registra en recordatorios_enviados ANTES de mandarlo ("reclamar").
// Así, aunque la revisión corra varias veces (cada hora o al encender el servidor),
// nadie recibe lo mismo dos veces. Si el envío falla, se borra el registro y se
// vuelve a intentar en la siguiente revisión.
//
// Privacidad: de los cumpleaños solo se muestra el día, nunca el año ni la edad.
const db = require('../config/db');
const { enviarASuscripciones } = require('./notificaciones');
const { enviarCorreo, escaparHtml, correoHabilitado } = require('./correo');
const { CONSULTA_RESUMEN, CONSULTA_DEPARTAMENTOS, leerMeta } = require('./estadisticas');
const { PERMISO_RECIBIR_RECORDATORIOS } = require('./permisos');
const F = require('./fechas');

// Horario en que se mandan recordatorios (hora de Hermosillo)
const HORA_INICIO = 8;
const HORA_FIN = 20;
// Un aviso cuenta como "bajo la meta" si lleva al menos 3 días publicado
// y se revisan solo los de los últimos 30 días
const DIAS_PARA_ALERTA = 3;
const DIAS_REVISION = 30;

// ── Consultas ────────────────────────────────────────────────

// El día y mes de una fecha coinciden con el día revisado.
// Quien nació (o entró) un 29 de febrero se recuerda el 28 en años no bisiestos:
// un año no es bisiesto si el día antes del 1 de marzo es el 28.
const coincideDia = (columna) => `(
  TO_CHAR(${columna}, 'MM-DD') = TO_CHAR(dias.dia, 'MM-DD')
  OR (TO_CHAR(${columna}, 'MM-DD') = '02-29'
      AND TO_CHAR(dias.dia, 'MM-DD') = '02-28'
      AND EXTRACT(DAY FROM make_date(EXTRACT(YEAR FROM dias.dia)::int, 3, 1) - 1) = 28)
)`;

// Cumpleaños y aniversarios laborales entre dos fechas (las dos incluidas).
// generate_series arma la lista de días, así funciona aunque la semana cruce de año.
// El aniversario cuenta desde el primer año cumplido.
const CONSULTA_FECHAS = `
  WITH dias AS (
    SELECT d::date AS dia FROM generate_series($1::date, $2::date, INTERVAL '1 day') AS d
  ),
  eventos AS (
    SELECT dias.dia, u.id_usu, 'cumpleanos' AS tipo, NULL::int AS anios
    FROM dias
    JOIN usuarios u ON ${coincideDia('u.fecha_nacimiento')}
    UNION ALL
    SELECT dias.dia, u.id_usu, 'aniversario' AS tipo,
           (EXTRACT(YEAR FROM dias.dia) - EXTRACT(YEAR FROM u.fecha_ingreso))::int AS anios
    FROM dias
    JOIN usuarios u ON ${coincideDia('u.fecha_ingreso')}
    WHERE EXTRACT(YEAR FROM dias.dia) > EXTRACT(YEAR FROM u.fecha_ingreso)
  )
  SELECT TO_CHAR(e.dia, 'YYYY-MM-DD') AS dia, e.tipo, e.anios,
         u.id_usu, u.nombre_completo, d.nombre AS departamento
  FROM eventos e
  JOIN usuarios u ON u.id_usu = e.id_usu
  LEFT JOIN departamentos d ON d.id_dep = u.id_departamento
  ORDER BY e.dia, e.tipo DESC, u.nombre_completo
`;

const fechasImportantes = async (desde, hasta) => (await db.query(CONSULTA_FECHAS, [desde, hasta])).rows;

// Quiénes reciben recordatorios
const obtenerDestinatarios = async () => {
  const { rows } = await db.query(
    `SELECT u.id_usu, u.nombre_completo, u.correo, u.recibir_correos
     FROM usuarios u
     JOIN usuario_permisos up ON up.id_usu = u.id_usu
     JOIN permisos p ON p.id_per = up.id_per
     WHERE p.nombre = $1
     ORDER BY u.id_usu`,
    [PERMISO_RECIBIR_RECORDATORIOS]
  );
  return rows;
};

const suscripcionesDe = async (idUsu) =>
  (await db.query('SELECT id_sus, endpoint, p256dh, auth FROM suscripciones_push WHERE id_usu = $1', [idUsu])).rows;

// Registrar el envío antes de hacerlo. Regresa false si ya estaba registrado (ya se mandó).
const reclamar = async (tipo, periodo, canal, idUsu) => {
  const { rowCount } = await db.query(
    `INSERT INTO recordatorios_enviados (tipo, periodo, canal, id_usu)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (tipo, periodo, id_usu) DO NOTHING`,
    [tipo, periodo, canal, idUsu]
  );
  return rowCount === 1;
};

// Si el envío falló, se borra el registro para reintentar en la siguiente revisión
const liberar = (tipo, periodo, idUsu) =>
  db.query('DELETE FROM recordatorios_enviados WHERE tipo = $1 AND periodo = $2 AND id_usu = $3', [tipo, periodo, idUsu]);

// ── Textos ───────────────────────────────────────────────────

// Aniversarios que se resaltan: el primero y cada 5 años
const esAniversarioEspecial = (anios) => anios === 1 || anios % 5 === 0;

const textoAnios = (anios) => `${anios} ${anios === 1 ? 'año' : 'años'} en GEMSO`;

// Una línea por celebración, para push y para la versión de texto del correo
const describir = (e) => {
  if (e.tipo === 'cumpleanos') return `🎂 Cumpleaños de ${e.nombre_completo}`;
  const icono = esAniversarioEspecial(e.anios) ? '🎉' : '🏅';
  return `${icono} ${e.nombre_completo}: ${textoAnios(e.anios)}`;
};

const porcentaje = (parte, total) => (total > 0 ? Math.round((parte * 100) / total) : 0);
const vaBajoMeta = (confirmados, total, meta) => total > 0 && confirmados * 100 < meta * total;

// ── Push: cumpleaños y aniversarios del día ──────────────────

const mensajeDelDia = (eventos, hoy) => {
  if (eventos.length === 1) {
    const [e] = eventos;
    let titulo;
    if (e.tipo === 'cumpleanos') titulo = `🎂 Hoy cumple años ${e.nombre_completo}`;
    else if (esAniversarioEspecial(e.anios)) titulo = `🎉 Aniversario especial: ${e.nombre_completo}`;
    else titulo = `🏅 Aniversario de ${e.nombre_completo}`;
    const cuerpo = e.tipo === 'cumpleanos'
      ? `${e.departamento || 'Sin departamento'}. ¡No olvides felicitarle!`
      : `Cumple ${textoAnios(e.anios)} (${e.departamento || 'sin departamento'}).`;
    return { titulo, cuerpo, url: '/', etiqueta: `fechas-${hoy}` };
  }
  return {
    titulo: `Hoy hay ${eventos.length} celebraciones en GEMSO`,
    cuerpo: eventos.map(describir).join('\n'),
    url: '/',
    etiqueta: `fechas-${hoy}`
  };
};

const pushDelDia = async (hoy, destinatarios) => {
  const eventos = await fechasImportantes(hoy, hoy);
  if (eventos.length === 0) return 0;

  let enviados = 0;
  for (const dest of destinatarios) {
    // A nadie se le recuerda su propio cumpleaños o aniversario
    const suyos = eventos.filter((e) => e.id_usu !== dest.id_usu);
    if (suyos.length === 0) continue;

    // Sin dispositivos no se registra nada: si activa push más tarde, le llega en la siguiente revisión
    const suscripciones = await suscripcionesDe(dest.id_usu);
    if (suscripciones.length === 0) continue;
    if (!(await reclamar('push_diario', hoy, 'push', dest.id_usu))) continue;

    const resultado = await enviarASuscripciones(suscripciones, mensajeDelDia(suyos, hoy));
    if (resultado.enviados === 0) await liberar('push_diario', hoy, dest.id_usu);
    else enviados++;
  }
  return enviados;
};

// ── Push: avisos bajo la meta ────────────────────────────────

const mensajeBajoMeta = (avisos, meta, hoy) => {
  if (avisos.length === 1) {
    const [a] = avisos;
    const dias = F.diasEntre(F.fechaLocal(a.fecha_creacion), hoy);
    return {
      titulo: 'Aviso bajo la meta de confirmación',
      cuerpo: `"${a.titulo}" lleva ${dias} días publicado y solo ${porcentaje(a.confirmados, a.destinatarios)}% lo ha confirmado (meta: ${meta}%).`,
      url: `/estadisticas/${a.id_anu}`,
      etiqueta: `bajo-meta-${hoy}`
    };
  }
  return {
    titulo: `${avisos.length} avisos van bajo la meta de confirmación`,
    cuerpo: avisos.map((a) => `• ${a.titulo} (${porcentaje(a.confirmados, a.destinatarios)}%)`).join('\n'),
    url: '/estadisticas',
    etiqueta: `bajo-meta-${hoy}`
  };
};

const avisosBajoMeta = async (hoy, destinatarios) => {
  const { meta } = await leerMeta();
  // Publicados en los últimos 30 días y hace 3 días o más ($5 es "antes de", sin incluirla)
  const desde = F.sumarDias(hoy, -DIAS_REVISION);
  const hasta = F.sumarDias(hoy, -(DIAS_PARA_ALERTA - 1));
  const { rows } = await db.query(CONSULTA_RESUMEN, [null, desde, null, null, hasta]);
  const bajos = rows.filter((a) => vaBajoMeta(a.confirmados, a.destinatarios, meta));
  if (bajos.length === 0) return 0;

  let enviados = 0;
  for (const dest of destinatarios) {
    const suscripciones = await suscripcionesDe(dest.id_usu);
    if (suscripciones.length === 0) continue;

    // Solo los avisos de los que todavía no se le ha avisado (una vez por aviso)
    const nuevos = [];
    for (const a of bajos) {
      if (await reclamar('aviso_bajo_meta', `aviso-${a.id_anu}`, 'push', dest.id_usu)) nuevos.push(a);
    }
    if (nuevos.length === 0) continue;

    const resultado = await enviarASuscripciones(suscripciones, mensajeBajoMeta(nuevos, meta, hoy));
    if (resultado.enviados === 0) {
      for (const a of nuevos) await liberar('aviso_bajo_meta', `aviso-${a.id_anu}`, dest.id_usu);
    } else {
      enviados++;
    }
  }
  return enviados;
};

// ── Correos ──────────────────────────────────────────────────

// Mandar un correo a cada destinatario que acepta correos.
// "armar(dest)" regresa { asunto, titulo, contenidoHtml, texto } o null si no hay nada que mandarle.
const enviarCorreos = async (tipo, periodo, destinatarios, armar) => {
  if (!correoHabilitado) return 0;

  let enviados = 0;
  for (const dest of destinatarios) {
    if (!dest.recibir_correos || !dest.correo) continue;
    const correo = armar(dest);
    if (!correo) continue;
    if (!(await reclamar(tipo, periodo, 'correo', dest.id_usu))) continue;

    try {
      await enviarCorreo({ para: dest.correo, ...correo });
      enviados++;
    } catch (error) {
      await liberar(tipo, periodo, dest.id_usu);
      console.error(`Error al enviar ${tipo} a ${dest.correo}:`, error.message);
    }
  }
  return enviados;
};

const ESTILO_TABLA = 'width:100%;border-collapse:collapse;font-size:14px;margin:12px 0;';
const ESTILO_TH = 'text-align:left;padding:8px;border-bottom:2px solid #e2e8f0;color:#475569;';
const ESTILO_TD = 'padding:8px;border-bottom:1px solid #e2e8f0;vertical-align:top;';

// Semanal: cumpleaños y aniversarios de lunes a domingo
const correoSemanal = async (hoy, destinatarios) => {
  const lunes = F.lunesDeLaSemana(hoy);
  const domingo = F.sumarDias(lunes, 6);
  const eventos = await fechasImportantes(lunes, domingo);
  if (eventos.length === 0) return 0; // semana sin celebraciones: no se manda correo

  const rango = `del ${F.formatearCorto(lunes)} al ${F.formatearCorto(domingo)}`;

  return enviarCorreos('correo_semanal', lunes, destinatarios, (dest) => {
    const suyos = eventos.filter((e) => e.id_usu !== dest.id_usu);
    if (suyos.length === 0) return null;

    const filas = suyos.map((e) => {
      const especial = e.tipo === 'aniversario' && esAniversarioEspecial(e.anios);
      const motivo = e.tipo === 'cumpleanos'
        ? '🎂 Cumpleaños'
        : `${especial ? '🎉' : '🏅'} ${textoAnios(e.anios)}${especial ? ' <strong>(aniversario especial)</strong>' : ''}`;
      const fondo = especial ? 'background:#fef9c3;' : '';
      return `<tr style="${fondo}">
        <td style="${ESTILO_TD}">${escaparHtml(F.formatearDia(e.dia))}</td>
        <td style="${ESTILO_TD}"><strong>${escaparHtml(e.nombre_completo)}</strong><br>
          <span style="color:#64748b;">${escaparHtml(e.departamento || 'Sin departamento')}</span></td>
        <td style="${ESTILO_TD}">${motivo}</td>
      </tr>`;
    }).join('');

    return {
      asunto: `Cumpleaños y aniversarios de la semana (${rango})`,
      titulo: 'Celebraciones de la semana',
      contenidoHtml: `
        <p>Hola, ${escaparHtml(dest.nombre_completo)}:</p>
        <p>Estas son las celebraciones de la semana ${escaparHtml(rango)}:</p>
        <table role="presentation" style="${ESTILO_TABLA}">
          <tr><th style="${ESTILO_TH}">Día</th><th style="${ESTILO_TH}">Colaborador</th><th style="${ESTILO_TH}">Motivo</th></tr>
          ${filas}
        </table>`,
      texto: [
        `Hola, ${dest.nombre_completo}:`,
        `Estas son las celebraciones de la semana ${rango}:`,
        ...suyos.map((e) => `- ${F.formatearDia(e.dia)}: ${describir(e)} (${e.departamento || 'Sin departamento'})`)
      ].join('\n')
    };
  });
};

// Mensual: estadísticas de los avisos publicados el mes anterior
const correoMensual = async (hoy, destinatarios) => {
  const desde = F.primerDiaDelMesAnterior(hoy);
  const hasta = F.primerDiaDelMes(hoy);
  const filtros = [null, desde, null, null, hasta];

  const [{ meta }, avisos, departamentos] = await Promise.all([
    leerMeta(),
    db.query(CONSULTA_RESUMEN, filtros).then((r) => r.rows),
    db.query(CONSULTA_DEPARTAMENTOS, filtros).then((r) => r.rows)
  ]);

  const mes = F.formatearMes(desde);
  const envios = departamentos.reduce((suma, d) => suma + d.envios, 0);
  const confirmados = departamentos.reduce((suma, d) => suma + d.confirmados, 0);
  const avisosBajos = avisos.filter((a) => vaBajoMeta(a.confirmados, a.destinatarios, meta));
  const depsBajos = departamentos.filter((d) => vaBajoMeta(d.confirmados, d.envios, meta));

  let resumenHtml;
  let resumenTexto;
  if (avisos.length === 0) {
    resumenTexto = `En ${mes} no se publicaron avisos.`;
    resumenHtml = `<p>${escaparHtml(resumenTexto)}</p>`;
  } else {
    resumenTexto = `En ${mes} se publicaron ${avisos.length} ${avisos.length === 1 ? 'aviso' : 'avisos'}. ` +
      `Se confirmó el ${porcentaje(confirmados, envios)}% de las lecturas; la meta es ${meta}%.`;

    const filasDeps = departamentos.map((d) => {
      const bajo = vaBajoMeta(d.confirmados, d.envios, meta);
      const estado = bajo
        ? '<span style="color:#b91c1c;font-weight:bold;">Bajo la meta</span>'
        : '<span style="color:#15803d;">En meta</span>';
      return `<tr>
        <td style="${ESTILO_TD}">${escaparHtml(d.departamento)}</td>
        <td style="${ESTILO_TD}">${porcentaje(d.vistos, d.envios)}%</td>
        <td style="${ESTILO_TD}"><strong>${porcentaje(d.confirmados, d.envios)}%</strong></td>
        <td style="${ESTILO_TD}">${estado}</td>
      </tr>`;
    }).join('');

    const listaAvisos = avisosBajos.length === 0
      ? '<p>Todos los avisos del mes alcanzaron la meta. 👏</p>'
      : `<p><strong>Avisos bajo la meta:</strong></p><ul>${avisosBajos
        .map((a) => `<li>${escaparHtml(a.titulo)} — ${porcentaje(a.confirmados, a.destinatarios)}% confirmado</li>`)
        .join('')}</ul>`;

    resumenHtml = `
      <p>${escaparHtml(resumenTexto)}</p>
      <table role="presentation" style="${ESTILO_TABLA}">
        <tr><th style="${ESTILO_TH}">Departamento</th><th style="${ESTILO_TH}">Abierto</th>
            <th style="${ESTILO_TH}">Confirmado</th><th style="${ESTILO_TH}">Estado</th></tr>
        ${filasDeps}
      </table>
      ${listaAvisos}
      <p style="color:#64748b;font-size:13px;">El detalle por persona está en la sección Estadísticas de la app.</p>`;

    resumenTexto += depsBajos.length > 0
      ? `\nDepartamentos bajo la meta: ${depsBajos.map((d) => d.departamento).join(', ')}.`
      : '\nTodos los departamentos están en meta.';
    if (avisosBajos.length > 0) {
      resumenTexto += `\nAvisos bajo la meta:\n${avisosBajos.map((a) => `- ${a.titulo} (${porcentaje(a.confirmados, a.destinatarios)}%)`).join('\n')}`;
    }
  }

  return enviarCorreos('correo_mensual', hoy.slice(0, 7), destinatarios, (dest) => ({
    asunto: `Estadísticas de avisos de ${mes}`,
    titulo: `Estadísticas de avisos: ${mes}`,
    contenidoHtml: `<p>Hola, ${escaparHtml(dest.nombre_completo)}:</p>${resumenHtml}`,
    texto: `Hola, ${dest.nombre_completo}:\n${resumenTexto}`
  }));
};

// ── Revisión general ─────────────────────────────────────────

// Revisa y manda lo que toque. Se puede llamar muchas veces al día: lo ya enviado no se repite.
// "ahora" se puede cambiar para simular otra fecha (scripts/recordatorios.js).
// Regresa cuántos se enviaron de cada tipo, o null si está fuera del horario.
const ejecutarPendientes = async (ahora = new Date()) => {
  const hora = F.horaLocal(ahora);
  if (hora < HORA_INICIO || hora > HORA_FIN) return null;

  const hoy = F.fechaLocal(ahora);
  const destinatarios = await obtenerDestinatarios();
  const resultado = { fecha: hoy, push_diario: 0, avisos_bajo_meta: 0, correo_semanal: 0, correo_mensual: 0 };
  if (destinatarios.length === 0) return resultado;

  const tareas = { push_diario: pushDelDia, avisos_bajo_meta: avisosBajoMeta, correo_semanal: correoSemanal, correo_mensual: correoMensual };
  for (const [nombre, tarea] of Object.entries(tareas)) {
    // Si una falla, las demás siguen
    try {
      resultado[nombre] = await tarea(hoy, destinatarios);
    } catch (error) {
      console.error(`Error en el recordatorio ${nombre}:`, error.message);
      resultado[nombre] = 'error';
    }
  }
  return resultado;
};

module.exports = { ejecutarPendientes, fechasImportantes, esAniversarioEspecial, HORA_INICIO, HORA_FIN };
