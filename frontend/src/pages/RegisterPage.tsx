import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { authApi, formatNetworkError } from '../services/api'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authApi.register({ email, username, password })
      navigate('/login', { state: { registered: true } })
    } catch (err: unknown) {
      const networkMsg = formatNetworkError(err, 'register')
      if (networkMsg) {
        setError(networkMsg)
        return
      }
      const axiosErr = err as { response?: { data?: { detail?: string } } }
      const msg = axiosErr.response?.data?.detail || 'Registration failed'
      setError(typeof msg === 'string' ? msg : 'Registration failed')
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
        <h1 className="text-2xl font-bold">Create account</h1>
        <p className="mt-2 text-sm text-gray-400">Join ChessMaster Pro today</p>

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
            <label className="mb-1 block text-sm text-gray-400">Username</label>
            <input
              type="text"
              required
              minLength={3}
              pattern="[a-zA-Z0-9_]+"
              className="input-field"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-400">Password</label>
            <input
              type="password"
              required
              minLength={8}
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-400">
          Already have an account?{' '}
          <Link to="/login" className="text-emerald-400 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </motion.div>
  )
}
