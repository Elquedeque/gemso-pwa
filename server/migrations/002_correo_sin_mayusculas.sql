-- Migración 002: correos sin distinguir mayúsculas/minúsculas
-- Normaliza los correos existentes y evita cuentas duplicadas como
-- "Juan@gemso.com.mx" y "juan@gemso.com.mx".
-- Se puede ejecutar varias veces sin efectos adicionales.
--
-- Ejecutar con:  psql -U postgres -d gemso_db -f server/migrations/002_correo_sin_mayusculas.sql

BEGIN;

-- 1. Guardar todos los correos en minúsculas y sin espacios
UPDATE usuarios
SET correo = LOWER(TRIM(correo))
WHERE correo <> LOWER(TRIM(correo));

-- 2. Unicidad sin importar mayúsculas (también acelera el login por LOWER(correo))
CREATE UNIQUE INDEX IF NOT EXISTS usuarios_correo_lower_key ON usuarios (LOWER(correo));

COMMIT;
