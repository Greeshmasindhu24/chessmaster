import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { rankingsApi } from '../services/api'

export default function RankingsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['rankings-blitz'],
    queryFn: () => rankingsApi.blitz(50).then((r) => r.data),
  })

  const entries = data?.entries ?? []

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Rankings</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">Blitz leaderboard by rating.</p>
      </div>

      <div className="glass-panel overflow-hidden p-0">
        {isLoading ? (
          <p className="p-6 text-sm text-gray-500">Loading leaderboard...</p>
        ) : error ? (
          <p className="p-6 text-sm text-red-400">Could not load rankings.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-black/10 bg-black/5 text-xs uppercase text-gray-500 dark:border-white/10 dark:bg-white/5">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Player</th>
                <th className="px-4 py-3">Rating</th>
                <th className="px-4 py-3">Games</th>
                <th className="px-4 py-3">Wins</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.user_id} className="border-b border-black/5 dark:border-white/5">
                  <td className="px-4 py-3 text-gray-500">{e.rank}</td>
                  <td className="px-4 py-3 font-medium">{e.username}</td>
                  <td className="px-4 py-3 text-emerald-400">{e.rating_blitz}</td>
                  <td className="px-4 py-3 text-gray-500">{e.games_played}</td>
                  <td className="px-4 py-3 text-gray-500">{e.wins}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </motion.div>
  )
}
