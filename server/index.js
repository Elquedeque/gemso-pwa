const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Ruta de prueba
app.get('/api/health', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW()');
    res.json({ status: 'ok', serverTime: result.rows[0].now });
  } catch (error) {
    console.error('Error al consultar la BD:', error);
    res.status(500).json({ status: 'error', message: 'Error de conexión a la BD' });
  }
});

// Endpoint de Inicio de Sesión
app.post('/api/login', async (req, res) => {
  const { correo, contraseña } = req.body;

  if (!correo || !contraseña) {
    return res.status(400).json({ error: 'Debes proporcionar correo y contraseña' });
  }

  try {
    const query = `
      SELECT u.id_usu, u.nombre_completo, u.correo, u.puesto, d.nombre AS departamento
      FROM usuarios u
      LEFT JOIN departamentos d ON u.id_departamento = d.id_dep
      WHERE u.correo = $1 AND u.contraseña = $2
    `;
    
    const result = await db.query(query, [correo, contraseña]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const usuario = result.rows[0];
    res.json({
      message: 'Inicio de sesión exitoso',
      usuario
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint de Registro de Usuarios
app.post('/api/usuarios', async (req, res) => {
  const { 
    nombre_completo, 
    correo, 
    contraseña, 
    puesto, 
    id_departamento, 
    fecha_nacimiento, 
    fecha_ingreso 
  } = req.body;

  // Validación básica de campos requeridos
  if (!nombre_completo || !correo || !contraseña || !puesto || !id_departamento || !fecha_nacimiento || !fecha_ingreso) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  try {
    // 1. Verificar si el correo ya existe
    const checkEmail = await db.query('SELECT id_usu FROM usuarios WHERE correo = $1', [correo]);
    if (checkEmail.rows.length > 0) {
      return res.status(400).json({ message: 'El correo electrónico ya está registrado.' });
    }

    // 2. Insertar en la base de datos PostgreSQL
    const query = `
      INSERT INTO usuarios (
        nombre_completo, 
        correo, 
        contraseña, 
        puesto, 
        id_departamento, 
        fecha_nacimiento, 
        fecha_ingreso
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id_usu, nombre_completo, correo;
    `;

    const values = [
      nombre_completo, 
      correo, 
      contraseña, 
      puesto, 
      id_departamento, 
      fecha_nacimiento, 
      fecha_ingreso
    ];

    const result = await db.query(query, values);

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      usuario: result.rows[0]
    });
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor al intentar registrar.' });
  }
});

// Endpoint para obtener la lista de departamentos
app.get('/api/departamentos', async (req, res) => {
  try {
    const result = await db.query('SELECT id_dep, nombre FROM departamentos ORDER BY nombre ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener departamentos:', error);
    res.status(500).json({ error: 'Error al consultar la base de datos' });
  }
});

// Regla de visibilidad de anuncios (usada por la lista y el detalle):
//   avisos generales (sin departamento ni usuario destino)
//   + avisos dirigidos al departamento del usuario ($2)
//   + avisos dirigidos personalmente al usuario ($1)
const FILTRO_VISIBLES = `
  ((a.id_dep_destino IS NULL AND a.id_usu_destino IS NULL)
   OR a.id_dep_destino = $2
   OR a.id_usu_destino = $1)
`;

// Endpoint para obtener los anuncios visibles para un usuario
app.get('/api/anuncios', async (req, res) => {
  const idUsu = Number(req.query.id_usu);

  if (!Number.isInteger(idUsu) || idUsu <= 0) {
    return res.status(400).json({ error: 'Debes indicar un id_usu válido' });
  }

  // ?limite=N opcional (1 a 50); sin él se devuelven todos
  let limite = null;
  if (req.query.limite !== undefined) {
    limite = Number(req.query.limite);
    if (!Number.isInteger(limite) || limite < 1 || limite > 50) {
      return res.status(400).json({ error: 'El límite debe ser un número entre 1 y 50' });
    }
  }

  try {
    const usuario = await db.query('SELECT id_departamento FROM usuarios WHERE id_usu = $1', [idUsu]);
    if (usuario.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const query = `
      SELECT
        a.id_anu,
        a.titulo,
        a.contenido,
        a.categoria,
        a.urgente,
        a.fecha_creacion,
        a.id_dep_destino,
        a.id_usu_destino,
        u.nombre_completo AS autor,
        d.nombre AS departamento_destino,
        EXISTS (SELECT 1 FROM anuncios_adj j WHERE j.id_anu = a.id_anu) AS tiene_adjunto,
        EXISTS (SELECT 1 FROM anuncios_leidos l WHERE l.id_anu = a.id_anu AND l.id_usu = $1) AS leido
      FROM anuncios a
      INNER JOIN usuarios u ON a.id_autor = u.id_usu
      LEFT JOIN departamentos d ON a.id_dep_destino = d.id_dep
      WHERE ${FILTRO_VISIBLES}
      ORDER BY a.fecha_creacion DESC
      LIMIT $3;
    `;
    // LIMIT NULL en PostgreSQL equivale a "sin límite"
    const result = await db.query(query, [idUsu, usuario.rows[0].id_departamento, limite]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener anuncios:', error);
    res.status(500).json({ error: 'Error al consultar la base de datos' });
  }
});

// Endpoint para obtener el detalle de un anuncio (con sus adjuntos)
// Solo lo devuelve si es visible para el usuario; si no, responde 404
app.get('/api/anuncios/:id', async (req, res) => {
  const idAnu = Number(req.params.id);
  const idUsu = Number(req.query.id_usu);

  if (!Number.isInteger(idAnu) || idAnu <= 0 || !Number.isInteger(idUsu) || idUsu <= 0) {
    return res.status(400).json({ error: 'Anuncio o usuario inválido' });
  }

  try {
    const usuario = await db.query('SELECT id_departamento FROM usuarios WHERE id_usu = $1', [idUsu]);
    if (usuario.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const query = `
      SELECT
        a.id_anu,
        a.titulo,
        a.contenido,
        a.categoria,
        a.urgente,
        a.fecha_creacion,
        a.id_dep_destino,
        a.id_usu_destino,
        u.nombre_completo AS autor,
        d.nombre AS departamento_destino,
        EXISTS (SELECT 1 FROM anuncios_leidos l WHERE l.id_anu = a.id_anu AND l.id_usu = $1) AS leido
      FROM anuncios a
      INNER JOIN usuarios u ON a.id_autor = u.id_usu
      LEFT JOIN departamentos d ON a.id_dep_destino = d.id_dep
      WHERE a.id_anu = $3 AND ${FILTRO_VISIBLES};
    `;
    const result = await db.query(query, [idUsu, usuario.rows[0].id_departamento, idAnu]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Aviso no encontrado' });
    }

    const adjuntos = await db.query(
      `SELECT id_anu_adj, nombre_archivo, tipo_archivo, url_archivo
       FROM anuncios_adj
       WHERE id_anu = $1
       ORDER BY id_anu_adj`,
      [idAnu]
    );

    res.json({ ...result.rows[0], adjuntos: adjuntos.rows });
  } catch (error) {
    console.error('Error al obtener detalle del anuncio:', error);
    res.status(500).json({ error: 'Error al consultar la base de datos' });
  }
});

// Endpoint para publicar un anuncio
app.post('/api/anuncios', async (req, res) => {
  const { titulo, contenido, categoria, urgente, id_autor, id_dep_destino } = req.body;

  // Validación básica de campos requeridos
  if (!titulo?.trim() || !contenido?.trim() || !categoria?.trim() || !id_autor) {
    return res.status(400).json({ error: 'Título, contenido, categoría y autor son obligatorios' });
  }

  try {
    const query = `
      INSERT INTO anuncios (titulo, contenido, categoria, urgente, id_autor, id_dep_destino)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id_anu, titulo, contenido, categoria, urgente, id_autor, id_dep_destino, fecha_creacion;
    `;
    const values = [
      titulo.trim(),
      contenido.trim(),
      categoria.trim(),
      urgente === true,
      id_autor,
      id_dep_destino || null // null = visible para todos los departamentos
    ];

    const result = await db.query(query, values);

    res.status(201).json({
      message: 'Anuncio publicado exitosamente',
      anuncio: result.rows[0]
    });
  } catch (error) {
    // 23503: el autor o el departamento no existen
    if (error.code === '23503') {
      return res.status(400).json({ error: 'El autor o el departamento indicado no existe' });
    }
    // 22001: texto más largo de lo permitido por la columna
    if (error.code === '22001') {
      return res.status(400).json({ error: 'Alguno de los campos excede la longitud permitida' });
    }
    console.error('Error al publicar anuncio:', error);
    res.status(500).json({ error: 'Error interno del servidor al publicar el anuncio' });
  }
});

// Endpoint para confirmar la lectura de un anuncio
app.post('/api/anuncios/:id/leido', async (req, res) => {
  const idAnu = Number(req.params.id);
  const idUsu = Number(req.body.id_usu);

  if (!Number.isInteger(idAnu) || idAnu <= 0 || !Number.isInteger(idUsu) || idUsu <= 0) {
    return res.status(400).json({ error: 'Anuncio o usuario inválido' });
  }

  try {
    // ON CONFLICT: si ya estaba confirmado, no se duplica (uq_usuario_anuncio)
    await db.query(
      `INSERT INTO anuncios_leidos (id_usu, id_anu)
       VALUES ($1, $2)
       ON CONFLICT (id_usu, id_anu) DO NOTHING`,
      [idUsu, idAnu]
    );
    res.json({ message: 'Lectura confirmada', id_anu: idAnu, leido: true });
  } catch (error) {
    if (error.code === '23503') {
      return res.status(404).json({ error: 'El anuncio o el usuario no existe' });
    }
    console.error('Error al confirmar lectura:', error);
    res.status(500).json({ error: 'Error interno del servidor al confirmar la lectura' });
  }
});

// Agregamos '0.0.0.0' para que escuche a cualquier dispositivo de tu red
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor Express listo para recibir conexiones en el puerto ${PORT}`);
});
