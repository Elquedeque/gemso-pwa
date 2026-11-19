// Límite de intentos fallidos (por ejemplo, la contraseña actual al cambiarla)
// Se guarda en memoria: se pierde si el servidor se reinicia, lo cual está bien para
// la escala de GEMSO (un solo servidor). Así no hace falta instalar ningún paquete.
//
// Uso:
//   const limite = crearLimite({ maximo: 5, minutos: 15 });
//   if (limite.bloqueado(clave)) -> responder 429
//   limite.fallo(clave)   después de un intento incorrecto
//   limite.limpiar(clave) después de un intento correcto

const crearLimite = ({ maximo, minutos }) => {
  const ventanaMs = minutos * 60 * 1000;
  const intentos = new Map(); // clave -> { cuenta, desde }

  // Si ya pasó la ventana, el contador empieza de nuevo
  const leer = (clave) => {
    const registro = intentos.get(clave);
    if (registro && Date.now() - registro.desde > ventanaMs) {
      intentos.delete(clave);
      return null;
    }
    return registro;
  };

  return {
    bloqueado: (clave) => (leer(clave)?.cuenta ?? 0) >= maximo,
    fallo: (clave) => {
      const registro = leer(clave);
      if (registro) registro.cuenta += 1;
      else intentos.set(clave, { cuenta: 1, desde: Date.now() });
    },
    limpiar: (clave) => intentos.delete(clave),
    minutos
  };
};

module.exports = { crearLimite };
