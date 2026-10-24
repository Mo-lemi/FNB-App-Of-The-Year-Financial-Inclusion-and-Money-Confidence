import { useEffect, useMemo, useState } from 'react'
import { demoSessionOnly, useAppData } from './lib/store'
import { forecast } from './lib/forecast'
import { todayISO } from './lib/dates'
import { newId } from './lib/money'
import { translator } from './lib/i18n'
import type { AppData, Txn } from './lib/types'
import Onboarding from './components/Onboarding'
import Today from './components/Today'
import AddEntry from './components/AddEntry'
import Insights from './components/Insights'
import Settings from './components/Settings'
import Icon, { type IconName } from './components/Icon'
import { LockScreen } from './components/Lock'
import { clearPin, hasPin } from './lib/lock'

export type Tab = 'today' | 'add' | 'insights' | 'settings'

const TABS: Tab[] = ['today', 'add', 'insights', 'settings']
const initialTab = (): Tab => {
  const h = window.location.hash.slice(1) as Tab
  return TABS.includes(h) ? h : 'today'
}

export interface Ctx {
  data: AppData
  setData: (fn: (d: AppData) => AppData) => void
  addTxn: (t: Omit<Txn, 'id'>, message?: string) => void
  toast: (message: string) => void
  go: (tab: Tab) => void
  /** Present only when a PIN is set. */
  lock?: () => void
}

// Leaving the app for longer than this locks it again.
const RELOCK_MS = 60_000

export default function App() {
  const [data, setDataRaw] = useAppData()
  const [tab, setTab] = useState<Tab>(initialTab)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [today, setToday] = useState(todayISO)
  const [locked, setLocked] = useState(() => hasPin() && !demoSessionOnly)

  useEffect(() => {
    let hiddenAt = 0
    const onVisibility = () => {
      if (document.hidden) hiddenAt = Date.now()
      else if (hasPin() && Date.now() - hiddenAt > RELOCK_MS) setLocked(true)
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  // The PIN guards this data, so it goes when the data goes.
  useEffect(() => {
    if (!data.profile) {
      // Leaving a visit-only demo brings back the real data saved on this phone.
      if (demoSessionOnly) return window.location.reload()
      clearPin()
      setLocked(false)
    }
  }, [data.profile])

  // Roll over to a new day if the app is left open past midnight.
  useEffect(() => {
    const id = setInterval(() => setToday(todayISO()), 60_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!toastMsg) return
    const id = setTimeout(() => setToastMsg(null), 2600)
    return () => clearTimeout(id)
  }, [toastMsg])

  const lang = data.profile?.lang ?? 'en'
  const t = translator(lang)
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const f = useMemo(() => (data.profile ? forecast(data, today) : null), [data, today])

  if (!data.profile || !f) return <Onboarding onDone={(d) => setDataRaw(d)} />
  if (locked)
    return (
      <LockScreen
        name={data.profile.name}
        onUnlock={() => setLocked(false)}
        onForgot={() => setDataRaw(() => ({ profile: null, txns: [], bills: [] }))}
      />
    )

  const ctx: Ctx = {
    data,
    setData: (fn) => setDataRaw(fn),
    addTxn: (txn, message) => {
      setDataRaw((d) => ({ ...d, txns: [...d.txns, { ...txn, id: newId() }] }))
      if (message) setToastMsg(message)
    },
    toast: setToastMsg,
    go: (next) => {
      setTab(next)
      window.history.replaceState(null, '', next === 'today' ? window.location.pathname : `#${next}`)
      window.scrollTo(0, 0)
    },
    lock: hasPin() && !demoSessionOnly ? () => setLocked(true) : undefined,
  }

  const navItems: { id: Tab; ico: IconName; label: string }[] = [
    { id: 'today', ico: 'home', label: t('navToday') },
    { id: 'add', ico: 'plus', label: t('navAdd') },
    { id: 'insights', ico: 'chart', label: t('navInsights') },
    { id: 'settings', ico: 'settings', label: t('navSettings') },
  ]

  return (
    <>
      <main className="app">
        {tab === 'today' && <Today ctx={ctx} f={f} t={t} />}
        {tab === 'add' && <AddEntry ctx={ctx} t={t} today={today} />}
        {tab === 'insights' && <Insights ctx={ctx} f={f} />}
        {tab === 'settings' && <Settings ctx={ctx} f={f} today={today} />}
      </main>
      <nav className="nav" aria-label="Main">
        <div className="nav-inner">
          {navItems.map((n) => (
            <button
              key={n.id}
              className={`${tab === n.id ? 'on' : ''} ${n.id === 'add' ? 'add-btn' : ''}`}
              aria-current={tab === n.id ? 'page' : undefined}
              onClick={() => ctx.go(n.id)}
            >
              <span className="ico">
                <Icon name={n.ico} size={22} />
              </span>
              {n.label}
            </button>
          ))}
        </div>
      </nav>
      {toastMsg && (
        <div className="toast" role="status">
          {toastMsg}
        </div>
      )}
    </>
  )
}
