import puzzles from '../data/dailyPuzzles.json'

export const DAILY_PUZZLE_COUNT = 3

export interface DailyPuzzle {
  id: string
  title: string
  fen: string
  solution: string[]
  hint: string
}

function dateHash(dateStr: string): number {
  let hash = 0
  for (let i = 0; i < dateStr.length; i += 1) {
    hash = (hash * 31 + dateStr.charCodeAt(i)) >>> 0
  }
  return hash
}

export function getDailyPuzzles(): DailyPuzzle[] {
  const bank = puzzles as DailyPuzzle[]
  const today = new Date().toISOString().slice(0, 10)
  const hash = dateHash(today)
  const count = Math.min(DAILY_PUZZLE_COUNT, bank.length)
  const indices = new Set<number>()
  let offset = 0
  while (indices.size < count) {
    indices.add((hash + offset) % bank.length)
    offset += 1
  }
  return [...indices].map((i) => bank[i])
}

export function getDailyPuzzle(): DailyPuzzle {
  return getDailyPuzzles()[0]
}
