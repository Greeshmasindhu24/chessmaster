import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface UserProfile {
  avatar_url: string | null
  country: string | null
  date_of_birth: string | null
  gender: string | null
  biography: string | null
  rating_bullet: number
  rating_blitz: number
  rating_rapid: number
  rating_classical: number
  rating_puzzle: number
  highest_rating: number
  games_played: number
  wins: number
  losses: number
  draws: number
}

export interface User {
  id: string
  email: string
  username: string
  role: string
  is_verified: boolean
  profile: UserProfile | null
}

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
}

function loadStoredAuth(): AuthState {
  const empty: AuthState = {
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
  }
  try {
    const raw = localStorage.getItem('chessmaster_auth')
    if (!raw) return empty
    const parsed = JSON.parse(raw) as Partial<AuthState>
    const hasToken = Boolean(parsed.accessToken || parsed.refreshToken)
    if (!parsed.isAuthenticated || !parsed.user || !hasToken) {
      localStorage.removeItem('chessmaster_auth')
      return empty
    }
    return {
      user: parsed.user,
      accessToken: parsed.accessToken ?? null,
      refreshToken: parsed.refreshToken ?? null,
      isAuthenticated: true,
    }
  } catch {
    localStorage.removeItem('chessmaster_auth')
    return empty
  }
}

const initial: AuthState = loadStoredAuth()

const authSlice = createSlice({
  name: 'auth',
  initialState: initial,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: User; accessToken: string; refreshToken: string }>,
    ) => {
      state.user = action.payload.user
      state.accessToken = action.payload.accessToken
      state.refreshToken = action.payload.refreshToken
      state.isAuthenticated = true
      localStorage.setItem(
        'chessmaster_auth',
        JSON.stringify({
          user: action.payload.user,
          accessToken: action.payload.accessToken,
          refreshToken: action.payload.refreshToken,
          isAuthenticated: true,
        }),
      )
    },
    logout: (state) => {
      state.user = null
      state.accessToken = null
      state.refreshToken = null
      state.isAuthenticated = false
      localStorage.removeItem('chessmaster_auth')
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload
      localStorage.setItem(
        'chessmaster_auth',
        JSON.stringify({
          user: action.payload,
          accessToken: state.accessToken,
          refreshToken: state.refreshToken,
          isAuthenticated: state.isAuthenticated,
        }),
      )
    },
  },
})

export const { setCredentials, logout, setUser } = authSlice.actions
export default authSlice.reducer
