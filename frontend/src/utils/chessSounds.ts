import { Chess, Move } from 'chess.js'

export type MoveSoundKind =
  | 'move'
  | 'capture'
  | 'check'
  | 'gameover'
  | 'castling'
  | 'promotion'

export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k'

let audioCtx: AudioContext | null = null
let masterGain: GainNode | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!audioCtx) audioCtx = new AudioContext()
    if (audioCtx.state === 'suspended') void audioCtx.resume()
    return audioCtx
  } catch {
    return null
  }
}

function getMasterOut(ctx: AudioContext): GainNode {
  if (!masterGain) {
    masterGain = ctx.createGain()
    masterGain.gain.value = 0.5
    masterGain.connect(ctx.destination)
  }
  return masterGain
}

type ToneOpts = {
  frequency: number
  endFrequency?: number
  durationMs: number
  type?: OscillatorType
  volume?: number
  delayMs?: number
}

function playTone({
  frequency,
  endFrequency,
  durationMs,
  type = 'sine',
  volume = 0.2,
  delayMs = 0,
}: ToneOpts) {
  const ctx = getAudioContext()
  if (!ctx) return

  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.value = frequency
  osc.connect(gain)
  gain.connect(getMasterOut(ctx))

  const start = ctx.currentTime + delayMs / 1000
  const attack = 0.008
  const duration = durationMs / 1000
  const end = start + duration

  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.linearRampToValueAtTime(volume, start + attack)
  gain.gain.exponentialRampToValueAtTime(0.0001, end)

  if (endFrequency && endFrequency !== frequency) {
    osc.frequency.setValueAtTime(frequency, start)
    osc.frequency.exponentialRampToValueAtTime(Math.max(endFrequency, 1), end)
  }

  osc.start(start)
  osc.stop(end + 0.015)
}

function pieceTypeFromMove(move: Move): PieceType {
  const piece = (move.promotion ?? move.piece) as PieceType
  return piece ?? 'p'
}

function playPawn(opts?: { louder?: boolean }) {
  const vol = opts?.louder ? 0.28 : 0.18
  playTone({ frequency: 520, durationMs: 55, type: 'sine', volume: vol })
}

function playKnight(opts?: { louder?: boolean }) {
  const vol = opts?.louder ? 0.26 : 0.19
  playTone({ frequency: 380, durationMs: 70, type: 'triangle', volume: vol })
  playTone({ frequency: 620, durationMs: 85, type: 'triangle', volume: vol * 0.85, delayMs: 55 })
}

function playBishop(opts?: { louder?: boolean }) {
  const vol = opts?.louder ? 0.26 : 0.19
  playTone({
    frequency: 480,
    endFrequency: 720,
    durationMs: 110,
    type: 'sine',
    volume: vol,
  })
}

function playRook(opts?: { louder?: boolean }) {
  const vol = opts?.louder ? 0.3 : 0.22
  playTone({ frequency: 180, durationMs: 90, type: 'triangle', volume: vol })
}

function playQueen(opts?: { louder?: boolean }) {
  const vol = opts?.louder ? 0.24 : 0.17
  playTone({ frequency: 660, durationMs: 100, type: 'sine', volume: vol })
  playTone({ frequency: 880, durationMs: 130, type: 'sine', volume: vol * 0.75, delayMs: 70 })
}

function playKing(opts?: { louder?: boolean }) {
  const vol = opts?.louder ? 0.28 : 0.21
  playTone({ frequency: 220, durationMs: 120, type: 'sine', volume: vol })
}

function playPieceSound(piece: PieceType, louder = false) {
  switch (piece) {
    case 'n':
      playKnight({ louder })
      break
    case 'b':
      playBishop({ louder })
      break
    case 'r':
      playRook({ louder })
      break
    case 'q':
      playQueen({ louder })
      break
    case 'k':
      playKing({ louder })
      break
    default:
      playPawn({ louder })
  }
}

function playCheckAlert() {
  playTone({ frequency: 740, durationMs: 120, type: 'sine', volume: 0.14, delayMs: 40 })
}

function playGameover() {
  playTone({ frequency: 440, durationMs: 160, type: 'sine', volume: 0.18 })
  playTone({ frequency: 370, durationMs: 200, type: 'sine', volume: 0.16, delayMs: 140 })
  playTone({ frequency: 294, durationMs: 280, type: 'sine', volume: 0.14, delayMs: 280 })
}

function playCastling() {
  playRook()
  playTone({ frequency: 160, durationMs: 70, type: 'triangle', volume: 0.14, delayMs: 50 })
}

export function soundKindForMove(chess: Chess, move: Move): MoveSoundKind {
  if (chess.isCheckmate() || chess.isDraw()) return 'gameover'
  if (chess.isCheck()) return 'check'
  if (move.captured) return 'capture'
  if (move.flags.includes('k') || move.flags.includes('q')) return 'castling'
  if (move.promotion) return 'promotion'
  return 'move'
}

export function playMoveSound(kind: MoveSoundKind, enabled: boolean, move?: Move) {
  if (!enabled) return

  const piece = move ? pieceTypeFromMove(move) : 'p'

  switch (kind) {
    case 'move':
    case 'promotion':
      playPieceSound(piece)
      break
    case 'capture':
      playPieceSound(piece, true)
      break
    case 'check':
      playPieceSound(piece)
      playCheckAlert()
      break
    case 'gameover':
      playGameover()
      break
    case 'castling':
      playCastling()
      break
  }
}
