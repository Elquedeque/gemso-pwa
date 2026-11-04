-- Migración 007: unificar "Tecnologías de la Información" dentro de "TI"
-- Había dos departamentos para la misma área y en las estadísticas salían separados.
-- Los usuarios y avisos del duplicado pasan a "TI" y después se borra el duplicado.
-- Se puede ejecutar varias veces sin efectos adicionales.
--
-- Ejecutar con:  psql -U postgres -d gemso_db -f server/migrations/007_unificar_departamento_ti.sql

BEGIN;

-- 1. Si no existe "TI" pero sí el duplicado, solo se renombra
UPDATE departamentos
SET nombre = 'TI'
WHERE nombre = 'Tecnologías de la Información'
  AND NOT EXISTS (SELECT 1 FROM departamentos WHERE nombre = 'TI');

-- 2. Mover usuarios del duplicado a "TI"
UPDATE usuarios
SET id_departamento = (SELECT id_dep FROM departamentos WHERE nombre = 'TI')
WHERE id_departamento IN (SELECT id_dep FROM departamentos WHERE nombre = 'Tecnologías de la Información');

-- 3. Mover avisos dirigidos al duplicado a "TI"
UPDATE anuncios
SET id_dep_destino = (SELECT id_dep FROM departamentos WHERE nombre = 'TI')
WHERE id_dep_destino IN (SELECT id_dep FROM departamentos WHERE nombre = 'Tecnologías de la Información');

-- 4. Borrar el duplicado (ya no tiene nada que apunte a él)
DELETE FROM departamentos WHERE nombre = 'Tecnologías de la Información';

COMMIT;
