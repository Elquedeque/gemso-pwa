-- Migración 009: suscripciones para notificaciones push
-- Cada fila es un dispositivo (navegador) de un usuario que aceptó recibir notificaciones.
-- El navegador entrega tres datos al suscribirse:
--   endpoint  URL única del servicio push (Google, Mozilla o Apple) para ese dispositivo
--   p256dh    llave pública del dispositivo, para cifrar el mensaje
--   auth      secreto del dispositivo, también para el cifrado
-- Se puede ejecutar varias veces sin efectos adicionales.
--
-- Ejecutar con:  psql -U postgres -d gemso_db -f server/migrations/009_suscripciones_push.sql

BEGIN;

CREATE TABLE IF NOT EXISTS suscripciones_push (
  id_sus SERIAL PRIMARY KEY,
  -- ON DELETE CASCADE: si se borra al usuario, se borran sus dispositivos
  id_usu INTEGER NOT NULL REFERENCES usuarios (id_usu) ON DELETE CASCADE,
  -- UNIQUE: un dispositivo pertenece a un solo usuario. Si en un equipo compartido
  -- entra otra persona y activa las notificaciones, el dispositivo pasa a ella.
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  -- Navegador y sistema, solo como referencia (por ejemplo para saber si es iPhone)
  user_agent TEXT,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Para buscar rápido los dispositivos de un usuario al enviar
CREATE INDEX IF NOT EXISTS idx_suscripciones_push_usu ON suscripciones_push (id_usu);

COMMIT;
