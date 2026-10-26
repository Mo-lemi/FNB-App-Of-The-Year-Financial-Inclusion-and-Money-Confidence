import type { Lang } from './types'

export const LANGS: { code: Lang; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'zu', label: 'isiZulu' },
  { code: 'st', label: 'Sesotho' },
  { code: 'af', label: 'Afrikaans' },
]

const en = {
  greeting: 'Hi',
  safeToday: 'Safe to spend today',
  spentToday: 'Spent today',
  earnedToday: 'Earned today',
  balance: 'Balance',
  buffer: 'Buffer',
  good: "You're on track",
  tight: 'Go carefully',
  survival: 'Essentials only today',
  tightSpot: 'Tight spot',
  leanWeek: 'Tough week ahead',
  next14: 'Next 14 days',
  goodDay: 'Good day! Put some away',
  moveToBuffer: 'Move to buffer',
  moneyIn: 'Money in',
  moneyOut: 'Money out',
  save: 'Save',
  navToday: 'Today',
  navAdd: 'Add',
  navInsights: 'Insights',
  navSettings: 'Settings',
}

type Dict = typeof en

// Translations should be checked by first-language speakers before launch.
const zu: Dict = {
  greeting: 'Sawubona',
  safeToday: 'Ongakusebenzisa namuhla ngokuphepha',
  spentToday: 'Okusetshenzisiwe namuhla',
  earnedToday: 'Okutholiwe namuhla',
  balance: 'Ibhalansi',
  buffer: 'Imali egciniwe',
  good: 'Usendleleni efanele',
  tight: 'Qaphela',
  survival: 'Okubalulekile kuphela namuhla',
  tightSpot: 'Isikhathi esinzima',
  leanWeek: 'Isonto elinzima liyeza',
  next14: 'Izinsuku ezi-14 ezizayo',
  goodDay: 'Usuku oluhle! Beka okuthile eceleni',
  moveToBuffer: 'Beka eceleni',
  moneyIn: 'Imali engenayo',
  moneyOut: 'Imali ephumayo',
  save: 'Gcina',
  navToday: 'Namuhla',
  navAdd: 'Faka',
  navInsights: 'Ulwazi',
  navSettings: 'Izilungiselelo',
}

const st: Dict = {
  greeting: 'Dumela',
  safeToday: 'O ka sebedisa kajeno ka polokeho',
  spentToday: 'Tse sebedisitsweng kajeno',
  earnedToday: 'Tse fumanweng kajeno',
  balance: 'Bhalanse',
  buffer: 'Chelete e bolokilweng',
  good: 'O tseleng e nepahetseng',
  tight: 'Hlokomela',
  survival: 'Tse bohlokwa feela kajeno',
  tightSpot: 'Nako e thata',
  leanWeek: 'Beke e thata e a tla',
  next14: 'Matsatsi a 14 a tlang',
  goodDay: 'Letsatsi le letle! Beha tse ding ka thoko',
  moveToBuffer: 'Beha ka thoko',
  moneyIn: 'Chelete e kenang',
  moneyOut: 'Chelete e tswang',
  save: 'Boloka',
  navToday: 'Kajeno',
  navAdd: 'Kenya',
  navInsights: 'Tsebo',
  navSettings: 'Ditlhophiso',
}

const af: Dict = {
  greeting: 'Hallo',
  safeToday: 'Veilig om vandag te spandeer',
  spentToday: 'Vandag spandeer',
  earnedToday: 'Vandag verdien',
  balance: 'Saldo',
  buffer: 'Buffer',
  good: 'Jy is op koers',
  tight: 'Wees versigtig',
  survival: 'Net noodsaaklikhede vandag',
  tightSpot: 'Moeilike tyd',
  leanWeek: 'Moeilike week vorentoe',
  next14: 'Volgende 14 dae',
  goodDay: 'Goeie dag! Sit iets opsy',
  moveToBuffer: 'Sit opsy',
  moneyIn: 'Geld in',
  moneyOut: 'Geld uit',
  save: 'Stoor',
  navToday: 'Vandag',
  navAdd: 'Voeg by',
  navInsights: 'Insigte',
  navSettings: 'Instellings',
}

export const DICTS: Record<Lang, Dict> = { en, zu, st, af }

export type TKey = keyof Dict
export const translator = (lang: Lang) => (key: TKey) => DICTS[lang]?.[key] ?? en[key]
