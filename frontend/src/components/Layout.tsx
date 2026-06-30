import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { RootState } from '../store'
import { logout, setUser } from '../store/authSlice'
import { authApi } from '../services/api'
import EmailVerificationBadge from './EmailVerificationBadge'
import NotificationBell from './NotificationBell'

export default function Layout() {
  const { isAuthenticated, user, refreshToken } = useSelector((s: RootState) => s.auth)
  const theme = useSelector((s: RootState) => s.settings.theme)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const isDark = theme === 'dark'

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
    navigate('/')
  }

  return (
    <div
      className={
        isDark
          ? 'min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-emerald-950/30'
          : 'min-h-screen bg-gradient-to-br from-gray-100 via-white to-emerald-50'
      }
    >
      <nav
        className={
          isDark
            ? 'sticky top-0 z-50 border-b border-white/5 bg-gray-950/80 backdrop-blur-xl'
            : 'sticky top-0 z-50 border-b border-black/5 bg-white/80 backdrop-blur-xl'
        }
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold">
            <span className="text-2xl">♔</span>
            <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              ChessMaster Pro
            </span>
          </Link>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <Link
                  to="/dashboard"
                  className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                >
                  Dashboard
                </Link>
                <Link
                  to="/play/ai"
                  className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                >
                  vs AI
                </Link>
                <Link
                  to="/play/online"
                  className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                >
                  Online
                </Link>
                <Link
                  to="/puzzles"
                  className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                >
                  Puzzles
                </Link>
                <Link
                  to="/analysis"
                  className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                >
                  Analysis
                </Link>
                <Link
                  to="/friends"
                  className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                >
                  Friends
                </Link>
                <Link
                  to="/rankings"
                  className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                >
                  Rankings
                </Link>
                <Link
                  to="/play"
                  className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                >
                  Local
                </Link>
                <Link
                  to="/settings"
                  className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                >
                  Settings
                </Link>
                <EmailVerificationBadge user={activeUser} variant="nav" />
                <NotificationBell />
                <span className="text-sm text-emerald-600 dark:text-emerald-400">{activeUser?.username}</span>
                <button onClick={handleLogout} className="btn-secondary py-2 text-sm">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                >
                  Login
                </Link>
                <Link to="/register" className="btn-primary py-2 text-sm">
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="mx-auto max-w-7xl px-4 py-8"
      >
        <Outlet />
      </motion.main>

      <footer
        className={
          isDark
            ? 'border-t border-white/5 py-8'
            : 'border-t border-black/5 py-8'
        }
      >
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-sm text-gray-500 sm:flex-row">
          <p>© {new Date().getFullYear()} ChessMaster Pro</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/privacy"
              className="hover:text-emerald-600 dark:hover:text-emerald-400"
            >
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-emerald-600 dark:hover:text-emerald-400">
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
