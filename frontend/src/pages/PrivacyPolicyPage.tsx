import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold text-emerald-400">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-gray-300">{children}</div>
    </section>
  )
}

export default function PrivacyPolicyPage() {
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-3xl pb-12"
    >
      <header>
        <h1 className="text-3xl font-bold md:text-4xl">Privacy Policy</h1>
        <p className="mt-2 text-sm text-gray-400">Last updated: June 28, 2026</p>
        <p className="mt-4 text-gray-300">
          ChessMaster Pro (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates the ChessMaster Pro mobile
          app and web service. This policy explains how we collect, use, and protect your information when
          you create an account, play games, or use online features.
        </p>
      </header>

      <LegalSection title="Information we collect">
        <p>
          <strong className="text-white">Account information:</strong> When you register, we collect your
          email address, username, and a hashed password. Optional profile fields may include country,
          biography, and avatar URL.
        </p>
        <p>
          <strong className="text-white">Game data:</strong> We store chess games you play — moves, results,
          time controls, room codes, and timestamps — so you can view history and resume online sessions.
        </p>
        <p>
          <strong className="text-white">Gameplay communications:</strong> In-game chat messages during
          online matches are transmitted through our servers to deliver them to your opponent.
        </p>
        <p>
          <strong className="text-white">Technical data:</strong> Our servers log standard request metadata
          (IP address, user agent, timestamps) for security, abuse prevention, and troubleshooting. JWT
          tokens authenticate API and WebSocket connections.
        </p>
        <p>
          <strong className="text-white">Preferences:</strong> Theme, board style, and app settings may be
          stored on our servers when you are signed in, and locally in your browser or app storage.
        </p>
      </LegalSection>

      <LegalSection title="How we use your information">
        <ul className="list-inside list-disc space-y-2">
          <li>Provide account registration, login, and session management</li>
          <li>Enable real-time multiplayer via WebSockets and matchmaking</li>
          <li>Persist game records, statistics, and match history</li>
          <li>Deliver in-game chat and game-state synchronization</li>
          <li>Improve reliability, prevent fraud, and enforce our Terms of Service</li>
          <li>Send account-related email (e.g., verification) when you request it</li>
        </ul>
      </LegalSection>

      <LegalSection title="Real-time connections">
        <p>
          Online play uses secure WebSocket connections (<code className="text-emerald-300">wss://</code>)
          to your game server. Messages include moves, clock updates, draw offers, and chat. Connections
          require a valid access token tied to your account.
        </p>
      </LegalSection>

      <LegalSection title="Data sharing">
        <p>
          We do not sell your personal information. We share data only with infrastructure providers that
          host our API and database (e.g., cloud hosting), under contracts that require appropriate
          safeguards, or when required by law.
        </p>
        <p>
          Your username and game activity may be visible to opponents during matches (e.g., moves, chat,
          result).
        </p>
      </LegalSection>

      <LegalSection title="Data retention">
        <p>
          Account and game data are retained while your account is active. You may request account deletion
          by contacting us; we will remove or anonymize personal data within a reasonable period, subject
          to legal retention requirements.
        </p>
      </LegalSection>

      <LegalSection title="Security">
        <p>
          Passwords are stored using industry-standard hashing. API access uses short-lived JWT access
          tokens and refresh tokens. Always use a strong, unique password and keep your device secure.
        </p>
      </LegalSection>

      <LegalSection title="Children">
        <p>
          ChessMaster Pro is not directed at children under 13. We do not knowingly collect personal
          information from children under 13. Contact us if you believe a child has provided us data.
        </p>
      </LegalSection>

      <LegalSection title="Your choices">
        <ul className="list-inside list-disc space-y-2">
          <li>Update profile information in Settings</li>
          <li>Sign out to end your session on a device</li>
          <li>Contact us to request access, correction, or deletion of your data</li>
        </ul>
      </LegalSection>

      <LegalSection title="Changes">
        <p>
          We may update this policy from time to time. We will post the revised version in the app and
          update the &quot;Last updated&quot; date. Continued use after changes constitutes acceptance.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Questions about this Privacy Policy:{' '}
          <a href="mailto:support@chessmaster.pro" className="text-emerald-400 hover:underline">
            support@chessmaster.pro
          </a>
        </p>
        <p className="mt-4">
          See also our{' '}
          <Link to="/terms" className="text-emerald-400 hover:underline">
            Terms of Service
          </Link>
          .
        </p>
      </LegalSection>
    </motion.article>
  )
}
