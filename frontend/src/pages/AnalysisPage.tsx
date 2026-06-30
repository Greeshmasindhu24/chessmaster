import { useMutation } from '@tanstack/react-query'
import { Chess } from 'chess.js'
import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import ClickChessboard from '../components/ClickChessboard'
import { EvalBar, MoveQualityBadge } from '../components/AnalysisWidgets'
import { analysisApi, formatNetworkError } from '../services/api'

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

export default function AnalysisPage() {
  const [searchParams] = useSearchParams()
  const gameIdParam = searchParams.get('gameId')
  const [fen, setFen] = useState(START_FEN)
  const [pgnInput, setPgnInput] = useState('')
  const [status, setStatus] = useState('Analyze a position or completed game')

  const positionMutation = useMutation({
    mutationFn: () => analysisApi.position(fen, 12).then((r) => r.data),
    onSuccess: (data) => {
      setStatus(`Engine: ${data.engine} · Best: ${data.best_move_san ?? '—'}`)
    },
    onError: (err) => setStatus(formatNetworkError(err, 'analyze position')),
  })

  const gameMutation = useMutation({
    mutationFn: () =>
      gameIdParam
        ? analysisApi.gameById(gameIdParam).then((r) => r.data)
        : analysisApi.game({ pgn: pgnInput, depth: 10 }).then((r) => r.data),
    onSuccess: (data) => {
      setStatus(
        `Analyzed ${data.moves.length} moves · Avg loss ${data.average_cp_loss ?? '—'} cp · ${data.engine}`,
      )
    },
    onError: (err) => setStatus(formatNetworkError(err, 'analyze game')),
  })

  const position = positionMutation.data
  const gameAnalysis = gameMutation.data

  const boardFen = useMemo(() => {
    try {
      return new Chess(fen).fen()
    } catch {
      return START_FEN
    }
  }, [fen])

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Game Analysis</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          Stockfish-powered evaluation, best moves, and move quality for positions and games.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-panel space-y-4 p-6">
          <h2 className="text-lg font-semibold">Position</h2>
          <label className="block text-sm text-gray-500">FEN</label>
          <input
            className="input-field font-mono text-xs"
            value={fen}
            onChange={(e) => setFen(e.target.value)}
          />
          <button
            type="button"
            onClick={() => positionMutation.mutate()}
            disabled={positionMutation.isPending}
            className="btn-primary text-sm disabled:opacity-50"
          >
            {positionMutation.isPending ? 'Analyzing...' : 'Analyze position'}
          </button>
          <ClickChessboard fen={boardFen} interactive={false} maxBoardWidth={400} reservedHeight={280} />
          {position && (
            <div className="space-y-3">
              <EvalBar evalCp={position.eval_cp} mate={position.mate} />
              <p className="text-sm">
                Best move:{' '}
                <span className="font-medium text-emerald-400">{position.best_move_san ?? '—'}</span>
              </p>
              {position.lines.length > 0 && (
                <div className="text-xs text-gray-500">
                  Top line: {position.lines[0].moves_uci.slice(0, 5).join(' ')}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="glass-panel space-y-4 p-6">
          <h2 className="text-lg font-semibold">Full game</h2>
          {gameIdParam ? (
            <p className="text-sm text-gray-500">
              Analyzing saved game <span className="font-mono text-emerald-400">{gameIdParam}</span>
            </p>
          ) : (
            <>
              <label className="block text-sm text-gray-500">PGN</label>
              <textarea
                className="input-field min-h-[120px] font-mono text-xs"
                value={pgnInput}
                onChange={(e) => setPgnInput(e.target.value)}
                placeholder="Paste PGN here..."
              />
            </>
          )}
          <button
            type="button"
            onClick={() => gameMutation.mutate()}
            disabled={gameMutation.isPending || (!gameIdParam && !pgnInput.trim())}
            className="btn-primary text-sm disabled:opacity-50"
          >
            {gameMutation.isPending ? 'Analyzing...' : 'Analyze game'}
          </button>

          {gameAnalysis && gameAnalysis.moves.length > 0 && (
            <div className="max-h-80 overflow-y-auto rounded-xl border border-black/10 dark:border-white/10">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-white/90 text-xs uppercase text-gray-500 dark:bg-gray-900/90">
                  <tr>
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Move</th>
                    <th className="px-3 py-2">Best</th>
                    <th className="px-3 py-2">Loss</th>
                    <th className="px-3 py-2">Quality</th>
                  </tr>
                </thead>
                <tbody>
                  {gameAnalysis.moves.map((m) => (
                    <tr key={`${m.move_number}-${m.uci}`} className="border-t border-black/5 dark:border-white/5">
                      <td className="px-3 py-2 text-gray-500">{m.move_number}</td>
                      <td className="px-3 py-2 font-medium">{m.san}</td>
                      <td className="px-3 py-2 font-mono text-xs text-gray-500">{m.best_move_uci ?? '—'}</td>
                      <td className="px-3 py-2 text-gray-500">{m.cp_loss ?? '—'}</td>
                      <td className="px-3 py-2">
                        <MoveQualityBadge quality={m.quality} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <p className="text-sm text-gray-500">{status}</p>
      <Link to="/dashboard" className="text-sm text-emerald-500 hover:underline">
        ← Back to dashboard
      </Link>
    </motion.div>
  )
}
