import { Chess, Move } from 'chess.js'

export type MoveSoundKind =
  | 'move'
  | 'capture'
  | 'check'
  | 'gameover'
  | 'castling'
  | 'promotion'

export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k'

/** Overall output level for all chess move sounds (gain node; values above 1 are allowed). */
export const MASTER_GAIN = 1.8

let audioCtx: AudioContext | null = null
let masterGain: GainNode | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!audioCtx) audioCtx = new AudioContext()
    return audioCtx
  } catch {
    return null
  }
}

/** Call on first user gesture so browsers allow playback (AudioContext autoplay policy). */
export function unlockAudio(): void {
  const ctx = getAudioContext()
  if (!ctx || ctx.state === 'running') return
  void ctx.resume()
}

function getMasterOut(ctx: AudioContext): GainNode {
  if (!masterGain) {
    masterGain = ctx.createGain()
    masterGain.connect(ctx.destination)
  }
  masterGain.gain.value = MASTER_GAIN
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

function scheduleTone(
  ctx: AudioContext,
  {
    frequency,
    endFrequency,
    durationMs,
    type = 'sine',
    volume = 0.35,
    delayMs = 0,
  }: ToneOpts,
) {
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

function playTone(opts: ToneOpts) {
  const ctx = getAudioContext()
  if (!ctx) return

  const run = () => scheduleTone(ctx, opts)

  if (ctx.state === 'suspended') {
    void ctx.resume().then(run).catch(() => {})
  } else {
    run()
  }
}

function pieceTypeFromMove(move: Move): PieceType {
  const piece = (move.promotion ?? move.piece) as PieceType
  return piece ?? 'p'
}

function playPawn(opts?: { louder?: boolean }) {
  const vol = opts?.louder ? 0.5 : 0.34
  playTone({ frequency: 520, durationMs: 55, type: 'sine', volume: vol })
}

function playKnight(opts?: { louder?: boolean }) {
  const vol = opts?.louder ? 0.46 : 0.36
  playTone({ frequency: 380, durationMs: 70, type: 'triangle', volume: vol })
  playTone({ frequency: 620, durationMs: 85, type: 'triangle', volume: vol * 0.85, delayMs: 55 })
}

function playBishop(opts?: { louder?: boolean }) {
  const vol = opts?.louder ? 0.46 : 0.36
  playTone({
    frequency: 480,
    endFrequency: 720,
    durationMs: 110,
    type: 'sine',
    volume: vol,
  })
}

function playRook(opts?: { louder?: boolean }) {
  const vol = opts?.louder ? 0.54 : 0.4
  playTone({ frequency: 180, durationMs: 90, type: 'triangle', volume: vol })
}

function playQueen(opts?: { louder?: boolean }) {
  const vol = opts?.louder ? 0.42 : 0.32
  playTone({ frequency: 660, durationMs: 100, type: 'sine', volume: vol })
  playTone({ frequency: 880, durationMs: 130, type: 'sine', volume: vol * 0.75, delayMs: 70 })
}

function playKing(opts?: { louder?: boolean }) {
  const vol = opts?.louder ? 0.5 : 0.38
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
  playTone({ frequency: 740, durationMs: 120, type: 'sine', volume: 0.3, delayMs: 40 })
}

function playGameover() {
  playTone({ frequency: 440, durationMs: 160, type: 'sine', volume: 0.36 })
  playTone({ frequency: 370, durationMs: 200, type: 'sine', volume: 0.32, delayMs: 140 })
  playTone({ frequency: 294, durationMs: 280, type: 'sine', volume: 0.28, delayMs: 280 })
}

function playCastling() {
  playRook()
  playTone({ frequency: 160, durationMs: 70, type: 'triangle', volume: 0.28, delayMs: 50 })
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
