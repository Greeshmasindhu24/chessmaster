import { Chess, Square } from 'chess.js'

const BLACK_PIECE_UNICODE: Record<string, string> = {
  p: '♟',
  n: '♞',
  b: '♝',
  r: '♜',
  q: '♛',
  k: '♚',
}

const WHITE_PIECE_UNICODE: Record<string, string> = {
  p: '♙',
  n: '♘',
  b: '♗',
  r: '♖',
  q: '♕',
  k: '♔',
}

const PIECE_VALUE_ORDER = ['q', 'r', 'b', 'n', 'p']

export interface MovePair {
  num: number
  white: string
  black?: string
}

export function formatMovePairs(sans: string[]): MovePair[] {
  const pairs: MovePair[] = []
  for (let i = 0; i < sans.length; i += 2) {
    pairs.push({
      num: Math.floor(i / 2) + 1,
      white: sans[i],
      black: sans[i + 1],
    })
  }
  return pairs
}

function sortCaptures(pieces: string[]): string[] {
  const counts: Record<string, number> = {}
  for (const p of pieces) counts[p] = (counts[p] || 0) + 1
  const sorted: string[] = []
  for (const p of PIECE_VALUE_ORDER) {
    for (let i = 0; i < (counts[p] || 0); i++) sorted.push(p)
  }
  return sorted
}

/** Pieces captured by white (black pieces) and by black (white pieces). */
export function getCapturedPieces(chess: Chess) {
  const byWhite: string[] = []
  const byBlack: string[] = []
  for (const move of chess.history({ verbose: true })) {
    if (!move.captured) continue
    if (move.color === 'w') byWhite.push(move.captured)
    else byBlack.push(move.captured)
  }
  return {
    byWhite: sortCaptures(byWhite),
    byBlack: sortCaptures(byBlack),
  }
}

export function blackCapturedUnicode(piece: string): string {
  return BLACK_PIECE_UNICODE[piece] ?? piece
}

export function whiteCapturedUnicode(piece: string): string {
  return WHITE_PIECE_UNICODE[piece] ?? piece
}

/** Clone chess instance while preserving move history. */
export function cloneChess(chess: Chess): Chess {
  const copy = new Chess()
  const pgn = chess.pgn()
  if (pgn) copy.loadPgn(pgn)
  else copy.load(chess.fen())
  return copy
}

/** Apply a UCI move and keep full move history (for SAN / captures display). */
export function applyUciMove(
  chess: Chess,
  uci: string,
): { from: Square; to: Square; san: string } | null {
  const from = uci.slice(0, 2) as Square
  const to = uci.slice(2, 4) as Square
  const promotion = uci.length > 4 ? (uci[4] as 'q' | 'r' | 'b' | 'n') : undefined
  try {
    const move = chess.move({ from, to, promotion: promotion ?? 'q' })
    return move ? { from, to, san: move.san } : null
  } catch {
    return null
  }
}

/** Rebuild chess from starting position by replaying UCI moves. */
export function chessFromUciMoves(moves: string[]): Chess {
  const chess = new Chess()
  for (const uci of moves) {
    if (!applyUciMove(chess, uci)) break
  }
  return chess
}
