import type { AppData, Bill, Txn } from './types'
import { ESSENTIAL_CATEGORIES } from './types'
import { addDays, daysBetween, dom, dow, isDueOn, monthKey } from './dates'
import { floorTo, roundTo } from './money'

/**
 * The forecasting engine.
 *
 * 1. Learns the user's income rhythm per weekday (mean = expected, 25th percentile = cautious),
 *    adjusted for the recent trend, and detects reliable monthly income (e.g. grants).
 * 2. Lays out the next HORIZON days: cautious income in, known bills out.
 * 3. Finds the largest equal daily spend that never pushes the balance below zero on any of
 *    those days. That number is "safe to spend today".
 *
 * Until there is enough history, the user's own weekly estimate acts as a prior and fades out.
 */

export const HORIZON = 14
const WINDOW = 84 // days of history used for the income model
const SPEND_WINDOW = 28
const PRIOR_FADE_DAYS = 28

export interface ScheduledIncome {
  category: string
  label: string
  dayOfMonth: number
  amount: number
}

export interface DayForecast {
  date: string
  expectedIncome: number
  cautiousIncome: number
  bills: Bill[]
  billTotal: number
  typicalSpend: number
  expectedBalance: number // usual income, usual spending
  safeBalance: number // cautious income, spending exactly the safe amount
}

export type Status = 'good' | 'tight' | 'survival'

export interface Forecast {
  today: string
  balance: number
  buffer: number
  spentToday: number
  earnedToday: number
  available: number // balance minus bills already due and unpaid
  overdueBills: Bill[]
  safeToday: number
  status: Status
  essentialsPerDay: number
  days: DayForecast[]
  pinch: { date: string; bills: Bill[]; balanceBefore: number; mainBill: { name: string; amount: number; date: string } | null } | null
  /** The sum behind safeToday: (available + income - bills) / days, for the "how is this worked out" view. */
  explain: { available: number; income: number; bills: number; billNames: string[]; days: number; until: string | null }
  leanWeek: { income: number; bills: number; typical: number } | null
  nudge: { amount: number; earned: number; typical: number } | null
  expectedByDow: number[]
  cautiousByDow: number[]
  trend: number // recent vs older income, 1 = flat
  scheduled: ScheduledIncome[]
  historyDays: number
  confidence: 'learning' | 'ok' | 'strong'
}

export const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

export function percentile(xs: number[], p: number): number {
  if (!xs.length) return 0
  const s = [...xs].sort((a, b) => a - b)
  const i = (s.length - 1) * p
  const lo = Math.floor(i)
  const hi = Math.ceil(i)
  return s[lo] + (s[hi] - s[lo]) * (i - lo)
}

const median = (xs: number[]) => percentile(xs, 0.5)
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x))

export function balances(txns: Txn[], openingBalance: number) {
  let balance = openingBalance
  let buffer = 0
  for (const t of txns) {
    if (t.kind === 'income') balance += t.amount
    else if (t.kind === 'expense') balance -= t.amount
    else if (t.kind === 'save') {
      balance -= t.amount
      buffer += t.amount
    } else {
      balance += t.amount
      buffer -= t.amount
    }
  }
  return { balance, buffer }
}

/** Income in the same category that arrives once a month, on roughly the same day, for roughly the same amount. */
export function detectScheduled(txns: Txn[]): ScheduledIncome[] {
  const byCat = new Map<string, Txn[]>()
  for (const t of txns) {
    if (t.kind !== 'income') continue
    byCat.set(t.category, [...(byCat.get(t.category) ?? []), t])
  }
  const out: ScheduledIncome[] = []
  for (const [category, list] of byCat) {
    const months = new Set(list.map((t) => monthKey(t.date)))
    if (list.length < 2 || list.length > months.size * 1.5) continue
    const days = list.map((t) => dom(t.date))
    const amounts = list.map((t) => t.amount)
    const d = median(days)
    const a = median(amounts)
    if (days.some((x) => Math.abs(x - d) > 3)) continue
    if (amounts.some((x) => Math.abs(x - a) > a * 0.25)) continue
    const label = list[list.length - 1].note || category
    out.push({ category, label, dayOfMonth: Math.round(d), amount: a })
  }
  return out
}

function isBillPaid(bill: Bill, due: string, txns: Txn[]): boolean {
  const name = bill.name.trim().toLowerCase()
  return txns.some((t) => {
    if (t.kind !== 'expense' || t.category !== 'bills') return false
    if ((t.note ?? '').trim().toLowerCase() !== name) return false
    const diff = daysBetween(due, t.date)
    return diff >= -10 && diff <= 5
  })
}

function scheduledReceived(s: ScheduledIncome, due: string, txns: Txn[]): boolean {
  return txns.some(
    (t) => t.kind === 'income' && t.category === s.category && Math.abs(daysBetween(due, t.date)) <= 4,
  )
}

function dailyTotals(txns: Txn[], from: string, to: string, pick: (t: Txn) => boolean): Map<string, number> {
  const m = new Map<string, number>()
  for (let d = from; d <= to; d = addDays(d, 1)) m.set(d, 0)
  for (const t of txns) if (m.has(t.date) && pick(t)) m.set(t.date, m.get(t.date)! + t.amount)
  return m
}

export function forecast(data: AppData, today: string): Forecast {
  const profile = data.profile!
  const txns = data.txns.filter((t) => t.date <= today)
  const { balance, buffer } = balances(txns, profile.openingBalance)

  const firstDate = txns.reduce((min, t) => (t.date < min ? t.date : min), profile.createdAt)
  const yesterday = addDays(today, -1)
  const historyDays = Math.max(0, daysBetween(firstDate, today))
  const windowStart = historyDays > WINDOW ? addDays(today, -WINDOW) : firstDate
  const priorWeight = clamp(1 - historyDays / PRIOR_FADE_DAYS, 0, 1)

  // --- Income model -------------------------------------------------------
  const scheduled = detectScheduled(txns)
  const scheduledCats = new Set(scheduled.map((s) => s.category))
  const isRhythmIncome = (t: Txn) => t.kind === 'income' && !scheduledCats.has(t.category)

  const income = historyDays > 0 ? dailyTotals(txns, windowStart, yesterday, isRhythmIncome) : new Map()
  const byDow: number[][] = [[], [], [], [], [], [], []]
  for (const [d, v] of income) byDow[dow(d)].push(v)

  let trend = 1
  const series = [...income.entries()]
  if (series.length >= 42) {
    const recent = mean(series.slice(-28).map(([, v]) => v))
    const older = mean(series.slice(0, -28).map(([, v]) => v))
    if (older > 0) trend = clamp(recent / older, 0.75, 1.25)
  }

  const priorDaily = profile.weeklyIncomeEstimate / 7
  const expectedByDow = byDow.map((xs) =>
    xs.length ? priorWeight * priorDaily + (1 - priorWeight) * mean(xs) * trend : priorDaily,
  )
  const cautiousByDow = byDow.map((xs) =>
    xs.length ? priorWeight * priorDaily * 0.6 + (1 - priorWeight) * percentile(xs, 0.25) * trend : priorDaily * 0.6,
  )

  // --- Spending model -----------------------------------------------------
  const spendStart = historyDays > SPEND_WINDOW ? addDays(today, -SPEND_WINDOW) : windowStart
  const discretionary =
    historyDays > 0
      ? dailyTotals(txns, spendStart, yesterday, (t) => t.kind === 'expense' && t.category !== 'bills')
      : new Map()
  const essentials =
    historyDays > 0
      ? dailyTotals(txns, spendStart, yesterday, (t) => t.kind === 'expense' && ESSENTIAL_CATEGORIES.includes(t.category))
      : new Map()
  const spendByDow: number[][] = [[], [], [], [], [], [], []]
  for (const [d, v] of discretionary) spendByDow[dow(d)].push(v)
  const priorSpend = (profile.weeklyIncomeEstimate * 0.6) / 7
  const typicalSpendByDow = spendByDow.map((xs) =>
    xs.length ? priorWeight * priorSpend + (1 - priorWeight) * mean(xs) : priorSpend,
  )
  const essentialsPerDay =
    priorWeight * ((profile.weeklyIncomeEstimate * 0.35) / 7) + (1 - priorWeight) * median([...essentials.values()])

  // --- Today --------------------------------------------------------------
  const todays = txns.filter((t) => t.date === today)
  const spentToday = todays.filter((t) => t.kind === 'expense').reduce((a, t) => a + t.amount, 0)
  const earnedToday = todays.filter(isRhythmIncome).reduce((a, t) => a + t.amount, 0)

  const overdueBills: Bill[] = []
  for (const bill of data.bills) {
    for (let back = 0; back <= 3; back++) {
      const d = addDays(today, -back)
      if (isDueOn(bill.dayOfMonth, d) && !isBillPaid(bill, d, txns)) overdueBills.push(bill)
    }
  }
  const available = balance - overdueBills.reduce((a, b) => a + b.amount, 0)

  // --- Lay out the horizon ------------------------------------------------
  const plan = Array.from({ length: HORIZON }, (_, i) => {
    const date = addDays(today, i + 1)
    const sched = scheduled
      .filter((s) => isDueOn(s.dayOfMonth, date) && !scheduledReceived(s, date, txns))
      .reduce((a, s) => a + s.amount, 0)
    const bills = data.bills.filter((b) => isDueOn(b.dayOfMonth, date) && !isBillPaid(b, date, txns))
    return {
      date,
      expectedIncome: expectedByDow[dow(date)] + sched,
      cautiousIncome: cautiousByDow[dow(date)] + sched,
      bills,
      billTotal: bills.reduce((a, b) => a + b.amount, 0),
      typicalSpend: typicalSpendByDow[dow(date)],
    }
  })

  // Largest S with: available + sum_{d<=k}(cautious_d - bills_d) - (k+1)*S >= 0 for every k.
  // (k+1 because today's remaining spend counts too.)
  let safe = available
  let pinchIndex = -1
  let cum = 0
  plan.forEach((p, k) => {
    cum += p.cautiousIncome - p.billTotal
    const s = (available + cum) / (k + 2)
    if (s < safe) {
      safe = s
      pinchIndex = k
    }
  })
  const safeToday = Math.max(0, floorTo(safe, 5))

  let expectedBalance = available
  let safeBalance = available - safeToday
  const days: DayForecast[] = plan.map((p) => {
    expectedBalance += p.expectedIncome - p.billTotal - p.typicalSpend
    safeBalance += p.cautiousIncome - p.billTotal - safeToday
    return { ...p, expectedBalance, safeBalance }
  })

  const upToPinch = plan.slice(0, pinchIndex + 1)
  const explain = {
    available,
    income: upToPinch.reduce((a, p) => a + p.cautiousIncome, 0),
    bills: upToPinch.reduce((a, p) => a + p.billTotal, 0),
    billNames: [...new Set(upToPinch.flatMap((p) => p.bills.map((b) => b.name)))],
    days: pinchIndex + 2,
    until: pinchIndex >= 0 ? plan[pinchIndex].date : null,
  }

  const pinchDay = pinchIndex >= 0 ? days[pinchIndex] : null
  // The tightest day often comes a day or two after the bill that causes it, so name the
  // biggest bill on or before that day rather than only bills on the day itself.
  let mainBill: { name: string; amount: number; date: string } | null = null
  for (const d of days.slice(0, pinchIndex + 1))
    for (const b of d.bills) if (!mainBill || b.amount > mainBill.amount) mainBill = { name: b.name, amount: b.amount, date: d.date }
  const pinch = pinchDay
    ? {
        date: pinchDay.date,
        bills: pinchDay.bills,
        balanceBefore: pinchIndex > 0 ? days[pinchIndex - 1].safeBalance : available - safeToday,
        mainBill,
      }
    : null

  const status: Status =
    safeToday >= essentialsPerDay * 1.3 ? 'good' : safeToday >= essentialsPerDay * 0.8 ? 'tight' : 'survival'

  const week = days.slice(0, 7)
  const weekIncome = week.reduce((a, d) => a + d.expectedIncome, 0)
  const weekBills = week.reduce((a, d) => a + d.billTotal, 0)
  const typicalWeek = expectedByDow.reduce((a, b) => a + b, 0) / (trend || 1)
  const leanWeek =
    weekIncome - weekBills < typicalWeek * 0.6
      ? { income: roundTo(weekIncome, 10), bills: weekBills, typical: roundTo(typicalWeek, 10) }
      : null

  // A better-than-usual earning day is the easiest moment to put something away.
  // Asked once a day: after any save today, the suggestion goes away.
  const typicalToday = expectedByDow[dow(today)]
  const savedToday = todays.some((t) => t.kind === 'save')
  let nudge: Forecast['nudge'] = null
  if (!savedToday && buffer < profile.bufferGoal && typicalToday > 0 && earnedToday > typicalToday * 1.25 && status !== 'survival') {
    const amount = Math.min(
      Math.max(10, roundTo((earnedToday - typicalToday) * (status === 'good' ? 0.3 : 0.15), 10)),
      profile.bufferGoal - buffer,
      floorTo(safeToday, 10), // never suggest more than is safe to spend today
    )
    if (amount >= 10) nudge = { amount, earned: earnedToday, typical: roundTo(typicalToday, 10) }
  }

  return {
    today,
    balance,
    buffer,
    spentToday,
    earnedToday,
    available,
    overdueBills,
    safeToday,
    status,
    essentialsPerDay: roundTo(essentialsPerDay, 5),
    days,
    pinch,
    explain,
    leanWeek,
    nudge,
    expectedByDow,
    cautiousByDow,
    trend,
    scheduled,
    historyDays,
    confidence: historyDays < 14 ? 'learning' : historyDays < 42 ? 'ok' : 'strong',
  }
}

function afterSaving(data: AppData, today: string, amount: number): Forecast {
  const save: Txn = { id: 'preview', date: today, kind: 'save', amount, category: 'buffer', note: '' }
  return forecast({ ...data, txns: [...data.txns, save] }, today)
}

/** What today's safe amount would become after moving `amount` into the buffer. */
export const safeAfterSaving = (data: AppData, today: string, amount: number) => afterSaving(data, today, amount).safeToday

/**
 * The most that can go into the buffer today (in R10 steps) while the safe amount still
 * covers everyday essentials, i.e. without dropping into "essentials only" mode.
 */
export function maxSave(data: AppData, today: string): number {
  const ok = (x: number) => afterSaving(data, today, x).status !== 'survival'
  if (!ok(0)) return 0
  let lo = 0
  let hi = Math.max(0, Math.floor(forecast(data, today).available / 10))
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    if (ok(mid * 10)) lo = mid
    else hi = mid - 1
  }
  return lo * 10
}
