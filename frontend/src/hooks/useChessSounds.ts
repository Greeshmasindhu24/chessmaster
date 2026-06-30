import { useCallback, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { Chess, Move } from 'chess.js'
import { RootState } from '../store'
import { playMoveSound, soundKindForMove, unlockAudio, type MoveSoundKind } from '../utils/chessSounds'

export function useChessSounds() {
  const soundEnabled = useSelector((s: RootState) => s.settings.soundEnabled)

  useEffect(() => {
    const unlock = () => unlockAudio()
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  const playAfterMove = useCallback(
    (chess: Chess, move: Move) => {
      playMoveSound(soundKindForMove(chess, move), soundEnabled, move)
    },
    [soundEnabled],
  )

  const playKind = useCallback(
    (kind: MoveSoundKind, move?: Move) => {
      playMoveSound(kind, soundEnabled, move)
    },
    [soundEnabled],
  )

  return { playAfterMove, playKind, soundEnabled }
}
