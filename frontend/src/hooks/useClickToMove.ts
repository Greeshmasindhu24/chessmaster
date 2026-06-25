import { useCallback, useEffect, useState } from 'react'
import { Chess, Square } from 'chess.js'

type SquareStyles = Record<string, React.CSSProperties>

function buildMoveHighlights(chess: Chess, square: Square): SquareStyles | null {
  const moves = chess.moves({ square, verbose: true })
  if (!moves.length) return null

  const highlights: SquareStyles = {}
  for (const m of moves) {
    highlights[m.to] = {
      background: chess.get(m.to as Square)
        ? 'radial-gradient(circle, rgba(0,0,0,.15) 85%, transparent 85%)'
        : 'radial-gradient(circle, rgba(0,0,0,.2) 25%, transparent 25%)',
      borderRadius: '50%',
    }
  }
  highlights[square] = { background: 'rgba(255, 255, 0, 0.4)' }
  return highlights
}

interface UseClickToMoveOptions {
  interactive?: boolean
  /** Only allow selecting pieces of this color; defaults to side to move. */
  selectableColor?: 'w' | 'b'
}

export function useClickToMove(
  fen: string,
  onMove: (from: Square, to: Square) => boolean,
  options: UseClickToMoveOptions = {},
) {
  const { interactive = true, selectableColor } = options
  const [moveFrom, setMoveFrom] = useState<Square | ''>('')
  const [optionSquares, setOptionSquares] = useState<SquareStyles>({})

  useEffect(() => {
    setMoveFrom('')
    setOptionSquares({})
  }, [fen])

  const onSquareClick = useCallback(
    (square: Square, piece?: string) => {
      if (!interactive) return

      const chess = new Chess(fen)
      const turn = chess.turn()

      const canSelectSquare = (sq: Square) => {
        const p = chess.get(sq)
        if (!p) return false
        const allowedColor = selectableColor ?? turn
        return p.color === allowedColor && p.color === turn
      }

      if (!moveFrom) {
        if (piece && canSelectSquare(square)) {
          const highlights = buildMoveHighlights(chess, square)
          if (highlights) {
            setOptionSquares(highlights)
            setMoveFrom(square)
          }
        }
        return
      }

      if (square === moveFrom) {
        setMoveFrom('')
        setOptionSquares({})
        return
      }

      const moves = chess.moves({ square: moveFrom, verbose: true })
      const found = moves.find((m) => m.to === square)
      if (found) {
        if (onMove(moveFrom, square)) {
          setMoveFrom('')
          setOptionSquares({})
        }
        return
      }

      if (piece && canSelectSquare(square)) {
        const highlights = buildMoveHighlights(chess, square)
        if (highlights) {
          setOptionSquares(highlights)
          setMoveFrom(square)
        } else {
          setMoveFrom('')
          setOptionSquares({})
        }
      } else {
        setMoveFrom('')
        setOptionSquares({})
      }
    },
    [fen, moveFrom, onMove, interactive, selectableColor],
  )

  return { onSquareClick, customSquareStyles: optionSquares, selectedSquare: moveFrom }
}
