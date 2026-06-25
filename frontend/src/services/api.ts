import axios from 'axios'
import { store } from '../store'
import { logout, setCredentials } from '../store/authSlice'

const rawApiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim() ?? ''
const API_URL = rawApiUrl

export const apiBaseUrl = API_URL ? `${API_URL}/api/v1` : '/api/v1'

export const api = axios.create({
  baseURL: apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
})

export function formatNetworkError(err: unknown, action: string): string {
  const axiosErr = err as {
    response?: { status?: number; data?: { detail?: string | { msg?: string }[] } }
    config?: { baseURL?: string; url?: string }
  }
  if (axiosErr.response) {
    const detail = axiosErr.response.data?.detail
    if (typeof detail === 'string') return detail
    if (detail && typeof detail === 'object' && 'message' in detail && typeof detail.message === 'string') {
      return detail.message
    }
    if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg
    if (axiosErr.response.status === 401) return 'Please log in again.'
    if (axiosErr.response.status === 402) return 'Payment required to unlock this AI level.'
    if (axiosErr.response.status && axiosErr.response.status >= 500) {
      return `Server error (${action}). Restart .\\run_backend.ps1 and try again.`
    }
    return `Request failed (${action}).`
  }
  const base = axiosErr.config?.baseURL ?? api.defaults.baseURL ?? apiBaseUrl
  const path = axiosErr.config?.url ?? ''
  const attempted = `${base}${path}`.replace(/([^:]\/)\/+/g, '$1')
  return `Cannot reach server (${action}). Tried ${attempted}. Use the Vite dev URL (http://localhost:5173) with the backend on port 8001, or restart .\\run_frontend.ps1 after closing old dev servers.`
}

api.interceptors.request.use((config) => {
  const token = store.getState().auth.accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const refreshToken = store.getState().auth.refreshToken
      if (refreshToken) {
        try {
          const refreshUrl = API_URL ? `${API_URL}/api/v1/auth/refresh` : '/api/v1/auth/refresh'
          const { data } = await axios.post(refreshUrl, {
            refresh_token: refreshToken,
          })
          const user = store.getState().auth.user!
          store.dispatch(
            setCredentials({
              user,
              accessToken: data.access_token,
              refreshToken: data.refresh_token,
            }),
          )
          original.headers.Authorization = `Bearer ${data.access_token}`
          return api(original)
        } catch {
          store.dispatch(logout())
        }
      }
    }
    return Promise.reject(error)
  },
)

export interface RegisterData {
  email: string
  username: string
  password: string
}

export interface LoginData {
  email: string
  password: string
}

export const authApi = {
  register: (data: RegisterData) => api.post('/auth/register', data),
  login: (data: LoginData) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  logout: (refreshToken: string) => api.post('/auth/logout', { refresh_token: refreshToken }),
}

export const healthApi = {
  check: () => api.get('/health'),
}

export const gamesApi = {
  create: (timeControlSeconds: number, incrementSeconds: number) =>
    api.post('/games', { time_control_seconds: timeControlSeconds, increment_seconds: incrementSeconds }),
  join: (roomCode: string) => api.post('/games/join', { room_code: roomCode }),
  get: (gameId: string) => api.get(`/games/${gameId}`),
  history: () => api.get('/games/history'),
  createAi: (difficulty: string, playerColor: 'white' | 'black') =>
    api.post('/games/ai', { difficulty, player_color: playerColor }),
  aiMove: (gameId: string, uci: string) =>
    api.post(`/games/${gameId}/ai/move`, { uci }),
}

export interface DummyPurchaseData {
  card_number: string
  expiry: string
  cvc: string
  cardholder_name: string
}

export const billingApi = {
  aiTiers: () => api.get('/billing/ai-tiers'),
  purchaseAiTier: (tier: string, data: DummyPurchaseData) =>
    api.post(`/billing/ai-tiers/${tier}/purchase`, data),
  onlineTiers: () => api.get('/billing/online-tiers'),
  purchaseOnlineTier: (tier: string, data: DummyPurchaseData) =>
    api.post(`/billing/online-tiers/${tier}/purchase`, data),
}
