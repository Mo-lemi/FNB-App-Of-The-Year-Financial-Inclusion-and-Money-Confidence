import type { AppData, Bill, Txn } from './types'
import { addDays, dom, dow, isDueOn } from './dates'
import { balances } from './forecast'
import { roundTo } from './money'

/**
 * 90 days of realistic data for the judges' demo account: Sipho, a food-delivery rider with a
 * weekend car-wash side hustle and a monthly child support grant. Earnings dipped over the last
 * three weeks (rainy season), and rent is due soon, so the forecast has something to say.
 * Generated relative to `today` so the demo always looks current; seeded so it is repeatable.
 * Bill and grant dates are placed relative to `today` too, so judges see the same story
 * whichever day they open it: stokvel due tomorrow, rent in 8 days, grant in 10, school
 * transport in 12.
 */

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const DAYS = 90
const TARGET_BALANCE = 2400
// Typical delivery earnings by weekday, Sun..Sat
const DELIVERY_BASE = [260, 150, 140, 160, 180, 320, 340]

function demoBills(today: string): Bill[] {
  const dayIn = (days: number) => dom(addDays(today, days))
  return [
    { id: 'b-rent', name: 'Rent', amount: 1800, dayOfMonth: dayIn(8) },
    { id: 'b-school', name: 'School transport', amount: 450, dayOfMonth: dayIn(12) },
    { id: 'b-stokvel', name: 'Stokvel', amount: 500, dayOfMonth: dayIn(1) },
  ]
}

export function buildDemo(today: string): AppData {
  const bills = demoBills(today)
  const grantDay = dom(addDays(today, 10))
  const rng = mulberry32(2026)
  const between = (lo: number, hi: number) => lo + rng() * (hi - lo)
  const txns: Txn[] = []
  let n = 0
  const add = (date: string, kind: Txn['kind'], amount: number, category: string, note?: string) =>
    txns.push({ id: `demo-${n++}`, date, kind, amount: roundTo(amount, 1), category, note })

  const start = addDays(today, -DAYS)
  let yesterdayIncome = 0

  for (let i = 0; i <= DAYS; i++) {
    const date = addDays(start, i)
    const w = dow(date)
    const d = dom(date)
    const isToday = date === today
    const trend = i > DAYS - 21 ? 0.82 : 1
    let earned = 0

    // Income
    if (isToday) {
      // A strong morning, so the "good day, save a little" nudge shows up in the demo.
      earned = roundTo(DELIVERY_BASE[w] * 1.5, 5)
      add(date, 'income', earned, 'work', 'Delivery payout')
      add(date, 'income', 380, 'side', 'Car wash')
      earned += 380
    } else {
      if (rng() > 0.12) {
        const amt = roundTo(DELIVERY_BASE[w] * between(0.6, 1.4) * trend, 5)
        add(date, 'income', amt, 'work', 'Delivery payout')
        earned += amt
      }
      if ((w === 0 || w === 6) && rng() < 0.85) {
        const amt = roundTo(between(150, 350) * trend, 10)
        add(date, 'income', amt, 'side', 'Car wash')
        earned += amt
      }
    }
    const grantToday = isDueOn(grantDay, date)
    if (grantToday) add(date, 'income', 560, 'grant', 'Child support grant')

    // Bills
    for (const b of bills) if (isDueOn(b.dayOfMonth, date) && !isToday) add(date, 'expense', b.amount, 'bills', b.name)

    // Everyday spending
    add(date, 'expense', roundTo(between(35, 95), 5), 'food', 'Food')
    if (earned > 0 || isToday) add(date, 'expense', roundTo(between(40, 80), 5), 'transport', 'Fuel')
    if (isToday) continue

    if (rng() < 0.3) add(date, 'expense', [12, 29, 49, 99][Math.floor(rng() * 4)], 'airtime', 'Data bundle')
    if ((grantToday || isDueOn(grantDay, addDays(date, -1))) && rng() < 0.6) add(date, 'expense', roundTo(between(550, 750), 10), 'food', 'Monthly groceries')
    if (d === 15 || d === 28) add(date, 'expense', 300, 'family', 'Sent home')
    if (w === 1) add(date, 'expense', roundTo(between(150, 220), 10), 'household', 'Prepaid electricity')
    if (yesterdayIncome > 450 && rng() < 0.65) add(date, 'expense', roundTo(between(60, 180), 10), 'other', 'Takeaways & treats')
    if (i % 17 === 9) add(date, 'save', 50, 'buffer', 'Buffer')

    yesterdayIncome = earned
  }

  const { balance } = balances(txns, 0)
  return {
    profile: {
      name: 'Sipho',
      lang: 'en',
      openingBalance: TARGET_BALANCE - balance,
      weeklyIncomeEstimate: 1800,
      bufferGoal: 1000,
      createdAt: start,
      isDemo: true,
    },
    txns,
    bills,
  }
}
