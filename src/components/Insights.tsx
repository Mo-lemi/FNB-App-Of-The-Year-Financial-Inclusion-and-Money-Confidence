import { useMemo } from 'react'
import type { Ctx } from '../App'
import type { Forecast } from '../lib/forecast'
import { buildInsights } from '../lib/insights'
import { DOW_SHORT } from '../lib/dates'
import { rand, roundTo } from '../lib/money'
import Icon from './Icon'

// Show the week starting Monday
const ORDER = [1, 2, 3, 4, 5, 6, 0]

export default function Insights({ ctx, f }: { ctx: Ctx; f: Forecast }) {
  const insights = useMemo(() => buildInsights(ctx.data, f), [ctx.data, f])
  const max = Math.max(...f.expectedByDow, 1)

  return (
    <>
      <header className="topbar">
        <div>
          <h1>Insights</h1>
          <div className="sub">From {f.historyDays} days of your money</div>
        </div>
      </header>

      <section className="card">
        <div className="card-head">
          <h2>Your earning week</h2>
          <div className="legend">
            <span>
              <i style={{ background: 'var(--brand)' }} />
              Typical
            </span>
            <span>
              <i style={{ background: 'var(--accent)' }} />
              Slow day
            </span>
          </div>
        </div>
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

      <section className="card">
        <ul className="insight-list">
          {insights.map((i) => (
            <li key={i.id}>
              <span className={`action-icon ${i.tone}`}>
                <Icon name={i.icon} />
              </span>
              <div>
                <h3>{i.title}</h3>
                <p>{i.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <details className="card how">
        <summary>
          How Madi works out your number <Icon name="chevron" size={18} />
        </summary>
        <ol>
          <li>It learns what you earn on each day of the week, and how much a slow day brings in.</li>
          <li>It notices regular money such as grants, and whether your earnings are rising or falling.</li>
          <li>It lays out your next 14 days: slow-day income in, bills out.</li>
          <li>It finds the most you can spend each day without running out before your bills, even if work is slow.</li>
        </ol>
      </details>
    </>
  )
}
