import { apiFetch } from './client'

export const ticketsApi = {
  mine: () => apiFetch('/tickets/'),
  get: (id) => apiFetch(`/tickets/${id}/`),
  acquire: (eventId) => apiFetch('/tickets/', { method: 'POST', body: { event: eventId } }),
}
