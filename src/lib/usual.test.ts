import { describe, expect, it } from 'vitest'
import { usualEntries } from './usual'
import { buildDemo } from './demo'
import type { Txn } from './types'

const TODAY = '2026-10-26'
const txn = (date: string, amount: number, category: string, note?: string, kind: Txn['kind'] = 'expense'): Txn => ({
  id: `${date}-${amount}-${note}`,
  date,
  kind,
  amount,
  category,
  note,
})

describe('usual entries', () => {
  it('learns the things you log most, with a typical amount', () => {
    const txns = [
      txn('2026-10-20', 40, 'food', 'Bread'),
      txn('2026-10-21', 50, 'food', 'Bread'),
      txn('2026-10-22', 60, 'food', 'bread'),
      txn('2026-10-23', 45, 'food', 'Bread'),
      txn('2026-10-24', 30, 'transport', 'Taxi'),
      txn('2026-10-25', 30, 'transport', 'Taxi'),
      txn('2026-10-26', 30, 'transport', 'Taxi'),
    ]
    expect(usualEntries(txns, 'expense', TODAY)).toEqual([
      { category: 'food', note: 'Bread', amount: 50, count: 4 },
      { category: 'transport', note: 'Taxi', amount: 30, count: 3 },
    ])
  })

  it('ignores one-offs, old entries, bills and the other direction', () => {
    const txns = [
      txn('2026-10-25', 999, 'other', 'TV'),
      txn('2026-08-01', 30, 'transport', 'Taxi'),
      txn('2026-08-02', 30, 'transport', 'Taxi'),
      txn('2026-08-03', 30, 'transport', 'Taxi'),
      txn('2026-10-01', 1800, 'bills', 'Rent'),
      txn('2026-10-02', 1800, 'bills', 'Rent'),
      txn('2026-10-03', 1800, 'bills', 'Rent'),
      txn('2026-10-24', 300, 'work', 'Payout', 'income'),
      txn('2026-10-25', 300, 'work', 'Payout', 'income'),
      txn('2026-10-26', 300, 'work', 'Payout', 'income'),
    ]
    expect(usualEntries(txns, 'expense', TODAY)).toEqual([])
    expect(usualEntries(txns, 'income', TODAY)).toHaveLength(1)
  })

  it("finds Sipho's food, fuel and delivery payouts in the demo", () => {
    const { txns } = buildDemo(TODAY)
    const out = usualEntries(txns, 'expense', TODAY).map((u) => u.note)
    expect(out).toEqual(expect.arrayContaining(['Food', 'Fuel']))
    expect(usualEntries(txns, 'income', TODAY)[0].note).toBe('Delivery payout')
  })
})
