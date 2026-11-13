-- Migración 015: campana de notificaciones
--   - usuarios.notificaciones_vistas_hasta: cuándo tocó "Marcar todas como leídas" por última vez
--
-- La campana muestra los avisos que la persona no ha abierto (no tienen fila en
-- anuncios_vistos). El contador rojo cuenta solo los que se publicaron después de
-- esta fecha. "Marcar todas como leídas" cambia esta fecha y no toca anuncios_vistos,
-- para que las estadísticas de Talento y Cultura no digan que abrió avisos que no abrió.
-- Si está vacía se usa la fecha de registro, así a alguien nuevo no le aparecen
-- como nuevos los avisos de antes de que entrara.
-- Se puede ejecutar varias veces sin efectos adicionales.
--
-- Ejecutar con:  psql -U postgres -d gemso_db -f server/migrations/015_campana_notificaciones.sql

BEGIN;

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS notificaciones_vistas_hasta TIMESTAMP;

COMMIT;
