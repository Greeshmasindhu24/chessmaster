import { Capacitor } from '@capacitor/core'
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../services/api'
import { RootState } from '../store'
import { setCredentials, setUser, User } from '../store/authSlice'

const PUBLIC_AUTH_PATHS = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/auth/google/callback',
]

function isPublicAuthPath(pathname: string): boolean {
  return PUBLIC_AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

/** Restore saved sessions and silently sign in guests so the app opens ready to play. */
export default function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { isAuthenticated, accessToken, refreshToken } = useSelector((s: RootState) => s.auth)
  const [ready, setReady] = useState(false)
  const [openedReadyToPlay, setOpenedReadyToPlay] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      const path = window.location.pathname
      const hasSession = isAuthenticated && (accessToken || refreshToken)

      if (hasSession) {
        try {
          const { data } = await authApi.me()
          if (!cancelled) dispatch(setUser(data))
        } catch {
          /* 401 refresh/logout handled by api interceptor */
        }
        if (!cancelled) {
          setOpenedReadyToPlay(true)
          setReady(true)
        }
        return
      }

      if (!isPublicAuthPath(path)) {
        try {
          const { data } = await authApi.guestLogin()
          if (!cancelled) {
            dispatch(
              setCredentials({
                user: data.user as User,
                accessToken: data.access_token,
                refreshToken: data.refresh_token,
              }),
            )
            setOpenedReadyToPlay(true)
          }
        } catch {
          /* offline or API unavailable — still show the app */
        }
      }

      if (!cancelled) setReady(true)
    }

    void bootstrap()
    return () => {
      cancelled = true
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- run once on cold start

  useEffect(() => {
    if (!ready || !openedReadyToPlay) return
    if (Capacitor.isNativePlatform() && window.location.pathname === '/') {
      navigate('/play/ai', { replace: true })
    }
  }, [ready, openedReadyToPlay, navigate])

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 text-emerald-400">
        <p className="text-sm">Loading ChessMaster Pro...</p>
      </div>
    )
  }

  return <>{children}</>
}
