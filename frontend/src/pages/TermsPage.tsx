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

export default function TermsPage() {
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-3xl pb-12"
    >
      <header>
        <h1 className="text-3xl font-bold md:text-4xl">Terms of Service</h1>
        <p className="mt-2 text-sm text-gray-400">Last updated: June 28, 2026</p>
        <p className="mt-4 text-gray-300">
          These Terms of Service (&quot;Terms&quot;) govern your use of ChessMaster Pro, including our
          website, mobile app, online multiplayer, and related services. By creating an account or using
          the service, you agree to these Terms.
        </p>
      </header>

      <LegalSection title="Eligibility">
        <p>
          You must be at least 13 years old to use ChessMaster Pro. If you are under 18, you represent
          that you have permission from a parent or guardian. You are responsible for maintaining the
          confidentiality of your account credentials.
        </p>
      </LegalSection>

      <LegalSection title="Accounts">
        <p>
          You agree to provide accurate registration information and to keep it updated. One person may
          not maintain multiple accounts for abuse purposes (e.g., rating manipulation or harassment).
          We may suspend or terminate accounts that violate these Terms.
        </p>
      </LegalSection>

      <LegalSection title="Use of the service">
        <p>You may use ChessMaster Pro to play chess, including:</p>
        <ul className="list-inside list-disc space-y-2">
          <li>Local practice on your device</li>
          <li>Games against AI opponents</li>
          <li>Real-time online multiplayer via our WebSocket game server</li>
          <li>Viewing your game history and profile statistics</li>
        </ul>
        <p className="mt-3">You agree not to:</p>
        <ul className="list-inside list-disc space-y-2">
          <li>Use engines, bots, or assistance during rated or fair-play online games unless explicitly allowed</li>
          <li>Harass, threaten, or send abusive content in chat</li>
          <li>Attempt to disrupt servers, exploit bugs, or access others&apos; accounts</li>
          <li>Reverse engineer or scrape the service in violation of applicable law</li>
          <li>Use the service for any unlawful purpose</li>
        </ul>
      </LegalSection>

      <LegalSection title="Online play and game data">
        <p>
          Online matches are synchronized through our servers. Moves, clocks, results, and optional chat
          are stored to provide game history and fair play. Disconnects may affect game outcomes according
          to server rules and time controls in effect at the time of the game.
        </p>
      </LegalSection>

      <LegalSection title="In-app purchases">
        <p>
          Some features (e.g., advanced AI or online time controls) may require payment. Prices and
          availability are shown in the app. Purchases are subject to the payment platform&apos;s terms
          (Google Play). Refunds follow Google Play refund policies unless otherwise required by law.
        </p>
      </LegalSection>

      <LegalSection title="Intellectual property">
        <p>
          ChessMaster Pro, its branding, software, and design are owned by us or our licensors. Chess
          rules are public domain; our implementation, artwork, and code are protected. You receive a
          limited, non-exclusive license to use the app for personal, non-commercial play.
        </p>
      </LegalSection>

      <LegalSection title="Disclaimer">
        <p>
          The service is provided &quot;as is&quot; without warranties of uninterrupted availability.
          Online features require an internet connection. We do not guarantee error-free move validation
          in all edge cases, though we strive for accuracy using established chess libraries.
        </p>
      </LegalSection>

      <LegalSection title="Limitation of liability">
        <p>
          To the maximum extent permitted by law, we are not liable for indirect, incidental, or
          consequential damages arising from your use of ChessMaster Pro. Our total liability for any
          claim related to the service is limited to the amount you paid us in the twelve months before
          the claim, or zero if you used only free features.
        </p>
      </LegalSection>

      <LegalSection title="Termination">
        <p>
          You may stop using the service at any time. We may suspend or terminate access for violations
          of these Terms or to protect the community. Provisions that by nature should survive
          (limitations of liability, governing law) will survive termination.
        </p>
      </LegalSection>

      <LegalSection title="Changes">
        <p>
          We may modify these Terms or the service. Material changes will be indicated by updating the
          date above. Continued use after changes constitutes acceptance.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Questions about these Terms:{' '}
          <a href="mailto:support@chessmaster.pro" className="text-emerald-400 hover:underline">
            support@chessmaster.pro
          </a>
        </p>
        <p className="mt-4">
          See also our{' '}
          <Link to="/privacy" className="text-emerald-400 hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </LegalSection>
    </motion.article>
  )
}
