import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import { RootState } from '../store'
import { logout } from '../store/authSlice'
import { authApi } from '../services/api'

export default function Layout() {
  const { isAuthenticated, user, refreshToken } = useSelector((s: RootState) => s.auth)
  const dispatch = useDispatch()
  const navigate = useNavigate()

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
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-emerald-950/30">
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-gray-950/80 backdrop-blur-xl">
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
                <Link to="/dashboard" className="text-sm text-gray-300 hover:text-white">
                  Dashboard
                </Link>
                <Link to="/play/ai" className="text-sm text-gray-300 hover:text-white">
                  vs AI
                </Link>
                <Link to="/play/online" className="text-sm text-gray-300 hover:text-white">
                  Online
                </Link>
                <Link to="/play" className="text-sm text-gray-300 hover:text-white">
                  Local
                </Link>
                <span className="text-sm text-emerald-400">{user?.username}</span>
                <button onClick={handleLogout} className="btn-secondary py-2 text-sm">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm text-gray-300 hover:text-white">
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
    </div>
  )
}
