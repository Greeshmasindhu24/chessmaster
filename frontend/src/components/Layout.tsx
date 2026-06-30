import { Link, Outlet, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import { RootState } from '../store'
import HeaderNavLinks from './HeaderNavLinks'
import UserNavActions from './UserNavActions'

export default function Layout() {
  const { isAuthenticated } = useSelector((s: RootState) => s.auth)
  const theme = useSelector((s: RootState) => s.settings.theme)
  const location = useLocation()
  const isDark = theme === 'dark'
  const isLanding = location.pathname === '/'

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
              isLanding ? null : (
                <>
                  <HeaderNavLinks />
                  <UserNavActions />
                </>
              )
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
