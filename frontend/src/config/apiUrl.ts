/** Where the SPA is served - used for error hints (proxy vs direct API). */
export function isBrowserLocalDevHost(): boolean {
  if (typeof window === 'undefined') return false
  const h = window.location.hostname
  return h === 'localhost' || h === '127.0.0.1'
}

function isLikelyLocalDevSurface(): boolean {
  if (typeof window === 'undefined') return false
  const h = window.location.hostname
  if (h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0') return true
  if (/^192\.168\.\d+\.\d+$/.test(h)) return true
  if (/^10\.\d+\.\d+\.\d+$/.test(h)) return true
  return false
}

/**
 * Resolved API origin (no /api/v1 suffix).
 * In Vite dev (`npm run dev`), always empty so axios uses /api/v1 → proxy → 127.0.0.1:8001.
 * Ignores VITE_API_URL pointing at Render (browser CORS blocks that from local/LAN dev).
 */
export function resolveApiOrigin(): string {
  const fromEnv = (import.meta.env.VITE_API_URL as string | undefined)?.trim() ?? ''
  if (import.meta.env.DEV) {
    return ''
  }
  if (isLikelyLocalDevSurface() && fromEnv.includes('onrender.com')) {
    return ''
  }
  if (!fromEnv && typeof window !== 'undefined' && window.location.hostname.includes('chessmaster-web.onrender.com')) {
    return 'https://chessmaster-api.onrender.com'
  }
  return fromEnv.replace(/\/$/, '')
}

export function apiV1BaseUrl(): string {
  const origin = resolveApiOrigin()
  return origin ? `${origin}/api/v1` : '/api/v1'
}

export function isRenderProductionWeb(): boolean {
  if (typeof window === 'undefined') return false
  return window.location.hostname.includes('chessmaster-web.onrender.com')
}
