import { describe, expect, it } from 'vitest'
import { addDays, daysBetween, daysInMonth, dom, dow, isDueOn, monthKey, shortDate } from './dates'
import { ordinal } from './insights'

describe('dates', () => {
  it('adds days across month and year ends', () => {
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('counts days between dates', () => {
    expect(daysBetween('2026-10-24', '2026-11-07')).toBe(14)
    expect(daysBetween('2026-10-24', '2026-10-24')).toBe(0)
  })

  it('knows month lengths, including leap years', () => {
    expect(daysInMonth('2026-11-15')).toBe(30)
    expect(daysInMonth('2027-02-01')).toBe(28)
    expect(daysInMonth('2028-02-01')).toBe(29)
  })

  it('moves a bill on the 31st to the last day of shorter months', () => {
    expect(isDueOn(31, '2026-11-30')).toBe(true)
    expect(isDueOn(31, '2026-11-29')).toBe(false)
    expect(isDueOn(30, '2027-02-28')).toBe(true)
    expect(isDueOn(5, '2026-11-05')).toBe(true)
  })

  it('reads weekday, day of month and month', () => {
    expect(dow('2026-10-26')).toBe(1) // Monday
    expect(dom('2026-10-26')).toBe(26)
    expect(monthKey('2026-10-26')).toBe('2026-10')
    expect(shortDate('2026-11-05')).toMatch(/^Thu 5 Nov/)
  })

  it('writes ordinals the way people say them', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 31].map(ordinal)).toEqual([
      '1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '23rd', '31st',
    ])
  })
})
