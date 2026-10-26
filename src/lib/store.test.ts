import { beforeEach, describe, expect, it, vi } from 'vitest'

// store.ts runs its start-up checks when it is first imported, so each test sets up
// the browser state it needs and then imports a fresh copy of the module.
const storage = new Map<string, string>()
let url = { search: '', pathname: '/app/', hash: '' }

async function loadStore(search = '') {
  url = { search, pathname: '/app/', hash: '' }
  vi.resetModules()
  return import('./store')
}

const realUser = JSON.stringify({
  profile: { name: 'Thandi', lang: 'en', openingBalance: 1000, weeklyIncomeEstimate: 1500, bufferGoal: 500, createdAt: '2026-10-01' },
  txns: [],
  bills: [],
})

beforeEach(() => {
  storage.clear()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => void storage.set(k, v),
    removeItem: (k: string) => void storage.delete(k),
  })
  vi.stubGlobal('window', {
    get location() {
      return url
    },
    history: { replaceState: () => {} },
  })
})

describe('storage', () => {
  it('moves data and PIN saved under the old Imali name to Madi', async () => {
    storage.set('imali:v1', realUser)
    storage.set('imali:lock', '{"hash":"x"}')
    await loadStore()
    expect(storage.get('madi:v1')).toBe(realUser)
    expect(storage.get('madi:lock')).toBe('{"hash":"x"}')
    expect(storage.has('imali:v1')).toBe(false)
    expect(storage.has('imali:lock')).toBe(false)
  })

  it('never overwrites newer Madi data with old Imali data', async () => {
    storage.set('madi:v1', realUser)
    storage.set('imali:v1', '{"profile":null}')
    await loadStore()
    expect(storage.get('madi:v1')).toBe(realUser)
  })

  it('opens a demo link on a phone with real data for this visit only', async () => {
    storage.set('madi:v1', realUser)
    storage.set('madi:lock', '{"hash":"x"}')
    const { demoSessionOnly } = await loadStore('?demo')
    expect(demoSessionOnly).toBe(true)
    expect(storage.get('madi:v1')).toBe(realUser)
    expect(storage.get('madi:lock')).toBe('{"hash":"x"}')
  })

  it('opens a normal demo on a phone without data', async () => {
    const { demoSessionOnly } = await loadStore('?demo')
    expect(demoSessionOnly).toBe(false)
  })
})
