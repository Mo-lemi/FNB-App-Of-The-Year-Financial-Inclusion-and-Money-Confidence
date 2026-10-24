import { useMemo } from 'react'
import type { Ctx } from '../App'
import type { Forecast } from '../lib/forecast'
import { buildInsights } from '../lib/insights'
import { DOW_SHORT } from '../lib/dates'
import { rand, roundTo } from '../lib/money'

// Show the week starting Monday
const ORDER = [1, 2, 3, 4, 5, 6, 0]

export default function Insights({ ctx, f }: { ctx: Ctx; f: Forecast }) {
  const insights = useMemo(() => buildInsights(ctx.data, f), [ctx.data, f])
  const max = Math.max(...f.expectedByDow, 1)

  return (
    <>
      <header className="topbar">
        <h1>Insights</h1>
        <span className="sub">{f.historyDays} days of history</span>
      </header>

      <section className="card">
        <h2>Your earning rhythm</h2>
        <p>What a typical day brings in (green), and a slow one (yellow). Imali plans with the slow days.</p>
        <div
          className="dow-bars"
          role="img"
          aria-label={ORDER.map((d) => `${DOW_SHORT[d]} usually ${rand(roundTo(f.expectedByDow[d], 10))}`).join(', ')}
        >
          {ORDER.map((d) => (
            <div key={d} className="bar" style={{ height: `${(f.expectedByDow[d] / max) * 100}%` }}>
              <div
                className="bar cautious"
                style={{ height: `${f.expectedByDow[d] ? (f.cautiousByDow[d] / f.expectedByDow[d]) * 100 : 0}%` }}
              />
            </div>
          ))}
        </div>
        <div className="dow-labels">
          {ORDER.map((d) => (
            <div key={d}>{DOW_SHORT[d]}</div>
          ))}
        </div>
      </section>

      {insights.map((i) => (
        <section key={i.id} className={`card insight ${i.tone}`}>
          <span className="icon" aria-hidden="true">
            {i.icon}
          </span>
          <div>
            <h2>{i.title}</h2>
            <p>{i.body}</p>
          </div>
        </section>
      ))}

      <section className="card">
        <h2>How Imali works out your number</h2>
        <p>1. It learns what you earn on each day of the week, and how much a slow day brings in.</p>
        <p>2. It notices regular money such as grants, and whether your earnings are rising or falling.</p>
        <p>3. It lays out your next 14 days: slow-day income in, bills out.</p>
        <p>4. It finds the most you can spend each day without running out before your bills, even if work is slow.</p>
      </section>
    </>
  )
}
