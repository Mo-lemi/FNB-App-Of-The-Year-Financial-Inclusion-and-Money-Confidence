import { describe, expect, it } from 'vitest'
import { parseSms } from './sms'

describe('parseSms', () => {
  it('reads a purchase', () => {
    const p = parseSms('Bank: R1,234.50 paid from cheq a/c..1234 @ Shoprite Soweto. Avail R2,000.00')
    expect(p).toMatchObject({ amount: 1234.5, kind: 'expense', category: 'food', note: 'Shoprite Soweto' })
    expect(p.scamWarnings).toHaveLength(0)
  })

  it('reads money received', () => {
    expect(parseSms('R500.00 paid to cheq a/c..1234 @ Ref Delivery payout')).toMatchObject({ amount: 500, kind: 'income' })
    expect(parseSms('You have received R350 from Thandi')).toMatchObject({ amount: 350, kind: 'income' })
  })

  it('flags common scams', () => {
    const p = parseSms('URGENT: your account is suspended. Click the link http://bit.ly/x and confirm your OTP')
    expect(p.scamWarnings.length).toBeGreaterThanOrEqual(3)
    expect(parseSms('Congratulations! You have won R50 000. Pay R250 admin fee to claim').scamWarnings.length).toBeGreaterThanOrEqual(2)
  })

  it.each([
    ['a link', 'Your parcel is waiting, visit https://track-parcel.co to pay customs'],
    ['a PIN or OTP request', 'Bank security: reply with the OTP we sent to keep your card active'],
    ['a prize', 'Congratulations, you are our lucky draw winner this week'],
    ['pressure to act fast', 'Your account will be blocked within 24 hours'],
    ['a fee to receive money', 'Your R3000 payout is ready. Send R150 release fee first'],
    ['an unsolicited loan', 'Your loan approved! R5000 with no credit check'],
  ])('warns about %s', (_label, text) => {
    expect(parseSms(text).scamWarnings.length).toBeGreaterThanOrEqual(1)
  })

  it('does not raise false alarms on normal bank messages', () => {
    expect(parseSms('FNB: R120.00 paid from cheq a/c..1234 @ Pick n Pay Soweto. Avail R1500.00').scamWarnings).toHaveLength(0)
    expect(parseSms('You have received R350 from Thandi').scamWarnings).toHaveLength(0)
  })

  it('sorts spending into categories', () => {
    expect(parseSms('R29.00 purchase @ Vodacom data bundle').category).toBe('airtime')
    expect(parseSms('R300.00 paid from cheq a/c..1234 @ Engen Diepkloof').category).toBe('transport')
    expect(parseSms('R85.00 purchase @ Corner Store').category).toBe('other')
  })

  it('recognises grant income', () => {
    expect(parseSms('R560.00 paid to sav a/c..1234 ref SASSA grant')).toMatchObject({ kind: 'income', category: 'grant', amount: 560 })
  })

  it('reads amounts with thousands separators', () => {
    expect(parseSms('R1 250.50 paid from cheq a/c..1234 @ Rent').amount).toBe(1250.5)
    expect(parseSms('R2,000 deposited into your account').amount).toBe(2000)
  })

  it('treats a payment to someone as money out', () => {
    expect(parseSms('R300.00 payment to Thandi successful').kind).toBe('expense')
  })

  it('leaves messages without money alone', () => {
    expect(parseSms('Your statement is ready to view')).toEqual({ amount: undefined, kind: undefined, category: undefined, note: undefined, scamWarnings: [] })
  })
})
