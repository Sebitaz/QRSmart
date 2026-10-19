import { apiFetch } from './client'

export const eventsApi = {
  list: () => apiFetch('/events/'),
  available: () => apiFetch('/events/available/'),
  get: (id) => apiFetch(`/events/${id}/`),
  create: (data) => apiFetch('/events/', { method: 'POST', body: data }),
}
