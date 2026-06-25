import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

const features = [
  { icon: '⚡', title: 'Live Multiplayer', desc: 'Real-time games with WebSocket sync' },
  { icon: '🤖', title: 'Play vs AI', desc: 'Stockfish-powered opponents at any level' },
  { icon: '🏆', title: 'Tournaments', desc: 'Swiss, Arena, Knockout & Round Robin' },
  { icon: '🧩', title: 'Puzzle Arena', desc: 'Daily puzzles and tactical training' },
  { icon: '📊', title: 'Game Analysis', desc: 'Accuracy, blunders, and eval graphs' },
  { icon: '👥', title: 'Social', desc: 'Friends, chat, and leaderboards' },
]

export default function LandingPage() {
  return (
    <div className="space-y-20">
      <section className="py-16 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl font-bold leading-tight md:text-7xl"
        >
          Master Chess.
          <br />
          <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
            Anytime. Anywhere.
          </span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mx-auto mt-6 max-w-2xl text-lg text-gray-400"
        >
          Enterprise-grade online chess platform with live multiplayer, AI opponents,
          tournaments, puzzles, and Stockfish analysis.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-10 flex flex-wrap justify-center gap-4"
        >
          <Link to="/register" className="btn-primary">
            Start Playing Free
          </Link>
          <Link to="/login" className="btn-secondary">
            Sign In
          </Link>
        </motion.div>
      </section>

      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * i }}
            className="glass-panel p-6"
          >
            <span className="text-3xl">{f.icon}</span>
            <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm text-gray-400">{f.desc}</p>
          </motion.div>
        ))}
      </section>
    </div>
  )
}
