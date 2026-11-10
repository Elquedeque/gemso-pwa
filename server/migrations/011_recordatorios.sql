-- Migración 011: recordatorios para Talento y Cultura
--   - permiso 'recibir_recordatorios' asignado a los usuarios de Talento y Cultura
--   - usuarios.recibir_correos: preferencia del interruptor "Correos informativos" de Ajustes
--   - tabla recordatorios_enviados: qué se mandó, a quién y de qué periodo,
--     para no repetir un recordatorio si el servidor se reinicia
-- Se puede ejecutar varias veces sin efectos adicionales.
--
-- Ejecutar con:  psql -U postgres -d gemso_db -f server/migrations/011_recordatorios.sql

BEGIN;

-- 1. Catálogo de permisos
INSERT INTO permisos (nombre, descripcion)
VALUES ('recibir_recordatorios', 'Recibe recordatorios de cumpleaños, aniversarios y estadísticas de avisos')
ON CONFLICT (nombre) DO NOTHING;

-- 2. Asignarlo a todos los usuarios actuales de Talento y Cultura
INSERT INTO usuario_permisos (id_usu, id_per)
SELECT u.id_usu, p.id_per
FROM usuarios u
JOIN departamentos d ON d.id_dep = u.id_departamento
JOIN permisos p ON p.nombre = 'recibir_recordatorios'
WHERE d.nombre = 'Talento y Cultura'
ON CONFLICT (id_usu, id_per) DO NOTHING;

-- 3. Preferencia de correos (por defecto sí los recibe)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS recibir_correos BOOLEAN NOT NULL DEFAULT TRUE;

-- 4. Registro de envíos
--    tipo     qué recordatorio es
--    periodo  a qué fecha o aviso corresponde, por ejemplo:
--               push_diario      '2026-11-10'  (el día)
--               aviso_bajo_meta  'aviso-5'     (una sola vez por aviso)
--               correo_semanal   '2026-11-09'  (el lunes de esa semana)
--               correo_mensual   '2026-11'     (el mes en que se envía)
--    La llave única impide mandar dos veces lo mismo a la misma persona.
CREATE TABLE IF NOT EXISTS recordatorios_enviados (
  id_env SERIAL PRIMARY KEY,
  tipo VARCHAR(30) NOT NULL
    CHECK (tipo IN ('push_diario', 'aviso_bajo_meta', 'correo_semanal', 'correo_mensual')),
  periodo VARCHAR(30) NOT NULL,
  canal VARCHAR(10) NOT NULL CHECK (canal IN ('push', 'correo')),
  -- ON DELETE CASCADE: si se borra al usuario, se borra su historial de envíos
  id_usu INTEGER NOT NULL REFERENCES usuarios (id_usu) ON DELETE CASCADE,
  fecha_envio TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_recordatorio UNIQUE (tipo, periodo, id_usu)
);

COMMIT;
