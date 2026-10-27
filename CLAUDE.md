# GEMSO PWA - Reglas del Proyecto

## Descripción
Aplicación Web Progresiva para la gestión de empleados y comunicación interna en GEMSO Autos de Hermosillo.

## Arquitectura y Stack
- **Frontend:** Vue 3 (Composition API), Vue Router, Vite.
- **Backend:** Node.js con Express.js.
- **Base de Datos:** PostgreSQL (Nombre de la base de datos local: `gemso_db`).

## Reglas para el Agente
1. Revisa las rutas existentes en Express y los componentes `.vue` antes de hacer modificaciones.
2. Mantén la consistencia de la conexión a `gemso_db` utilizando las variables definidas en el `.env`.
3. No instales ni modifiques paquetes en `package.json` sin avisar previamente en la consola.