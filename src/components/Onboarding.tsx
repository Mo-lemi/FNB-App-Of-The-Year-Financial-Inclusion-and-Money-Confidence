import { useState } from 'react'
import type { AppData, Bill, Lang } from '../lib/types'
import { LANGS } from '../lib/i18n'
import { buildDemo } from '../lib/demo'
import { todayISO } from '../lib/dates'
import BillsEditor from './BillsEditor'
import Icon from './Icon'

export default function Onboarding({ onDone }: { onDone: (d: AppData) => void }) {
  const [step, setStep] = useState<'welcome' | 'about' | 'bills'>('welcome')
  const [name, setName] = useState('')
  const [lang, setLang] = useState<Lang>('en')
  const [balance, setBalance] = useState('')
  const [weekly, setWeekly] = useState('')
  const [goal, setGoal] = useState('500')
  const [bills, setBills] = useState<Bill[]>([])
  const digits = (s: string) => s.replace(/\D/g, '')

  if (step === 'welcome') {
    return (
      <main className="app welcome">
        <img className="logo" src={`${import.meta.env.BASE_URL}icon.svg`} alt="" />
        <h1>Madi</h1>
        <p className="tagline">Know what's safe to spend today, even when your income changes every day.</p>
        <div className="features">
          <div>
            <span className="feature-icon"><Icon name="target" /></span>
            <span>
              <b>One clear number.</b> How much you can spend today and still cover rent and bills.
            </span>
          </div>
          <div>
            <span className="feature-icon"><Icon name="calendar" /></span>
            <span>
              <b>Sees slow weeks coming.</b> It learns your earning rhythm and warns you early.
            </span>
          </div>
          <div>
            <span className="feature-icon"><Icon name="shield" /></span>
            <span>
              <b>Spots scam SMSes.</b> Paste a message and Madi checks it before you act.
            </span>
          </div>
          <div>
            <span className="feature-icon"><Icon name="lock" /></span>
            <span>
              <b>Private.</b> No sign-up, no bank login. Your data never leaves your phone.
            </span>
          </div>
        </div>
        <div className="stack">
          <button className="btn" onClick={() => setStep('about')}>
            Start
          </button>
          <button className="btn secondary" onClick={() => onDone(buildDemo(todayISO()))}>
            Try the demo (90 days of data)
          </button>
        </div>
        <p className="fine">Works offline and uses very little data.</p>
      </main>
    )
  }

  if (step === 'about') {
    const valid = name.trim() !== '' && balance !== '' && Number(weekly) > 0
    return (
      <main className="app">
        <header className="topbar">
          <h1>About you</h1>
          <span className="sub">Step 1 of 2</span>
        </header>
        <section className="card">
          <label className="field">
            <span>What should we call you?</span>
            <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </label>
          <label className="field">
            <span>Language</span>
            <select value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
              {LANGS.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
            <div className="hint">Main screens are translated. More text, and Setswana, are coming.</div>
          </label>
          <label className="field">
            <span>How much money do you have right now?</span>
            <input inputMode="numeric" value={balance} onChange={(e) => setBalance(digits(e.target.value))} placeholder="R" />
            <div className="hint">Cash and bank together. A rough amount is fine.</div>
          </label>
          <label className="field">
            <span>In a normal week, how much do you earn?</span>
            <input inputMode="numeric" value={weekly} onChange={(e) => setWeekly(digits(e.target.value))} placeholder="R" />
            <div className="hint">Your best guess. Madi learns the real pattern as you log.</div>
          </label>
          <label className="field">
            <span>Buffer goal: money to keep aside for slow weeks</span>
            <input inputMode="numeric" value={goal} onChange={(e) => setGoal(digits(e.target.value))} placeholder="R" />
          </label>
        </section>
        <div className="stack">
          <button className="btn" disabled={!valid} onClick={() => setStep('bills')}>
            Next
          </button>
          <button className="btn ghost" onClick={() => setStep('welcome')}>
            Back
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="app">
      <header className="topbar">
        <h1>Monthly bills</h1>
        <span className="sub">Step 2 of 2</span>
      </header>
      <section className="card">
        <p style={{ marginBottom: 12 }}>
          Add the money that must go out every month: rent, school fees, stokvel, funeral cover. Madi keeps this safe for you.
        </p>
        <BillsEditor bills={bills} onChange={setBills} />
      </section>
      <div className="stack">
        <button
          className="btn"
          onClick={() =>
            onDone({
              profile: {
                name: name.trim(),
                lang,
                openingBalance: Number(balance),
                weeklyIncomeEstimate: Number(weekly),
                bufferGoal: Number(goal) || 0,
                createdAt: todayISO(),
              },
              txns: [],
              bills,
            })
          }
        >
          {bills.length ? 'Finish' : 'Skip for now'}
        </button>
        <button className="btn ghost" onClick={() => setStep('about')}>
          Back
        </button>
      </div>
    </main>
  )
}
