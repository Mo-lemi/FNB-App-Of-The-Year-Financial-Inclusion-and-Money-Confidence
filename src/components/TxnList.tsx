import type { Ctx } from '../App'
import type { Txn } from '../lib/types'
import Icon from './Icon'
import { rand } from '../lib/money'
import { shortDate } from '../lib/dates'

const LABEL: Record<string, string> = {
  work: 'Work',
  side: 'Side hustle',
  grant: 'Grant',
  family: 'Family',
  food: 'Food',
  transport: 'Transport',
  airtime: 'Airtime & data',
  household: 'Household',
  bills: 'Bills',
  other: 'Other',
  buffer: 'Buffer',
  adjustment: 'Balance correction',
}

export const categoryLabel = (c: string) => LABEL[c] ?? c

export default function TxnList({ ctx, txns, limit }: { ctx: Ctx; txns: Txn[]; limit?: number }) {
  // Newest first; within a day, the most recently added first.
  const sorted = txns
    .map((t, i) => ({ t, i }))
    .sort((a, b) => (a.t.date === b.t.date ? b.i - a.i : a.t.date < b.t.date ? 1 : -1))
    .slice(0, limit)
    .map((x) => x.t)

  if (!sorted.length) return <div className="empty">Nothing logged yet. Tap Add to log money in or out.</div>

  return (
    <ul className="list">
      {sorted.map((t) => {
        const isIn = t.kind === 'income' || t.kind === 'withdraw'
        const sign = isIn ? '+' : '−'
        const kindLabel = t.kind === 'save' ? 'To buffer' : t.kind === 'withdraw' ? 'From buffer' : categoryLabel(t.category)
        return (
          <li key={t.id}>
            <div className="what">
              <div>{t.note || kindLabel}</div>
              <div>
                {kindLabel} · {shortDate(t.date)}
              </div>
            </div>
            <div className={`amt ${isIn ? 'in' : ''}`}>
              {sign}
              {rand(t.amount)}
            </div>
            <button
              className="icon-btn"
              aria-label={`Delete ${t.note || kindLabel}`}
              onClick={() => {
                ctx.setData((d) => ({ ...d, txns: d.txns.filter((x) => x.id !== t.id) }))
                ctx.toast('Entry deleted')
              }}
            >
              <Icon name="x" size={16} />
            </button>
          </li>
        )
      })}
    </ul>
  )
}
