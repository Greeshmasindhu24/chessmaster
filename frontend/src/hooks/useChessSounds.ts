import { useCallback } from 'react'
import { useSelector } from 'react-redux'
import { Chess, Move } from 'chess.js'
import { RootState } from '../store'
import { playMoveSound, soundKindForMove, type MoveSoundKind } from '../utils/chessSounds'

export function useChessSounds() {
  const soundEnabled = useSelector((s: RootState) => s.settings.soundEnabled)

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
