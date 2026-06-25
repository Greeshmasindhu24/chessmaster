import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { motion } from 'framer-motion'
import { authApi, formatNetworkError } from '../services/api'
import { setCredentials } from '../store/authSlice'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await authApi.login({ email, password })
      dispatch(
        setCredentials({
          user: data.user,
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
        }),
      )
      navigate('/dashboard')
    } catch (err: unknown) {
      const networkMsg = formatNetworkError(err, 'sign in')
      if (networkMsg) {
        setError(networkMsg)
      } else {
        setError('Invalid email or password')
      }
    } finally {
      setLoading(false)
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
        <p className="mt-2 text-sm text-gray-400">Sign in to continue playing</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
          )}
          <div>
            <label className="mb-1 block text-sm text-gray-400">Email</label>
            <input
              type="email"
              required
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-400">Password</label>
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

        <p className="mt-6 text-center text-sm text-gray-400">
          No account?{' '}
          <Link to="/register" className="text-emerald-400 hover:underline">
            Register
          </Link>
        </p>
      </div>
    </motion.div>
  )
}
