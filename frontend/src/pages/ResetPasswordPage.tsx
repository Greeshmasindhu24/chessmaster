import { FormEvent, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { authApi, formatNetworkError } from '../services/api'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const tokenFromUrl = searchParams.get('token') ?? ''

  const [token, setToken] = useState(tokenFromUrl)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authApi.resetPassword(token, password)
      navigate('/login', { state: { passwordReset: true } })
    } catch (err) {
      setError(formatNetworkError(err, 'reset password'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-md">
      <div className="glass-panel p-8">
        <h1 className="text-2xl font-bold">Reset password</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Choose a new password for your account.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-500">{error}</div>
          )}
          <div>
            <label className="mb-1 block text-sm text-gray-500 dark:text-gray-400">Reset token</label>
            <input
              required
              className="input-field font-mono text-xs"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-500 dark:text-gray-400">New password</label>
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
            {loading ? 'Updating...' : 'Update password'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          <Link to="/login" className="text-emerald-600 hover:underline dark:text-emerald-400">
            Back to sign in
          </Link>
        </p>
      </div>
    </motion.div>
  )
}
