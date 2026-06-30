import { Link } from 'react-router-dom'
import { useCallback, useState } from 'react'
import { Chess, Square } from 'chess.js'
import { motion } from 'framer-motion'
import ClickChessboard from '../components/ClickChessboard'
import MoveHistory from '../components/MoveHistory'
import { cloneChess } from '../utils/chessDisplay'
import { useChessSounds } from '../hooks/useChessSounds'
import { useOnlineStatus } from '../hooks/useOnlineStatus'

export default function PlayPage() {
  const isOnline = useOnlineStatus()
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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Play Offline</h1>
        {isOnline && (
          <Link to="/play/online?match=1" className="text-sm text-emerald-400 hover:underline">
            Switch to online →
          </Link>
        )}
      </div>

      <p className="mb-4 text-sm text-gray-400">
        Two players on the same device — no internet required. For a solo game,{' '}
        <Link to="/play/ai" className="text-emerald-400 hover:underline">
          play vs AI
        </Link>
        .
        {isOnline && (
          <>
            {' '}
            When connected,{' '}
            <Link to="/play/online?match=1" className="text-emerald-400 hover:underline">
              play online
            </Link>{' '}
            to match a random opponent.
          </>
        )}
      </p>

      {!isOnline && (
        <p className="mb-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
          Offline mode — internet is not required for this board or vs AI.
        </p>
      )}

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
            Pass the device between players. Click a piece, then a highlighted square to move.
          </p>
        </div>

        <div className="glass-panel p-4">
          <MoveHistory chess={game} />
        </div>
      </div>
    </motion.div>
  )
}
