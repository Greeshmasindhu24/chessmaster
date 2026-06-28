export interface BoardThemeColors {
  id: string
  name: string
  dark: string
  light: string
}

export const BOARD_THEMES: BoardThemeColors[] = [
  { id: 'classic', name: 'Classic green', dark: '#769656', light: '#eeeed2' },
  { id: 'blue', name: 'Blue', dark: '#4a6fa5', light: '#dce4f0' },
  { id: 'brown', name: 'Brown wood', dark: '#b58863', light: '#f0d9b5' },
  { id: 'marble', name: 'Marble', dark: '#8b8b8b', light: '#e8e8e8' },
]

const themeById = Object.fromEntries(BOARD_THEMES.map((t) => [t.id, t])) as Record<
  string,
  BoardThemeColors
>

export function getBoardTheme(id: string): BoardThemeColors {
  return themeById[id] ?? themeById.classic
}

export function boardSquareStyles(themeId: string) {
  const theme = getBoardTheme(themeId)
  return {
    customDarkSquareStyle: { backgroundColor: theme.dark },
    customLightSquareStyle: { backgroundColor: theme.light },
  }
}
