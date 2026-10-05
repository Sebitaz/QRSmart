import { apiFetch } from './client'

export const authApi = {
  register: (data) => apiFetch('/auth/register/', { method: 'POST', body: data, auth: false }),
  login: (email, password) =>
    apiFetch('/auth/login/', { method: 'POST', body: { email, password }, auth: false }),
  logout: (refresh) => apiFetch('/auth/logout/', { method: 'POST', body: { refresh } }),
  me: () => apiFetch('/auth/me/'),
}
