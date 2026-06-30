import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Chess } from 'chess.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const bankSource = readFileSync(join(__dirname, '../src/data/dailyPuzzles.ts'), 'utf8')
const bankMatch = bankSource.match(/export const DAILY_PUZZLE_BANK[^=]*=\s*(\[[\s\S]*\])\s*$/m)
if (!bankMatch) {
  console.error('Could not read DAILY_PUZZLE_BANK from dailyPuzzles.ts')
  process.exit(1)
}

/** @type {Array<{id:string,title:string,fen:string,solution:string[],hint:string}>} */
const DAILY_PUZZLE_BANK = Function(`"use strict"; return (${bankMatch[1]})`)()

function playUci(chess, uci) {
  const from = uci.slice(0, 2)
  const to = uci.slice(2, 4)
  const promotion = uci.length > 4 ? uci[4] : undefined
  try {
    return chess.move({ from, to, promotion })
  } catch {
    return null
  }
}

function validatePuzzle(puzzle, index) {
  const issues = []
  let chess

  try {
    chess = new Chess(puzzle.fen)
  } catch (error) {
    return { index, id: puzzle.id, valid: false, issues: [`Invalid FEN: ${error.message}`] }
  }

  for (let i = 0; i < puzzle.solution.length; i += 1) {
    const move = playUci(chess, puzzle.solution[i])
    if (!move) {
      issues.push(`Illegal move ${i + 1}: ${puzzle.solution[i]}`)
      break
    }
  }

  return {
    index: index + 1,
    id: puzzle.id,
    valid: issues.length === 0,
    issues,
    outcome:
      issues.length === 0
        ? chess.isCheckmate()
          ? 'checkmate'
          : chess.isCheck()
            ? 'check'
            : 'tactic'
        : 'failed',
  }
}

const results = DAILY_PUZZLE_BANK.map(validatePuzzle)
const failed = results.filter((r) => !r.valid)

console.log('Puzzle bank validation\n')
for (const r of results) {
  const status = r.valid ? `OK (${r.outcome})` : 'FAIL'
  console.log(`#${r.index} ${r.id}: ${status}`)
  for (const issue of r.issues) console.log(`  - ${issue}`)
}

if (failed.length > 0) {
  console.error(`\n${failed.length} invalid puzzle(s).`)
  process.exit(1)
}

console.log(`\nAll ${results.length} puzzles valid.`)
