-- Migración 005: empresas del grupo GEMSO
-- GEMSO es el grupo corporativo; cada usuario pertenece a una de sus empresas
-- (por ahora solo "Autos de Hermosillo"). El grupo no se guarda: siempre es GEMSO.
--   - catálogo de empresas
--   - empresa de cada usuario (los existentes quedan en "Autos de Hermosillo")
--   - "Autos de Hermosillo" como valor por defecto para usuarios nuevos
-- Se puede ejecutar varias veces sin efectos adicionales.
--
-- Ejecutar con:  psql -U postgres -d gemso_db -f server/migrations/005_empresas.sql

BEGIN;

-- 1. Catálogo de empresas
CREATE TABLE IF NOT EXISTS empresas (
  id_emp SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE
);

INSERT INTO empresas (nombre)
VALUES ('Autos de Hermosillo')
ON CONFLICT (nombre) DO NOTHING;

-- 2. Empresa del usuario
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS id_empresa INTEGER
  REFERENCES empresas (id_emp);

-- 3. Usuarios existentes sin empresa
UPDATE usuarios
SET id_empresa = (SELECT id_emp FROM empresas WHERE nombre = 'Autos de Hermosillo')
WHERE id_empresa IS NULL;

-- 4. Valor por defecto para usuarios nuevos (DEFAULT no acepta subconsultas)
DO $$
DECLARE
  id_default INTEGER;
BEGIN
  SELECT id_emp INTO id_default FROM empresas WHERE nombre = 'Autos de Hermosillo';
  EXECUTE format('ALTER TABLE usuarios ALTER COLUMN id_empresa SET DEFAULT %s', id_default);
END $$;

COMMIT;
