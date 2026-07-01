import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

/** Legacy route — email verification is no longer required. */
export default function VerifyEmailPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const timer = setTimeout(() => navigate('/dashboard', { replace: true }), 2000)
    return () => clearTimeout(timer)
  }, [navigate])

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-md">
      <div className="glass-panel p-8 text-center">
        <h1 className="text-2xl font-bold">You&apos;re all set</h1>
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          Email verification is no longer required. Taking you to the game...
        </p>
        <p className="mt-6 text-sm">
          <Link to="/dashboard" className="text-emerald-600 hover:underline dark:text-emerald-400">
            Go to dashboard now
          </Link>
        </p>
      </div>
    </motion.div>
  )
}
