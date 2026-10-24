import { useState } from 'react'
import type { Ctx } from '../App'
import type { Forecast } from '../lib/forecast'
import type { Lang, Profile } from '../lib/types'
import { LANGS } from '../lib/i18n'
import { rand } from '../lib/money'
import BillsEditor from './BillsEditor'

export default function Settings({ ctx, f, today }: { ctx: Ctx; f: Forecast; today: string }) {
  const p = ctx.data.profile!
  const [actual, setActual] = useState('')
  const [withdraw, setWithdraw] = useState('')
  const setProfile = (patch: Partial<Profile>) => ctx.setData((d) => ({ ...d, profile: { ...d.profile!, ...patch } }))
  const digits = (s: string) => Number(s.replace(/\D/g, ''))

  const correctBalance = () => {
    const diff = Math.round((Number(actual) - f.balance) * 100) / 100
    if (!actual || diff === 0) return
    ctx.addTxn(
      { date: today, kind: diff > 0 ? 'income' : 'expense', amount: Math.abs(diff), category: 'adjustment', note: 'Balance correction' },
      `Balance set to ${rand(Number(actual))}`,
    )
    setActual('')
  }

  const exportData = () => {
    const blob = new Blob([JSON.stringify(ctx.data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `imali-${today}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const reset = () => {
    const msg = p.isDemo ? 'Leave the demo and start fresh?' : 'Delete all your data from this phone? This cannot be undone.'
    if (confirm(msg)) ctx.setData(() => ({ profile: null, txns: [], bills: [] }))
  }

  return (
    <>
      <header className="topbar">
        <h1>Settings</h1>
      </header>

      <section className="card">
        <label className="field">
          <span>Name</span>
          <input value={p.name} onChange={(e) => setProfile({ name: e.target.value })} />
        </label>
        <label className="field">
          <span>Language</span>
          <select value={p.lang} onChange={(e) => setProfile({ lang: e.target.value as Lang })}>
            {LANGS.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
        <div className="row">
          <label className="field">
            <span>Usual weekly income</span>
            <input inputMode="numeric" value={p.weeklyIncomeEstimate || ''} onChange={(e) => setProfile({ weeklyIncomeEstimate: digits(e.target.value) })} />
          </label>
          <label className="field">
            <span>Buffer goal</span>
            <input inputMode="numeric" value={p.bufferGoal || ''} onChange={(e) => setProfile({ bufferGoal: digits(e.target.value) })} />
          </label>
        </div>
      </section>

      <h3 className="section-title">Monthly bills</h3>
      <section className="card">
        <BillsEditor bills={ctx.data.bills} onChange={(bills) => ctx.setData((d) => ({ ...d, bills }))} />
      </section>

      <h3 className="section-title">Balance</h3>
      <section className="card">
        <p style={{ marginBottom: 10 }}>
          Imali thinks your balance is <b>{rand(f.balance)}</b>. If your real balance is different, enter it here.
        </p>
        <div className="row">
          <label className="field">
            <span>Real balance</span>
            <input inputMode="decimal" value={actual} onChange={(e) => setActual(e.target.value.replace(/[^\d.]/g, ''))} placeholder="R" />
          </label>
          <button className="btn shrink" style={{ marginBottom: 14 }} onClick={correctBalance} disabled={!actual}>
            Update
          </button>
        </div>
      </section>

      <h3 className="section-title">Buffer</h3>
      <section className="card">
        <p style={{ marginBottom: 10 }}>
          You have <b>{rand(f.buffer)}</b> in your buffer. Take some out if you really need it.
        </p>
        <div className="row">
          <label className="field">
            <span>Amount</span>
            <input inputMode="numeric" value={withdraw} onChange={(e) => setWithdraw(e.target.value.replace(/\D/g, ''))} placeholder="R" />
          </label>
          <button
            className="btn secondary shrink"
            style={{ marginBottom: 14 }}
            disabled={!(Number(withdraw) > 0 && Number(withdraw) <= f.buffer)}
            onClick={() => {
              ctx.addTxn(
                { date: today, kind: 'withdraw', amount: Number(withdraw), category: 'buffer', note: 'From buffer' },
                `${rand(Number(withdraw))} moved back`,
              )
              setWithdraw('')
            }}
          >
            Take out
          </button>
        </div>
      </section>

      <h3 className="section-title">Your data</h3>
      <section className="card">
        <p style={{ marginBottom: 12 }}>
          Everything stays on this phone. Imali has no server and no account, and never asks for your banking PIN or password.
        </p>
        <div className="stack">
          <button className="btn secondary" onClick={exportData}>
            Download my data
          </button>
          <button className="btn danger" onClick={reset}>
            {p.isDemo ? 'Exit demo' : 'Delete all data'}
          </button>
        </div>
      </section>
      <p className="fine">Imali · built for the FNB App of the Year Hackathon 2026</p>
    </>
  )
}
