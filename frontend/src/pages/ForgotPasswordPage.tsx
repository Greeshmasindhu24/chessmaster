import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { authApi, formatNetworkError } from '../services/api'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)
    try {
      const { data } = await authApi.forgotPassword(email)
      setMessage(data.message)
    } catch (err) {
      setError(formatNetworkError(err, 'request reset'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-md">
      <div className="glass-panel p-8">
        <h1 className="text-2xl font-bold">Forgot password</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Enter your email and we&apos;ll send a reset link when SMTP is configured.
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
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Sending...' : 'Send reset link'}
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
