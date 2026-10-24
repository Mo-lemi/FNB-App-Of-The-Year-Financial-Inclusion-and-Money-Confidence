import type { AppData } from './types'
import type { Forecast } from './forecast'
import { mean } from './forecast'
import { addDays, DOW_LONG } from './dates'
import { rand, roundTo } from './money'
import type { IconName } from '../components/Icon'

export interface Insight {
  id: string
  icon: IconName
  title: string
  body: string
  tone: 'info' | 'good' | 'warn'
}

const CATEGORY_LABEL: Record<string, string> = {
  food: 'Food',
  transport: 'Transport',
  airtime: 'Airtime & data',
  household: 'Household',
  family: 'Family support',
  other: 'Other',
}

export function buildInsights(data: AppData, f: Forecast): Insight[] {
  const out: Insight[] = []
  const today = f.today
  const txns = data.txns.filter((t) => t.date <= today)

  if (f.confidence === 'learning') {
    out.push({
      id: 'learning',
      icon: 'leaf',
      title: 'Still learning your rhythm',
      body: `Log your money in and out for ${14 - f.historyDays} more days and the forecast will be based on your real patterns instead of your estimate.`,
      tone: 'info',
    })
  }

  // Best earning days
  const ranked = f.expectedByDow.map((v, d) => ({ d, v })).sort((a, b) => b.v - a.v)
  if (f.historyDays >= 14 && ranked[0].v > 0) {
    const worst = ranked[ranked.length - 1]
    out.push({
      id: 'best-days',
      icon: 'calendar',
      title: `${DOW_LONG[ranked[0].d]}s and ${DOW_LONG[ranked[1].d]}s are your best days`,
      body: `You usually earn about ${rand(roundTo(ranked[0].v, 10))} on a ${DOW_LONG[ranked[0].d]}, but only ${rand(roundTo(worst.v, 10))} on a ${DOW_LONG[worst.d]}. Plan big purchases after your strong days.`,
      tone: 'info',
    })
  }

  // Trend
  if (Math.abs(f.trend - 1) >= 0.08) {
    const pct = Math.round(Math.abs(f.trend - 1) * 100)
    const down = f.trend < 1
    out.push({
      id: 'trend',
      icon: down ? 'trendDown' : 'trendUp',
      title: down ? `Earnings are down ${pct}% lately` : `Earnings are up ${pct}% lately`,
      body: down
        ? 'Your last 4 weeks brought in less than the weeks before. Your safe-to-spend amount has already been lowered to match.'
        : 'Your last 4 weeks were stronger than before. A good time to grow your buffer.',
      tone: down ? 'warn' : 'good',
    })
  }

  // Weekly swing
  const weeks: number[] = []
  for (let w = 1; w <= 8; w++) {
    const end = addDays(today, -7 * (w - 1) - 1)
    const start = addDays(end, -6)
    if (start < data.profile!.createdAt) break
    weeks.push(txns.filter((t) => t.kind === 'income' && t.date >= start && t.date <= end).reduce((a, t) => a + t.amount, 0))
  }
  if (weeks.length >= 4) {
    const lo = Math.min(...weeks)
    const hi = Math.max(...weeks)
    out.push({
      id: 'swing',
      icon: 'wave',
      title: 'Your income swings week to week',
      body: `Over the last ${weeks.length} weeks you earned between ${rand(roundTo(lo, 10))} and ${rand(roundTo(hi, 10))} a week. That's why Imali plans with your slower weeks, not your best ones.`,
      tone: 'info',
    })
  }

  // Spending after big days
  const incomeByDay = new Map<string, number>()
  const spendByDay = new Map<string, number>()
  const start = addDays(today, -56)
  for (const t of txns) {
    if (t.date < start || t.date >= today) continue
    if (t.kind === 'income') incomeByDay.set(t.date, (incomeByDay.get(t.date) ?? 0) + t.amount)
    if (t.kind === 'expense' && t.category !== 'bills') spendByDay.set(t.date, (spendByDay.get(t.date) ?? 0) + t.amount)
  }
  const incomes = [...incomeByDay.values()].sort((a, b) => a - b)
  if (incomes.length >= 20) {
    const bigThreshold = incomes[Math.floor(incomes.length * 0.75)]
    const after: number[] = []
    const others: number[] = []
    for (let d = addDays(start, 1); d < today; d = addDays(d, 1)) {
      const spend = spendByDay.get(d) ?? 0
      if ((incomeByDay.get(addDays(d, -1)) ?? 0) >= bigThreshold) after.push(spend)
      else others.push(spend)
    }
    const ratio = mean(after) / (mean(others) || 1)
    if (after.length >= 4 && ratio >= 1.2) {
      out.push({
        id: 'spike',
        icon: 'alert',
        title: `You spend ${Math.round((ratio - 1) * 100)}% more after a big day`,
        body: 'The day after you earn well, spending jumps. Moving a little to your buffer on good days keeps that money safe.',
        tone: 'warn',
      })
    }
  }

  // Top spending category
  const since = addDays(today, -30)
  const byCat = new Map<string, number>()
  for (const t of txns) {
    if (t.kind !== 'expense' || t.category === 'bills' || t.date < since) continue
    byCat.set(t.category, (byCat.get(t.category) ?? 0) + t.amount)
  }
  const total = [...byCat.values()].reduce((a, b) => a + b, 0)
  const top = [...byCat.entries()].sort((a, b) => b[1] - a[1])[0]
  if (top && total > 0) {
    out.push({
      id: 'top-cat',
      icon: 'receipt',
      title: `${CATEGORY_LABEL[top[0]] ?? top[0]} is your biggest cost`,
      body: `${rand(roundTo(top[1], 10))} in the last 30 days, ${Math.round((top[1] / total) * 100)}% of your everyday spending (not counting bills).`,
      tone: 'info',
    })
  }

  for (const s of f.scheduled) {
    out.push({
      id: `sched-${s.category}`,
      icon: 'repeat',
      title: `${s.label} arrives around the ${ordinal(s.dayOfMonth)}`,
      body: `We spotted about ${rand(roundTo(s.amount, 10))} coming in each month and already count on it in your forecast.`,
      tone: 'good',
    })
  }

  const goal = data.profile!.bufferGoal
  if (goal > 0) {
    const pct = Math.min(100, Math.round((f.buffer / goal) * 100))
    out.push({
      id: 'buffer',
      icon: 'piggy',
      title: `Buffer: ${pct}% of your ${rand(goal)} goal`,
      body:
        pct >= 100
          ? 'Your buffer is full. A slow week will not knock you over.'
          : `${rand(f.buffer)} set aside. A full buffer covers about ${Math.max(1, Math.round(goal / Math.max(f.essentialsPerDay, 1)))} days of essentials if work dries up.`,
      tone: pct >= 100 ? 'good' : 'info',
    })
  }

  return out
}

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

