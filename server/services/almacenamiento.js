// Almacenamiento de archivos (imagen y adjuntos de los avisos, migración 016)
//
// Todo lo que toca archivos pasa por aquí. Hoy guarda en una carpeta del disco
// (ALMACENAMIENTO_RUTA en el .env), que por indicación del jefe es una carpeta
// sincronizada con el OneDrive de la cuenta @gemso.com.mx: OneDrive la sube sola a la nube.
// Si mañana se usa SharePoint u otro servicio, solo cambia este archivo.
//
// Reglas:
//   - En la BD se guarda una "clave" relativa ("avisos/12/<uuid>.png"), nunca la ruta completa.
//   - El nombre en disco es aleatorio: el nombre original (que escribe el usuario) solo va en la BD,
//     así nadie puede salirse de la carpeta con nombres como "../../archivo".
//   - El tipo se revisa por extensión y por la "firma" de los primeros bytes del archivo,
//     para que no se pueda subir, por ejemplo, un .exe renombrado a .pdf.
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

// Carpeta base. Sin ALMACENAMIENTO_RUTA se usa server/archivos (no se sube a GitHub)
const BASE = path.resolve(process.env.ALMACENAMIENTO_RUTA || path.join(__dirname, '..', 'archivos'));
if (!process.env.ALMACENAMIENTO_RUTA) {
  console.warn(`Falta ALMACENAMIENTO_RUTA en server/.env; los archivos se guardan en ${BASE}`);
}

// Tipos aceptados: tipo para el navegador y cómo reconocer el archivo por sus primeros bytes
const empiezaCon = (buf, ...bytes) => bytes.every((b, i) => buf[i] === b);
const ZIP = (buf) => empiezaCon(buf, 0x50, 0x4b, 0x03, 0x04); // docx, xlsx y pptx son ZIP por dentro
const TIPOS = {
  jpg: { mime: 'image/jpeg', firma: (b) => empiezaCon(b, 0xff, 0xd8, 0xff) },
  jpeg: { mime: 'image/jpeg', firma: (b) => empiezaCon(b, 0xff, 0xd8, 0xff) },
  png: { mime: 'image/png', firma: (b) => empiezaCon(b, 0x89, 0x50, 0x4e, 0x47) },
  webp: { mime: 'image/webp', firma: (b) => b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP' },
  pdf: { mime: 'application/pdf', firma: (b) => b.toString('ascii', 0, 4) === '%PDF' },
  docx: { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', firma: ZIP },
  xlsx: { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', firma: ZIP },
  pptx: { mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', firma: ZIP }
};

const MB = 1024 * 1024;
const REGLAS = {
  imagen: { extensiones: ['jpg', 'jpeg', 'png', 'webp'], maxBytes: 5 * MB },
  adjunto: { extensiones: ['pdf', 'docx', 'xlsx', 'pptx', 'jpg', 'jpeg', 'png'], maxBytes: 10 * MB }
};

// Error con mensaje para mostrar al usuario (la ruta responde 400)
class ErrorArchivo extends Error {}

const extensionDe = (nombre) => path.extname(nombre || '').slice(1).toLowerCase();

// Revisar un archivo antes de guardarlo. Regresa su extensión o lanza ErrorArchivo.
const validar = (buffer, nombre, tipo) => {
  const regla = REGLAS[tipo];
  const ext = extensionDe(nombre);
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw new ErrorArchivo('El archivo está vacío');
  if (buffer.length > regla.maxBytes) {
    throw new ErrorArchivo(`El archivo pesa más de ${regla.maxBytes / MB} MB`);
  }
  if (!regla.extensiones.includes(ext)) {
    throw new ErrorArchivo(`Tipo de archivo no permitido. Se aceptan: ${regla.extensiones.join(', ')}`);
  }
  if (!TIPOS[ext].firma(buffer)) {
    throw new ErrorArchivo('El contenido del archivo no corresponde a su extensión');
  }
  return ext;
};

// Ruta completa de una clave, comprobando que quede dentro de la carpeta base
const rutaDe = (clave) => {
  const ruta = path.resolve(BASE, clave);
  if (ruta !== BASE && !ruta.startsWith(BASE + path.sep)) throw new Error('Clave de archivo inválida');
  return ruta;
};

// Guardar y regresar la clave. "carpeta" es relativa, por ejemplo "avisos/12"
const guardar = async (buffer, carpeta, ext) => {
  const clave = path.posix.join(carpeta, `${crypto.randomUUID()}.${ext}`);
  const ruta = rutaDe(clave);
  await fs.mkdir(path.dirname(ruta), { recursive: true });
  await fs.writeFile(ruta, buffer);
  return clave;
};

// Borrar sin fallar si ya no existe (por ejemplo, al reemplazar la imagen)
const borrar = async (clave) => {
  if (!clave) return;
  await fs.unlink(rutaDe(clave)).catch(() => {});
};

// ¿El archivo está en el disco? (OneDrive podría no haberlo descargado si se quitó
// "Mantener siempre en este dispositivo")
const existe = async (clave) => fs.access(rutaDe(clave)).then(() => true, () => false);

const mimeDe = (clave) => TIPOS[extensionDe(clave)]?.mime || 'application/octet-stream';

module.exports = { BASE, REGLAS, ErrorArchivo, validar, guardar, borrar, existe, rutaDe, mimeDe };
