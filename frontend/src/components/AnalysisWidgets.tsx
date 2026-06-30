function evalToPercent(evalCp: number | null, mate: number | null): number {
  if (mate !== null && mate !== undefined) {
    return mate > 0 ? 98 : 2
  }
  if (evalCp === null || evalCp === undefined) return 50
  const clamped = Math.max(-800, Math.min(800, evalCp))
  return 50 + (clamped / 800) * 50
}

function formatEval(evalCp: number | null, mate: number | null): string {
  if (mate !== null && mate !== undefined) {
    return mate > 0 ? `M${mate}` : `-M${Math.abs(mate)}`
  }
  if (evalCp === null || evalCp === undefined) return '—'
  const pawns = evalCp / 100
  const sign = pawns > 0 ? '+' : ''
  return `${sign}${pawns.toFixed(1)}`
}

const QUALITY_STYLES: Record<string, string> = {
  best: 'text-emerald-400',
  good: 'text-teal-400',
  inaccuracy: 'text-yellow-400',
  mistake: 'text-orange-400',
  blunder: 'text-red-400',
  unknown: 'text-gray-400',
}

export function EvalBar({
  evalCp,
  mate,
  className = '',
}: {
  evalCp: number | null
  mate: number | null
  className?: string
}) {
  const whitePercent = evalToPercent(evalCp, mate)

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex justify-between text-xs text-gray-500">
        <span>Black</span>
        <span className="font-medium text-emerald-400">{formatEval(evalCp, mate)}</span>
        <span>White</span>
      </div>
      <div className="flex h-3 overflow-hidden rounded-full border border-black/10 dark:border-white/10">
        <div className="bg-gray-800 transition-all duration-500" style={{ width: `${100 - whitePercent}%` }} />
        <div className="bg-gray-100 transition-all duration-500" style={{ width: `${whitePercent}%` }} />
      </div>
    </div>
  )
}

export function MoveQualityBadge({ quality }: { quality: string }) {
  return (
    <span className={`text-xs font-medium capitalize ${QUALITY_STYLES[quality] ?? QUALITY_STYLES.unknown}`}>
      {quality}
    </span>
  )
}
