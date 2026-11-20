-- Migración 018: nombres de departamento únicos
--
-- Desde esta versión Talento y Cultura crea y renombra departamentos desde la app
-- (routes/departamentos.js, permiso gestionar_colaboradores). Para que no existan
-- "Ventas" y "ventas" al mismo tiempo, el nombre debe ser único sin importar
-- mayúsculas o minúsculas. El servidor también lo revisa para dar un mensaje claro;
-- este índice es la última barrera si dos personas guardan al mismo tiempo.
--
-- Antes de aplicarla se revisó que no hubiera nombres repetidos (TI, Talento y Cultura, Ventas).
-- Se puede ejecutar varias veces sin efectos adicionales.
--
-- Ejecutar con:  psql -U postgres -d gemso_db -f server/migrations/018_departamentos_unicos.sql

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS ux_departamentos_nombre ON departamentos (LOWER(nombre));

COMMIT;
