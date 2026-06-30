import { Link } from 'react-router-dom'
import { useCallback, useState } from 'react'
import { Chess, Square } from 'chess.js'
import { motion } from 'framer-motion'
import ClickChessboard from '../components/ClickChessboard'
import MoveHistory from '../components/MoveHistory'
import { cloneChess } from '../utils/chessDisplay'
import { useChessSounds } from '../hooks/useChessSounds'

export default function PlayPage() {
  const { playAfterMove } = useChessSounds()
  const [game, setGame] = useState(new Chess())
  const [fen, setFen] = useState(game.fen())
  const [status, setStatus] = useState('White to move')

  const updateStatus = useCallback((chess: Chess) => {
    if (chess.isCheckmate()) {
      setStatus(`Checkmate! ${chess.turn() === 'w' ? 'Black' : 'White'} wins`)
    } else if (chess.isDraw()) {
      setStatus('Draw')
    } else if (chess.isCheck()) {
      setStatus(`${chess.turn() === 'w' ? 'White' : 'Black'} is in check`)
    } else {
      setStatus(`${chess.turn() === 'w' ? 'White' : 'Black'} to move`)
    }
  }, [])

  const onMove = useCallback(
    (from: Square, to: Square) => {
      const chess = cloneChess(game)
      try {
        const move = chess.move({ from, to, promotion: 'q' })
        if (!move) return false
        setFen(chess.fen())
        setGame(chess)
        updateStatus(chess)
        playAfterMove(chess, move)
        return true
      } catch {
        return false
      }
    },
    [game, updateStatus, playAfterMove],
  )

  const resetGame = () => {
    const chess = new Chess()
    setGame(chess)
    setFen(chess.fen())
    setStatus('White to move')
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mx-auto max-w-4xl"
    >
      <h1 className="mb-6 text-2xl font-bold">Local Board</h1>
      <p className="mb-4 text-sm text-gray-400">
        Practice locally,{' '}
        <Link to="/play/ai" className="text-emerald-400 hover:underline">
          play vs AI
        </Link>
        , or{' '}
        <Link to="/play/online" className="text-emerald-400 hover:underline">
          play online
        </Link>{' '}
        with matchmaking and room codes.
      </p>

      <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
        <div className="glass-panel p-3 sm:p-6">
          <div className="mb-3 flex items-center justify-between sm:mb-4">
            <span className="font-medium text-emerald-400">{status}</span>
            <button onClick={resetGame} className="btn-secondary py-2 text-sm">
              New Game
            </button>
          </div>
          <ClickChessboard fen={fen} onMove={onMove} maxBoardWidth={560} reservedHeight={300} />
          <p className="mt-3 text-xs text-gray-500">
            Click a piece to see legal moves, then click a highlighted square to move.
          </p>
        </div>

        <div className="glass-panel p-4">
          <MoveHistory chess={game} />
        </div>
      </div>
    </motion.div>
  )
}
