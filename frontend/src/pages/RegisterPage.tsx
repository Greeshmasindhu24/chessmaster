import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import { authApi, formatNetworkError } from '../services/api'
import PasswordInput from '../components/PasswordInput'
import {
  COUNTRY_OPTIONS,
  GENDER_OPTIONS,
  type Country,
  type Gender,
  validateDateOfBirth,
} from '../config/profileFields'
import { setCredentials, User } from '../store/authSlice'
import { RootState } from '../store'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [gender, setGender] = useState<Gender>('prefer_not_to_say')
  const [country, setCountry] = useState<Country | ''>('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated)

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true })
    }
  }, [isAuthenticated, navigate])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    const dobError = validateDateOfBirth(dateOfBirth)
    if (dobError) {
      setError(dobError)
      return
    }

    setLoading(true)
    try {
      const { data } = await authApi.register({
        email: email.trim(),
        username: username.trim(),
        password,
        date_of_birth: dateOfBirth,
        gender,
        country: country || null,
      })
      dispatch(
        setCredentials({
          user: data.user as User,
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
        }),
      )
      navigate('/dashboard', { replace: true })
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
        <p className="mt-2 text-sm text-gray-400">
          Join ChessMaster Pro — profile details are collected once at signup
        </p>

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
            <PasswordInput
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="border-t border-white/10 pt-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-500">
              Profile
            </p>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-gray-400">Date of birth</label>
                <input
                  type="date"
                  required
                  className="input-field"
                  value={dateOfBirth}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                />
                <p className="mt-1 text-xs text-gray-500">Must be 13 or older</p>
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-400">Gender</label>
                <select
                  required
                  className="input-field select-field"
                  value={gender}
                  onChange={(e) => setGender(e.target.value as Gender)}
                >
                  {GENDER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-400">
                  Country <span className="text-gray-500">(optional)</span>
                </label>
                <select
                  className="input-field select-field"
                  value={country}
                  onChange={(e) => setCountry(e.target.value as Country | '')}
                >
                  <option value="">Select country</option>
                  {COUNTRY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Creating account...' : 'Create account'}
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
