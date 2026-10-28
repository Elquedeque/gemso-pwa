-- Migración 004: sucursal por defecto "GEMSO"
-- Mientras no se capture la sucursal real de cada usuario, se usa "GEMSO":
--   - se agrega al catálogo de sucursales
--   - se asigna a los usuarios que no tienen sucursal
--   - queda como valor por defecto para los usuarios nuevos
-- Requiere la migración 003. Se puede ejecutar varias veces sin efectos adicionales.
--
-- Ejecutar con:  psql -U postgres -d gemso_db -f server/migrations/004_sucursal_default.sql

BEGIN;

-- 1. Sucursal "GEMSO" en el catálogo
INSERT INTO sucursales (nombre)
VALUES ('GEMSO')
ON CONFLICT (nombre) DO NOTHING;

-- 2. Usuarios existentes sin sucursal
UPDATE usuarios
SET id_sucursal = (SELECT id_suc FROM sucursales WHERE nombre = 'GEMSO')
WHERE id_sucursal IS NULL;

-- 3. Valor por defecto para usuarios nuevos.
--    DEFAULT no acepta subconsultas, así que se arma con el id ya resuelto.
DO $$
DECLARE
  id_gemso INTEGER;
BEGIN
  SELECT id_suc INTO id_gemso FROM sucursales WHERE nombre = 'GEMSO';
  EXECUTE format('ALTER TABLE usuarios ALTER COLUMN id_sucursal SET DEFAULT %s', id_gemso);
END $$;

COMMIT;
