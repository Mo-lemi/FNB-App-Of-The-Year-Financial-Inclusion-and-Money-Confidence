import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { checkPin, clearPin, hasPin, setPin, waitLeft } from './lock'

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
})

describe('app lock', () => {
  beforeEach(() => store.clear())

  it('stores a hash, never the PIN itself', async () => {
    await setPin('4826')
    expect(hasPin()).toBe(true)
    expect(store.get('madi:lock')).not.toContain('4826')
  })

  it('accepts the right PIN and rejects a wrong one', async () => {
    await setPin('4826')
    expect(await checkPin('1111')).toBe(false)
    expect(await checkPin('4826')).toBe(true)
  })

  it('makes you wait after five wrong tries, even with the right PIN', async () => {
    await setPin('4826')
    for (let i = 0; i < 5; i++) await checkPin('0000')
    expect(waitLeft()).toBeGreaterThan(25_000)
    expect(await checkPin('4826')).toBe(false)
  })

  it('clears completely', async () => {
    await setPin('4826')
    clearPin()
    expect(hasPin()).toBe(false)
    expect(await checkPin('anything')).toBe(true)
  })

  afterEach(() => vi.useRealTimers())

  it('doubles the wait with each wrong try after the fifth', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-26T10:00:00'))
    await setPin('4826')
    for (let i = 0; i < 5; i++) await checkPin('0000')
    expect(waitLeft()).toBe(30_000)
    vi.advanceTimersByTime(30_001)
    expect(waitLeft()).toBe(0)
    await checkPin('0000')
    expect(waitLeft()).toBe(60_000)
  })

  it('a correct PIN resets the count of wrong tries', async () => {
    await setPin('4826')
    for (let i = 0; i < 4; i++) await checkPin('0000')
    expect(await checkPin('4826')).toBe(true)
    await checkPin('0000')
    expect(waitLeft()).toBe(0)
  })

  it('uses a different salt every time, so equal PINs never look equal', async () => {
    await setPin('4826')
    const first = JSON.parse(store.get('madi:lock')!)
    await setPin('4826')
    const second = JSON.parse(store.get('madi:lock')!)
    expect(first.salt).not.toBe(second.salt)
    expect(first.hash).not.toBe(second.hash)
  })

  it('still works where secure crypto is unavailable (plain-http dev server)', async () => {
    const real = globalThis.crypto
    Object.defineProperty(globalThis, 'crypto', { value: { getRandomValues: real.getRandomValues.bind(real) }, configurable: true })
    try {
      await setPin('4826')
      expect(JSON.parse(store.get('madi:lock')!).alg).toBe('fnv')
      expect(await checkPin('1111')).toBe(false)
      expect(await checkPin('4826')).toBe(true)
    } finally {
      Object.defineProperty(globalThis, 'crypto', { value: real, configurable: true })
    }
  })
})
