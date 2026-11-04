-- Migración 006: estadísticas de avisos para Talento y Cultura
--   - tabla anuncios_vistos: guarda la primera vez que alguien abre un aviso
--     (la confirmación de lectura sigue en anuncios_leidos)
--   - las lecturas confirmadas que ya existían también cuentan como vistas
--   - permiso 'ver_estadisticas' asignado a los usuarios de Talento y Cultura
-- Se puede ejecutar varias veces sin duplicar datos.
--
-- Ejecutar con:  psql -U postgres -d gemso_db -f server/migrations/006_estadisticas_avisos.sql

BEGIN;

-- 1. Vistas de avisos (una sola fila por usuario y aviso)
CREATE TABLE IF NOT EXISTS anuncios_vistos (
  id_anu_vis SERIAL PRIMARY KEY,
  id_usu INTEGER NOT NULL REFERENCES usuarios (id_usu) ON DELETE CASCADE,
  id_anu INTEGER NOT NULL REFERENCES anuncios (id_anu) ON DELETE CASCADE,
  fecha_visto TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_vista_usuario_anuncio UNIQUE (id_usu, id_anu)
);

-- 2. Quien ya confirmó lectura, ya lo vio (se usa la fecha de la confirmación)
INSERT INTO anuncios_vistos (id_usu, id_anu, fecha_visto)
SELECT l.id_usu, l.id_anu, l.fecha_leido
FROM anuncios_leidos l
WHERE l.id_usu IS NOT NULL AND l.id_anu IS NOT NULL
ON CONFLICT (id_usu, id_anu) DO NOTHING;

-- 3. Catálogo de permisos
INSERT INTO permisos (nombre, descripcion)
VALUES ('ver_estadisticas', 'Permite ver quién ha visto y confirmado los avisos')
ON CONFLICT (nombre) DO NOTHING;

-- 4. Asignar el permiso a todos los usuarios actuales de Talento y Cultura
INSERT INTO usuario_permisos (id_usu, id_per)
SELECT u.id_usu, p.id_per
FROM usuarios u
JOIN departamentos d ON d.id_dep = u.id_departamento
JOIN permisos p ON p.nombre = 'ver_estadisticas'
WHERE d.nombre = 'Talento y Cultura'
ON CONFLICT (id_usu, id_per) DO NOTHING;

COMMIT;
