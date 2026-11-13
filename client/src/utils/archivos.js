// Subir y mostrar archivos de los avisos (server/routes/anuncios.js, migración 016)
// Las imágenes y adjuntos piden sesión, así que no se pueden poner directo en <img src> o
// en un enlace: se piden con apiFetch (que manda el token) y se muestran como "blob URL".
import { apiFetch } from '../api';

// Mismos límites que el servidor (services/almacenamiento.js), para avisar antes de subir
const MB = 1024 * 1024;
export const REGLAS_ARCHIVOS = {
  imagen: { extensiones: ['jpg', 'jpeg', 'png', 'webp'], maxBytes: 5 * MB, accept: '.jpg,.jpeg,.png,.webp' },
  adjunto: { extensiones: ['pdf', 'docx', 'xlsx', 'pptx', 'jpg', 'jpeg', 'png'], maxBytes: 10 * MB, accept: '.pdf,.docx,.xlsx,.pptx,.jpg,.jpeg,.png' }
};
export const MAX_ADJUNTOS = 5;

export const extensionDe = (nombre) => (nombre.split('.').pop() || '').toLowerCase();

// Revisión rápida en el navegador; regresa el mensaje de error o '' si está bien
export const revisarArchivo = (archivo, tipo) => {
  const regla = REGLAS_ARCHIVOS[tipo];
  if (!regla.extensiones.includes(extensionDe(archivo.name))) {
    return `"${archivo.name}": se aceptan ${regla.extensiones.join(', ')}`;
  }
  if (archivo.size > regla.maxBytes) return `"${archivo.name}" pesa más de ${regla.maxBytes / MB} MB`;
  return '';
};

// "245 KB" o "1.2 MB"
export const formatearTamano = (bytes) => {
  if (!bytes && bytes !== 0) return '';
  if (bytes < MB) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / MB).toFixed(1)} MB`;
};

// Subir un archivo: el cuerpo es el archivo y el nombre va en un encabezado
export const subirArchivo = async (ruta, archivo) => {
  const res = await apiFetch(ruta, {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream', 'X-Nombre-Archivo': encodeURIComponent(archivo.name) },
    body: archivo
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `No se pudo subir "${archivo.name}"`);
  return data;
};

// Pedir un archivo con sesión y regresar una URL local para <img> o para abrirlo.
// Quien la pide debe liberarla con URL.revokeObjectURL cuando ya no la use.
export const urlDeArchivo = async (ruta) => {
  const res = await apiFetch(ruta);
  if (!res.ok) throw new Error('No se pudo cargar el archivo');
  return URL.createObjectURL(await res.blob());
};

// Descargar con el nombre original
export const descargarArchivo = async (ruta, nombre) => {
  const url = await urlDeArchivo(ruta);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
};

// Abrir en una pestaña nueva (PDF e imágenes los muestra el navegador)
export const abrirArchivo = async (ruta) => {
  const url = await urlDeArchivo(ruta);
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
};
