import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Chess, Square } from 'chess.js'
import ClickChessboard from '../components/ClickChessboard'
import MoveHistory from '../components/MoveHistory'
import UpgradeModal, { TierInfo } from '../components/UpgradeModal'
import { cloneChess } from '../utils/chessDisplay'
import { motion } from 'framer-motion'
import { useDispatch, useSelector } from 'react-redux'
import { api, authApi, billingApi, formatNetworkError } from '../services/api'
import { hideDummyBilling } from '../config/features'
import { buyLabel } from '../config/products'
import { gameSocket } from '../services/socket'
import { setUser } from '../store/authSlice'
import { useChessSounds } from '../hooks/useChessSounds'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import type { RootState } from '../store'

type Phase = 'lobby' | 'waiting' | 'playing' | 'finished'

interface GameInfo {
  gameId: string
  roomCode: string
  color: 'white' | 'black'
  opponent?: string
}

interface TimePreset {
  label: string
  seconds: number
  increment: number
  tier: string
}

export default function PlayOnlinePage() {
  const dispatch = useDispatch()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const autoMatch = searchParams.get('match') === '1'
  const isOnline = useOnlineStatus()
  const { accessToken, user } = useSelector((s: RootState) => s.auth)
  const [phase, setPhase] = useState<Phase>('lobby')
  const [selectedPreset, setSelectedPreset] = useState<TimePreset | null>(null)
  const [roomCodeInput, setRoomCodeInput] = useState('')
  const [createdRoomCode, setCreatedRoomCode] = useState('')
  const [copied, setCopied] = useState<'code' | 'share' | null>(null)
  const [gameInfo, setGameInfo] = useState<GameInfo | null>(null)
  const [chess, setChess] = useState(() => new Chess())
  const [fen, setFen] = useState(new Chess().fen())
  const [orientation, setOrientation] = useState<'white' | 'black'>('white')
  const [status, setStatus] = useState('Create or join a game')
  const [chatMessages, setChatMessages] = useState<{ username: string; text: string }[]>([])
  const [chatInput, setChatInput] = useState('')
  const [drawOffered, setDrawOffered] = useState(false)
  const [upgradeTier, setUpgradeTier] = useState<TierInfo | null>(null)
  const { playAfterMove, playKind } = useChessSounds()
  const chessRef = useRef(chess)
  const fenRef = useRef(fen)
  const autoMatchStarted = useRef(false)
  chessRef.current = chess
  fenRef.current = fen

  const { data: onlineTiers = [] } = useQuery({
    queryKey: ['online-tiers'],
    queryFn: () => billingApi.onlineTiers().then((r) => r.data as TierInfo[]),
    enabled: !!accessToken,
  })

  const timePresets: TimePreset[] = useMemo(
    () =>
      onlineTiers.map((t) => ({
        label: t.label,
        seconds: t.time_control_seconds ?? 600,
        increment: t.increment_seconds ?? 0,
        tier: t.id,
      })),
    [onlineTiers],
  )

  useEffect(() => {
    if (!selectedPreset && timePresets.length > 0) {
      const free = timePresets.find((p) => p.tier === 'blitz') ?? timePresets[0]
      setSelectedPreset(free)
    }
  }, [timePresets, selectedPreset])

  const selectedTierInfo = onlineTiers.find((t) => t.id === selectedPreset?.tier)
  const isPresetUnlocked = selectedTierInfo?.unlocked ?? true

  const shareMessage = useMemo(() => {
    if (!createdRoomCode) return ''
    const presetLabel = selectedPreset?.label ?? 'chess'
    return `Join me for a ${presetLabel} game on ChessMaster Pro! Room code: ${createdRoomCode}`
  }, [createdRoomCode, selectedPreset])

  const shareLinks = useMemo(() => {
    const body = encodeURIComponent(shareMessage)
    const subject = encodeURIComponent('Join my chess game on ChessMaster Pro')
    return {
      whatsapp: `https://wa.me/?text=${body}`,
      sms: `sms:?body=${body}`,
      email: `mailto:?subject=${subject}&body=${body}`,
    }
  }, [shareMessage])

  const canNativeShare = useMemo(
    () => typeof navigator !== 'undefined' && typeof navigator.share === 'function',
    [],
  )

  const refreshTiers = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['online-tiers'] })
  }, [queryClient])

  const handlePresetClick = (preset: TimePreset) => {
    const tier = onlineTiers.find((t) => t.id === preset.tier)
    if (tier && !tier.unlocked && tier.requires_payment) {
      if (hideDummyBilling) {
        setStatus('Premium time controls coming soon')
        return
      }
      setUpgradeTier(tier)
      return
    }
    setSelectedPreset(preset)
    setStatus('Create or join a game')
  }

  const requireUnlockedOrUpgrade = (): boolean => {
    if (isPresetUnlocked) return true
    if (hideDummyBilling) {
      setStatus('Premium time controls coming soon')
      return false
    }
    if (selectedTierInfo) setUpgradeTier(selectedTierInfo)
    setStatus('Payment required for this time control')
    return false
  }

  const refreshProfile = useCallback(async () => {
    try {
      const { data } = await authApi.me()
      dispatch(setUser(data))
    } catch {
      /* ignore */
    }
  }, [dispatch])

  const updateStatus = useCallback((chess: Chess) => {
    if (chess.isCheckmate()) {
      setStatus(`Checkmate! ${chess.turn() === 'w' ? 'Black' : 'White'} wins`)
      setPhase('finished')
    } else if (chess.isDraw()) {
      setStatus('Draw')
      setPhase('finished')
    } else if (chess.isCheck()) {
      setStatus(`${chess.turn() === 'w' ? 'White' : 'Black'} is in check`)
    } else {
      setStatus(`${chess.turn() === 'w' ? 'White' : 'Black'} to move`)
    }
  }, [])

  const applyFen = useCallback((nextFen: string) => {
    const next = new Chess(nextFen)
    chessRef.current = next
    setChess(next)
    setFen(nextFen)
  }, [])

  const resetChess = useCallback(() => {
    const next = new Chess()
    chessRef.current = next
    setChess(next)
    setFen(next.fen())
  }, [])

  const backToLobby = useCallback(() => {
    setPhase('lobby')
    setGameInfo(null)
    setCreatedRoomCode('')
    resetChess()
    setChatMessages([])
    setDrawOffered(false)
    setStatus('Create or join a game')
  }, [resetChess])

  const applyMove = useCallback(
    (from: Square, to: Square, promotion?: 'q' | 'r' | 'b' | 'n') => {
      const next = cloneChess(chessRef.current)
      const move = next.move({ from, to, promotion: promotion ?? 'q' })
      if (!move) return null
      chessRef.current = next
      setChess(next)
      setFen(next.fen())
      updateStatus(next)
      playAfterMove(next, move)
      return move
    },
    [updateStatus, playAfterMove],
  )

  useEffect(() => {
    if (!accessToken) return

    gameSocket.connect(accessToken)

    const unsubs = [
      gameSocket.on('matchmaking', (data) => {
        if (data.status === 'waiting') setPhase('waiting')
        if (data.status === 'cancelled') setPhase('lobby')
      }),
      gameSocket.on('match_found', (data) => {
        const info: GameInfo = {
          gameId: data.game_id as string,
          roomCode: data.room_code as string,
          color: data.your_color as 'white' | 'black',
          opponent: data.opponent as string,
        }
        resetChess()
        setGameInfo(info)
        setOrientation(info.color)
        setPhase('playing')
        setStatus(`Playing vs ${info.opponent}`)
        gameSocket.joinGame(info.gameId)
      }),
      gameSocket.on('player_joined', (data) => {
        if (data.fen) applyFen(data.fen as string)
        if (data.your_color) {
          setOrientation(data.your_color as 'white' | 'black')
          setPhase('playing')
          setStatus('Opponent connected — game started')
        }
        if (data.username) {
          setStatus(`${data.username} joined the game`)
        }
      }),
      gameSocket.on('move_played', (data) => {
        const uci = data.uci as string
        const from = uci.slice(0, 2) as Square
        const to = uci.slice(2, 4) as Square
        const promotion = uci.length > 4 ? (uci[4] as 'q' | 'r' | 'b' | 'n') : undefined
        const move = applyMove(from, to, promotion)
        if (!move && data.fen) applyFen(data.fen as string)
        if (data.result) {
          setStatus(`Game over: ${data.result}`)
          setPhase('finished')
          playKind('gameover')
          refreshProfile()
        }
      }),
      gameSocket.on('draw_offer', (data) => {
        if (data.declined) {
          setDrawOffered(false)
          setStatus('Draw offer declined')
        } else {
          setDrawOffered(true)
          setStatus(`${data.username} offers a draw`)
        }
      }),
      gameSocket.on('game_finished', (data) => {
        setStatus(`Game over: ${data.result}${data.reason ? ` (${data.reason})` : ''}`)
        setPhase('finished')
        playKind('gameover')
        refreshProfile()
      }),
      gameSocket.on('chat_message', (data) => {
        setChatMessages((prev) => [
          ...prev,
          { username: data.username as string, text: data.text as string },
        ])
      }),
      gameSocket.on('error', (data) => {
        const msg = data.message as string
        setStatus(`Error: ${msg}`)
        if (
          !hideDummyBilling &&
          (msg.toLowerCase().includes('upgrade') || msg.toLowerCase().includes('payment'))
        ) {
          setPhase('lobby')
          if (selectedTierInfo) setUpgradeTier(selectedTierInfo)
        }
      }),
    ]

    return () => {
      unsubs.forEach((off) => off())
      gameSocket.disconnect()
    }
  }, [accessToken, applyFen, applyMove, resetChess, refreshProfile, selectedTierInfo, playKind])

  const createRoom = async () => {
    if (!selectedPreset || !requireUnlockedOrUpgrade()) return
    if (!isOnline) {
      setStatus('Internet required for online play')
      return
    }
    try {
      const { data } = await api.post('/games', {
        time_control_seconds: selectedPreset.seconds,
        increment_seconds: selectedPreset.increment,
      })
    resetChess()
    setCreatedRoomCode(data.room_code)
    setGameInfo({
      gameId: data.id,
      roomCode: data.room_code,
      color: 'white',
    })
    setOrientation('white')
    setPhase('waiting')
    setStatus('Waiting for your friend to join')
    gameSocket.joinGame(data.id)
    } catch (err) {
      if (!hideDummyBilling && (err as { response?: { status?: number } }).response?.status === 402 && selectedTierInfo) {
        setUpgradeTier(selectedTierInfo)
      }
      setStatus(formatNetworkError(err, 'create room') || 'Could not create room')
    }
  }

  const joinRoom = async () => {
    const code = roomCodeInput.trim().toUpperCase()
    if (!code) return
    if (!isOnline) {
      setStatus('Internet required for online play')
      return
    }
    try {
    const { data } = await api.post('/games/join', { room_code: code })
    setGameInfo({
      gameId: data.id,
      roomCode: data.room_code,
      color: 'black',
    })
    setOrientation('black')
    applyFen(data.fen)
    setPhase('playing')
    setStatus('Game started!')
    gameSocket.joinGame(data.id)
    } catch (err) {
      setStatus(formatNetworkError(err, 'join room') || 'Could not join room')
    }
  }

  const findMatch = useCallback(() => {
    if (!selectedPreset || !requireUnlockedOrUpgrade()) return
    if (!isOnline) {
      setStatus('Internet required for online play — use Offline or vs AI instead')
      return
    }
    setPhase('waiting')
    setStatus('Searching for a random opponent...')
    gameSocket.findMatch(selectedPreset.seconds, selectedPreset.increment)
  }, [selectedPreset, isOnline])

  const cancelSearch = () => {
    if (!selectedPreset) return
    gameSocket.cancelMatchmaking(selectedPreset.seconds, selectedPreset.increment)
    setPhase('lobby')
    setStatus('Matchmaking cancelled')
  }

  const cancelWaiting = () => {
    if (createdRoomCode) {
      backToLobby()
      return
    }
    cancelSearch()
  }

  const copyText = async (text: string, kind: 'code' | 'share') => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(kind)
      window.setTimeout(() => setCopied(null), 2000)
    } catch {
      setStatus('Could not copy automatically — select the text and copy it manually')
    }
  }

  const shareNative = async () => {
    if (!shareMessage) return
    try {
      await navigator.share({
        title: 'ChessMaster Pro',
        text: shareMessage,
      })
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setStatus('Could not share — try copying the code instead')
      }
    }
  }

  useEffect(() => {
    if (!autoMatch || autoMatchStarted.current || !isOnline || !selectedPreset) return
    if (phase !== 'lobby') return
    autoMatchStarted.current = true
    findMatch()
  }, [autoMatch, isOnline, selectedPreset, phase, findMatch])

  const isMyTurn = useMemo(() => {
    if (phase !== 'playing' || !gameInfo) return false
    const turn = new Chess(fen).turn()
    return (
      (gameInfo.color === 'white' && turn === 'w') ||
      (gameInfo.color === 'black' && turn === 'b')
    )
  }, [phase, gameInfo, fen])

  const onMove = useCallback(
    (from: Square, to: Square) => {
      if (phase !== 'playing' || !gameInfo) return false

      const turn = chessRef.current.turn()
      if ((gameInfo.color === 'white' && turn !== 'w') || (gameInfo.color === 'black' && turn !== 'b')) {
        return false
      }

      const move = applyMove(from, to)
      if (!move) return false

      const uci = move.from + move.to + (move.promotion || '')
      gameSocket.playMove(gameInfo.gameId, uci)
      return true
    },
    [phase, gameInfo, applyMove],
  )

  const sendChat = (e: React.FormEvent) => {
    e.preventDefault()
    if (!gameInfo || !chatInput.trim()) return
    gameSocket.sendChat(gameInfo.gameId, chatInput.trim())
    setChatMessages((prev) => [...prev, { username: user?.username || 'You', text: chatInput.trim() }])
    setChatInput('')
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-4xl">
      {!hideDummyBilling && (
      <UpgradeModal
        tier={upgradeTier}
        product="online"
        open={!!upgradeTier}
        onClose={() => setUpgradeTier(null)}
        onSuccess={() => {
          refreshTiers()
          if (upgradeTier) {
            setSelectedPreset({
              label: upgradeTier.label,
              seconds: upgradeTier.time_control_seconds ?? 600,
              increment: upgradeTier.increment_seconds ?? 0,
              tier: upgradeTier.id,
            })
          }
          setStatus('Time control unlocked — find a match or create a room!')
        }}
      />
      )}

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Play Online</h1>
        <Link to="/play" className="text-sm text-emerald-400 hover:underline">
          ← Offline play
        </Link>
      </div>

      {!isOnline && (
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-4 text-sm text-amber-200">
          <p className="font-medium">You are offline</p>
          <p className="mt-1 text-xs text-amber-300/90">
            Online matchmaking needs an internet connection. Use{' '}
            <Link to="/play" className="underline">
              Offline
            </Link>{' '}
            for same-device play or{' '}
            <Link to="/play/ai" className="underline">
              vs AI
            </Link>
            .
          </p>
        </div>
      )}

      {phase === 'lobby' && (
        <div className="glass-panel mb-6 space-y-6 p-6">
          <div>
            <label className="mb-2 block text-sm text-gray-400">Time control</label>
            <div className="flex flex-wrap gap-2">
              {timePresets.map((p) => {
                const tier = onlineTiers.find((t) => t.id === p.tier)
                const locked = tier && !tier.unlocked && tier.requires_payment
                const selected = selectedPreset?.tier === p.tier
                return (
                <button
                  key={p.tier}
                  type="button"
                  onClick={() => handlePresetClick(p)}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    selected
                      ? locked
                        ? 'border border-yellow-500/50 bg-yellow-500/10 text-yellow-100'
                        : 'bg-emerald-600 text-white'
                      : locked
                        ? 'border border-white/10 bg-white/[0.02] text-gray-400'
                        : 'bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  {locked ? '🔒 ' : ''}{p.label}
                  {tier && tier.price_cents > 0 && (
                    <span className="ml-1 text-xs opacity-80">
                      ({tier.price_one_time_display ?? `${tier.price_display} one-time`})
                    </span>
                  )}
                </button>
              )})}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              {hideDummyBilling
                ? 'Quick play 3+2 is free. Other time controls coming in a future update.'
                : 'Quick play 3+2 is free. Other time controls are separate one-time purchases — buy any tier individually.'}
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-400">Quick match</label>
            <div className="flex flex-wrap gap-3">
              {!hideDummyBilling && !isPresetUnlocked && selectedTierInfo?.requires_payment ? (
                <button
                  type="button"
                  onClick={() => setUpgradeTier(selectedTierInfo)}
                  className="btn-primary"
                >
                  {buyLabel(selectedTierInfo.label, selectedTierInfo.price_cents)}
                </button>
              ) : (
                <>
                  <button type="button" onClick={findMatch} className="btn-primary" disabled={!selectedPreset || !isOnline}>
                    Find Random Match
                  </button>
                  <button type="button" onClick={createRoom} className="btn-secondary" disabled={!selectedPreset || !isOnline}>
                    Create Room
                  </button>
                </>
              )}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Create a room to get a code you can share with a friend.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-400">Join a friend&apos;s room</label>
            <div className="flex gap-2">
              <input
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                placeholder="Enter room code"
                className="input-field flex-1 uppercase"
                maxLength={8}
                disabled={!isOnline}
              />
              <button onClick={joinRoom} className="btn-secondary" disabled={!isOnline || !roomCodeInput.trim()}>
                Join Room
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Ask your friend for their 6-letter room code, then paste it here.
            </p>
          </div>
        </div>
      )}

      {phase === 'waiting' && (
        <div className="glass-panel mb-6 p-6 text-center">
          {createdRoomCode ? (
            <>
              <h2 className="mb-2 text-lg font-semibold text-white">Your game room is ready</h2>
              <p className="mb-6 text-sm text-gray-400">
                When your friend joins, the game starts automatically.
              </p>
              <p className="mb-1 text-xs uppercase tracking-wide text-gray-500">Room code</p>
              <p className="mb-3 font-mono text-4xl font-bold tracking-[0.3em] text-emerald-400">
                {createdRoomCode}
              </p>
              <p className="mb-4 text-sm text-gray-400">
                Send this code to your friend using any app below
              </p>
              <div className="mb-6 flex flex-wrap justify-center gap-2">
                {canNativeShare && (
                  <button
                    type="button"
                    onClick={shareNative}
                    className="btn-secondary px-4 py-2 text-sm"
                  >
                    Share
                  </button>
                )}
                <a
                  href={shareLinks.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary px-4 py-2 text-sm"
                >
                  WhatsApp
                </a>
                <a href={shareLinks.sms} className="btn-secondary px-4 py-2 text-sm">
                  SMS
                </a>
                <a href={shareLinks.email} className="btn-secondary px-4 py-2 text-sm">
                  Email
                </a>
                <button
                  type="button"
                  onClick={() => copyText(createdRoomCode, 'code')}
                  className="btn-secondary px-4 py-2 text-sm"
                >
                  {copied === 'code' ? 'Copied!' : 'Copy'}
                </button>
                <button
                  type="button"
                  onClick={() => copyText(shareMessage, 'share')}
                  className="btn-secondary px-4 py-2 text-sm"
                >
                  {copied === 'share' ? 'Copied!' : 'Copy invite'}
                </button>
              </div>
              <p className="mb-4 text-sm text-emerald-400">{status}</p>
              <button type="button" onClick={cancelWaiting} className="btn-secondary">
                Cancel
              </button>
            </>
          ) : (
            <>
              <p className="mb-4 text-emerald-400">{status}</p>
              <button type="button" onClick={cancelSearch} className="btn-secondary">
                Cancel search
              </button>
            </>
          )}
        </div>
      )}

      {(phase === 'playing' || phase === 'finished') && gameInfo && (
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <div className="glass-panel p-3 sm:p-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 sm:mb-4">
              <span className="font-medium text-emerald-400">{status}</span>
              <div className="flex gap-2">
                {phase === 'finished' && (
                  <button onClick={backToLobby} className="btn-primary py-2 text-sm">
                    Play Again
                  </button>
                )}
                {phase === 'playing' && (
                  <>
                    <button
                      onClick={() => gameSocket.offerDraw(gameInfo.gameId)}
                      className="btn-secondary py-2 text-sm"
                    >
                      Offer Draw
                    </button>
                    <button
                      onClick={() => gameSocket.resign(gameInfo.gameId)}
                      className="btn-secondary py-2 text-sm text-red-400"
                    >
                      Resign
                    </button>
                  </>
                )}
                {drawOffered && (
                  <>
                    <button
                      onClick={() => {
                        gameSocket.respondDraw(gameInfo.gameId, true)
                        setDrawOffered(false)
                      }}
                      className="btn-primary py-2 text-sm"
                    >
                      Accept Draw
                    </button>
                    <button
                      onClick={() => {
                        gameSocket.respondDraw(gameInfo.gameId, false)
                        setDrawOffered(false)
                      }}
                      className="btn-secondary py-2 text-sm"
                    >
                      Decline
                    </button>
                  </>
                )}
              </div>
            </div>
            <ClickChessboard
              fen={fen}
              onMove={onMove}
              boardOrientation={orientation}
              maxBoardWidth={520}
              reservedHeight={360}
              interactive={isMyTurn}
              selectableColor={gameInfo.color === 'white' ? 'w' : 'b'}
            />
            <p className="mt-3 text-xs text-gray-500">
              You play {gameInfo.color}
              {gameInfo.opponent ? ` vs ${gameInfo.opponent}` : ''}
              {isMyTurn
                ? ' · Your turn — click a piece, then a highlighted square'
                : ' · Waiting for opponent'}
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="glass-panel p-4">
              <MoveHistory chess={chess} />
            </div>

            <div className="glass-panel flex flex-1 flex-col p-4">
              <h3 className="mb-3 text-sm font-semibold text-gray-300">Chat</h3>
              <div className="mb-3 flex-1 space-y-2 overflow-y-auto text-sm">
                {chatMessages.length === 0 && (
                  <p className="text-gray-500">No messages yet</p>
                )}
                {chatMessages.map((m, i) => (
                  <p key={i}>
                    <span className="font-medium text-emerald-400">{m.username}:</span> {m.text}
                  </p>
                ))}
              </div>
              {phase === 'playing' && (
                <form onSubmit={sendChat} className="flex gap-2">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="input-field flex-1 text-sm"
                    placeholder="Message..."
                  />
                  <button type="submit" className="btn-secondary py-2 text-sm">
                    Send
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {phase === 'lobby' && (
        <p className="text-sm text-gray-500">{status}</p>
      )}
    </motion.div>
  )
}
