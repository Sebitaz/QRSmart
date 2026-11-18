const API_URL = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '')
const TOKENS_KEY = 'qrsmart.tokens'

export const tokenStorage = {
  get() {
    try {
      return JSON.parse(localStorage.getItem(TOKENS_KEY)) ?? null
    } catch {
      return null
    }
  },
  set(tokens) {
    localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens))
  },
  clear() {
    localStorage.removeItem(TOKENS_KEY)
  },
}

export class ApiError extends Error {
  constructor(status, data) {
    super(extractMessage(data) ?? `Error ${status}`)
    this.status = status
    this.data = data ?? {}
  }

  get fieldErrors() {
    const errors = {}
    for (const [key, value] of Object.entries(this.data)) {
      if (key !== 'detail' && key !== 'non_field_errors') {
        errors[key] = Array.isArray(value) ? value.join(' ') : String(value)
      }
    }
    return errors
  }
}

function extractMessage(data) {
  if (!data || typeof data !== 'object') return null
  if (data.detail) return data.detail
  if (data.non_field_errors) return data.non_field_errors.join(' ')
  return null
}

// para no hacer varios refresh al mismo tiempo
let refreshPromise = null

async function refreshAccessToken() {
  const tokens = tokenStorage.get()
  if (!tokens?.refresh) throw new Error('Sin refresh token')

  refreshPromise ??= fetch(`${API_URL}/auth/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh: tokens.refresh }),
  })
    .then(async (response) => {
      if (!response.ok) throw new Error('Refresh inválido')
      const data = await response.json()
      tokenStorage.set({ access: data.access, refresh: data.refresh ?? tokens.refresh })
    })
    .finally(() => {
      refreshPromise = null
    })

  return refreshPromise
}

export async function apiFetch(path, { method = 'GET', body, auth = true, retry = true } = {}) {
  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const tokens = tokenStorage.get()
  if (auth && tokens?.access) headers.Authorization = `Bearer ${tokens.access}`

  let response
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0, { detail: 'No fue posible conectar con el servidor.' })
  }

  // si el token se vencio lo refrescamos y volvemos a intentar
  if (response.status === 401 && auth && retry && tokens?.refresh) {
    try {
      await refreshAccessToken()
      return apiFetch(path, { method, body, auth, retry: false })
    } catch {
      tokenStorage.clear()
      window.dispatchEvent(new Event('auth:expired'))
    }
  }

  const text = await response.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = { detail: `Error inesperado del servidor (${response.status}).` }
  }

  if (!response.ok) throw new ApiError(response.status, data)
  return data
}
