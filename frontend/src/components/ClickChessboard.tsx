import { Chessboard } from 'react-chessboard'
import { Square } from 'chess.js'
import { useSelector } from 'react-redux'
import { useClickToMove } from '../hooks/useClickToMove'
import { useResponsiveBoardWidth } from '../hooks/useResponsiveBoardWidth'
import { boardSquareStyles } from '../config/boardThemes'
import { RootState } from '../store'

interface ClickChessboardProps {
  fen: string
  onMove?: (from: Square, to: Square) => boolean
  boardWidth?: number
  maxBoardWidth?: number
  reservedHeight?: number
  boardOrientation?: 'white' | 'black'
  interactive?: boolean
  selectableColor?: 'w' | 'b'
}

export default function ClickChessboard({
  fen,
  onMove = () => false,
  boardWidth: explicitWidth,
  maxBoardWidth = 560,
  reservedHeight = 320,
  boardOrientation = 'white',
  interactive = true,
  selectableColor,
}: ClickChessboardProps) {
  const boardTheme = useSelector((s: RootState) => s.settings.boardTheme)
  const responsiveWidth = useResponsiveBoardWidth(maxBoardWidth, reservedHeight)
  const boardWidth = explicitWidth ?? responsiveWidth
  const { onSquareClick, customSquareStyles } = useClickToMove(fen, onMove, {
    interactive,
    selectableColor,
  })

  return (
    <div className="mx-auto w-fit max-w-full">
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
    </div>
  )
}
