import { useEffect, useState } from 'react'
import type { AppData } from './types'
import { buildDemo } from './demo'
import { todayISO } from './dates'
import { clearPin } from './lock'

const KEY = 'imali:v1'
const EMPTY: AppData = { profile: null, txns: [], bills: [] }

// A link ending in ?demo opens a fresh demo account (used for the judges' demo link).
// Checked once at startup so the URL can be cleaned up straight away.
const demoRequested = (() => {
  const params = new URLSearchParams(window.location.search)
  if (!params.has('demo')) return false
  params.delete('demo')
  const query = params.toString()
  window.history.replaceState(null, '', window.location.pathname + (query ? `?${query}` : '') + window.location.hash)
  return true
})()

function readStored(): AppData {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY
  } catch {
    return EMPTY
  }
}

// If someone with their own data opens a demo link, the demo runs for this visit only
// and is never saved, so their real data (and PIN) are left untouched.
const stored = readStored()
export const demoSessionOnly = demoRequested && !!stored.profile && !stored.profile.isDemo

function load(): AppData {
  if (!demoRequested) return stored
  if (!demoSessionOnly) clearPin()
  return buildDemo(todayISO())
}

/** All data lives on the device. Nothing is sent to a server. */
export function useAppData() {
  const [data, setData] = useState<AppData>(load)
  useEffect(() => {
    if (demoSessionOnly) return
    try {
      localStorage.setItem(KEY, JSON.stringify(data))
    } catch {
      // Storage full or blocked: the app keeps working for this session.
    }
  }, [data])
  return [data, setData] as const
}
