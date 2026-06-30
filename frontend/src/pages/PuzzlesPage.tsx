import { useCallback, useMemo, useState } from 'react'
import { Chess, Square } from 'chess.js'
import { motion } from 'framer-motion'
import ClickChessboard from '../components/ClickChessboard'
import { cloneChess } from '../utils/chessDisplay'
import { getDailyPuzzle } from '../utils/dailyPuzzle'
import { useChessSounds } from '../hooks/useChessSounds'

function moveToUci(from: Square, to: Square, promotion?: string): string {
  return `${from}${to}${promotion ?? ''}`
}

export default function PuzzlesPage() {
  const puzzle = useMemo(() => getDailyPuzzle(), [])
  const { playAfterMove } = useChessSounds()
  const [game, setGame] = useState(() => new Chess(puzzle.fen))
  const [fen, setFen] = useState(puzzle.fen)
  const [moveIndex, setMoveIndex] = useState(0)
  const [solved, setSolved] = useState(false)
  const [status, setStatus] = useState('Find the best move')
  const [showHint, setShowHint] = useState(false)

  const resetPuzzle = useCallback(() => {
    const chess = new Chess(puzzle.fen)
    setGame(chess)
    setFen(puzzle.fen)
    setMoveIndex(0)
    setSolved(false)
    setStatus('Find the best move')
    setShowHint(false)
  }, [puzzle.fen])

  const onMove = useCallback(
    (from: Square, to: Square) => {
      if (solved) return false

      const chess = cloneChess(game)
      try {
        const move = chess.move({ from, to, promotion: 'q' })
        if (!move) return false

        const played = moveToUci(from, to, move.promotion)
        const expected = puzzle.solution[moveIndex]
        if (played !== expected) {
          setStatus('Not the best move — try again')
          return false
        }

        let nextIndex = moveIndex + 1
        while (nextIndex < puzzle.solution.length) {
          const uci = puzzle.solution[nextIndex]
          const replyFrom = uci.slice(0, 2) as Square
          const replyTo = uci.slice(2, 4) as Square
          const replyPromotion = uci.length > 4 ? uci[4] : undefined
          const reply = chess.move({
            from: replyFrom,
            to: replyTo,
            promotion: replyPromotion as 'q' | 'r' | 'b' | 'n' | undefined,
          })
          if (!reply) break
          playAfterMove(chess, reply)
          nextIndex += 1
        }

        setGame(chess)
        setFen(chess.fen())
        setMoveIndex(nextIndex)
        playAfterMove(chess, move)

        if (nextIndex >= puzzle.solution.length) {
          setSolved(true)
          setStatus('Puzzle solved!')
        } else {
          setStatus('Correct — keep going')
        }
        return true
      } catch {
        return false
      }
    },
    [game, moveIndex, playAfterMove, puzzle.solution, solved],
  )

  const sideLabel = game.turn() === 'w' ? 'White' : 'Black'

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-4xl">
      <h1 className="mb-2 text-2xl font-bold">Daily Puzzle</h1>
      <p className="mb-6 text-sm text-gray-400">
        {puzzle.title} — one fresh challenge each day from our puzzle bank.
      </p>

      <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
        <div className="glass-panel p-3 sm:p-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 sm:mb-4">
            <span className={`font-medium ${solved ? 'text-emerald-400' : 'text-emerald-300'}`}>{status}</span>
            <button type="button" onClick={resetPuzzle} className="btn-secondary py-2 text-sm">
              Reset
            </button>
          </div>
          <ClickChessboard fen={fen} onMove={onMove} maxBoardWidth={480} reservedHeight={300} />
        </div>

        <div className="glass-panel space-y-4 p-6">
          <div>
            <h2 className="font-semibold">Today&apos;s puzzle</h2>
            <p className="mt-1 text-sm text-gray-400">{sideLabel} to play</p>
          </div>
          <button
            type="button"
            onClick={() => setShowHint((v) => !v)}
            className="btn-secondary w-full py-2 text-sm"
          >
            {showHint ? 'Hide hint' : 'Show hint'}
          </button>
          {showHint && <p className="text-sm text-gray-400">{puzzle.hint}</p>}
          {solved && (
            <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
              Nice work! Come back tomorrow for a new puzzle.
            </p>
          )}
        </div>
      </div>
    </motion.div>
  )
}
