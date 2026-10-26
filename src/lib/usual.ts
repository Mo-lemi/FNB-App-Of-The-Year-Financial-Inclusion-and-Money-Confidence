import type { Txn } from './types'
import { addDays } from './dates'
import { percentile } from './forecast'
import { roundTo } from './money'

export interface UsualEntry {
  category: string
  note?: string
  amount: number
  count: number
}

const WINDOW = 30
const MIN_COUNT = 3

/**
 * The entries someone logs again and again ("Food R65", "Fuel R60"), learned from the last
 * 30 days, most frequent first. One tap on one fills in the whole form, so logging takes
 * two taps instead of typing. Bills have their own picker, so they are left out.
 */
export function usualEntries(txns: Txn[], kind: 'income' | 'expense', today: string, limit = 4): UsualEntry[] {
  const since = addDays(today, -WINDOW)
  const groups = new Map<string, { category: string; note?: string; amounts: number[] }>()
  for (const t of txns) {
    if (t.kind !== kind || t.date < since || t.date > today) continue
    if (t.category === 'bills' || t.category === 'adjustment') continue
    const note = t.note?.trim() || undefined
    const key = `${t.category}|${(note ?? '').toLowerCase()}`
    const g = groups.get(key) ?? { category: t.category, note, amounts: [] }
    g.amounts.push(t.amount)
    groups.set(key, g)
  }
  return [...groups.values()]
    .filter((g) => g.amounts.length >= MIN_COUNT)
    .map((g) => ({ category: g.category, note: g.note, amount: Math.max(5, roundTo(percentile(g.amounts, 0.5), 5)), count: g.amounts.length }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}
