/** Where the SPA is served — used to decide dev proxy vs direct API URL. */
export function isBrowserLocalDevHost(): boolean {
  if (typeof window === 'undefined') return false
  const h = window.location.hostname
  return h === 'localhost' || h === '127.0.0.1'
}

/**
 * Resolved API origin (no /api/v1 suffix).
 * On localhost dev, always empty so axios uses relative /api/v1 → Vite proxy → 127.0.0.1:8001.
 * Ignores a stale VITE_API_URL pointing at Render (browser CORS would block it anyway).
 */
export function resolveApiOrigin(): string {
  const fromEnv = (import.meta.env.VITE_API_URL as string | undefined)?.trim() ?? ''
  if (import.meta.env.DEV && isBrowserLocalDevHost()) {
    return ''
  }
  return fromEnv.replace(/\/$/, '')
}

export function apiV1BaseUrl(): string {
  const origin = resolveApiOrigin()
  return origin ? `${origin}/api/v1` : '/api/v1'
}
