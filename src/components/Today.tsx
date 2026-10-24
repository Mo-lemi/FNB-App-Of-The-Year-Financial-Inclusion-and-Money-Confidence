import type { Ctx } from '../App'
import type { Forecast } from '../lib/forecast'
import type { TKey } from '../lib/i18n'
import { rand } from '../lib/money'
import { parseISO, shortDate } from '../lib/dates'
import ForecastChart from './ForecastChart'
import TxnList from './TxnList'

interface Props {
  ctx: Ctx
  f: Forecast
  t: (k: TKey) => string
}

export default function Today({ ctx, f, t }: Props) {
  const { profile, txns } = ctx.data
  const p = profile!
  const todayLabel = parseISO(f.today).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' })
  const goalPct = p.bufferGoal > 0 ? Math.min(100, (f.buffer / p.bufferGoal) * 100) : 0
  const usualLow = f.days.reduce((lo, d) => (d.expectedBalance < lo.expectedBalance ? d : lo), f.days[0])

  return (
    <>
      <header className="topbar">
        <div>
          <h1>
            {t('greeting')}, {p.name}
          </h1>
          <div className="sub">{todayLabel}</div>
        </div>
        {p.isDemo && <span className="badge">Demo</span>}
      </header>

      <section className={`card hero ${f.status}`} aria-live="polite">
        <div className="label">{t('safeToday')}</div>
        <div className="amount">{rand(f.safeToday)}</div>
        <div className="status">{t(f.status)}</div>
        <div className="meta">
          <span>
            {t('spentToday')}: <b>{rand(f.spentToday)}</b>
          </span>
          <span>
            {t('earnedToday')}: <b>{rand(f.earnedToday)}</b>
          </span>
        </div>
        {f.confidence === 'learning' && (
          <p style={{ marginTop: 10, fontSize: '0.8125rem' }}>
            Based on your estimate for now. It gets sharper as you log your days.
          </p>
        )}
      </section>

      {f.overdueBills.map((b) => (
        <section key={b.id} className="card alert bad">
          <span className="icon" aria-hidden="true">⏰</span>
          <div className="body">
            <h2>
              {b.name} ({rand(b.amount)}) is due
            </h2>
            <p>We've already set this money aside in today's amount.</p>
            <div className="actions">
              <button
                className="btn"
                onClick={() =>
                  ctx.addTxn(
                    { date: f.today, kind: 'expense', amount: b.amount, category: 'bills', note: b.name },
                    `${b.name} marked as paid`,
                  )
                }
              >
                Mark as paid
              </button>
            </div>
          </div>
        </section>
      ))}

      {f.nudge && (
        <section className="card alert good">
          <span className="icon" aria-hidden="true">🌟</span>
          <div className="body">
            <h2>{t('goodDay')}</h2>
            <p>
              You earned {rand(f.nudge.earned)} today. On this weekday you usually earn about {rand(f.nudge.typical)}.
              Moving {rand(f.nudge.amount)} to your buffer now protects you on slow days.
            </p>
            <div className="actions">
              <button
                className="btn"
                onClick={() =>
                  ctx.addTxn(
                    { date: f.today, kind: 'save', amount: f.nudge!.amount, category: 'buffer', note: 'Good-day save' },
                    `${rand(f.nudge!.amount)} moved to your buffer`,
                  )
                }
              >
                {t('moveToBuffer')}: {rand(f.nudge.amount)}
              </button>
            </div>
          </div>
        </section>
      )}

      {f.pinch && (
        <section className="card alert warn">
          <span className="icon" aria-hidden="true">⚠️</span>
          <div className="body">
            <h2>
              {t('tightSpot')}: {shortDate(f.pinch.date)}
            </h2>
            <p>
              {f.pinch.bills.length
                ? `${f.pinch.bills.map((b) => `${b.name} (${rand(b.amount)})`).join(' and ')} is due. `
                : 'Your slower earning days catch up with you around then. '}
              That's why today's amount is {rand(f.safeToday)}. Stick to it and you can cover everything until then,
              even if work is slow.
            </p>
          </div>
        </section>
      )}

      {f.leanWeek && (
        <section className="card alert warn">
          <span className="icon" aria-hidden="true">🌧️</span>
          <div className="body">
            <h2>{t('leanWeek')}</h2>
            <p>
              The next 7 days: about {rand(f.leanWeek.income)} expected in
              {f.leanWeek.bills > 0 ? `, ${rand(f.leanWeek.bills)} in bills out` : ''}. A normal week brings in about{' '}
              {rand(f.leanWeek.typical)}.
            </p>
          </div>
        </section>
      )}

      <section className="card chart">
        <h2>{t('next14')}</h2>
        <div className="legend">
          <span>
            <i style={{ background: 'var(--line-safe)' }} />
            Spending {rand(f.safeToday)}/day
          </span>
          <span>
            <i style={{ background: 'var(--line-usual)' }} />
            Spending as usual
          </span>
        </div>
        <ForecastChart f={f} />
        {usualLow && usualLow.expectedBalance < 0 && (
          <p style={{ marginTop: 8 }}>
            If you spend the way you usually do, you'd run <b>{rand(-usualLow.expectedBalance)} short</b> by{' '}
            {shortDate(usualLow.date)}.
          </p>
        )}
      </section>

      <div className="stats">
        <div className="card">
          <div className="stat-label">{t('balance')}</div>
          <div className="stat-value">{rand(f.balance)}</div>
        </div>
        <div className="card">
          <div className="stat-label">{t('buffer')}</div>
          <div className="stat-value">{rand(f.buffer)}</div>
          {p.bufferGoal > 0 && (
            <div className="progress" role="progressbar" aria-valuenow={Math.round(goalPct)} aria-valuemin={0} aria-valuemax={100}>
              <div style={{ width: `${goalPct}%` }} />
            </div>
          )}
        </div>
      </div>

      <div className="stack" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 12 }}>
        <button className="btn" onClick={() => ctx.go('add')}>
          + {t('moneyIn')} / {t('moneyOut')}
        </button>
        <button className="btn secondary" onClick={() => ctx.go('insights')}>
          See insights
        </button>
      </div>

      <h3 className="section-title">Recent</h3>
      <section className="card">
        <TxnList ctx={ctx} txns={txns} limit={6} />
      </section>
    </>
  )
}
