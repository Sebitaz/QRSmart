import { apiFetch } from './client'

export const ticketsApi = {
  mine: () => apiFetch('/tickets/'),
  get: (id) => apiFetch(`/tickets/${id}/`),
  acquire: (eventId) => apiFetch('/tickets/', { method: 'POST', body: { event: eventId } }),
  validate: (code) => apiFetch('/tickets/validate/', { method: 'POST', body: { code } }),
}
