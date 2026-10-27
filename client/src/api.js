// URL base del backend.
// En desarrollo se deja vacía: Vite reenvía /api al servidor Express (ver vite.config.js),
// así funciona igual desde la PC o desde un celular en la misma red.
// Para producción, define VITE_API_URL en client/.env (ej. https://api.gemso.com).
export const API_URL = import.meta.env.VITE_API_URL || '';
