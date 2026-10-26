import { describe, expect, it } from 'vitest'
import { floorTo, newId, rand, roundTo } from './money'
import { DICTS, LANGS, translator, type TKey } from './i18n'

describe('money', () => {
  it('formats rand amounts the South African way, never splitting across lines', () => {
    expect(rand(1234)).toBe('R1 234')
    expect(rand(50)).toBe('R50')
    expect(rand(-50)).toBe('-R50')
    expect(rand(12.5, { cents: true })).toBe('R12,50')
  })

  it('rounds to friendly steps', () => {
    expect(roundTo(123, 10)).toBe(120)
    expect(roundTo(125, 10)).toBe(130)
    expect(floorTo(129, 10)).toBe(120)
  })

  it('creates unique ids', () => {
    const ids = new Set(Array.from({ length: 200 }, newId))
    expect(ids.size).toBe(200)
  })
})

describe('translations', () => {
  it('offers four languages', () => {
    expect(LANGS.map((l) => l.code)).toEqual(['en', 'zu', 'st', 'af'])
  })

  it('translates every label in every language', () => {
    const keys = Object.keys(DICTS.en) as TKey[]
    for (const { code } of LANGS) {
      const t = translator(code)
      for (const k of keys) expect(t(k).trim(), `${code}.${k}`).not.toBe('')
    }
  })

  it('actually translates, not just copies English', () => {
    for (const code of ['zu', 'st', 'af'] as const) {
      expect(translator(code)('safeToday')).not.toBe(DICTS.en.safeToday)
    }
  })
})
