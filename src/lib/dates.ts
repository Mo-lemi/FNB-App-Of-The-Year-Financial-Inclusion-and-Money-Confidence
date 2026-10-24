const pad = (n: number) => String(n).padStart(2, '0')

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const todayISO = () => toISO(new Date())

export function addDays(s: string, n: number): string {
  const d = parseISO(s)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

export const dow = (s: string) => parseISO(s).getDay()
export const dom = (s: string) => parseISO(s).getDate()
export const monthKey = (s: string) => s.slice(0, 7)

export function daysBetween(a: string, b: string): number {
  return Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86_400_000)
}

export function daysInMonth(s: string): number {
  const d = parseISO(s)
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
}

/** True if something scheduled for `dayOfMonth` falls on date `s` (31st -> last day of short months). */
export const isDueOn = (dayOfMonth: number, s: string) => dom(s) === Math.min(dayOfMonth, daysInMonth(s))

export const DOW_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const DOW_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function shortDate(s: string): string {
  const d = parseISO(s)
  return `${DOW_SHORT[d.getDay()]} ${d.getDate()} ${d.toLocaleString('en-ZA', { month: 'short' })}`
}
