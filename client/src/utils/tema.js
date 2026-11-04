// Preferencias Visuales: modo oscuro, tamaño de letra y alto contraste
// Se guardan en localStorage y se aplican al <html>, donde style.css
// tiene los colores de cada tema (html.dark).
//   - main.js llama a aplicarPreferenciasGuardadas() al abrir la app.
//   - AccesibilidadView usa estas funciones para cambiarlas.
// index.html también pone el modo oscuro antes de cargar la app para que no
// se vea un flash del tema claro (usa la misma clave 'theme').

const CLAVES = {
  tema: 'theme',             // 'dark' | 'light'
  tamanoLetra: 'fontSize',   // 'normal' | 'grande' | 'muy-grande'
  altoContraste: 'highContrast' // 'true' | 'false'
};

const TAMANOS_LETRA = { normal: '100%', grande: '110%', 'muy-grande': '120%' };

// localStorage puede fallar (modo incógnito o almacenamiento bloqueado), eso no debe tronar la app
const leer = (clave) => {
  try {
    return localStorage.getItem(clave);
  } catch {
    return null;
  }
};

const guardar = (clave, valor) => {
  try {
    localStorage.setItem(clave, valor);
  } catch {
    // Sin almacenamiento el cambio sí se aplica, solo que no se recuerda
  }
};

// Leer las preferencias actuales (si no hay nada guardado, las de por defecto)
export const leerPreferencias = () => ({
  oscuro: leer(CLAVES.tema) === 'dark',
  tamanoLetra: TAMANOS_LETRA[leer(CLAVES.tamanoLetra)] ? leer(CLAVES.tamanoLetra) : 'normal',
  altoContraste: leer(CLAVES.altoContraste) === 'true'
});

// Cambiar el tema sin transiciones
// Si cada componente anima a su ritmo, por un momento se mezclan colores de los dos temas
// (texto claro sobre fondo todavía blanco). Por eso .sin-transiciones (style.css)
// las apaga solo mientras se hace el cambio.
export const aplicarModoOscuro = (oscuro) => {
  const html = document.documentElement;
  html.classList.add('sin-transiciones');
  html.classList.toggle('dark', oscuro);
  guardar(CLAVES.tema, oscuro ? 'dark' : 'light');
  // Esperar a que el navegador pinte los colores nuevos para volver a activarlas
  requestAnimationFrame(() => requestAnimationFrame(() => html.classList.remove('sin-transiciones')));
};

// Cambiar el tamaño de letra
export const aplicarTamanoLetra = (tamano) => {
  const valor = TAMANOS_LETRA[tamano] ? tamano : 'normal';
  document.documentElement.style.fontSize = TAMANOS_LETRA[valor];
  guardar(CLAVES.tamanoLetra, valor);
};

// Activar o desactivar el alto contraste
export const aplicarAltoContraste = (activo) => {
  document.documentElement.classList.toggle('high-contrast', activo);
  guardar(CLAVES.altoContraste, String(activo));
};

// Al abrir la app, aplicar lo que el usuario eligió la última vez
export const aplicarPreferenciasGuardadas = () => {
  const { oscuro, tamanoLetra, altoContraste } = leerPreferencias();
  document.documentElement.classList.toggle('dark', oscuro);
  document.documentElement.classList.toggle('high-contrast', altoContraste);
  document.documentElement.style.fontSize = TAMANOS_LETRA[tamanoLetra];
};
