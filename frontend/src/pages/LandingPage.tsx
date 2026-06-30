import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useSelector } from 'react-redux'
import { RootState } from '../store'
import EmailVerificationBadge from '../components/EmailVerificationBadge'
import { useOnlineStatus } from '../hooks/useOnlineStatus'

const playModes = [
  {
    icon: '⚡',
    title: 'Play Online',
    desc: 'Match a random opponent when you are connected',
    path: '/play/online',
    accent: 'from-amber-400/20 to-orange-500/10',
    glow: 'group-hover:shadow-amber-500/20',
    requiresOnline: true,
  },
  {
    icon: '♟️',
    title: 'Play Offline',
    desc: 'Two players on one device — no internet needed',
    path: '/play',
    accent: 'from-emerald-400/20 to-teal-500/10',
    glow: 'group-hover:shadow-emerald-500/20',
    requiresOnline: false,
  },
  {
    icon: '🤖',
    title: 'Play vs AI',
    desc: 'Stockfish opponents — works offline on your device',
    path: '/play/ai',
    accent: 'from-violet-400/20 to-purple-500/10',
    glow: 'group-hover:shadow-violet-500/20',
    requiresOnline: false,
  },
]

const socialModes = [
  {
    icon: '🏆',
    title: 'Rankings',
    desc: 'Blitz leaderboards and your standing',
    path: '/rankings',
    accent: 'from-yellow-400/20 to-amber-500/10',
    glow: 'group-hover:shadow-yellow-500/20',
  },
  {
    icon: '👥',
    title: 'Friends',
    desc: 'Add friends and challenge them',
    path: '/friends',
    accent: 'from-sky-400/20 to-blue-500/10',
    glow: 'group-hover:shadow-sky-500/20',
  },
  {
    icon: '🧩',
    title: 'Daily Puzzles',
    desc: 'Three fresh tactics every day',
    path: '/puzzles',
    accent: 'from-rose-400/20 to-pink-500/10',
    glow: 'group-hover:shadow-rose-500/20',
  },
]

const floatingPieces = ['♔', '♕', '♖', '♗', '♘', '♙']

function ChessBoardPattern() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.07] dark:opacity-[0.12]"
      aria-hidden
    >
      <defs>
        <pattern id="landing-board" width="64" height="64" patternUnits="userSpaceOnUse">
          <rect width="32" height="32" fill="currentColor" className="text-emerald-500" />
          <rect x="32" y="32" width="32" height="32" fill="currentColor" className="text-emerald-500" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#landing-board)" />
    </svg>
  )
}

function ModeCard({
  mode,
  index,
  isAuthenticated,
  isOnline,
}: {
  mode: (typeof playModes)[number] | (typeof socialModes)[number]
  index: number
  isAuthenticated: boolean
  isOnline: boolean
}) {
  const requiresOnline = 'requiresOnline' in mode && mode.requiresOnline
  const disabled = requiresOnline && !isOnline
  const targetPath = isAuthenticated ? mode.path : '/register'
  const onlinePath = requiresOnline && isOnline ? `${mode.path}?match=1` : targetPath

  const card = (
    <div
      className={`group relative block overflow-hidden rounded-2xl border border-emerald-500/20 bg-white/70 p-6 shadow-lg backdrop-blur-xl transition duration-300 hover:border-emerald-400/50 hover:shadow-2xl ${mode.glow} dark:border-white/10 dark:bg-white/[0.07] dark:hover:border-emerald-400/40 ${
        disabled ? 'pointer-events-none opacity-50' : ''
      }`}
    >
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${mode.accent} opacity-0 transition group-hover:opacity-100`}
        aria-hidden
      />
      <div className="relative">
        <motion.span
          className="inline-block text-4xl"
          whileHover={{ scale: 1.15, rotate: 5 }}
          transition={{ type: 'spring', stiffness: 400 }}
        >
          {mode.icon}
        </motion.span>
        <h3 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">{mode.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">{mode.desc}</p>
        {disabled && (
          <p className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-400">
            Requires internet — use Offline or vs AI instead
          </p>
        )}
        <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 transition group-hover:gap-2 dark:text-emerald-400">
          {isAuthenticated ? (requiresOnline && isOnline ? 'Find match' : 'Play now') : 'Get started'}
          <span aria-hidden>→</span>
        </span>
      </div>
    </div>
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.08 * index }}
      whileHover={disabled ? undefined : { y: -6 }}
    >
      {disabled ? card : <Link to={onlinePath}>{card}</Link>}
    </motion.div>
  )
}

export default function LandingPage() {
  const { isAuthenticated, user } = useSelector((s: RootState) => s.auth)
  const isOnline = useOnlineStatus()

  return (
    <div className="relative space-y-24 overflow-hidden pb-8">
      {isAuthenticated && user && !user.is_verified && user.role !== 'guest' && (
        <EmailVerificationBadge user={user} variant="strip" />
      )}

      {!isOnline && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          You are offline. Online matchmaking is unavailable — use{' '}
          <Link to="/play" className="font-medium underline">
            Offline
          </Link>{' '}
          or{' '}
          <Link to="/play/ai" className="font-medium underline">
            vs AI
          </Link>{' '}
          to keep playing.
        </div>
      )}

      {/* Hero */}
      <section className="relative -mx-4 overflow-hidden rounded-3xl px-4 py-20 sm:-mx-0 sm:px-8 md:py-28">
        <ChessBoardPattern />

        <div
          className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-emerald-400/30 blur-3xl dark:bg-emerald-500/25"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-16 top-12 h-80 w-80 rounded-full bg-teal-400/25 blur-3xl dark:bg-teal-500/20"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute bottom-0 left-1/2 h-64 w-96 -translate-x-1/2 rounded-full bg-cyan-300/20 blur-3xl dark:bg-cyan-400/15"
          aria-hidden
        />

        {floatingPieces.map((piece, i) => (
          <motion.span
            key={piece}
            className="pointer-events-none absolute select-none text-3xl opacity-20 dark:opacity-25 md:text-5xl"
            style={{
              left: `${8 + i * 15}%`,
              top: `${12 + (i % 3) * 22}%`,
            }}
            animate={{
              y: [0, -12, 0],
              rotate: [0, i % 2 === 0 ? 6 : -6, 0],
            }}
            transition={{
              duration: 4 + i * 0.4,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.3,
            }}
            aria-hidden
          >
            {piece}
          </motion.span>
        ))}

        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-4 py-1.5 text-sm font-medium text-emerald-700 shadow-lg shadow-emerald-500/10 backdrop-blur-sm dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-300"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            {isOnline ? 'Online · Random matchmaking' : 'Offline mode available'} · Stockfish AI
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-extrabold leading-[1.1] tracking-tight md:text-7xl lg:text-8xl"
          >
            <span className="text-gray-900 dark:text-white">Master Chess.</span>
            <br />
            <span className="bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 bg-clip-text text-transparent drop-shadow-sm">
              Anytime. Anywhere.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-600 dark:text-gray-200 md:text-xl"
          >
            Play online against random opponents when connected, or go offline for same-device
            two-player games and AI — all in one premium chess experience.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          >
            <Link
              to={
                isAuthenticated
                  ? isOnline
                    ? '/play/online?match=1'
                    : '/play'
                  : '/register'
              }
              className="group relative inline-flex items-center justify-center overflow-hidden rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-8 py-4 text-lg font-bold text-white shadow-xl shadow-emerald-500/30 transition hover:scale-[1.03] hover:shadow-emerald-500/45 active:scale-[0.98]"
            >
              <span className="relative z-10">
                {isAuthenticated
                  ? isOnline
                    ? 'Find Online Match'
                    : 'Play Offline'
                  : 'Start Playing Free'}
              </span>
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition group-hover:translate-x-full duration-700" />
            </Link>
            <Link
              to={isAuthenticated ? '/play/ai' : '/login'}
              className="inline-flex items-center justify-center rounded-xl border-2 border-emerald-500/40 bg-white/60 px-8 py-4 text-lg font-semibold text-emerald-700 backdrop-blur-sm transition hover:border-emerald-500/60 hover:bg-white/80 dark:border-emerald-400/40 dark:bg-white/5 dark:text-emerald-300 dark:hover:bg-white/10"
            >
              {isAuthenticated ? 'Play vs AI' : 'Sign In'}
            </Link>
          </motion.div>

          {!isAuthenticated && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="mt-5 text-sm text-gray-500 dark:text-gray-300"
            >
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-emerald-600 hover:underline dark:text-emerald-400">
                Sign in
              </Link>
            </motion.p>
          )}

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-14 grid grid-cols-3 gap-4 border-t border-emerald-500/20 pt-10 sm:gap-8"
          >
            {[
              { value: isOnline ? 'Live' : 'Off', label: 'Connection' },
              { value: '∞', label: 'Offline practice' },
              { value: '24/7', label: 'Online play' },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 md:text-3xl">
                  {stat.value}
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-300 sm:text-sm">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Play modes */}
      <section>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-10 text-center"
        >
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white md:text-4xl">
            Choose your battlefield
          </h2>
          <p className="mt-3 text-gray-600 dark:text-gray-300">
            Online when connected, offline when you are not — pick your mode and jump in.
          </p>
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {playModes.map((f, i) => (
            <ModeCard
              key={f.title}
              mode={f}
              index={i}
              isAuthenticated={isAuthenticated}
              isOnline={isOnline}
            />
          ))}
        </div>
      </section>

      {/* Social & extras — horizontal row like dashboard quick links */}
      <section>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-6 text-center"
        >
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white md:text-3xl">
            Community
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Rankings, friends, and daily puzzles
          </p>
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {socialModes.map((f, i) => (
            <ModeCard
              key={f.title}
              mode={f}
              index={i}
              isAuthenticated={isAuthenticated}
              isOnline={isOnline}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
