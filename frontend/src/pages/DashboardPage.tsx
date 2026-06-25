import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import { RootState } from '../store'
import { authApi, gamesApi, healthApi } from '../services/api'

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
  const user = useSelector((s: RootState) => s.auth.user)
  const profile = user?.profile

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

  const activeProfile = freshUser?.profile ?? profile

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
          <h2 className="text-lg font-semibold">Quick Play</h2>
          <p className="mt-2 text-sm text-gray-400">
            Play vs AI, practice locally, or find an online opponent
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link to="/play/ai" className="btn-primary">
              Play vs AI
            </Link>
            <Link to="/play/online" className="btn-secondary">
              Play Online
            </Link>
            <Link to="/play" className="btn-secondary">
              Local Board
            </Link>
          </div>
        </div>

        <div className="glass-panel p-6">
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
