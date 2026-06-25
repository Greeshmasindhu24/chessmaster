import { useEffect, useRef } from 'react'
import { Chess } from 'chess.js'
import {
  blackCapturedUnicode,
  formatMovePairs,
  getCapturedPieces,
  whiteCapturedUnicode,
} from '../utils/chessDisplay'

interface MoveHistoryProps {
  chess: Chess
  /** Highlight the latest move pair (1-based move number). */
  highlightLatest?: boolean
  className?: string
}

function CapturedRow({
  label,
  pieces,
  renderPiece,
}: {
  label: string
  pieces: string[]
  renderPiece: (piece: string) => string
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-14 shrink-0 text-xs text-gray-500">{label}</span>
      <div className="flex min-h-[1.25rem] flex-wrap gap-0.5 text-lg leading-none">
        {pieces.length === 0 ? (
          <span className="text-xs text-gray-600">—</span>
        ) : (
          pieces.map((p, i) => (
            <span key={`${p}-${i}`} title={p.toUpperCase()}>
              {renderPiece(p)}
            </span>
          ))
        )}
      </div>
    </div>
  )
}

export default function MoveHistory({ chess, highlightLatest = true, className = '' }: MoveHistoryProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const sans = chess.history()
  const pairs = formatMovePairs(sans)
  const { byWhite, byBlack } = getCapturedPieces(chess)
  const latestNum = pairs.length > 0 ? pairs[pairs.length - 1].num : 0

  useEffect(() => {
    if (!highlightLatest || !scrollRef.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [sans.length, highlightLatest])

  return (
    <div className={`flex flex-col ${className}`}>
      <h3 className="mb-3 text-sm font-semibold text-gray-300">Move history</h3>

      <div className="mb-4 space-y-2 rounded-lg border border-white/5 bg-white/[0.02] p-3">
        <CapturedRow
          label="By White"
          pieces={byWhite}
          renderPiece={blackCapturedUnicode}
        />
        <CapturedRow
          label="By Black"
          pieces={byBlack}
          renderPiece={whiteCapturedUnicode}
        />
      </div>

      <div
        ref={scrollRef}
        className="min-h-[8rem] flex-1 overflow-y-auto rounded-lg border border-white/5 bg-black/20 p-2 font-mono text-sm"
      >
        {pairs.length === 0 ? (
          <p className="px-1 py-2 text-xs text-gray-500">No moves yet</p>
        ) : (
          <table className="w-full border-collapse">
            <tbody>
              {pairs.map(({ num, white, black }) => (
                <tr
                  key={num}
                  className={
                    highlightLatest && num === latestNum
                      ? 'bg-emerald-500/10 text-emerald-100'
                      : 'text-gray-300'
                  }
                >
                  <td className="w-8 pr-2 text-right text-xs text-gray-500">{num}.</td>
                  <td className="w-1/2 py-0.5 pr-2">{white}</td>
                  <td className="py-0.5 text-gray-400">{black ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
