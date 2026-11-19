-- Migración 017: cambio y restablecimiento de contraseña
--   - usuarios.contrasena_cambiada: cuándo cambió la contraseña por última vez
--   - tabla restablecimientos: enlaces de un solo uso para poner una contraseña nueva
--
-- JWT no guarda las sesiones en el servidor, así que no se pueden "borrar". En su lugar,
-- middleware/autenticar.js rechaza los tokens emitidos antes de contrasena_cambiada:
-- al cambiar o restablecer la contraseña se cierran las sesiones de los otros dispositivos.
--
-- Mientras no haya correo real, Talento y Cultura genera el enlace desde la ficha del
-- colaborador (permiso gestionar_colaboradores) y se lo manda por otro medio.
-- TyC nunca ve ni escribe la contraseña: solo entrega el enlace.
-- Se puede ejecutar varias veces sin efectos adicionales.
--
-- Ejecutar con:  psql -U postgres -d gemso_db -f server/migrations/017_contrasenas.sql

BEGIN;

-- 1. Fecha del último cambio de contraseña
--    TIMESTAMPTZ (con zona horaria) porque se compara contra la hora del token,
--    que está en segundos desde 1970 en UTC. Vacía si nunca la ha cambiado.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS contrasena_cambiada TIMESTAMPTZ;

-- 2. Enlaces para restablecer la contraseña
--    token_hash       huella SHA-256 del enlace (igual que en invitaciones, migración 012):
--                     con la tabla en la mano no se puede armar un enlace válido
--    creado_por       quien lo generó (TyC). Vacío si algún día lo pide la persona por correo
--    fecha_expira     después de esta fecha el enlace ya no sirve
--    fecha_uso        cuándo se usó; si tiene valor, ya no sirve
--    fecha_cancelada  se generó otro enlace para la misma persona, o ya restableció con otro
CREATE TABLE IF NOT EXISTS restablecimientos (
  id_res SERIAL PRIMARY KEY,
  id_usu INTEGER NOT NULL REFERENCES usuarios (id_usu) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  creado_por INTEGER REFERENCES usuarios (id_usu) ON DELETE SET NULL,
  fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_expira TIMESTAMP NOT NULL,
  fecha_uso TIMESTAMP,
  fecha_cancelada TIMESTAMP
);

-- Para cancelar rápido los enlaces pendientes de una persona
CREATE INDEX IF NOT EXISTS ix_restablecimientos_usuario ON restablecimientos (id_usu);

COMMIT;
