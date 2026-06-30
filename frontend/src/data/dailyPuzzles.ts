export interface DailyPuzzle {
  id: string
  title: string
  fen: string
  solution: string[]
  hint: string
}

export const DAILY_PUZZLE_BANK: DailyPuzzle[] = [
  {
    id: 'mate-in-1-back-rank',
    title: 'Back rank mate',
    fen: '6k1/5ppp/8/8/8/8/8/R6K w - - 0 1',
    solution: ['a1a8'],
    hint: 'Use your rook on the back rank.',
  },
  {
    id: 'fork-knight',
    title: 'Knight fork',
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
    solution: ['f3g5'],
    hint: 'Threaten the weak f7 square.',
  },
  {
    id: 'discovered-attack',
    title: 'Discovered check',
    fen: '3k4/8/8/8/8/5B2/6PP/4R1K1 w - - 0 1',
    solution: ['e1e8'],
    hint: 'Your rook can reach the eighth rank.',
  },
  {
    id: 'pin-win-piece',
    title: 'Pin the queen',
    fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
    solution: ['c4f7'],
    hint: 'Strike on f7 with your bishop.',
  },
  {
    id: 'smothered-setup',
    title: 'Queen delivery',
    fen: '6k1/5ppp/8/8/8/8/Q6P/6K1 w - - 0 1',
    solution: ['a2a8'],
    hint: 'Deliver checkmate on the back rank.',
  },
  {
    id: 'skewer-rook',
    title: 'Skewer along the diagonal',
    fen: '8/2r5/1k6/8/8/8/8/4B1K1 w - - 0 1',
    solution: ['e1a5'],
    hint: 'Attack along the long diagonal.',
  },
  {
    id: 'mate-in-2-queen',
    title: 'Queen and king',
    fen: '6k1/5ppp/8/8/8/8/5PPP/4Q1K1 w - - 0 1',
    solution: ['e1e8'],
    hint: 'Coordinate queen and king.',
  },
  {
    id: 'capture-hanging',
    title: 'Win the rook',
    fen: '4r1k1/8/8/8/3B4/8/5PPP/4R1K1 w - - 0 1',
    solution: ['e1e8'],
    hint: 'Capture the rook with check.',
  },
  {
    id: 'promotion-tactic',
    title: 'Push the passer',
    fen: '8/4P3/4k3/8/4K3/8/8/8 w - - 0 1',
    solution: ['e7e8q'],
    hint: 'Advance the pawn.',
  },
  {
    id: 'deflection',
    title: 'Remove the defender',
    fen: 'r2qkb1r/ppp2ppp/2n1n3/3p4/3P4/2N1PN2/PPP3PP/R1BQKB1R w KQkq - 0 1',
    solution: ['c3d5'],
    hint: 'Jump into the center with tempo.',
  },
]
