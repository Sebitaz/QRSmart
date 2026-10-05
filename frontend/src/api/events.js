import { apiFetch } from './client'

export const eventsApi = {
  list: () => apiFetch('/events/'),
  get: (id) => apiFetch(`/events/${id}/`),
  create: (data) => apiFetch('/events/', { method: 'POST', body: data }),
}
