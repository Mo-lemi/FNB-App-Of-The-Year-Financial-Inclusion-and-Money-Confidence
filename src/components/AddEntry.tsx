import { useState } from 'react'
import type { Ctx } from '../App'
import type { TKey } from '../lib/i18n'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../lib/types'
import { parseSms, type ParsedSms } from '../lib/sms'
import { rand } from '../lib/money'
import { categoryLabel } from './TxnList'
import Icon from './Icon'

interface Props {
  ctx: Ctx
  t: (k: TKey) => string
  today: string
}

export default function AddEntry({ ctx, t, today }: Props) {
  const [kind, setKind] = useState<'income' | 'expense'>('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('food')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(today)
  const [sms, setSms] = useState('')
  const [parsed, setParsed] = useState<ParsedSms | null>(null)
  const [showSms, setShowSms] = useState(false)

  const cats = kind === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
  const value = Number(amount.replace(',', '.'))
  const valid = value > 0 && date <= today

  const switchKind = (k: 'income' | 'expense') => {
    setKind(k)
    setCategory(k === 'income' ? 'work' : 'food')
    setNote('')
  }

  const readSms = () => {
    const p = parseSms(sms)
    setParsed(p)
    if (p.kind) {
      setKind(p.kind)
      setCategory(p.category ?? (p.kind === 'income' ? 'work' : 'other'))
    }
    if (p.amount) setAmount(String(p.amount))
    if (p.note) setNote(p.note)
  }

  const save = () => {
    if (!valid) return
    ctx.addTxn(
      { date, kind, amount: Math.round(value * 100) / 100, category, note: note.trim() || undefined },
      `${kind === 'income' ? '+' : '−'}${rand(value)} saved`,
    )
    setAmount('')
    setNote('')
    setSms('')
    setParsed(null)
    ctx.go('today')
  }

  return (
    <>
      <header className="topbar">
        <h1>{t('navAdd')}</h1>
        <button className="btn ghost" onClick={() => setShowSms((s) => !s)} aria-expanded={showSms}>
          {showSms ? 'Hide SMS reader' : <><Icon name="message" size={18} /> Paste an SMS</>}
        </button>
      </header>

      {showSms && (
        <section className="card">
          <h2>Read a bank SMS</h2>
          <p style={{ marginBottom: 10 }}>
            Paste a payment SMS and we'll fill in the details. We'll also check it for signs of a scam. Nothing leaves your phone.
          </p>
          <label className="field">
            <span className="sr-only">SMS text</span>
            <textarea
              value={sms}
              onChange={(e) => setSms(e.target.value)}
              placeholder="e.g. R120.00 paid from cheq a/c..1234 @ Shoprite. Avail R830.00"
            />
          </label>
          <button className="btn secondary block" onClick={readSms} disabled={!sms.trim()}>
            Read SMS
          </button>
          {parsed && parsed.scamWarnings.length > 0 && (
            <div className="warnings" role="alert">
              <strong>This looks like a scam</strong>
              <ul>
                {parsed.scamWarnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
              <p style={{ marginTop: 6, color: 'inherit' }}>Don't reply, don't click, don't pay. Call your bank on the number on your card.</p>
            </div>
          )}
          {parsed && !parsed.amount && parsed.scamWarnings.length === 0 && (
            <p style={{ marginTop: 10 }}>We couldn't find an amount in that SMS. Please fill it in below.</p>
          )}
          {parsed && parsed.amount && parsed.scamWarnings.length === 0 && (
            <p style={{ marginTop: 10, color: 'var(--good)' }}>Filled in below. Check it, then save.</p>
          )}
        </section>
      )}

      <div className="segmented" role="tablist">
        <button role="tab" aria-selected={kind === 'income'} className={kind === 'income' ? 'on' : ''} onClick={() => switchKind('income')}>
          {t('moneyIn')}
        </button>
        <button role="tab" aria-selected={kind === 'expense'} className={kind === 'expense' ? 'on' : ''} onClick={() => switchKind('expense')}>
          {t('moneyOut')}
        </button>
      </div>

      <label className="field">
        <span>Amount (R)</span>
        <input
          className="amount-input"
          inputMode="decimal"
          placeholder="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ''))}
          autoFocus
        />
      </label>

      <div className="field">
        <span>Category</span>
        <div className="chips">
          {cats.map((c) => (
            <button key={c} className={`chip ${category === c ? 'on' : ''}`} onClick={() => setCategory(c)} aria-pressed={category === c}>
              {categoryLabel(c)}
            </button>
          ))}
        </div>
      </div>

      {kind === 'expense' && category === 'bills' && ctx.data.bills.length > 0 && (
        <div className="field">
          <span>Which bill?</span>
          <div className="chips">
            {ctx.data.bills.map((b) => (
              <button
                key={b.id}
                className={`chip ${note === b.name ? 'on' : ''}`}
                onClick={() => {
                  setNote(b.name)
                  if (!amount) setAmount(String(b.amount))
                }}
              >
                {b.name} · {rand(b.amount)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="row">
        <label className="field">
          <span>Note (optional)</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={kind === 'income' ? 'e.g. Delivery payout' : 'e.g. Taxi to work'} />
        </label>
        <label className="field shrink" style={{ width: 150 }}>
          <span>Date</span>
          <input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value || today)} />
        </label>
      </div>

      <button className="btn block" onClick={save} disabled={!valid}>
        {t('save')} {valid ? `${kind === 'income' ? '+' : '−'}${rand(value, { cents: value % 1 !== 0 })}` : ''}
      </button>
    </>
  )
}
