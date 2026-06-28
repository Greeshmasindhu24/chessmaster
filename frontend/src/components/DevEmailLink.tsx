/** Shown when SMTP is not configured — backend returns the link in the API response. */
export default function DevEmailLink({
  label,
  url,
}: {
  label: string
  url: string
}) {
  if (!url) return null

  return (
    <div className="rounded-lg bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
      <p className="font-medium">Dev mode — no email sent</p>
      <p className="mt-1 text-xs text-amber-600/80 dark:text-amber-400/80">
        SMTP is not configured on the backend. Add{' '}
        <code className="rounded bg-amber-500/10 px-1">SMTP_HOST</code>,{' '}
        <code className="rounded bg-amber-500/10 px-1">SMTP_USER</code>, and{' '}
        <code className="rounded bg-amber-500/10 px-1">SMTP_PASSWORD</code> to{' '}
        <code className="rounded bg-amber-500/10 px-1">ChessMasterPro/.env</code> (see{' '}
        <code className="rounded bg-amber-500/10 px-1">.env.example</code>), then restart the
        backend to receive verification emails in your inbox.
      </p>
      <p className="mt-2 text-xs text-amber-600/80 dark:text-amber-400/80">{label}</p>
      <p className="mt-1 break-all">
        <a href={url} className="underline hover:no-underline">
          {url}
        </a>
      </p>
    </div>
  )
}
