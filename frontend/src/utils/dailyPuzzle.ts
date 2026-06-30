import puzzles from '../data/dailyPuzzles.json'

export interface DailyPuzzle {
  id: string
  title: string
  fen: string
  solution: string[]
  hint: string
}

export function getDailyPuzzle(): DailyPuzzle {
  const bank = puzzles as DailyPuzzle[]
  const today = new Date().toISOString().slice(0, 10)
  let hash = 0
  for (let i = 0; i < today.length; i += 1) {
    hash = (hash * 31 + today.charCodeAt(i)) >>> 0
  }
  return bank[hash % bank.length]
}
