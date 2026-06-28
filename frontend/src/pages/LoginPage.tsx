import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { motion } from 'framer-motion'
import { authApi, formatNetworkError } from '../services/api'
import { setCredentials, User } from '../store/authSlice'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [guestLoading, setGuestLoading] = useState(false)
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const finishLogin = (data: { user: User; access_token: string; refresh_token: string }) => {
    dispatch(
      setCredentials({
        user: data.user,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
      }),
    )
    navigate('/dashboard')
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await authApi.login({ email, password })
      finishLogin(data)
    } catch (err: unknown) {
      setError(formatNetworkError(err, 'sign in') || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  const handleGuest = async () => {
    setError('')
    setGuestLoading(true)
    try {
      const { data } = await authApi.guestLogin()
      finishLogin(data)
    } catch (err: unknown) {
      setError(formatNetworkError(err, 'guest sign in'))
    } finally {
      setGuestLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-md"
    >
      <div className="glass-panel p-8">
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Sign in to continue playing</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-500">{error}</div>
          )}
          <div>
            <label className="mb-1 block text-sm text-gray-500 dark:text-gray-400">Email</label>
            <input
              type="email"
              required
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-sm text-gray-500 dark:text-gray-400">Password</label>
              <Link
                to="/forgot-password"
                className="text-xs text-emerald-600 hover:underline dark:text-emerald-400"
              >
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              required
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-black/10 dark:border-white/10" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-transparent px-2 text-gray-500">or</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGuest}
          disabled={guestLoading}
          className="btn-secondary w-full"
        >
          {guestLoading ? 'Creating guest...' : 'Continue as guest'}
        </button>

        <p className="mt-4 text-center text-xs text-gray-500">
          Google sign-in — Phase 2 (configure GOOGLE_CLIENT_ID)
        </p>

        <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          No account?{' '}
          <Link to="/register" className="text-emerald-600 hover:underline dark:text-emerald-400">
            Register
          </Link>
        </p>
      </div>
    </motion.div>
  )
}
