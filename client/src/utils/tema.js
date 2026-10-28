// Preferencias visuales: modo oscuro, tamaño de letra y alto contraste.
// Se guardan en localStorage y se aplican sobre <html>, donde style.css
// define las variables de color de cada tema (html.dark).
//   - main.js llama a aplicarPreferenciasGuardadas() al arrancar la app.
//   - AccesibilidadView usa las funciones para cambiarlas.
// index.html también aplica el modo oscuro antes de cargar la app, para evitar
// un destello del tema claro (usa la misma clave 'theme').

const CLAVES = {
  tema: 'theme',             // 'dark' | 'light'
  tamanoLetra: 'fontSize',   // 'normal' | 'grande' | 'muy-grande'
  altoContraste: 'highContrast' // 'true' | 'false'
};

const TAMANOS_LETRA = { normal: '100%', grande: '110%', 'muy-grande': '120%' };

// localStorage puede fallar (modo privado, almacenamiento bloqueado): no debe romper la app
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
    // Sin almacenamiento: el cambio se aplica, solo que no se recuerda
  }
};

// Preferencias actuales (valores por defecto si no hay nada guardado)
export const leerPreferencias = () => ({
  oscuro: leer(CLAVES.tema) === 'dark',
  tamanoLetra: TAMANOS_LETRA[leer(CLAVES.tamanoLetra)] ? leer(CLAVES.tamanoLetra) : 'normal',
  altoContraste: leer(CLAVES.altoContraste) === 'true'
});

// Cambia de tema sin transiciones: si cada componente anima a su propio ritmo,
// por un instante se mezclan colores de ambos temas (ej. texto claro sobre fondo
// todavía blanco). La clase .sin-transiciones (style.css) las apaga solo durante el cambio.
export const aplicarModoOscuro = (oscuro) => {
  const html = document.documentElement;
  html.classList.add('sin-transiciones');
  html.classList.toggle('dark', oscuro);
  guardar(CLAVES.tema, oscuro ? 'dark' : 'light');
  // Se espera a que el navegador pinte los colores nuevos antes de reactivarlas
  requestAnimationFrame(() => requestAnimationFrame(() => html.classList.remove('sin-transiciones')));
};

export const aplicarTamanoLetra = (tamano) => {
  const valor = TAMANOS_LETRA[tamano] ? tamano : 'normal';
  document.documentElement.style.fontSize = TAMANOS_LETRA[valor];
  guardar(CLAVES.tamanoLetra, valor);
};

export const aplicarAltoContraste = (activo) => {
  document.documentElement.classList.toggle('high-contrast', activo);
  guardar(CLAVES.altoContraste, String(activo));
};

// Al arrancar: aplica lo que el usuario eligió la última vez
export const aplicarPreferenciasGuardadas = () => {
  const { oscuro, tamanoLetra, altoContraste } = leerPreferencias();
  document.documentElement.classList.toggle('dark', oscuro);
  document.documentElement.classList.toggle('high-contrast', altoContraste);
  document.documentElement.style.fontSize = TAMANOS_LETRA[tamanoLetra];
};
