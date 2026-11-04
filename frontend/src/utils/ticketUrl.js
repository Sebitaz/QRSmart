/* global __PUBLIC_URL__ */
// en desarrollo vite.config.js inyecta la IP del PC en la red; si no hay, se usa el origen actual
const BASE_URL = (typeof __PUBLIC_URL__ === 'string' && __PUBLIC_URL__) || window.location.origin

// URL que va dentro del QR: al escanearla el celular abre la vista de la entrada
export const ticketPublicUrl = (code) => `${BASE_URL}/entrada/${code}`
