import type { Ctx } from '../App'
import type { Forecast } from '../lib/forecast'
import type { TKey } from '../lib/i18n'
import { rand } from '../lib/money'
import { parseISO, shortDate } from '../lib/dates'
import ForecastChart from './ForecastChart'
import TxnList from './TxnList'
import Icon from './Icon'

interface Props {
  ctx: Ctx
  f: Forecast
  t: (k: TKey) => string
}

/** One sentence under the number explaining why it is what it is. */
function reason(f: Forecast): string {
  if (f.confidence === 'learning') return 'Based on your estimate for now. It gets sharper as you log your days.'
  if (f.pinch?.bills.length) {
    const b = f.pinch.bills[0]
    return `Keeping enough back for ${b.name} (${rand(b.amount)}) on ${shortDate(f.pinch.date)}.`
  }
  if (f.pinch) return `Your slower days catch up with you around ${shortDate(f.pinch.date)}, so this plays it safe.`
  if (f.leanWeek) return 'A slow week is coming, so this plays it safe.'
  return 'Your bills for the next 14 days are covered.'
}

export default function Today({ ctx, f, t }: Props) {
  const { profile, txns } = ctx.data
  const p = profile!
  const todayLabel = parseISO(f.today).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' })
  const usualLow = f.days.reduce((lo, d) => (d.expectedBalance < lo.expectedBalance ? d : lo), f.days[0])
  const overdue = f.overdueBills[0]

  const exitDemo = () => {
    if (confirm('Leave the demo? You can start with your own details.')) ctx.setData(() => ({ profile: null, txns: [], bills: [] }))
  }

  return (
    <>
      <header className="topbar">
        <div>
          <h1>
            {t('greeting')}, {p.name}
          </h1>
          <div className="sub">{todayLabel}</div>
        </div>
        {p.isDemo && (
          <button className="pill-btn" onClick={exitDemo}>
            <Icon name="logout" size={16} /> Exit demo
          </button>
        )}
      </header>

      <section className={`card hero ${f.status}`} aria-live="polite">
        <div className="label">{t('safeToday')}</div>
        <div className="amount">{rand(f.safeToday)}</div>
        <div className="status">{t(f.status)}</div>
        <p className="reason">{reason(f)}</p>
        <dl className="hero-stats">
          <div>
            <dt>{t('spentToday')}</dt>
            <dd>{rand(f.spentToday)}</dd>
          </div>
          <div>
            <dt>{t('balance')}</dt>
            <dd>{rand(f.balance)}</dd>
          </div>
          <div>
            <dt>{t('buffer')}</dt>
            <dd>
              {rand(f.buffer)}
              {p.bufferGoal > 0 && <span className="of"> / {rand(p.bufferGoal)}</span>}
            </dd>
          </div>
        </dl>
      </section>

      {overdue ? (
        <section className="card action">
          <span className="action-icon bad">
            <Icon name="clock" />
          </span>
          <div className="body">
            <h2>
              {overdue.name} ({rand(overdue.amount)}) is due
            </h2>
            <p>Already set aside in today's amount.</p>
          </div>
          <button
            className="btn small"
            onClick={() =>
              ctx.addTxn(
                { date: f.today, kind: 'expense', amount: overdue.amount, category: 'bills', note: overdue.name },
                `${overdue.name} marked as paid`,
              )
            }
          >
            Paid
          </button>
        </section>
      ) : (
        f.nudge && (
          <section className="card action">
            <span className="action-icon good">
              <Icon name="piggy" />
            </span>
            <div className="body">
              <h2>{t('goodDay')}</h2>
              <p>
                You earned {rand(f.nudge.earned)}, more than your usual {rand(f.nudge.typical)}.
              </p>
            </div>
            <button
              className="btn small"
              onClick={() =>
                ctx.addTxn(
                  { date: f.today, kind: 'save', amount: f.nudge!.amount, category: 'buffer', note: 'Good-day save' },
                  `${rand(f.nudge!.amount)} moved to your buffer`,
                )
              }
            >
              Save {rand(f.nudge.amount)}
            </button>
          </section>
        )
      )}

      <section className="card chart">
        <div className="card-head">
          <h2>{t('next14')}</h2>
          <div className="legend">
            <span>
              <i style={{ background: 'var(--line-safe)' }} />
              {rand(f.safeToday)}/day
            </span>
            <span>
              <i className="dashed" style={{ borderColor: 'var(--line-usual)' }} />
              As usual
            </span>
          </div>
        </div>
        <ForecastChart f={f} />
        {usualLow && usualLow.expectedBalance < 0 && (
          <p className="chart-note">
            Spending as usual, you'd be <b>{rand(-usualLow.expectedBalance)} short</b> by {shortDate(usualLow.date)}.
          </p>
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Recent</h2>
        </div>
        <TxnList ctx={ctx} txns={txns} limit={4} />
      </section>
    </>
  )
}
