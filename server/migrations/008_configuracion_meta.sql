-- Migración 008: configuración general de la app
-- Primer uso: la meta de confirmación de lectura de las estadísticas (en %).
-- Es una sola meta compartida por todo Talento y Cultura, y se guarda quién la cambió y cuándo.
-- Se puede ejecutar varias veces sin efectos adicionales.
--
-- Ejecutar con:  psql -U postgres -d gemso_db -f server/migrations/008_configuracion_meta.sql

BEGIN;

CREATE TABLE IF NOT EXISTS configuracion (
  clave VARCHAR(50) PRIMARY KEY,
  valor TEXT NOT NULL,
  -- ON DELETE SET NULL: si se borra al usuario, el valor se queda sin autor
  id_usu_actualizo INTEGER REFERENCES usuarios (id_usu) ON DELETE SET NULL,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Meta inicial: 80% de confirmación
INSERT INTO configuracion (clave, valor)
VALUES ('meta_confirmacion', '80')
ON CONFLICT (clave) DO NOTHING;

COMMIT;
