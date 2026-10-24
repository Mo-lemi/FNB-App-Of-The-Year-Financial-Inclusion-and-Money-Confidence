import { useState } from 'react'
import type { Bill } from '../lib/types'
import { newId, rand } from '../lib/money'
import { ordinal } from '../lib/insights'

export default function BillsEditor({ bills, onChange }: { bills: Bill[]; onChange: (b: Bill[]) => void }) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [day, setDay] = useState('1')
  const valid = name.trim() !== '' && Number(amount) > 0 && Number(day) >= 1 && Number(day) <= 31

  return (
    <>
      {bills.length > 0 && (
        <ul className="list" style={{ marginBottom: 12 }}>
          {bills.map((b) => (
            <li key={b.id}>
              <div className="what">
                <div>{b.name}</div>
                <div>Every month on the {ordinal(b.dayOfMonth)}</div>
              </div>
              <div className="amt">{rand(b.amount)}</div>
              <button className="icon-btn" aria-label={`Remove ${b.name}`} onClick={() => onChange(bills.filter((x) => x.id !== b.id))}>
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="row">
        <label className="field">
          <span>Bill</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rent" />
        </label>
        <label className="field" style={{ maxWidth: 100 }}>
          <span>Amount</span>
          <input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} placeholder="R" />
        </label>
        <label className="field" style={{ maxWidth: 70 }}>
          <span>Day</span>
          <input inputMode="numeric" value={day} onChange={(e) => setDay(e.target.value.replace(/\D/g, '').slice(0, 2))} />
        </label>
      </div>
      <button
        className="btn secondary block"
        disabled={!valid}
        onClick={() => {
          onChange([...bills, { id: newId(), name: name.trim(), amount: Number(amount), dayOfMonth: Number(day) }])
          setName('')
          setAmount('')
          setDay('1')
        }}
      >
        + Add bill
      </button>
    </>
  )
}
