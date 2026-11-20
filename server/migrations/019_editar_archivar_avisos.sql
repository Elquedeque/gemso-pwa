-- Migración 019: editar y archivar avisos
--   - anuncios.fecha_edicion / editado_por: última vez que Talento y Cultura corrigió el aviso.
--     El detalle muestra "Editado el …". Las confirmaciones de lectura se conservan.
--   - anuncios.fecha_archivado / archivado_por: el aviso archivado deja de verse en la lista,
--     el carrusel, la campana y el detalle de los colaboradores, pero se conservan sus
--     confirmaciones, vistas, imagen y adjuntos. TyC lo sigue viendo en Estadísticas y lo
--     puede restaurar. No se borra nada de la BD ni de la carpeta de archivos.
--
-- Decisiones del usuario (sesión 15): archivar en lugar de borrar definitivo, conservar las
-- confirmaciones al editar con la marca "Editado", no cambiar el destino y que lo haga todo
-- el equipo con permiso publicar_avisos.
-- Se puede ejecutar varias veces sin efectos adicionales.
--
-- Ejecutar con:  psql -U postgres -d gemso_db -f server/migrations/019_editar_archivar_avisos.sql

BEGIN;

-- 1. Edición. Vacías = nunca se ha editado.
--    ON DELETE SET NULL: si se borra a quien editó, el aviso se conserva
ALTER TABLE anuncios ADD COLUMN IF NOT EXISTS fecha_edicion TIMESTAMP;
ALTER TABLE anuncios ADD COLUMN IF NOT EXISTS editado_por INTEGER
  REFERENCES usuarios (id_usu) ON DELETE SET NULL;

-- 2. Archivo. Vacías = el aviso está vigente.
ALTER TABLE anuncios ADD COLUMN IF NOT EXISTS fecha_archivado TIMESTAMP;
ALTER TABLE anuncios ADD COLUMN IF NOT EXISTS archivado_por INTEGER
  REFERENCES usuarios (id_usu) ON DELETE SET NULL;

-- 3. Casi todas las consultas piden solo los vigentes, del más nuevo al más viejo.
--    El índice parcial solo guarda esos avisos.
CREATE INDEX IF NOT EXISTS ix_anuncios_vigentes ON anuncios (fecha_creacion DESC)
  WHERE fecha_archivado IS NULL;

COMMIT;
