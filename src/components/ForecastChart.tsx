import { useState } from 'react'
import type { Forecast } from '../lib/forecast'
import { rand } from '../lib/money'
import { DOW_SHORT, dom, dow, shortDate } from '../lib/dates'

const W = 340
const H = 170
const PAD = { l: 8, r: 8, t: 12, b: 26 }

export default function ForecastChart({ f }: { f: Forecast }) {
  const [sel, setSel] = useState<number | null>(null)
  const start = { date: f.today, safe: f.available - f.safeToday, usual: f.available }
  const pts = [start, ...f.days.map((d) => ({ date: d.date, safe: d.safeBalance, usual: d.expectedBalance }))]
  const values = pts.flatMap((p) => [p.safe, p.usual])
  const min = Math.min(0, ...values)
  const max = Math.max(...values, 1)
  const x = (i: number) => PAD.l + (i / (pts.length - 1)) * (W - PAD.l - PAD.r)
  const y = (v: number) => PAD.t + ((max - v) / (max - min)) * (H - PAD.t - PAD.b)
  const path = (key: 'safe' | 'usual') => pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`).join('')
  const day = sel !== null && sel > 0 ? f.days[sel - 1] : null

  const pick = (clientX: number, rect: DOMRect) => {
    const rel = ((clientX - rect.left) / rect.width) * W
    const i = Math.round(((rel - PAD.l) / (W - PAD.l - PAD.r)) * (pts.length - 1))
    setSel(Math.max(1, Math.min(pts.length - 1, i)))
  }

  return (
    <>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Projected balance for the next 14 days. Lowest point if you stick to the safe amount: ${rand(Math.min(...f.days.map((d) => d.safeBalance)))}.`}
        onPointerDown={(e) => pick(e.clientX, e.currentTarget.getBoundingClientRect())}
        onPointerMove={(e) => e.buttons && pick(e.clientX, e.currentTarget.getBoundingClientRect())}
      >
        <line x1={PAD.l} x2={W - PAD.r} y1={y(0)} y2={y(0)} stroke="var(--muted)" strokeDasharray="3 4" strokeWidth="1" />
        <text x={W - PAD.r} y={y(0) - 4} textAnchor="end" fontSize="10" fill="var(--muted)">
          R0
        </text>
        {y(0) < H - PAD.b && (
          <rect x={PAD.l} y={y(0)} width={W - PAD.l - PAD.r} height={H - PAD.b - y(0)} fill="var(--bad-bg)" opacity="0.6" />
        )}
        {f.days.map((d, i) =>
          d.billTotal > 0 ? (
            <g key={d.date}>
              <line x1={x(i + 1)} x2={x(i + 1)} y1={PAD.t} y2={H - PAD.b} stroke="var(--tight)" strokeWidth="1" opacity="0.5" />
              <text x={x(i + 1)} y={PAD.t - 2} textAnchor="middle" fontSize="9" fill="var(--tight)">
                {d.bills[0].name.slice(0, 10)}
              </text>
            </g>
          ) : null,
        )}
        <path d={path('usual')} fill="none" stroke="var(--line-usual)" strokeWidth="2" strokeDasharray="5 4" strokeLinejoin="round" />
        <path d={path('safe')} fill="none" stroke="var(--line-safe)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) =>
          i % 2 === 0 ? (
            <text key={p.date} x={x(i)} y={H - 8} textAnchor="middle" fontSize="9" fill="var(--muted)">
              {i === 0 ? 'Today' : `${DOW_SHORT[dow(p.date)].slice(0, 2)} ${dom(p.date)}`}
            </text>
          ) : null,
        )}
        {sel !== null && (
          <g>
            <line x1={x(sel)} x2={x(sel)} y1={PAD.t} y2={H - PAD.b} stroke="var(--text)" strokeWidth="1" opacity="0.4" />
            <circle cx={x(sel)} cy={y(pts[sel].safe)} r="4.5" fill="var(--line-safe)" stroke="var(--surface)" strokeWidth="2" />
            <circle cx={x(sel)} cy={y(pts[sel].usual)} r="4" fill="var(--line-usual)" stroke="var(--surface)" strokeWidth="2" />
          </g>
        )}
      </svg>
      {day ? (
        <div className="day-detail">
          <b>{shortDate(day.date)}</b>: about {rand(day.expectedIncome)} expected in (slow day: {rand(day.cautiousIncome)})
          {day.billTotal > 0 && <>, {day.bills.map((b) => `${b.name} ${rand(b.amount)}`).join(', ')} out</>}. Balance:{' '}
          <b>{rand(day.safeBalance)}</b> on the safe plan, <b>{rand(day.expectedBalance)}</b> spending as usual.
        </div>
      ) : (
        <div className="day-detail">Tap the chart to see any day.</div>
      )}
    </>
  )
}
