import type { Kind } from './types'

export interface ParsedSms {
  amount?: number
  kind?: Extract<Kind, 'income' | 'expense'>
  category?: string
  note?: string
  scamWarnings: string[]
}

const AMOUNT = /R\s?(\d{1,3}(?:[ ,]\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)/i
const INCOME = /(paid to (?:your |cheq|sav|acc|a\/c)|received|deposit(?:ed)?|credited|\bcredit\b|inward|payment from|transfer from|you have been paid)/i
const EXPENSE = /(paid from|purchase|purch\b|withdrawn|withdrawal|debited|\bdebit\b|spent|payment to|reserved for|bought)/i

const MERCHANTS: [RegExp, string][] = [
  [/shoprite|checkers|spar|pick ?n ?pay|pnp|boxer|usave|woolworths|food|kfc|chicken|bakery|butcher/i, 'food'],
  [/taxi|uber|bolt|fuel|petrol|engen|shell|sasol|bp |caltex|total|bus|gautrain|putco/i, 'transport'],
  [/vodacom|mtn|cell ?c|telkom|rain|airtime|data bundle|\bdata\b/i, 'airtime'],
  [/eskom|electricity|prepaid elec|water|municipal|pep|ackermans|hardware/i, 'household'],
]

const SCAM_RULES: [RegExp, string][] = [
  [/https?:\/\/|bit\.ly|tinyurl|wa\.me|\b(click|tap|visit)\b.{0,25}\b(link|here|below)\b/i,
    'Contains a link. Banks never ask you to log in or "verify" through an SMS link.'],
  [/\b(otp|one[- ]?time ?pin|pin|password|cvv)\b[\s\S]{0,60}\b(share|send|give|reply|confirm|provide)\b|\b(share|send|give|reply|confirm|provide)\b[\s\S]{0,60}\b(otp|one[- ]?time ?pin|pin|password|cvv)\b/i,
    'Asks for your PIN, OTP or password. Never share these with anyone, even "the bank".'],
  [/\b(you('ve| have)? won|winner|prize|lotto|jackpot|congratulations|lucky draw)\b/i,
    'Promises a prize or winnings you did not enter for.'],
  [/\b(urgent(ly)?|immediately|suspended|blocked|locked|deactivated|within 24 ?h(ours)?|final notice|verify your account)\b/i,
    'Pressures you to act fast. Scammers rush you so you do not stop to check.'],
  [/\b(pay|send|deposit)\b.{0,30}\b(fee|admin|release|unlock|claim)\b/i,
    'Asks you to pay a fee to receive money. Real payouts never cost you money first.'],
  [/\b(loan approved|pre-?approved|guaranteed loan|no credit check)\b/i,
    'Unsolicited "approved loan". Check with a registered credit provider before replying.'],
]

export function parseSms(text: string): ParsedSms {
  const scamWarnings = SCAM_RULES.filter(([re]) => re.test(text)).map(([, msg]) => msg)
  const m = text.match(AMOUNT)
  const amount = m ? Number(m[1].replace(/[ ,]/g, '')) : undefined

  let kind: ParsedSms['kind']
  if (INCOME.test(text) && !/payment to/i.test(text)) kind = 'income'
  else if (EXPENSE.test(text)) kind = 'expense'

  let category: string | undefined
  if (kind === 'expense') category = MERCHANTS.find(([re]) => re.test(text))?.[1] ?? 'other'
  if (kind === 'income') category = /sassa|grant|srd/i.test(text) ? 'grant' : 'work'

  const at = text.match(/@\s*([A-Za-z0-9 &'-]{2,30})/)
  const note = at ? at[1].trim().replace(/\s+\d.*$/, '') : undefined

  return { amount: amount && amount > 0 ? amount : undefined, kind, category, note, scamWarnings }
}
