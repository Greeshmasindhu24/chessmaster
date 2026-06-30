import { Chess, Move } from 'chess.js'

export type MoveSoundKind =
  | 'move'
  | 'capture'
  | 'check'
  | 'gameover'
  | 'castling'
  | 'promotion'

export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k'

/** Overall output level (1.0 = full; per-sound volumes do the rest). */
export const MASTER_GAIN = 1.0

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

/** Resume AudioContext on user gesture (browser autoplay policy). Safe to call repeatedly. */
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
    volume = 0.55,
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
  const attack = 0.002
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
  osc.stop(end + 0.004)
}

function playTone(opts: ToneOpts) {
  const ctx = getAudioContext()
  if (!ctx) return

  unlockAudio()

  const run = () => scheduleTone(ctx, opts)

  if (ctx.state === 'running') {
    run()
  } else {
    void ctx.resume().then(run).catch(run)
  }
}

function pieceTypeFromMove(move: Move): PieceType {
  const piece = (move.promotion ?? move.piece) as PieceType
  return piece ?? 'p'
}

function playPawn(opts?: { louder?: boolean }) {
  const vol = opts?.louder ? 0.72 : 0.58
  playTone({ frequency: 540, durationMs: 30, type: 'triangle', volume: vol })
}

function playKnight(opts?: { louder?: boolean }) {
  const vol = opts?.louder ? 0.7 : 0.56
  playTone({ frequency: 400, durationMs: 36, type: 'triangle', volume: vol })
  playTone({ frequency: 650, durationMs: 40, type: 'triangle', volume: vol * 0.88, delayMs: 20 })
}

function playBishop(opts?: { louder?: boolean }) {
  const vol = opts?.louder ? 0.68 : 0.54
  playTone({
    frequency: 500,
    endFrequency: 760,
    durationMs: 55,
    type: 'sine',
    volume: vol,
  })
}

function playRook(opts?: { louder?: boolean }) {
  const vol = opts?.louder ? 0.78 : 0.62
  playTone({ frequency: 190, durationMs: 48, type: 'triangle', volume: vol })
}

function playQueen(opts?: { louder?: boolean }) {
  const vol = opts?.louder ? 0.66 : 0.52
  playTone({ frequency: 680, durationMs: 50, type: 'sine', volume: vol })
  playTone({ frequency: 900, durationMs: 58, type: 'sine', volume: vol * 0.82, delayMs: 32 })
}

function playKing(opts?: { louder?: boolean }) {
  const vol = opts?.louder ? 0.72 : 0.58
  playTone({ frequency: 240, durationMs: 58, type: 'sine', volume: vol })
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
  playTone({ frequency: 900, durationMs: 48, type: 'sine', volume: 0.62 })
}

function playGameover() {
  playTone({ frequency: 440, durationMs: 80, type: 'sine', volume: 0.6 })
  playTone({ frequency: 370, durationMs: 90, type: 'sine', volume: 0.55, delayMs: 60 })
  playTone({ frequency: 294, durationMs: 110, type: 'sine', volume: 0.5, delayMs: 120 })
}

function playCastling() {
  playRook()
  playTone({ frequency: 170, durationMs: 40, type: 'triangle', volume: 0.55, delayMs: 24 })
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

  unlockAudio()

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
