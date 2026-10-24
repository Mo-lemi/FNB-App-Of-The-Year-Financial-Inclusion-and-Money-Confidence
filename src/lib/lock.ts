// Optional 4-digit app lock. It keeps other people on a shared phone out of the app;
// it is not encryption. Only a salted hash of the PIN is stored, so a PIN reused from
// a bank card is never sitting on the phone in plain text.

const KEY = 'imali:lock'
const MAX_TRIES = 5
const BASE_WAIT_MS = 30_000

interface LockState {
  alg: 'sha256' | 'fnv'
  salt: string
  hash: string
  fails: number
  until: number
}

export const WEAK_PINS = ['0000', '1111', '1234', '4321', '1212', '2580', '9999']

function read(): LockState | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as LockState) : null
  } catch {
    return null
  }
}

function write(s: LockState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    // Storage blocked: the lock simply won't survive a reload.
  }
}

const hex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')

// crypto.subtle only exists on https and localhost. The fallback keeps the lock working
// when the dev server is opened over the local network.
async function digest(alg: LockState['alg'], salt: string, pin: string): Promise<string> {
  if (alg === 'sha256') {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${pin}`))
    return hex(new Uint8Array(buf))
  }
  let h = 0x811c9dc5
  for (const ch of `${salt}:${pin}`) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193) >>> 0
  return h.toString(16)
}

export const hasPin = () => read() !== null

export function clearPin() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // Nothing to clear.
  }
}

export async function setPin(pin: string) {
  const alg: LockState['alg'] = typeof crypto !== 'undefined' && crypto.subtle ? 'sha256' : 'fnv'
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)))
  write({ alg, salt, hash: await digest(alg, salt, pin), fails: 0, until: 0 })
}

/** Milliseconds left before another try is allowed (0 if none). */
export function waitLeft(): number {
  const s = read()
  return s ? Math.max(0, s.until - Date.now()) : 0
}

/** Checks a PIN. Wrong tries are counted, and after 5 the wait doubles each time. */
export async function checkPin(pin: string): Promise<boolean> {
  const s = read()
  if (!s) return true
  if (Date.now() < s.until) return false
  const ok = (await digest(s.alg, s.salt, pin)) === s.hash
  if (ok) {
    write({ ...s, fails: 0, until: 0 })
  } else {
    const fails = s.fails + 1
    const until = fails >= MAX_TRIES ? Date.now() + BASE_WAIT_MS * 2 ** (fails - MAX_TRIES) : 0
    write({ ...s, fails, until })
  }
  return ok
}
