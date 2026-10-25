import { beforeEach, describe, expect, it, vi } from 'vitest'
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
})
