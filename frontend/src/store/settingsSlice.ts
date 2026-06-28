import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export type ThemeMode = 'dark' | 'light'

interface SettingsState {
  theme: ThemeMode
  boardTheme: string
  soundEnabled: boolean
  moveConfirmation: boolean
  synced: boolean
}

const STORAGE_KEY = 'chessmaster_settings'

function loadSettings(): SettingsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      return { ...defaultSettings, ...JSON.parse(raw), synced: false }
    }
  } catch {
    /* ignore */
  }
  return defaultSettings
}

const defaultSettings: SettingsState = {
  theme: 'dark',
  boardTheme: 'classic',
  soundEnabled: true,
  moveConfirmation: false,
  synced: false,
}

export function applyTheme(theme: ThemeMode) {
  const root = document.documentElement
  root.classList.remove('dark', 'light')
  root.classList.add(theme)
  root.style.colorScheme = theme
}

const settingsSlice = createSlice({
  name: 'settings',
  initialState: loadSettings(),
  reducers: {
    setTheme: (state, action: PayloadAction<ThemeMode>) => {
      state.theme = action.payload
      applyTheme(action.payload)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    },
    setPreferences: (
      state,
      action: PayloadAction<{
        theme?: ThemeMode
        board_theme?: string
        sound_enabled?: boolean
        move_confirmation?: boolean
      }>,
    ) => {
      if (action.payload.theme) state.theme = action.payload.theme
      if (action.payload.board_theme) state.boardTheme = action.payload.board_theme
      if (action.payload.sound_enabled !== undefined) state.soundEnabled = action.payload.sound_enabled
      if (action.payload.move_confirmation !== undefined) {
        state.moveConfirmation = action.payload.move_confirmation
      }
      state.synced = true
      applyTheme(state.theme)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    },
    setSynced: (state, action: PayloadAction<boolean>) => {
      state.synced = action.payload
    },
  },
})

export const { setTheme, setPreferences, setSynced } = settingsSlice.actions
export default settingsSlice.reducer
