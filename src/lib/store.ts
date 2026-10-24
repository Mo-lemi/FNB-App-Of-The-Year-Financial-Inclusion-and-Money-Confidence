import { useEffect, useState } from 'react'
import type { AppData } from './types'
import { buildDemo } from './demo'
import { todayISO } from './dates'

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

function load(): AppData {
  if (demoRequested) return buildDemo(todayISO())
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY
  } catch {
    return EMPTY
  }
}

/** All data lives on the device. Nothing is sent to a server. */
export function useAppData() {
  const [data, setData] = useState<AppData>(load)
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(data))
    } catch {
      // Storage full or blocked: the app keeps working for this session.
    }
  }, [data])
  return [data, setData] as const
}
