import { apiFetch } from './client'

export const ticketsApi = {
  mine: () => apiFetch('/tickets/'),
  get: (id) => apiFetch(`/tickets/${id}/`),
  acquire: (eventId) => apiFetch('/tickets/', { method: 'POST', body: { event: eventId } }),
  // vista pública que abre quien escanea el QR (sin sesión)
  public: (code) => apiFetch(`/tickets/public/${code}/`, { auth: false }),
}
