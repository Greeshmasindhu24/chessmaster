export interface DailyPuzzle {
  id: string
  title: string
  fen: string
  solution: string[]
  hint: string
  explanation: string
}

export const DAILY_PUZZLE_BANK: DailyPuzzle[] = [
  {
    id: 'mate-in-1-back-rank',
    title: 'Back rank mate',
    fen: '6k1/5ppp/8/8/8/8/8/R6K w - - 0 1',
    solution: ['a1a8'],
    hint: 'Use your rook on the back rank.',
    explanation:
      'Black\'s king is trapped behind its own pawns on the back rank. Slide your rook from a1 to a8 — it gives check with no escape squares. Look for a single rook move along the open file.',
  },
  {
    id: 'fork-knight',
    title: 'Knight fork',
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
    solution: ['f3g5'],
    hint: 'Threaten the weak f7 square.',
    explanation:
      'The f7 pawn is only defended by the king. Jump your knight from f3 to g5 to attack f7 and threaten a quick tactic. Knights are perfect for forks — look for a square that hits two targets at once.',
  },
  {
    id: 'discovered-attack',
    title: 'Discovered check',
    fen: '3k4/8/8/8/8/5B2/6PP/4R1K1 w - - 0 1',
    solution: ['e1e8'],
    hint: 'Your rook can reach the eighth rank.',
    explanation:
      'Your bishop on f3 masks the rook\'s line to e8. Move the rook to e8 and the bishop\'s diagonal stays aimed at the king — it\'s checkmate. Look for a rook lift that unleashes a discovered attack.',
  },
  {
    id: 'pin-win-piece',
    title: 'Pin the queen',
    fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
    solution: ['c4f7'],
    hint: 'Strike on f7 with your bishop.',
    explanation:
      'Bishop takes on f7 wins material because the black king is exposed and pieces are tangled. The tactic starts with Bxf7 — look for a capture on f7 that wins a piece or forces the king out.',
  },
  {
    id: 'smothered-setup',
    title: 'Queen delivery',
    fen: '6k1/5ppp/8/8/8/8/Q6P/6K1 w - - 0 1',
    solution: ['a2a8'],
    hint: 'Deliver checkmate on the back rank.',
    explanation:
      'Your queen on a2 can reach a8 in one move. The black king has no room to run because its own pawns block escape. Promote the attack along the a-file — Qa8 is checkmate.',
  },
  {
    id: 'skewer-rook',
    title: 'Skewer along the diagonal',
    fen: '8/2r5/1k6/8/8/8/8/4B1K1 w - - 0 1',
    solution: ['e1a5'],
    hint: 'Attack along the long diagonal.',
    explanation:
      'Move your bishop to a5, lining up the black king and rook on the diagonal. The king must move, then you win the rook. Skewers work like pins in reverse — attack the valuable piece behind.',
  },
  {
    id: 'mate-in-2-queen',
    title: 'Queen and king',
    fen: '6k1/5ppp/8/8/8/8/5PPP/4Q1K1 w - - 0 1',
    solution: ['e1e8'],
    hint: 'Coordinate queen and king.',
    explanation:
      'Queen to e8 delivers checkmate — the king on g8 is boxed in by its pawns. When your queen and king work together on the back rank, look for a forcing queen move that cuts off every escape.',
  },
  {
    id: 'capture-hanging',
    title: 'Win the rook',
    fen: '4r1k1/8/8/8/3B4/8/5PPP/4R1K1 w - - 0 1',
    solution: ['e1e8'],
    hint: 'Capture the rook with check.',
    explanation:
      'The rook on e8 is undefended. Play Rxe8+ — you win the exchange with check and keep the initiative. Always scan for loose pieces on the same rank, file, or diagonal as your rook.',
  },
  {
    id: 'promotion-tactic',
    title: 'Push the passer',
    fen: '8/4P3/4k3/8/4K3/8/8/8 w - - 0 1',
    solution: ['e7e8q'],
    hint: 'Advance the pawn.',
    explanation:
      'Your e-pawn is one step from promotion. Push e7–e8 and choose a queen — the new queen wins easily against the lone king. In endgames, advancing a passed pawn is often the whole idea.',
  },
  {
    id: 'deflection',
    title: 'Remove the defender',
    fen: 'r2qkb1r/ppp2ppp/2n1n3/3p4/3P4/2N1PN2/PPP3PP/R1BQKB1R w KQkq - 0 1',
    solution: ['c3d5'],
    hint: 'Jump into the center with tempo.',
    explanation:
      'Knight to d5 attacks key squares and disrupts Black\'s coordination. The move gains time by threatening pieces that must relocate. Look for a central knight jump that wins a tempo or forks two pieces.',
  },
]
