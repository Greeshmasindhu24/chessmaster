import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from '../store'
import { authApi } from '../services/api'
import { setCredentials, User } from '../store/authSlice'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch()
  const { isAuthenticated, accessToken, refreshToken } = useSelector((s: RootState) => s.auth)
  const hasSession = isAuthenticated && Boolean(accessToken || refreshToken)
  const [checking, setChecking] = useState(!hasSession)
  const [guestFailed, setGuestFailed] = useState(false)

  useEffect(() => {
    if (hasSession) {
      setChecking(false)
      return
    }
    if (guestFailed) return

    let cancelled = false
    setChecking(true)
    authApi
      .guestLogin()
      .then(({ data }) => {
        if (cancelled) return
        dispatch(
          setCredentials({
            user: data.user as User,
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
          }),
        )
      })
      .catch(() => {
        if (!cancelled) setGuestFailed(true)
      })
      .finally(() => {
        if (!cancelled) setChecking(false)
      })

    return () => {
      cancelled = true
    }
  }, [hasSession, guestFailed, dispatch])

  if (hasSession) return <>{children}</>

  if (checking) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500 dark:text-gray-400">
        Getting you ready to play...
      </div>
    )
  }

  return <Navigate to="/login?session=expired" replace />
}
