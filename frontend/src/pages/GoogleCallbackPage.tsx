import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import axios from 'axios'
import { setCredentials, User } from '../store/authSlice'
import { apiBaseUrl } from '../services/api'

export default function GoogleCallbackPage() {
  const [error, setError] = useState('')
  const dispatch = useDispatch()
  const navigate = useNavigate()

  useEffect(() => {
    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash
    const params = new URLSearchParams(hash)
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')

    if (!accessToken || !refreshToken) {
      setError('Google sign-in did not return session tokens.')
      return
    }

    let cancelled = false

    ;(async () => {
      try {
        const { data: user } = await axios.get<User>(`${apiBaseUrl}/auth/me`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        if (cancelled) return
        dispatch(
          setCredentials({
            user,
            accessToken,
            refreshToken,
          }),
        )
        navigate('/dashboard', { replace: true })
      } catch {
        if (!cancelled) {
          setError('Signed in with Google but could not load your profile. Try signing in again.')
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [dispatch, navigate])

  if (error) {
    return (
      <div className="mx-auto max-w-md glass-panel p-8 text-center">
        <p className="text-red-500">{error}</p>
        <button type="button" onClick={() => navigate('/login')} className="btn-primary mt-6">
          Back to sign in
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md glass-panel p-8 text-center">
      <p className="text-gray-500 dark:text-gray-400">Completing Google sign-in…</p>
    </div>
  )
}
