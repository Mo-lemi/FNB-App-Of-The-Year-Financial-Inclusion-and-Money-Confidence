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
})
