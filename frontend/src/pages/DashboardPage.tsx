import { useQuery } from '@tanstack/react-query'
import { Link, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import { useEffect } from 'react'
import { RootState } from '../store'
import { setUser } from '../store/authSlice'
import { authApi, gamesApi, healthApi } from '../services/api'
import DevEmailLink from '../components/DevEmailLink'
import { ageFromDateOfBirth, countryLabel, genderLabel } from '../config/profileFields'
import { useOnlineStatus } from '../hooks/useOnlineStatus'

interface GameSummary {
  id: string
  white_player_id: string | null
  black_player_id: string | null
  status: string
  mode: string
  result: string | null
  room_code: string | null
  finished_at: string | null
  created_at: string
}

function outcomeLabel(game: GameSummary, userId: string): { text: string; className: string } {
  if (!game.result || game.status !== 'finished') {
    return { text: game.status, className: 'text-gray-400' }
  }
  if (game.result === '1/2-1/2') {
    return { text: 'Draw', className: 'text-yellow-400' }
  }
  const isWhite = game.white_player_id === userId
  const won = (game.result === '1-0' && isWhite) || (game.result === '0-1' && !isWhite)
  return won
    ? { text: 'Win', className: 'text-emerald-400' }
    : { text: 'Loss', className: 'text-red-400' }
}

export default function DashboardPage() {
  const dispatch = useDispatch()
  const location = useLocation()
  const isOnline = useOnlineStatus()
  const user = useSelector((s: RootState) => s.auth.user)
  const profile = user?.profile
  const navState = location.state as { verifyUrl?: string | null; justRegistered?: boolean } | null
  const devVerifyUrl = navState?.verifyUrl ?? ''

  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: () => healthApi.check().then((r) => r.data),
    refetchInterval: 30000,
  })

  const { data: freshUser } = useQuery({
    queryKey: ['me'],
    queryFn: () => authApi.me().then((r) => r.data),
    refetchInterval: 15000,
  })

  useEffect(() => {
    if (freshUser) {
      dispatch(setUser(freshUser))
    }
  }, [freshUser, dispatch])

  const activeUser = freshUser ?? user
  const activeProfile = freshUser?.profile ?? profile
  const showUnverifiedBanner =
    activeUser && !activeUser.is_verified && activeUser.role !== 'guest'

  const { data: history = [] } = useQuery({
    queryKey: ['game-history'],
    queryFn: () => gamesApi.history().then((r) => r.data as GameSummary[]),
    refetchInterval: 15000,
  })

  const stats = [
    { label: 'Wins', value: activeProfile?.wins ?? 0, color: 'text-emerald-400' },
    { label: 'Losses', value: activeProfile?.losses ?? 0, color: 'text-red-400' },
    { label: 'Draws', value: activeProfile?.draws ?? 0, color: 'text-yellow-400' },
    { label: 'Games Played', value: activeProfile?.games_played ?? 0, color: '' },
    { label: 'Blitz Rating', value: activeProfile?.rating_blitz ?? 1200, color: '' },
    {
      label: 'Win Rate',
      value:
        activeProfile && activeProfile.games_played > 0
          ? `${Math.round((activeProfile.wins / activeProfile.games_played) * 100)}%`
          : '—',
      color: '',
    },
  ]

  const finishedGames = history.filter((g) => g.status === 'finished' && g.result)

  return (
    <div className="space-y-8">
      {showUnverifiedBanner && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-4 text-sm text-amber-800 dark:text-amber-200"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-semibold">Verify your email address</p>
              <p className="mt-1 text-xs text-amber-700/90 dark:text-amber-300/90">
                {devVerifyUrl
                  ? 'Email was not sent — SMTP is not configured on the server. Use the link below to verify.'
                  : navState?.justRegistered
                    ? 'We sent a verification link to your inbox. Check spam if it does not arrive within a few minutes.'
                    : 'AI and online play require a verified email. Check your inbox or resend the link from settings.'}
              </p>
              {devVerifyUrl && (
                <div className="mt-3">
                  <DevEmailLink label="Verification link:" url={devVerifyUrl} />
                </div>
              )}
            </div>
            <Link to="/settings" className="btn-primary shrink-0 py-2 text-sm">
              Verify now
            </Link>
          </div>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-3xl font-bold">
          Welcome, <span className="text-emerald-400">{user?.username}</span>
        </h1>
        <p className="mt-2 text-gray-400">Your chess command center</p>
      </motion.div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-panel p-6"
          >
            <p className="text-sm text-gray-400">{s.label}</p>
            <p className={`mt-2 text-3xl font-bold ${s.color}`}>{s.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-panel p-6">
          <h2 className="text-lg font-semibold">Your Profile</h2>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Username</span>
              <span>{activeUser?.username ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Email</span>
              <span className="truncate pl-4 text-right">{activeUser?.email ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Age</span>
              <span>
                {activeProfile?.date_of_birth
                  ? (ageFromDateOfBirth(activeProfile.date_of_birth) ?? '—')
                  : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Gender</span>
              <span>{genderLabel(activeProfile?.gender)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Country</span>
              <span>{countryLabel(activeProfile?.country)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Email verified</span>
              <span className={activeUser?.is_verified ? 'text-emerald-400' : 'text-yellow-400'}>
                {activeUser?.is_verified ? 'Yes' : 'Pending'}
              </span>
            </div>
          </div>
          <Link to="/settings" className="btn-secondary mt-4 inline-block text-sm">
            Edit profile
          </Link>
        </div>

        <div className="glass-panel p-6">
          <h2 className="text-lg font-semibold">Quick Play</h2>
          <p className="mt-2 text-sm text-gray-400">
            {isOnline
              ? 'Find a random opponent online, or play offline on this device'
              : 'You are offline — use same-device or vs AI modes'}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {isOnline ? (
              <Link to="/play/online?match=1" className="btn-primary">
                Play Online
              </Link>
            ) : (
              <span className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-200">
                Online unavailable
              </span>
            )}
            <Link to="/play" className="btn-secondary">
              Play Offline
            </Link>
            <Link to="/play/ai" className="btn-secondary">
              Play vs AI
            </Link>
            <Link to="/rankings" className="btn-secondary">
              Rankings
            </Link>
            <Link to="/friends" className="btn-secondary">
              Friends
            </Link>
            <Link to="/puzzles" className="btn-secondary">
              Puzzles
            </Link>
          </div>
        </div>

        <div className="glass-panel p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold">System Status</h2>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">API</span>
              <span className={health?.status === 'healthy' ? 'text-emerald-400' : 'text-yellow-400'}>
                {health?.status ?? 'checking...'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Database</span>
              <span className={health?.database === 'ok' ? 'text-emerald-400' : 'text-red-400'}>
                {health?.database ?? '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Redis</span>
              <span className={health?.redis === 'ok' ? 'text-emerald-400' : 'text-red-400'}>
                {health?.redis ?? '—'}
              </span>
            </div>
          </div>
          {health?.status !== 'healthy' && (
            <p className="mt-3 text-xs text-yellow-400">
              Online play needs the backend running — use .\run_backend.ps1
            </p>
          )}
        </div>
      </div>

      <div className="glass-panel p-6">
        <h2 className="text-lg font-semibold">Recent Games</h2>
        {finishedGames.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">
            No finished games yet. Play vs AI or online to build your record.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-gray-400">
                  <th className="pb-2 pr-4">Result</th>
                  <th className="pb-2 pr-4">Mode</th>
                  <th className="pb-2 pr-4">Score</th>
                  <th className="pb-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {finishedGames.slice(0, 10).map((game) => {
                  const outcome = outcomeLabel(game, user!.id)
                  return (
                    <tr key={game.id} className="border-b border-white/5">
                      <td className={`py-2 pr-4 font-medium ${outcome.className}`}>{outcome.text}</td>
                      <td className="py-2 pr-4 capitalize text-gray-300">{game.mode}</td>
                      <td className="py-2 pr-4 font-mono text-gray-300">{game.result}</td>
                      <td className="py-2 text-gray-500">
                        {game.finished_at
                          ? new Date(game.finished_at).toLocaleDateString()
                          : new Date(game.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
