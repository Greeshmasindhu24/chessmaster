import { Chess } from 'chess.js'
import type { DailyPuzzle } from '../data/dailyPuzzles'

export interface PuzzleValidationResult {
  valid: boolean
  issues: string[]
  sideToMove: 'w' | 'b' | null
  isCheckmate: boolean
  isCheck: boolean
}

function playUci(chess: Chess, uci: string) {
  const from = uci.slice(0, 2)
  const to = uci.slice(2, 4)
  const promotion = uci.length > 4 ? uci[4] : undefined
  return chess.move({ from, to, promotion })
}

export function validatePuzzle(puzzle: DailyPuzzle): PuzzleValidationResult {
  const issues: string[] = []
  let chess: Chess

  try {
    chess = new Chess(puzzle.fen)
  } catch {
    return {
      valid: false,
      issues: ['Invalid FEN'],
      sideToMove: null,
      isCheckmate: false,
      isCheck: false,
    }
  }

  const sideToMove = chess.turn()

  if (!chess.board().flat().some((p) => p?.type === 'k' && p.color === 'w')) {
    issues.push('Missing white king')
  }
  if (!chess.board().flat().some((p) => p?.type === 'k' && p.color === 'b')) {
    issues.push('Missing black king')
  }
  if (chess.isGameOver()) {
    issues.push('Position is already finished')
  }
  if (puzzle.solution.length === 0) {
    issues.push('Solution is empty')
  }

  for (let i = 0; i < puzzle.solution.length; i += 1) {
    const uci = puzzle.solution[i]
    const move = playUci(chess, uci)
    if (!move) {
      issues.push(`Illegal move ${i + 1}: ${uci}`)
      break
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    sideToMove,
    isCheckmate: chess.isCheckmate(),
    isCheck: chess.isCheck(),
  }
}
