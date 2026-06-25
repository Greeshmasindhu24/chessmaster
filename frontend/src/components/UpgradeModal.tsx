import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { billingApi, formatNetworkError } from '../services/api'

export interface TierInfo {
  id: string
  label: string
  description: string
  price_cents: number
  price_display: string
  level: number
  unlocked: boolean
  requires_payment: boolean
  time_control_seconds?: number
  increment_seconds?: number
}

/** @deprecated use TierInfo */
export type AiTierInfo = TierInfo

interface UpgradeModalProps {
  tier: TierInfo | null
  product: 'ai' | 'online'
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function UpgradeModal({ tier, product, open, onClose, onSuccess }: UpgradeModalProps) {
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvc, setCvc] = useState('')
  const [cardholderName, setCardholderName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tier) return
    setLoading(true)
    setError('')
    try {
      const purchase =
        product === 'online'
          ? billingApi.purchaseOnlineTier(tier.id, {
              card_number: cardNumber,
              expiry,
              cvc,
              cardholder_name: cardholderName,
            })
          : billingApi.purchaseAiTier(tier.id, {
              card_number: cardNumber,
              expiry,
              cvc,
              cardholder_name: cardholderName,
            })
      await purchase
      onSuccess()
      onClose()
    } catch (err) {
      setError(formatNetworkError(err, 'complete payment') || 'Payment failed')
    } finally {
      setLoading(false)
    }
  }

  if (!tier) return null

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="glass-panel w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">
                  Unlock {tier.label}
                  {product === 'ai' ? ' AI' : ' Online'}
                </h2>
                <p className="mt-1 text-sm text-gray-400">{tier.description}</p>
              </div>
              <span className="rounded-lg bg-emerald-600/20 px-3 py-1 text-lg font-bold text-emerald-400">
                {tier.price_display}
              </span>
            </div>

            <form onSubmit={handlePay} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs text-gray-400">Cardholder name</label>
                <input
                  className="input-field"
                  value={cardholderName}
                  onChange={(e) => setCardholderName(e.target.value)}
                  placeholder="Jane Doe"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-400">Card number</label>
                <input
                  className="input-field font-mono"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="0000 0000 0000 0000"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Expiry (MM/YY)</label>
                  <input
                    className="input-field font-mono"
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    placeholder="12/30"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">CVC</label>
                  <input
                    className="input-field font-mono"
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value)}
                    placeholder="123"
                    required
                  />
                </div>
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={onClose} className="btn-secondary flex-1 py-2.5">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="btn-primary flex-1 py-2.5">
                  {loading ? 'Processing...' : `Pay ${tier.price_display}`}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
