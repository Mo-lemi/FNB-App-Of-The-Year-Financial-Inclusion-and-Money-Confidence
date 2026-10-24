export function rand(n: number, opts: { cents?: boolean } = {}): string {
  const sign = n < 0 ? '-' : ''
  const v = Math.abs(n)
  const s = v.toLocaleString('en-ZA', {
    minimumFractionDigits: opts.cents ? 2 : 0,
    maximumFractionDigits: opts.cents ? 2 : 0,
  })
  return `${sign}R${s.replace(/\u00a0/g, ' ')}`
}

export const roundTo = (n: number, step: number) => Math.round(n / step) * step
export const floorTo = (n: number, step: number) => Math.floor(n / step) * step

export const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)
