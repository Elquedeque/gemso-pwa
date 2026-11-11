-- Migración 012: departamentos que solo entran por invitación
--   - departamentos.solo_por_invitacion: no aparece en el registro abierto (Talento y Cultura)
--   - permiso 'invitar_colaboradores' asignado a los usuarios de Talento y Cultura
--   - tabla invitaciones: enlaces de un solo uso que TyC manda por correo
--
-- Antes, cualquiera podía registrarse y elegir el departamento "Talento y Cultura",
-- con lo que recibía los permisos de publicar avisos. Ahora el registro sigue abierto
-- para los demás departamentos, pero a TyC solo se entra con una invitación, donde
-- el correo y el departamento los decide TyC y la persona no los puede cambiar.
-- Se puede ejecutar varias veces sin efectos adicionales.
--
-- Ejecutar con:  psql -U postgres -d gemso_db -f server/migrations/012_invitaciones.sql

BEGIN;

-- 0. Departamentos cerrados al registro abierto
--    Se marca con una columna y no con el nombre en el código, para poder cerrar
--    otro departamento más adelante sin cambiar el servidor.
ALTER TABLE departamentos ADD COLUMN IF NOT EXISTS solo_por_invitacion BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE departamentos SET solo_por_invitacion = TRUE WHERE nombre = 'Talento y Cultura';

-- 1. Catálogo de permisos
INSERT INTO permisos (nombre, descripcion)
VALUES ('invitar_colaboradores', 'Envía invitaciones para registrarse en la app')
ON CONFLICT (nombre) DO NOTHING;

-- 2. Asignarlo a todos los usuarios actuales de Talento y Cultura
INSERT INTO usuario_permisos (id_usu, id_per)
SELECT u.id_usu, p.id_per
FROM usuarios u
JOIN departamentos d ON d.id_dep = u.id_departamento
JOIN permisos p ON p.nombre = 'invitar_colaboradores'
WHERE d.nombre = 'Talento y Cultura'
ON CONFLICT (id_usu, id_per) DO NOTHING;

-- 3. Invitaciones
--    token_hash       huella SHA-256 del enlace. El enlace completo solo viaja en el
--                     correo: si alguien leyera esta tabla, no podría usar las invitaciones
--                     (misma idea que guardar contraseñas cifradas)
--    fecha_expira     después de esta fecha el enlace ya no sirve (7 días)
--    fecha_uso        cuándo se registró la persona; si tiene valor, ya no se puede usar
--    fecha_cancelada  TyC la canceló, o mandó una nueva al mismo correo
--    Una invitación está "pendiente" si las tres fechas de cierre siguen vacías y no ha vencido.
CREATE TABLE IF NOT EXISTS invitaciones (
  id_inv SERIAL PRIMARY KEY,
  correo VARCHAR(150) NOT NULL,
  id_departamento INTEGER NOT NULL REFERENCES departamentos (id_dep),
  token_hash CHAR(64) NOT NULL UNIQUE,
  -- ON DELETE SET NULL: si se borra a quien invitó, la invitación se conserva
  creada_por INTEGER REFERENCES usuarios (id_usu) ON DELETE SET NULL,
  fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_expira TIMESTAMP NOT NULL,
  fecha_uso TIMESTAMP,
  fecha_cancelada TIMESTAMP,
  -- El correo se guarda igual que en usuarios (migración 002)
  CONSTRAINT ck_invitacion_correo CHECK (correo = LOWER(TRIM(correo)))
);

-- Para buscar rápido las invitaciones de un correo (al reenviar o cancelar)
CREATE INDEX IF NOT EXISTS ix_invitaciones_correo ON invitaciones (correo);

COMMIT;
