import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { RootState } from '../store'

export default function VerifiedPlayRoute({ children }: { children: React.ReactNode }) {
  const user = useSelector((s: RootState) => s.auth.user)

  if (user && !user.is_verified && user.role !== 'guest') {
    return (
      <div className="mx-auto max-w-lg">
        <div className="glass-panel p-8 text-center">
          <h1 className="text-2xl font-bold">Verify your email to play</h1>
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            Online and AI games require a verified email to keep the community safe. Check your
            inbox for the verification link, or resend it from settings.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/settings#verification" className="btn-primary">
              Resend verification
            </Link>
            <Link to="/dashboard" className="btn-secondary">
              Back to dashboard
            </Link>
          </div>
          <p className="mt-4 text-xs text-gray-500">
            Local board practice is available without verification —{' '}
            <Link to="/play" className="text-emerald-600 hover:underline dark:text-emerald-400">
              open local board
            </Link>
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
