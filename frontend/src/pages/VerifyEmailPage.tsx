import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import { authApi, formatNetworkError } from '../services/api'
import { RootState } from '../store'
import { setUser } from '../store/authSlice'

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated)
  const tokenFromUrl = searchParams.get('token') ?? ''

  const [token, setToken] = useState(tokenFromUrl)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [autoTried, setAutoTried] = useState(false)

  const confirmToken = async (value: string) => {
    setError('')
    setMessage('')
    setLoading(true)
    try {
      const { data } = await authApi.confirmEmailVerification(value)
      setMessage(data.message)
      if (isAuthenticated) {
        const { data: me } = await authApi.me()
        dispatch(setUser(me))
        setTimeout(() => navigate('/settings', { replace: true }), 1500)
      } else {
        setTimeout(() => navigate('/login', { replace: true, state: { emailVerified: true } }), 1500)
      }
    } catch (err) {
      setError(formatNetworkError(err, 'verify email'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (tokenFromUrl && !autoTried) {
      setAutoTried(true)
      void confirmToken(tokenFromUrl)
    }
  }, [tokenFromUrl, autoTried])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    void confirmToken(token)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-md">
      <div className="glass-panel p-8">
        <h1 className="text-2xl font-bold">Verify email</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Confirm your email address to secure your account.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-500">{error}</div>
          )}
          {message && (
            <div className="rounded-lg bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">
              {message}
            </div>
          )}
          {!tokenFromUrl && (
            <>
              <div>
                <label className="mb-1 block text-sm text-gray-500 dark:text-gray-400">Verification token</label>
                <input
                  required
                  className="input-field font-mono text-xs"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Verifying...' : 'Confirm email'}
              </button>
            </>
          )}
          {tokenFromUrl && loading && !message && !error && (
            <p className="text-sm text-gray-500 dark:text-gray-400">Verifying your email...</p>
          )}
        </form>

        <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          {isAuthenticated ? (
            <Link to="/settings" className="text-emerald-600 hover:underline dark:text-emerald-400">
              Back to settings
            </Link>
          ) : (
            <Link to="/login" className="text-emerald-600 hover:underline dark:text-emerald-400">
              Back to sign in
            </Link>
          )}
        </p>
      </div>
    </motion.div>
  )
}
