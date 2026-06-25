import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Link } from 'react-router-dom'

import { useQuery, useQueryClient } from '@tanstack/react-query'

import { Chess, Square } from 'chess.js'

import { useDispatch, useSelector } from 'react-redux'

import { motion } from 'framer-motion'

import ClickChessboard from '../components/ClickChessboard'

import MoveHistory from '../components/MoveHistory'

import UpgradeModal, { AiTierInfo } from '../components/UpgradeModal'

import { cloneChess, applyUciMove } from '../utils/chessDisplay'

import { authApi, billingApi, formatNetworkError, gamesApi } from '../services/api'

import { setUser } from '../store/authSlice'

import type { RootState } from '../store'



type Phase = 'setup' | 'playing' | 'finished'



export default function PlayAiPage() {

  const dispatch = useDispatch()

  const queryClient = useQueryClient()

  const userId = useSelector((s: RootState) => s.auth.user?.id)

  const [phase, setPhase] = useState<Phase>('setup')

  const [difficulty, setDifficulty] = useState('beginner')

  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white')

  const [gameId, setGameId] = useState<string | null>(null)

  const [chess, setChess] = useState(() => new Chess())

  const [fen, setFen] = useState(new Chess().fen())

  const [status, setStatus] = useState('Choose difficulty and start')

  const [loading, setLoading] = useState(false)

  const [upgradeTier, setUpgradeTier] = useState<AiTierInfo | null>(null)

  const chessRef = useRef(chess)

  chessRef.current = chess



  const { data: tiers = [], isLoading: tiersLoading } = useQuery({

    queryKey: ['ai-tiers'],

    queryFn: () => billingApi.aiTiers().then((r) => r.data as AiTierInfo[]),

    enabled: !!userId,

  })



  const selectedTier = tiers.find((t) => t.id === difficulty)

  const isSelectedUnlocked = selectedTier?.unlocked ?? difficulty === 'beginner'



  useEffect(() => {

    if (tiers.length === 0) return

    const current = tiers.find((t) => t.id === difficulty)

    if (current && !current.unlocked) {

      const firstFree = tiers.find((t) => t.unlocked)

      if (firstFree) setDifficulty(firstFree.id)

    }

  }, [tiers, difficulty])



  const refreshProfile = useCallback(async () => {

    try {

      const { data } = await authApi.me()

      dispatch(setUser(data))

    } catch {

      /* ignore */

    }

  }, [dispatch])



  const refreshTiers = useCallback(() => {

    queryClient.invalidateQueries({ queryKey: ['ai-tiers'] })

  }, [queryClient])



  const updateStatus = useCallback((board: Chess, result?: string | null) => {

    if (result) {

      const humanWon =

        (result === '1-0' && playerColor === 'white') ||

        (result === '0-1' && playerColor === 'black')

      const isDraw = result === '1/2-1/2'

      if (isDraw) setStatus('Draw — well fought!')

      else if (humanWon) setStatus('You win!')

      else setStatus('You lose — the AI wins this one')

      setPhase('finished')

      refreshProfile()

      return

    }

    if (board.isCheckmate()) {

      setStatus(board.turn() === 'w' ? 'Checkmate — Black wins' : 'Checkmate — White wins')

      setPhase('finished')

    } else if (board.isDraw()) {

      setStatus('Draw')

      setPhase('finished')

    } else if (board.isCheck()) {

      setStatus(`${board.turn() === 'w' ? 'White' : 'Black'} is in check`)

    } else {

      setStatus(`${board.turn() === 'w' ? 'White' : 'Black'} to move`)

    }

  }, [playerColor, refreshProfile])



  const handleTierClick = (tier: AiTierInfo) => {

    if (tier.unlocked) {

      setDifficulty(tier.id)

      setStatus('Choose difficulty and start')

      return

    }

    setUpgradeTier(tier)

  }



  const startGame = async () => {

    if (!isSelectedUnlocked) {

      if (selectedTier) setUpgradeTier(selectedTier)

      return

    }



    setLoading(true)

    setStatus('Starting game...')

    try {

      const { data } = await gamesApi.createAi(difficulty, playerColor)

      setGameId(data.game.id)

      setPhase('playing')

      if (data.ai_opening_move?.uci) {

        const start = new Chess()

        applyUciMove(start, data.ai_opening_move.uci)

        chessRef.current = start

        setChess(start)

        setFen(start.fen())

        setStatus('AI moved — your turn')

      } else {

        const start = new Chess()

        chessRef.current = start

        setChess(start)

        setFen(start.fen())

        setStatus('Your move')

      }

    } catch (err) {

      const axiosErr = err as { response?: { status?: number } }

      if (axiosErr.response?.status === 402 && selectedTier) {

        setUpgradeTier(selectedTier)

        setStatus('Payment required for this level')

      } else {

        const msg = formatNetworkError(err, 'start AI game')

        setStatus(msg || 'Could not start game')

      }

    } finally {

      setLoading(false)

    }

  }



  const isMyTurn = useMemo(() => {

    if (phase !== 'playing') return false

    const turn = new Chess(fen).turn()

    return (

      (playerColor === 'white' && turn === 'w') ||

      (playerColor === 'black' && turn === 'b')

    )

  }, [phase, fen, playerColor])



  const onMove = useCallback(

    (from: Square, to: Square) => {

      if (phase !== 'playing' || !gameId) return false



      const snapshot = cloneChess(chessRef.current)

      const board = cloneChess(chessRef.current)

      const move = board.move({ from, to, promotion: 'q' })

      if (!move) return false



      const uci = move.from + move.to + (move.promotion || '')



      chessRef.current = board

      setChess(board)

      setFen(board.fen())

      setStatus('AI is thinking...')



      gamesApi

        .aiMove(gameId, uci)

        .then(({ data }) => {

          const next = cloneChess(chessRef.current)

          if (data.ai_move?.uci) {

            applyUciMove(next, data.ai_move.uci)

          }

          chessRef.current = next

          setChess(next)

          setFen(next.fen())

          updateStatus(next, data.result)

        })

        .catch(() => {

          chessRef.current = snapshot

          setChess(snapshot)

          setFen(snapshot.fen())

          setStatus('Move failed — try again')

        })



      return true

    },

    [phase, gameId, updateStatus],

  )



  const resetToSetup = () => {

    setPhase('setup')

    setGameId(null)

    const start = new Chess()

    chessRef.current = start

    setChess(start)

    setFen(start.fen())

    setStatus('Choose difficulty and start')

  }



  useEffect(() => {

    if (phase === 'finished') refreshProfile()

  }, [phase, refreshProfile])



  return (

    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-4xl">

      <UpgradeModal

        tier={upgradeTier}

        product="ai"

        open={!!upgradeTier}

        onClose={() => setUpgradeTier(null)}

        onSuccess={() => {

          refreshTiers()

          if (upgradeTier) setDifficulty(upgradeTier.id)

          setStatus(`${upgradeTier?.label} unlocked — start your game!`)

        }}

      />



      <div className="mb-6 flex items-center justify-between">

        <h1 className="text-2xl font-bold">Play vs AI</h1>

        <Link to="/play" className="text-sm text-emerald-400 hover:underline">

          ← Local board

        </Link>

      </div>



      {phase === 'setup' && (

        <div className="glass-panel mb-6 space-y-6 p-6">

          <div>

            <label className="mb-2 block text-sm text-gray-400">Difficulty</label>

            {tiersLoading ? (

              <p className="text-sm text-gray-500">Loading tiers...</p>

            ) : (

              <div className="grid gap-2 sm:grid-cols-2">

                {tiers.map((tier) => {

                  const locked = !tier.unlocked

                  const selected = difficulty === tier.id

                  return (

                    <button

                      key={tier.id}

                      type="button"

                      onClick={() => handleTierClick(tier)}

                      className={`relative rounded-lg px-4 py-3 text-left text-sm transition ${

                        selected

                          ? locked

                            ? 'border border-yellow-500/50 bg-yellow-500/10 text-yellow-100'

                            : 'bg-emerald-600 text-white'

                          : locked

                            ? 'border border-white/10 bg-white/[0.02] text-gray-400 hover:border-yellow-500/30'

                            : 'bg-white/5 text-gray-300 hover:bg-white/10'

                      }`}

                    >

                      <div className="flex items-center justify-between gap-2">

                        <span className="font-medium">{tier.label}</span>

                        <span

                          className={`text-xs font-semibold ${

                            tier.price_cents === 0 ? 'text-emerald-400' : locked ? 'text-yellow-400' : 'text-emerald-300'

                          }`}

                        >

                          {locked && tier.requires_payment ? '🔒 ' : ''}

                          {tier.price_display}

                        </span>

                      </div>

                      <span className="mt-0.5 block text-xs opacity-80">{tier.description}</span>

                      {locked && tier.requires_payment && (

                        <span className="mt-1 block text-xs text-yellow-400/90">Tap to upgrade</span>

                      )}

                    </button>

                  )

                })}

              </div>

            )}

          </div>



          <div>

            <label className="mb-2 block text-sm text-gray-400">Your color</label>

            <div className="flex gap-2">

              {(['white', 'black'] as const).map((c) => (

                <button

                  key={c}

                  type="button"

                  onClick={() => setPlayerColor(c)}

                  className={`rounded-lg px-4 py-2 text-sm capitalize ${

                    playerColor === c

                      ? 'bg-emerald-600 text-white'

                      : 'bg-white/5 text-gray-300 hover:bg-white/10'

                  }`}

                >

                  {c}

                </button>

              ))}

            </div>

          </div>



          {!isSelectedUnlocked && selectedTier?.requires_payment ? (

            <button

              type="button"

              onClick={() => setUpgradeTier(selectedTier)}

              className="btn-primary w-full sm:w-auto"

            >

              Upgrade to {selectedTier.label} — {selectedTier.price_display}

            </button>

          ) : (

            <button type="button" onClick={startGame} disabled={loading} className="btn-primary">

              {loading ? 'Starting...' : 'Start Game'}

            </button>

          )}



          {status !== 'Choose difficulty and start' && phase === 'setup' && (

            <p className={`text-sm ${status.includes('unlocked') ? 'text-emerald-400' : 'text-red-400'}`}>

              {status}

            </p>

          )}

        </div>

      )}



      {(phase === 'playing' || phase === 'finished') && (

        <div className="grid gap-6 lg:grid-cols-[1fr_260px]">

          <div className="glass-panel p-6">

            <div className="mb-4 flex items-center justify-between">

              <span className="font-medium text-emerald-400">{status}</span>

              {phase === 'finished' && (

                <button onClick={resetToSetup} className="btn-secondary py-2 text-sm">

                  New Game

                </button>

              )}

            </div>

            <ClickChessboard

              fen={fen}

              onMove={onMove}

              boardOrientation={playerColor}

              boardWidth={Math.min(520, window.innerWidth - 64)}

              interactive={isMyTurn}

              selectableColor={playerColor === 'white' ? 'w' : 'b'}

            />

            <p className="mt-3 text-xs text-gray-500">

              {selectedTier?.label ?? difficulty} AI · You play {playerColor}

              {isMyTurn ? ' · Your turn' : phase === 'playing' ? ' · AI thinking...' : ''}

            </p>

          </div>



          <div className="glass-panel flex min-h-[320px] flex-col p-4 lg:min-h-0">

            <MoveHistory chess={chess} className="min-h-0 flex-1" />

          </div>

        </div>

      )}



      {phase === 'setup' && (

        <p className="text-sm text-gray-500">

          Beginner is free. Intermediate, Advanced, and Expert require a one-time payment to unlock.

          {userId ? '' : ' Log in to track stats and purchases.'}

        </p>

      )}

    </motion.div>

  )

}


