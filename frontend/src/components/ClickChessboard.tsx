import { Chessboard } from 'react-chessboard'
import { Square } from 'chess.js'
import { useClickToMove } from '../hooks/useClickToMove'

const BOARD_SQUARE_STYLES = {
  customDarkSquareStyle: { backgroundColor: '#769656' },
  customLightSquareStyle: { backgroundColor: '#eeeed2' },
}

interface ClickChessboardProps {
  fen: string
  onMove: (from: Square, to: Square) => boolean
  boardWidth: number
  boardOrientation?: 'white' | 'black'
  interactive?: boolean
  selectableColor?: 'w' | 'b'
}

export default function ClickChessboard({
  fen,
  onMove,
  boardWidth,
  boardOrientation = 'white',
  interactive = true,
  selectableColor,
}: ClickChessboardProps) {
  const { onSquareClick, customSquareStyles } = useClickToMove(fen, onMove, {
    interactive,
    selectableColor,
  })

  return (
    <Chessboard
      position={fen}
      boardOrientation={boardOrientation}
      boardWidth={boardWidth}
      arePiecesDraggable={false}
      autoPromoteToQueen
      onSquareClick={interactive ? onSquareClick : undefined}
      customSquareStyles={customSquareStyles}
      {...BOARD_SQUARE_STYLES}
    />
  )
}
