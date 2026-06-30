import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { RootState } from '../store'
import { logout, setUser } from '../store/authSlice'
import { authApi } from '../services/api'
import EmailVerificationBadge from './EmailVerificationBadge'
import NotificationBell from './NotificationBell'

interface Props {
  className?: string
}

/** Verified badge, notifications, username, and logout — shared by header and landing hub. */
export default function UserNavActions({ className = '' }: Props) {
  const { isAuthenticated, user, refreshToken } = useSelector((s: RootState) => s.auth)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: freshUser } = useQuery({
    queryKey: ['me'],
    queryFn: () => authApi.me().then((r) => r.data),
    enabled: isAuthenticated,
    refetchInterval: 30000,
  })

  useEffect(() => {
    if (freshUser) {
      dispatch(setUser(freshUser))
    }
  }, [freshUser, dispatch])

  const activeUser = freshUser ?? user

  const handleLogout = async () => {
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken)
      } catch {
        /* ignore */
      }
    }
    dispatch(logout())
    queryClient.clear()
    navigate('/')
  }

  if (!isAuthenticated || !activeUser) return null

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      <EmailVerificationBadge user={activeUser} variant="nav" />
      <NotificationBell />
      <span className="text-sm text-emerald-600 dark:text-emerald-400">{activeUser.username}</span>
      <button type="button" onClick={handleLogout} className="btn-secondary py-2 text-sm">
        Logout
      </button>
    </div>
  )
}
