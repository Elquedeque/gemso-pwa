-- Migración 001: permiso para publicar avisos
-- Beta: solo el departamento de Talento y Cultura (TyC) puede publicar.
-- Se puede ejecutar varias veces sin duplicar datos.
--
-- Ejecutar con:  psql -U postgres -d gemso_db -f server/migrations/001_permiso_publicar_avisos.sql

BEGIN;

-- 1. Catálogo de permisos
INSERT INTO permisos (nombre, descripcion)
VALUES ('publicar_avisos', 'Permite crear y publicar avisos/comunicados')
ON CONFLICT (nombre) DO NOTHING;

-- 2. Asignar el permiso a todos los usuarios actuales de Talento y Cultura
INSERT INTO usuario_permisos (id_usu, id_per)
SELECT u.id_usu, p.id_per
FROM usuarios u
JOIN departamentos d ON d.id_dep = u.id_departamento
JOIN permisos p ON p.nombre = 'publicar_avisos'
WHERE d.nombre = 'Talento y Cultura'
ON CONFLICT (id_usu, id_per) DO NOTHING;

COMMIT;
