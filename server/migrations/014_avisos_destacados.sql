-- Migración 014: avisos destacados
--   - anuncios.destacado: el aviso aparece en el carrusel "Aviso Destacado" de la pantalla
--     de inicio y en el Modo TV, además de en la lista normal
--
-- El formulario de Crear Aviso ya ofrecía "Destacar en Carrusel" desde el prototipo,
-- pero no había dónde guardarlo. Los avisos que ya existen quedan sin destacar.
-- Se puede ejecutar varias veces sin efectos adicionales.
--
-- Ejecutar con:  psql -U postgres -d gemso_db -f server/migrations/014_avisos_destacados.sql

BEGIN;

ALTER TABLE anuncios ADD COLUMN IF NOT EXISTS destacado BOOLEAN NOT NULL DEFAULT FALSE;

-- El carrusel pide los destacados más recientes; el índice solo incluye los destacados,
-- que serán pocos comparados con todos los avisos
CREATE INDEX IF NOT EXISTS ix_anuncios_destacados ON anuncios (fecha_creacion DESC) WHERE destacado;

COMMIT;
