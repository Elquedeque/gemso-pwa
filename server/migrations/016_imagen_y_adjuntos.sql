-- Migración 016: imagen y adjuntos de los avisos
--   - anuncios.imagen: clave del archivo de la imagen del aviso en el almacenamiento
--   - anuncios_adj.tamano_bytes: tamaño del adjunto, para mostrarlo antes de descargar
--
-- Los archivos se guardan con services/almacenamiento.js en la carpeta ALMACENAMIENTO_RUTA
-- del .env (por ahora, una carpeta sincronizada con OneDrive). En la BD solo va la clave
-- relativa (por ejemplo "avisos/12/3f2c…e1.png"), nunca la ruta completa: así se puede
-- mover la carpeta a otro lugar cambiando solo el .env.
-- anuncios_adj.url_archivo (de la etapa 1) guarda esa misma clave.
-- Se puede ejecutar varias veces sin efectos adicionales.
--
-- Ejecutar con:  psql -U postgres -d gemso_db -f server/migrations/016_imagen_y_adjuntos.sql

BEGIN;

ALTER TABLE anuncios ADD COLUMN IF NOT EXISTS imagen TEXT;
ALTER TABLE anuncios_adj ADD COLUMN IF NOT EXISTS tamano_bytes INTEGER;

COMMIT;
