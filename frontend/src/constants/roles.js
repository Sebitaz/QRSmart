export const ROLES = Object.freeze({
  ORGANIZADOR: 'ORGANIZADOR',
  LOGISTICA: 'LOGISTICA',
  ASISTENTE: 'ASISTENTE',
})

export const ROLE_LABELS = {
  [ROLES.ORGANIZADOR]: 'Organizador',
  [ROLES.LOGISTICA]: 'Logística',
  [ROLES.ASISTENTE]: 'Asistente',
}

export const ROLE_HOME = {
  [ROLES.ORGANIZADOR]: '/organizador',
  [ROLES.LOGISTICA]: '/logistica',
  [ROLES.ASISTENTE]: '/asistente',
}

export const ROLE_NAV = {
  [ROLES.ORGANIZADOR]: [
    { to: '/organizador', label: 'Mis eventos' },
    { to: '/organizador/eventos/nuevo', label: 'Crear evento' },
  ],
  [ROLES.LOGISTICA]: [{ to: '/logistica', label: 'Escáner' }],
  [ROLES.ASISTENTE]: [{ to: '/asistente', label: 'Mis entradas' }],
}

export const homeForRole = (role) => ROLE_HOME[role] ?? '/login'
