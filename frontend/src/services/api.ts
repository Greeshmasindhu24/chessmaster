import axios from 'axios'
import { store } from '../store'
import { logout, setCredentials } from '../store/authSlice'
import type { Country, Gender } from '../config/profileFields'
import {
  apiV1BaseUrl,
  isBrowserLocalDevHost,
  isRenderProductionWeb,
  resolveApiOrigin,
} from '../config/apiUrl'

const API_ORIGIN = resolveApiOrigin()

export const apiBaseUrl = apiV1BaseUrl()

const REMOTE_API_TIMEOUT_MS = 90_000
const LOCAL_API_TIMEOUT_MS = 30_000

export const api = axios.create({
  baseURL: apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
  timeout: API_ORIGIN ? REMOTE_API_TIMEOUT_MS : LOCAL_API_TIMEOUT_MS,
})

const AUTH_SESSION_MESSAGES = new Set([
  'not authenticated',
  'invalid token',
  'invalid token type',
  'invalid refresh token',
  'session revoked',
  'user not found or inactive',
  'user inactive',
])


function isRemoteApiBase(base: string | undefined): boolean {
  return (
    typeof base === 'string' &&
    (base.startsWith('http://') || base.startsWith('https://')) &&
    !base.includes('localhost') &&
    !base.includes('127.0.0.1')
  )
}

function isRetryableColdStart(err: unknown): boolean {
  const axiosErr = err as { response?: unknown; code?: string }
  return !axiosErr.response && (axiosErr.code === 'ERR_NETWORK' || axiosErr.code === 'ECONNABORTED')
}

const RENDER_COLD_START_RETRY_DELAYS_MS = [2500, 5000, 8000]

async function withRenderColdStartRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown
  const attempts = API_ORIGIN ? 1 + RENDER_COLD_START_RETRY_DELAYS_MS.length : 1
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      const canRetry = API_ORIGIN && isRetryableColdStart(err) && i < attempts - 1
      if (!canRetry) throw err
      await new Promise((r) => setTimeout(r, RENDER_COLD_START_RETRY_DELAYS_MS[i] ?? 2500))
    }
  }
  throw lastErr
}

export function formatNetworkError(err: unknown, action: string): string {
  const axiosErr = err as {
    response?: { status?: number; data?: { detail?: string | { msg?: string }[] } }
    config?: { baseURL?: string; url?: string }
    code?: string
    message?: string
  }
  if (axiosErr.response) {
    const status = axiosErr.response.status
    const detail = axiosErr.response.data?.detail
    if (status === 401) return 'Please log in again.'
    if (typeof detail === 'string') {
      if (AUTH_SESSION_MESSAGES.has(detail.toLowerCase())) return 'Please log in again.'
      return detail
    }
    if (detail && typeof detail === 'object' && 'message' in detail && typeof detail.message === 'string') {
      return detail.message
    }
    if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg
    if (axiosErr.response.status === 402) return 'Payment required to unlock this AI level.'
    if (axiosErr.response.status && axiosErr.response.status >= 500) {
      return `Server error (${action}). Restart .\\run_backend.ps1 and try again.`
    }
    return `Request failed (${action}).`
  }
  const base = axiosErr.config?.baseURL ?? api.defaults.baseURL ?? apiBaseUrl
  const path = axiosErr.config?.url ?? ''
  const attempted = `${base}${path}`.replace(/([^:]\/)\/+/g, '$1')

  const remoteApi = isRemoteApiBase(base)
  const code = axiosErr.code
  const onProdWeb = isRenderProductionWeb()

  if (remoteApi && import.meta.env.DEV) {
    return `Cannot reach server (${action}). Local dev must use http://localhost:5173 with .\run_frontend.ps1 (VITE_API_URL empty) and .\run_backend.ps1 on port 8001 — not the Render API. Tried ${attempted}.`
  }

  if (remoteApi && isBrowserLocalDevHost()) {
    return `Cannot reach server (${action}). The app is calling ${attempted}, but local dev should use the Vite proxy. Clear VITE_API_URL in frontend/.env.local (leave it empty), restart .\run_frontend.ps1, and run the backend on port 8001 (.\run_backend.ps1). Calling Render from localhost is blocked by CORS.`
  }

  if (remoteApi && typeof window !== 'undefined') {
    if (code === 'ECONNABORTED') {
      return `Request timed out (${action}) after ${REMOTE_API_TIMEOUT_MS / 1000}s. The Render API (chessmaster-api) may be waking from sleep — wait ~1 minute, open https://chessmaster-api.onrender.com/api/v1/health in a tab, then retry sign-in.`
    }
    if (onProdWeb) {
      return `Cannot reach the API (${action}). You are on the production site (chessmaster-web). Tried ${attempted}. If chessmaster-api was sleeping, wait ~1 minute and retry (the app retries automatically during cold start). Check https://chessmaster-api.onrender.com/api/v1/health in your browser.`
    }
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

function isPublicAuthPath(pathname: string): boolean {
  return /^\/(login|register)(\/|$)/.test(pathname)
}

function clearSessionAndRedirectToLogin(): void {
  store.dispatch(logout())
  if (typeof window !== 'undefined' && !isPublicAuthPath(window.location.pathname)) {
    window.location.assign('/login?session=expired')
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    const isAuthEndpoint = AUTH_NO_REFRESH_PATHS.some((p) => String(original?.url ?? '').includes(p))
    if (error.response?.status === 401 && !isAuthEndpoint) {
      if (!original._retry) {
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
            clearSessionAndRedirectToLogin()
          }
        } else {
          clearSessionAndRedirectToLogin()
        }
      } else {
        clearSessionAndRedirectToLogin()
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
  register: (data: RegisterData) => withRenderColdStartRetry(() => api.post('/auth/register', data)),
  login: (data: LoginData) => withRenderColdStartRetry(() => api.post('/auth/login', data)),
  guestLogin: () => withRenderColdStartRetry(() => api.post('/auth/guest')),
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

export interface AnalyzePositionResult {
  fen: string
  turn: string
  eval_cp: number | null
  mate: number | null
  best_move_uci: string | null
  best_move_san: string | null
  lines: { moves_uci: string[]; eval_cp: number | null; mate: number | null }[]
  engine: string
}

export interface MoveAnalysisResult {
  move_number: number
  san: string
  uci: string
  fen_before: string
  eval_before_cp: number | null
  best_move_uci: string | null
  eval_after_cp: number | null
  cp_loss: number | null
  quality: string
}

export interface AnalyzeGameResult {
  game_id: string | null
  pgn: string | null
  moves: MoveAnalysisResult[]
  average_cp_loss: number | null
  engine: string
}

export const analysisApi = {
  position: (fen: string, depth = 12) =>
    api.post<AnalyzePositionResult>('/analysis/position', { fen, depth }),
  game: (payload: { game_id?: string; pgn?: string; depth?: number }) =>
    api.post<AnalyzeGameResult>('/analysis/game', payload),
  gameById: (gameId: string) => api.get<AnalyzeGameResult>(`/analysis/game/${gameId}`),
}

export interface FriendSummary {
  id: string
  user_id: string
  friend_id: string
  status: string
  created_at: string
  friend: {
    id: string
    username: string
    avatar_url: string | null
    rating_blitz: number
  } | null
}

export interface UserSearchHit {
  id: string
  username: string
  avatar_url: string | null
  rating_blitz: number
  friendship_status: string | null
}

export const friendsApi = {
  list: () => api.get<FriendSummary[]>('/friends'),
  requests: () => api.get<FriendSummary[]>('/friends/requests'),
  sendRequest: (username: string) => api.post<FriendSummary>('/friends/requests', { username }),
  accept: (friendshipId: string) => api.post<FriendSummary>(`/friends/requests/${friendshipId}/accept`),
  decline: (friendshipId: string) => api.post<FriendSummary>(`/friends/requests/${friendshipId}/decline`),
  search: (q: string) => api.get<UserSearchHit[]>('/friends/search', { params: { q } }),
}

export interface NotificationItem {
  id: string
  type: string
  title: string
  message: string
  data: Record<string, string> | null
  is_read: boolean
  created_at: string
}

export const notificationsApi = {
  list: () => api.get<NotificationItem[]>('/notifications'),
  unreadCount: () => api.get<{ count: number }>('/notifications/unread-count'),
  markRead: (notificationIds?: string[]) =>
    api.post('/notifications/mark-read', { notification_ids: notificationIds ?? null }),
}

export interface LeaderboardEntry {
  rank: number
  user_id: string
  username: string
  avatar_url: string | null
  rating_blitz: number
  games_played: number
  wins: number
}

export const rankingsApi = {
  blitz: (limit = 50) => api.get<{ entries: LeaderboardEntry[]; rating_type: string }>('/rankings/blitz', { params: { limit } }),
}
