import { Chessboard } from 'react-chessboard'
import { Square } from 'chess.js'
import { useSelector } from 'react-redux'
import { useClickToMove } from '../hooks/useClickToMove'
import { boardSquareStyles } from '../config/boardThemes'
import { RootState } from '../store'

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
  const boardTheme = useSelector((s: RootState) => s.settings.boardTheme)
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
      {...boardSquareStyles(boardTheme)}
    />
  )
}
