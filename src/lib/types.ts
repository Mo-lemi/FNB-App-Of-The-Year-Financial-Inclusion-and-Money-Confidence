export type Lang = 'en' | 'zu' | 'st' | 'af'

/** income/expense change the spendable balance; save/withdraw move money to/from the buffer pot. */
export type Kind = 'income' | 'expense' | 'save' | 'withdraw'

export interface Txn {
  id: string
  date: string // YYYY-MM-DD, local
  amount: number // rands, always positive
  kind: Kind
  category: string
  note?: string
}

export interface Bill {
  id: string
  name: string
  amount: number
  dayOfMonth: number // 1-31; clamped to the month's last day
}

export interface Profile {
  name: string
  lang: Lang
  openingBalance: number
  weeklyIncomeEstimate: number // prior used until enough history exists
  bufferGoal: number
  createdAt: string
  isDemo?: boolean
}

export interface AppData {
  profile: Profile | null
  txns: Txn[]
  bills: Bill[]
}

export const INCOME_CATEGORIES = ['work', 'side', 'grant', 'family', 'other'] as const
export const EXPENSE_CATEGORIES = ['food', 'transport', 'airtime', 'household', 'family', 'bills', 'other'] as const
export const ESSENTIAL_CATEGORIES = ['food', 'transport', 'airtime']
