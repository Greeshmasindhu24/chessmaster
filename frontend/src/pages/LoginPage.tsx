import { FormEvent, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import { authApi, formatNetworkError } from '../services/api'
import PasswordInput from '../components/PasswordInput'
import { setCredentials, User } from '../store/authSlice'
import { RootState } from '../store'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [registeredMsg, setRegisteredMsg] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [guestLoading, setGuestLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated)

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true })
      return
    }

    const params = new URLSearchParams(location.search)
    const googleError = params.get('google_error')
    if (googleError) {
      setError(decodeURIComponent(googleError.replace(/\+/g, ' ')))
      return
    }
    if (params.get('session') === 'expired') {
      setRegisteredMsg('Your session expired. Please sign in again.')
      return
    }

    const state = location.state as {
      registered?: boolean
      email?: string
      passwordReset?: boolean
      emailVerified?: boolean
    } | null
    if (state?.passwordReset) {
      setRegisteredMsg('Password updated — sign in with your new password.')
    } else if (state?.registered) {
      setRegisteredMsg('Account created — sign in with your email/username and password.')
    }
    if (state?.email) {
      setEmail(state.email)
    }
  }, [isAuthenticated, navigate, location.search, location.state])

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
      const { data } = await authApi.login({ email: email.trim(), password })
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

  const handleGoogle = async () => {
    setError('')
    setGoogleLoading(true)
    try {
      const { data } = await authApi.googleOAuthStatus()
      if (!data.authorize_url) {
        setError(
          data.message ||
            'Google sign-in is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to the backend .env.',
        )
        return
      }
      window.location.assign(data.authorize_url)
    } catch (err: unknown) {
      setError(formatNetworkError(err, 'start Google sign-in'))
    } finally {
      setGoogleLoading(false)
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
          {registeredMsg && (
            <div className="rounded-lg bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">
              {registeredMsg}
            </div>
          )}
          {error && (
            <div className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-500">{error}</div>
          )}
          <div>
            <label className="mb-1 block text-sm text-gray-500 dark:text-gray-400">Email or username</label>
            <input
              type="text"
              required
              autoComplete="username"
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
            <PasswordInput
              required
              autoComplete="current-password"
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

        <button
          type="button"
          onClick={handleGoogle}
          disabled={googleLoading}
          className="btn-secondary mt-3 w-full"
        >
          {googleLoading ? 'Connecting to Google...' : 'Continue with Google'}
        </button>

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
