import { Link } from 'react-router-dom'
import type { User } from '../store/authSlice'

type Variant = 'nav' | 'strip'

interface Props {
  user: User | null | undefined
  variant?: Variant
}

/** Visible email verification status — hide when guest; verified nav badge stays subtle. */
export default function EmailVerificationBadge({ user, variant = 'nav' }: Props) {
  if (!user || user.role === 'guest') return null

  if (user.is_verified) {
    if (variant === 'nav') {
      return (
        <span
          className="hidden items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 sm:inline-flex dark:text-emerald-300"
          title="Email verified"
        >
          Verified ✓
        </span>
      )
    }
    return (
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-center text-sm text-emerald-800 dark:text-emerald-200">
        Email verified ✓
      </div>
    )
  }

  if (variant === 'nav') {
    return (
      <Link
        to="/settings"
        className="inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-800 transition hover:bg-amber-500/25 dark:text-amber-200"
        title="Verify your email to unlock AI and online play"
      >
        Verify email
      </Link>
    )
  }

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
      <p className="font-medium">Verify your email</p>
      <p className="mt-1 text-xs text-amber-700/90 dark:text-amber-300/90">
        Check your inbox for the verification link, or resend it from settings.
      </p>
      <Link
        to="/settings"
        className="mt-2 inline-block text-xs font-semibold text-emerald-700 underline hover:no-underline dark:text-emerald-400"
      >
        Open settings to verify →
      </Link>
    </div>
  )
}
