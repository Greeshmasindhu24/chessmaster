import { useCallback, useMemo, useState } from 'react'
import { Chess, Square } from 'chess.js'
import { motion } from 'framer-motion'
import ClickChessboard from '../components/ClickChessboard'
import { cloneChess } from '../utils/chessDisplay'
import { getDailyPuzzles, type DailyPuzzle } from '../utils/dailyPuzzle'
import { validatePuzzle } from '../utils/puzzleValidation'
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

function createPuzzleState(puzzle: DailyPuzzle): PuzzlePlayState | null {
  const validation = validatePuzzle(puzzle)
  if (!validation.valid) {
    console.warn(`Skipping invalid puzzle "${puzzle.id}":`, validation.issues.join('; '))
    return null
  }

  try {
    return {
      game: new Chess(puzzle.fen),
      fen: puzzle.fen,
      moveIndex: 0,
      solved: false,
      status: 'Find the best move',
      showHint: false,
    }
  } catch {
    console.warn(`Skipping invalid puzzle "${puzzle.id}": could not load FEN`)
    return null
  }
}

function HowToPlayGuide() {
  return (
    <details className="glass-panel group mb-6 overflow-hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 transition-colors hover:bg-white/[0.03] sm:p-5 [&::-webkit-details-marker]:hidden">
        <span className="font-semibold text-gray-100">How to play</span>
        <span
          className="shrink-0 text-sm text-gray-400 transition-transform group-open:rotate-180"
          aria-hidden
        >
          ▼
        </span>
      </summary>
      <div className="border-t border-white/10 px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
        <ul className="space-y-3 text-sm leading-relaxed text-gray-400">
          <li>
            <span className="font-medium text-gray-300">Daily puzzles.</span> You get three puzzles
            each day — the same three for every player. They refresh at midnight and change
            tomorrow.
          </li>
          <li>
            <span className="font-medium text-gray-300">Click to move.</span> Tap a piece (
            <span className="text-gray-300" aria-hidden>
              ♙ ♟ ♘ ♞ ♗ ♝ ♖ ♜ ♕ ♛ ♔ ♚
            </span>
            ), then tap its destination. Squares are labeled by file{' '}
            <span className="font-mono text-gray-300">a</span>–
            <span className="font-mono text-gray-300">h</span> and rank{' '}
            <span className="font-mono text-gray-300">1</span>–
            <span className="font-mono text-gray-300">8</span>. Legal squares show as{' '}
            <span className="text-gray-300">dots</span> on the board.
          </li>
          <li>
            <span className="font-medium text-gray-300">Correct moves.</span> Your move must match
            the puzzle&apos;s solution line. Other legal moves show{' '}
            <span className="text-gray-300">&ldquo;Not the best move&mdash;try again&rdquo;</span>{' '}
            — keep trying until you find the best line.
          </li>
          <li>
            <span className="font-medium text-gray-300">Multi-move puzzles.</span> Some puzzles need
            several moves. After each correct move, the opponent&apos;s reply plays automatically
            until you finish the full solution.
          </li>
          <li>
            <span className="font-medium text-gray-300">Hints.</span> Tap{' '}
            <span className="text-gray-300">Show hint</span> in the sidebar for a text clue. Tap
            again to hide it.
          </li>
          <li>
            <span className="font-medium text-gray-300">Reset.</span> Restarts the current puzzle
            from the starting position so you can replay it.
          </li>
          <li>
            <span className="font-medium text-gray-300">Progress.</span> Use the{' '}
            <span className="text-gray-300">Puzzle 1 / 2 / 3</span> tabs to switch puzzles. The{' '}
            <span className="text-gray-300">X/3 solved</span> counter tracks how many you&apos;ve
            completed today.
          </li>
          <li>
            <span className="font-medium text-gray-300">Sounds.</span> Move and capture (
            <span className="font-mono text-gray-300">x</span>) sounds play when sound is enabled in
            Settings.
          </li>
        </ul>
        <div className="mt-4 border-t border-white/10 pt-4">
          <h3 className="mb-2 text-sm font-semibold text-gray-200">Notation symbols</h3>
          <ul className="space-y-1.5 text-sm leading-relaxed text-gray-400">
            <li>
              <span className="font-mono font-medium text-gray-300">+</span> — check
            </li>
            <li>
              <span className="font-mono font-medium text-gray-300">#</span> — checkmate
            </li>
            <li>
              <span className="font-mono font-medium text-gray-300">x</span> — capture
            </li>
            <li>
              <span className="font-mono font-medium text-gray-300">O-O</span> — kingside castling
            </li>
            <li>
              <span className="font-mono font-medium text-gray-300">O-O-O</span> — queenside castling
            </li>
            <li>
              <span className="font-mono font-medium text-gray-300">=Q</span> — pawn promotes to queen
            </li>
          </ul>
        </div>
      </div>
    </details>
  )
}

export default function PuzzlesPage() {
  const puzzles = useMemo(() => getDailyPuzzles(), [])

  if (puzzles.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-4xl">
        <h1 className="mb-2 text-2xl font-bold">Daily Puzzles</h1>
        <p className="text-sm text-gray-400">No puzzles available right now. Check back soon.</p>
      </motion.div>
    )
  }

  return <PuzzlesPageContent puzzles={puzzles} />
}

function PuzzlesPageContent({ puzzles }: { puzzles: DailyPuzzle[] }) {
  const { playAfterMove } = useChessSounds()
  const [activeIndex, setActiveIndex] = useState(0)
  const [states, setStates] = useState<PuzzlePlayState[]>(() =>
    puzzles.map(createPuzzleState).filter((state): state is PuzzlePlayState => state !== null),
  )

  const puzzle = puzzles[activeIndex]
  const { game, fen, solved, status, showHint } = states[activeIndex]
  const solvedCount = states.filter((s) => s.solved).length
  const allSolved = solvedCount === puzzles.length

  const resetPuzzle = useCallback(() => {
    const next = createPuzzleState(puzzles[activeIndex])
    if (!next) return
    setStates((prev) => prev.map((s, i) => (i === activeIndex ? next : s)))
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

      <HowToPlayGuide />

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
