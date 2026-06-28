import axios from 'axios'
import { store } from '../store'
import { logout, setCredentials } from '../store/authSlice'
import type { Country, Gender } from '../config/profileFields'
import { apiV1BaseUrl, isBrowserLocalDevHost, resolveApiOrigin } from '../config/apiUrl'

const API_ORIGIN = resolveApiOrigin()

export const apiBaseUrl = apiV1BaseUrl()

export const api = axios.create({
  baseURL: apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
})

export function formatNetworkError(err: unknown, action: string): string {
  const axiosErr = err as {
    response?: { status?: number; data?: { detail?: string | { msg?: string }[] } }
    config?: { baseURL?: string; url?: string }
    code?: string
    message?: string
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

  const remoteApi =
    typeof base === 'string' &&
    (base.startsWith('http://') || base.startsWith('https://')) &&
    !base.includes('localhost') &&
    !base.includes('127.0.0.1')

  if (remoteApi && isBrowserLocalDevHost()) {
    return `Cannot reach server (${action}). The app is calling ${attempted}, but local dev should use the Vite proxy. Clear VITE_API_URL in frontend/.env.local (leave it empty), restart .\\run_frontend.ps1, and run the backend on port 8001 (.\\run_backend.ps1). Calling Render from localhost is blocked by CORS.`
  }

  if (remoteApi && typeof window !== 'undefined') {
    return `Cannot reach server (${action}). Tried ${attempted}. If the API was sleeping, wait ~1 minute and retry. Otherwise check Render dashboard (chessmaster-api health) and your network connection.`
  }

  return `Cannot reach server (${action}). Tried ${attempted}. Use the Vite dev URL (http://localhost:5173) with the backend on port 8001, or restart .\\run_frontend.ps1 after closing old dev servers.`
}

api.interceptors.request.use((config) => {
  const token = store.getState().auth.accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

const AUTH_NO_REFRESH_PATHS = ['/auth/login', '/auth/register', '/auth/guest', '/auth/refresh']

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    const isAuthEndpoint = AUTH_NO_REFRESH_PATHS.some((p) => String(original?.url ?? '').includes(p))
    if (error.response?.status === 401 && !original._retry && !isAuthEndpoint) {
      original._retry = true
      const refreshToken = store.getState().auth.refreshToken
      if (refreshToken) {
        try {
          const refreshUrl = API_ORIGIN ? `${API_ORIGIN}/api/v1/auth/refresh` : '/api/v1/auth/refresh'
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
  date_of_birth: string
  gender: Gender
  country?: Country | null
}

export interface LoginData {
  email: string
  password: string
}

export const authApi = {
  register: (data: RegisterData) => api.post('/auth/register', data),
  login: (data: LoginData) => api.post('/auth/login', data),
  guestLogin: () => api.post('/auth/guest'),
  me: () => api.get('/auth/me'),
  logout: (refreshToken: string) => api.post('/auth/logout', { refresh_token: refreshToken }),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, new_password: string) =>
    api.post('/auth/reset-password', { token, new_password }),
  requestEmailVerification: () => api.post('/auth/verify-email/request'),
  confirmEmailVerification: (token: string) =>
    api.post('/auth/verify-email/confirm', { token }),
  googleOAuthStatus: () => api.get('/auth/google'),
  deleteAccount: () => api.delete('/auth/account'),
}

export interface ProfileUpdateData {
  avatar_url?: string | null
  biography?: string | null
}

export interface PreferencesData {
  theme?: 'dark' | 'light'
  board_theme?: string
  sound_enabled?: boolean
  move_confirmation?: boolean
}

export const profileApi = {
  getProfile: () => api.get('/users/me/profile'),
  updateProfile: (data: ProfileUpdateData) => api.patch('/users/me/profile', data),
  getPreferences: () => api.get('/users/me/preferences'),
  updatePreferences: (data: PreferencesData) => api.patch('/users/me/preferences', data),
  getPublicProfile: (username: string) => api.get(`/users/${username}`),
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
