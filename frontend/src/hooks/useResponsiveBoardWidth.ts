import { useEffect, useState } from 'react'

const MIN_BOARD_WIDTH = 240
const HORIZONTAL_CHROME = 64

function computeBoardWidth(maxWidth: number, reservedHeight: number): number {
  const byWidth = window.innerWidth - HORIZONTAL_CHROME
  const byHeight = window.innerHeight - reservedHeight
  return Math.max(MIN_BOARD_WIDTH, Math.min(maxWidth, byWidth, byHeight))
}

/** Viewport-aware chess board width: fits width and height on mobile, capped on desktop. */
export function useResponsiveBoardWidth(maxWidth = 560, reservedHeight = 320) {
  const [boardWidth, setBoardWidth] = useState(() =>
    computeBoardWidth(maxWidth, reservedHeight),
  )

  useEffect(() => {
    const onResize = () => setBoardWidth(computeBoardWidth(maxWidth, reservedHeight))
    window.addEventListener('resize', onResize)
    onResize()
    return () => window.removeEventListener('resize', onResize)
  }, [maxWidth, reservedHeight])

  return boardWidth
}
