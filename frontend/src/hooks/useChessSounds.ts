import { useCallback, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { Chess, Move } from 'chess.js'
import { RootState } from '../store'
import { playMoveSound, soundKindForMove, unlockAudio, type MoveSoundKind } from '../utils/chessSounds'

const UNLOCK_EVENTS = ['pointerdown', 'click', 'touchstart', 'keydown'] as const
const UNLOCK_OPTS: AddEventListenerOptions = { capture: true, passive: true }

export function useChessSounds() {
  const soundEnabled = useSelector((s: RootState) => s.settings.soundEnabled)

  useEffect(() => {
    const unlock = () => unlockAudio()
    for (const event of UNLOCK_EVENTS) {
      document.addEventListener(event, unlock, UNLOCK_OPTS)
    }
    return () => {
      for (const event of UNLOCK_EVENTS) {
        document.removeEventListener(event, unlock, UNLOCK_OPTS)
      }
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
