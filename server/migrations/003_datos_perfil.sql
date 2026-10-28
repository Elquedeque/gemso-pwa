-- Migración 003: datos del perfil de usuario
-- Agrega lo que muestra PerfilView y no existía en la BD:
--   - teléfono de contacto del usuario
--   - catálogo de sucursales y la sucursal de cada usuario
--   - gerente (otro usuario) de cada usuario
-- Todas las columnas nuevas aceptan NULL para no romper a los usuarios existentes.
-- Se puede ejecutar varias veces sin efectos adicionales.
--
-- Ejecutar con:  psql -U postgres -d gemso_db -f server/migrations/003_datos_perfil.sql

BEGIN;

-- 1. Teléfono de contacto
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS telefono VARCHAR(20);

-- 2. Catálogo de sucursales
CREATE TABLE IF NOT EXISTS sucursales (
  id_suc SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE
);

-- 3. Sucursal del usuario
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS id_sucursal INTEGER
  REFERENCES sucursales (id_suc);

-- 4. Gerente del usuario (es otro registro de usuarios).
--    ON DELETE SET NULL: si se borra al gerente, sus subordinados quedan sin gerente.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS id_gerente INTEGER
  REFERENCES usuarios (id_usu) ON DELETE SET NULL;

-- Un usuario no puede ser su propio gerente
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'usuarios_gerente_distinto') THEN
    ALTER TABLE usuarios
      ADD CONSTRAINT usuarios_gerente_distinto CHECK (id_gerente IS NULL OR id_gerente <> id_usu);
  END IF;
END $$;

COMMIT;
