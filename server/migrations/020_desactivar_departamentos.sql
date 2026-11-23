-- Migración 020: desactivar departamentos
--
-- Un departamento con colaboradores, invitaciones o avisos no se puede borrar (sesión 15),
-- así que si un área desaparece o se fusiona con otra no había forma de quitarla de las listas.
-- Desactivarlo la saca del registro, de Invitaciones, del destino de un aviso y de la lista
-- para mover colaboradores, sin perder su historial:
--   - Sus colaboradores se quedan en él y siguen viendo sus avisos.
--   - Sus avisos y estadísticas no cambian.
--   - Sus invitaciones pendientes se cancelan al desactivarlo (decisión del usuario).
--   - Se puede volver a activar.
-- Talento y Cultura no se puede desactivar (el servidor lo impide).
--
-- Como en los avisos archivados (migración 019), se guarda cuándo y quién en lugar de un
-- sí/no: activo = fecha_desactivado IS NULL.
-- Se puede ejecutar varias veces sin efectos adicionales.
--
-- Ejecutar con:  psql -U postgres -d gemso_db -f server/migrations/020_desactivar_departamentos.sql

BEGIN;

-- Vacías = el departamento está activo. Mismos tipos que fecha_archivado / archivado_por.
ALTER TABLE departamentos ADD COLUMN IF NOT EXISTS fecha_desactivado TIMESTAMP;
ALTER TABLE departamentos ADD COLUMN IF NOT EXISTS desactivado_por INTEGER
  REFERENCES usuarios (id_usu) ON DELETE SET NULL;

COMMIT;
