-- Migración 013: gestión de colaboradores por Talento y Cultura
--   - usuarios.activo: TyC puede desactivar a alguien (por ejemplo, si deja la empresa)
--   - permiso 'gestionar_colaboradores' asignado a los usuarios de Talento y Cultura
--   - tabla cambios_colaboradores: historial de quién cambió qué dato y cuándo
--
-- Desactivar en lugar de borrar conserva sus avisos, confirmaciones e historial.
-- Un usuario desactivado no puede iniciar sesión, su sesión abierta deja de servir,
-- no recibe notificaciones ni recordatorios y no cuenta en las estadísticas.
-- Se puede ejecutar varias veces sin efectos adicionales.
--
-- Ejecutar con:  psql -U postgres -d gemso_db -f server/migrations/013_gestion_colaboradores.sql

BEGIN;

-- 1. Estado de la cuenta
--    fecha_desactivacion y desactivado_por solo tienen valor mientras está desactivado
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS fecha_desactivacion TIMESTAMP;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS desactivado_por INTEGER
  REFERENCES usuarios (id_usu) ON DELETE SET NULL;

-- 2. Catálogo de permisos
INSERT INTO permisos (nombre, descripcion)
VALUES ('gestionar_colaboradores', 'Corrige los datos de los colaboradores y los desactiva o reactiva')
ON CONFLICT (nombre) DO NOTHING;

-- 3. Asignarlo a todos los usuarios actuales de Talento y Cultura
INSERT INTO usuario_permisos (id_usu, id_per)
SELECT u.id_usu, p.id_per
FROM usuarios u
JOIN departamentos d ON d.id_dep = u.id_departamento
JOIN permisos p ON p.nombre = 'gestionar_colaboradores'
WHERE d.nombre = 'Talento y Cultura'
ON CONFLICT (id_usu, id_per) DO NOTHING;

-- 4. Historial de cambios
--    Una fila por cada dato cambiado. Los valores se guardan como texto legible
--    (por ejemplo el nombre del departamento, no su id), para leer el historial
--    aunque después cambien los catálogos.
--    campo: nombre_completo, correo, telefono, puesto, fecha_nacimiento, fecha_ingreso,
--           departamento, sucursal, empresa, gerente o activo
CREATE TABLE IF NOT EXISTS cambios_colaboradores (
  id_cam SERIAL PRIMARY KEY,
  id_usu INTEGER NOT NULL REFERENCES usuarios (id_usu) ON DELETE CASCADE,
  campo VARCHAR(30) NOT NULL,
  valor_anterior TEXT,
  valor_nuevo TEXT,
  -- ON DELETE SET NULL: si se borra a quien hizo el cambio, el historial se conserva
  cambiado_por INTEGER REFERENCES usuarios (id_usu) ON DELETE SET NULL,
  fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_cambios_colaboradores_usuario ON cambios_colaboradores (id_usu, fecha DESC);

COMMIT;
