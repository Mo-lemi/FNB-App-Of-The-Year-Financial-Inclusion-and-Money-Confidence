import { describe, expect, it } from 'vitest'
import { detectScheduled, forecast, HORIZON, percentile, maxSave, safeAfterSaving } from './forecast'
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

  it('never suggests saving more than is safe today, and saving lowers the safe amount', () => {
    const data = buildDemo(TODAY)
    const f = forecast(data, TODAY)
    expect(f.nudge!.amount).toBeLessThanOrEqual(f.safeToday)
    expect(safeAfterSaving(data, TODAY, f.nudge!.amount)).toBeLessThan(f.safeToday)
  })

  it('caps a custom save where essentials would no longer be covered', () => {
    const data = buildDemo(TODAY)
    const limit = maxSave(data, TODAY)
    expect(limit).toBeGreaterThanOrEqual(forecast(data, TODAY).nudge!.amount)
    const status = (x: number) => {
      const d = buildDemo(TODAY)
      d.txns.push({ id: 's', date: TODAY, kind: 'save', amount: x, category: 'buffer', note: '' })
      return forecast(d, TODAY).status
    }
    expect(status(limit)).not.toBe('survival')
    expect(status(limit + 10)).toBe('survival')
  })

  it('stops suggesting once something was saved today', () => {
    const data = buildDemo(TODAY)
    data.txns.push({ id: 'x', date: TODAY, kind: 'save', amount: 60, category: 'buffer', note: 'Good-day save' })
    expect(forecast(data, TODAY).nudge).toBeNull()
  })

  it('tells the same demo story whichever day the judges open it', () => {
    for (let i = 0; i < 365; i += 3) {
      const day = addDays(TODAY, i)
      const f = forecast(buildDemo(day), day)
      expect(f.status, day).not.toBe('survival')
      expect(f.overdueBills, day).toHaveLength(0)
      expect(f.nudge, day).not.toBeNull()
    }
  })

  it('detects the falling trend in the demo', () => {
    const f = forecast(buildDemo(TODAY), TODAY)
    expect(f.trend).toBeLessThan(1)
  })
})

describe('forecast status', () => {
  it('says "on track" when there is plenty of money', () => {
    const f = forecast(base({ profile: { ...base().profile!, openingBalance: 20000 } }), TODAY)
    expect(f.status).toBe('good')
  })

  it('says "essentials only" when a big bill eats almost everything', () => {
    const f = forecast(base({ bills: [{ id: 'r', name: 'Rent', amount: 3500, dayOfMonth: 26 }] }), TODAY)
    expect(f.status).toBe('survival')
    expect(f.nudge).toBeNull()
    expect(maxSave(base({ bills: [{ id: 'r', name: 'Rent', amount: 3500, dayOfMonth: 26 }] }), TODAY)).toBe(0)
  })

  it('grows more confident as history builds up', () => {
    expect(forecast(base(), TODAY).confidence).toBe('learning')
    expect(forecast(buildDemo(TODAY), TODAY).confidence).toBe('strong')
  })

  it('ignores entries dated in the future', () => {
    const later: Txn = { id: 'x', date: addDays(TODAY, 3), kind: 'expense', amount: 900, category: 'food' }
    expect(forecast(base({ txns: [later] }), TODAY).balance).toBe(forecast(base(), TODAY).balance)
  })

  it('keeps buffer savings out of what is safe to spend', () => {
    const saved: Txn = { id: 's', date: TODAY, kind: 'save', amount: 300, category: 'buffer' }
    const f = forecast(base({ txns: [saved] }), TODAY)
    expect(f.buffer).toBe(300)
    expect(f.safeToday).toBeLessThan(forecast(base(), TODAY).safeToday)
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
  it('tells a brand-new user it is still learning', () => {
    const data = base()
    const ids = buildInsights(data, forecast(data, TODAY)).map((i) => i.id)
    expect(ids).toContain('learning')
    expect(ids).not.toContain('best-days')
  })

  it('finds best days, the falling trend and the grant in the demo', () => {
    const data = buildDemo(TODAY)
    const ids = buildInsights(data, forecast(data, TODAY)).map((i) => i.id)
    expect(ids).toEqual(expect.arrayContaining(['best-days', 'trend']))
    expect(ids.some((id) => id.startsWith('sched-'))).toBe(true)
  })

  it('produces several insights for the demo', () => {
    const data = buildDemo(TODAY)
    const ids = buildInsights(data, forecast(data, TODAY)).map((i) => i.id)
    expect(ids).toEqual(expect.arrayContaining(['best-days', 'trend', 'swing', 'top-cat', 'sched-grant', 'buffer']))
  })
})
