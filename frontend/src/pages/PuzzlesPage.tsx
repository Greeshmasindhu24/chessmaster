import { useCallback, useMemo, useState } from 'react'
import { Chess, Square } from 'chess.js'
import { motion } from 'framer-motion'
import ClickChessboard from '../components/ClickChessboard'
import { cloneChess } from '../utils/chessDisplay'
import { getDailyPuzzles, type DailyPuzzle } from '../utils/dailyPuzzle'
import { useChessSounds } from '../hooks/useChessSounds'

function moveToUci(from: Square, to: Square, promotion?: string): string {
  return `${from}${to}${promotion ?? ''}`
}

interface PuzzlePlayState {
  game: Chess
  fen: string
  moveIndex: number
  solved: boolean
  status: string
  showHint: boolean
}

function createPuzzleState(puzzle: DailyPuzzle): PuzzlePlayState {
  return {
    game: new Chess(puzzle.fen),
    fen: puzzle.fen,
    moveIndex: 0,
    solved: false,
    status: 'Find the best move',
    showHint: false,
  }
}

export default function PuzzlesPage() {
  const puzzles = useMemo(() => getDailyPuzzles(), [])
  const { playAfterMove } = useChessSounds()
  const [activeIndex, setActiveIndex] = useState(0)
  const [states, setStates] = useState<PuzzlePlayState[]>(() => puzzles.map(createPuzzleState))

  const puzzle = puzzles[activeIndex]
  const { game, fen, solved, status, showHint } = states[activeIndex]
  const solvedCount = states.filter((s) => s.solved).length
  const allSolved = solvedCount === puzzles.length

  const resetPuzzle = useCallback(() => {
    setStates((prev) =>
      prev.map((s, i) => (i === activeIndex ? createPuzzleState(puzzles[i]) : s)),
    )
  }, [activeIndex, puzzles])

  const onMove = useCallback(
    (from: Square, to: Square) => {
      const current = states[activeIndex]
      if (current.solved) return false

      const chess = cloneChess(current.game)
      try {
        const move = chess.move({ from, to, promotion: 'q' })
        if (!move) return false

        const played = moveToUci(from, to, move.promotion)
        const expected = puzzle.solution[current.moveIndex]
        if (played !== expected) {
          setStates((prev) =>
            prev.map((s, i) =>
              i === activeIndex ? { ...s, status: 'Not the best move — try again' } : s,
            ),
          )
          return false
        }

        let nextIndex = current.moveIndex + 1
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

        const isSolved = nextIndex >= puzzle.solution.length
        playAfterMove(chess, move)

        setStates((prev) =>
          prev.map((s, i) =>
            i === activeIndex
              ? {
                  ...s,
                  game: chess,
                  fen: chess.fen(),
                  moveIndex: nextIndex,
                  solved: isSolved,
                  status: isSolved ? 'Puzzle solved!' : 'Correct — keep going',
                }
              : s,
          ),
        )
        return true
      } catch {
        return false
      }
    },
    [activeIndex, playAfterMove, puzzle.solution, states],
  )

  const sideLabel = game.turn() === 'w' ? 'White' : 'Black'

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-4xl">
      <h1 className="mb-2 text-2xl font-bold">Daily Puzzles</h1>
      <p className="mb-4 text-sm text-gray-400">
        Three fresh challenges each day from our puzzle bank.
      </p>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {puzzles.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setActiveIndex(i)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              i === activeIndex
                ? 'bg-emerald-600 text-white'
                : states[i].solved
                  ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10'
            }`}
          >
            Puzzle {i + 1}
            {states[i].solved && ' ✓'}
          </button>
        ))}
        <span className="ml-auto text-sm text-gray-500">
          {solvedCount}/{puzzles.length} solved
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
        <div className="glass-panel p-3 sm:p-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 sm:mb-4">
            <span className={`font-medium ${solved ? 'text-emerald-400' : 'text-emerald-300'}`}>
              {status}
            </span>
            <button type="button" onClick={resetPuzzle} className="btn-secondary py-2 text-sm">
              Reset
            </button>
          </div>
          <ClickChessboard fen={fen} onMove={onMove} maxBoardWidth={480} reservedHeight={300} />
        </div>

        <div className="glass-panel space-y-4 p-6">
          <div>
            <h2 className="font-semibold">
              Puzzle {activeIndex + 1} of {puzzles.length}
            </h2>
            <p className="mt-1 text-sm font-medium text-gray-300">{puzzle.title}</p>
            <p className="mt-1 text-sm text-gray-400">{sideLabel} to play</p>
          </div>
          <button
            type="button"
            onClick={() =>
              setStates((prev) =>
                prev.map((s, i) =>
                  i === activeIndex ? { ...s, showHint: !s.showHint } : s,
                ),
              )
            }
            className="btn-secondary w-full py-2 text-sm"
          >
            {showHint ? 'Hide hint' : 'Show hint'}
          </button>
          {showHint && <p className="text-sm text-gray-400">{puzzle.hint}</p>}
          {solved && !allSolved && (
            <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
              Nice work! Try the next puzzle above.
            </p>
          )}
          {allSolved && (
            <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
              All three solved! Come back tomorrow for new puzzles.
            </p>
          )}
        </div>
      </div>
    </motion.div>
  )
}
