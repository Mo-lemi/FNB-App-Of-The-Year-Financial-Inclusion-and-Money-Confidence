import { describe, expect, it } from 'vitest'
import { detectScheduled, forecast, HORIZON, percentile } from './forecast'
import { buildDemo } from './demo'
import { buildInsights } from './insights'
import { addDays } from './dates'
import type { AppData, Txn } from './types'

const TODAY = '2026-10-24'

function base(overrides: Partial<AppData> = {}): AppData {
  return {
    profile: { name: 'T', lang: 'en', openingBalance: 1000, weeklyIncomeEstimate: 1400, bufferGoal: 500, createdAt: TODAY },
    txns: [],
    bills: [],
    ...overrides,
  }
}

describe('percentile', () => {
  it('interpolates', () => {
    expect(percentile([0, 10, 20, 30, 40], 0.25)).toBe(10)
    expect(percentile([], 0.5)).toBe(0)
  })
})

describe('forecast', () => {
  it('never lets the safe-spending path go below zero', () => {
    const f = forecast(buildDemo(TODAY), TODAY)
    expect(f.days).toHaveLength(HORIZON)
    for (const d of f.days) expect(d.safeBalance).toBeGreaterThanOrEqual(-0.01)
    expect(f.safeToday).toBeGreaterThan(0)
  })

  it('uses the weekly estimate as a prior for brand-new users', () => {
    const f = forecast(base(), TODAY)
    expect(f.confidence).toBe('learning')
    expect(f.expectedByDow.every((v) => Math.abs(v - 200) < 1e-9)).toBe(true)
    expect(f.safeToday).toBeGreaterThan(0)
  })

  it('reserves money for an upcoming bill', () => {
    const without = forecast(base(), TODAY)
    const withRent = forecast(base({ bills: [{ id: 'r', name: 'Rent', amount: 1500, dayOfMonth: 26 }] }), TODAY)
    expect(withRent.safeToday).toBeLessThan(without.safeToday)
    expect(withRent.pinch?.bills[0]?.name).toBe('Rent')
  })

  it('treats a bill that is already paid as handled', () => {
    const bills = [{ id: 'r', name: 'Rent', amount: 1500, dayOfMonth: 26 }]
    const paid: Txn = { id: 'p', date: TODAY, kind: 'expense', amount: 1500, category: 'bills', note: 'rent' }
    const f = forecast(base({ bills, txns: [paid], profile: { ...base().profile!, openingBalance: 2500 } }), TODAY)
    expect(f.days.find((d) => d.date === '2026-10-26')!.billTotal).toBe(0)
  })

  it('subtracts an overdue unpaid bill from what is available', () => {
    const f = forecast(base({ bills: [{ id: 'r', name: 'Rent', amount: 400, dayOfMonth: 23 }] }), TODAY)
    expect(f.overdueBills).toHaveLength(1)
    expect(f.available).toBe(600)
  })

  it('suggests saving on a better-than-usual day', () => {
    const f = forecast(buildDemo(TODAY), TODAY)
    expect(f.nudge?.amount).toBeGreaterThan(0)
  })

  it('detects the falling trend in the demo', () => {
    const f = forecast(buildDemo(TODAY), TODAY)
    expect(f.trend).toBeLessThan(1)
  })
})

describe('detectScheduled', () => {
  it('finds a monthly grant but not daily work income', () => {
    const txns: Txn[] = []
    for (let i = 0; i < 90; i++) txns.push({ id: `w${i}`, date: addDays('2026-07-01', i), kind: 'income', amount: 200, category: 'work' })
    for (const d of ['2026-07-03', '2026-08-03', '2026-09-04']) txns.push({ id: d, date: d, kind: 'income', amount: 560, category: 'grant', note: 'Grant' })
    const s = detectScheduled(txns)
    expect(s.map((x) => x.category)).toEqual(['grant'])
    expect(s[0].dayOfMonth).toBe(3)
  })
})

describe('insights', () => {
  it('produces several insights for the demo', () => {
    const data = buildDemo(TODAY)
    const ids = buildInsights(data, forecast(data, TODAY)).map((i) => i.id)
    expect(ids).toEqual(expect.arrayContaining(['best-days', 'trend', 'swing', 'top-cat', 'sched-grant', 'buffer']))
  })
})
