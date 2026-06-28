/** One-time purchase catalog — mirrors backend product_catalog.py for UI and Phase 2 Google Play. */

export type PurchaseType = 'one_time' | 'free'

export interface ProductTier {
  id: string
  label: string
  description: string
  priceCents: number
  level: number
  purchaseType: PurchaseType
  /** Google Play in-app product ID (Phase 2). Null for free tiers. */
  googlePlayProductId: string | null
  timeControlSeconds?: number
  incrementSeconds?: number
}

function tier(
  id: string,
  label: string,
  description: string,
  priceCents: number,
  level: number,
  googlePlayProductId: string | null,
  time?: { seconds: number; increment: number },
): ProductTier {
  return {
    id,
    label,
    description,
    priceCents,
    level,
    purchaseType: priceCents > 0 ? 'one_time' : 'free',
    googlePlayProductId,
    ...(time ? { timeControlSeconds: time.seconds, incrementSeconds: time.increment } : {}),
  }
}

export const AI_PRODUCTS: ProductTier[] = [
  tier('beginner', 'Beginner', 'Makes occasional mistakes — free for everyone', 0, 1, null),
  tier('intermediate', 'Intermediate', 'Solid club-level play', 499, 2, 'cmp_ai_intermediate'),
  tier('advanced', 'Advanced', 'Strong tactical play', 999, 3, 'cmp_ai_advanced'),
  tier('expert', 'Expert', 'Best available engine strength', 1499, 4, 'cmp_ai_expert'),
]

export const ONLINE_PRODUCTS: ProductTier[] = [
  tier('bullet', 'Bullet 1+0', 'Ultra-fast 1 minute games', 499, 1, 'cmp_online_bullet', {
    seconds: 60,
    increment: 0,
  }),
  tier('blitz', 'Blitz 3+2', 'Quick blitz — free for everyone', 0, 2, null, {
    seconds: 180,
    increment: 2,
  }),
  tier('rapid', 'Rapid 10+0', 'Standard rapid time control', 999, 3, 'cmp_online_rapid', {
    seconds: 600,
    increment: 0,
  }),
  tier('classical', 'Classical 30+0', 'Long classical games', 1499, 4, 'cmp_online_classical', {
    seconds: 1800,
    increment: 0,
  }),
]

export function formatPrice(cents: number): string {
  if (cents === 0) return 'Free'
  return `$${(cents / 100).toFixed(2)}`
}

export function formatOneTimePrice(cents: number): string {
  if (cents === 0) return 'Free'
  return `${formatPrice(cents)} one-time`
}

export function buyLabel(label: string, priceCents: number): string {
  if (priceCents === 0) return label
  return `Buy ${label} — ${formatOneTimePrice(priceCents)}`
}
