import { useEffect, useState } from 'react'
import { checkPin, clearPin, setPin, waitLeft, WEAK_PINS } from '../lib/lock'
import PinPad from './PinPad'

const waitMessage = (ms: number) => `Too many wrong tries. Try again in ${Math.ceil(ms / 1000)} seconds.`

/** Counts down the lockout after too many wrong tries. */
function useWait() {
  const [wait, setWait] = useState(waitLeft)
  useEffect(() => {
    if (!wait) return
    const id = setInterval(() => setWait(waitLeft()), 1000)
    return () => clearInterval(id)
  }, [wait > 0])
  return [wait, () => setWait(waitLeft())] as const
}

export function LockScreen({ name, onUnlock, onForgot }: { name: string; onUnlock: () => void; onForgot: () => void }) {
  const [errors, setErrors] = useState(0)
  const [wait, refreshWait] = useWait()

  const submit = async (pin: string) => {
    if (await checkPin(pin)) return onUnlock()
    setErrors((e) => e + 1)
    refreshWait()
  }

  const forgot = () => {
    if (confirm('Madi has no account, so a forgotten PIN cannot be reset. The only way in is to delete everything Madi saved on this phone. Delete it and start again?')) onForgot()
  }

  return (
    <main className="lock-screen">
      <img className="lock-logo" src={`${import.meta.env.BASE_URL}icon.svg`} alt="" />
      <PinPad
        title={name ? `Welcome back, ${name}` : 'Welcome back'}
        sub="Enter your Madi PIN"
        error={wait ? waitMessage(wait) : errors ? 'That PIN is not right. Try again.' : ''}
        errorCount={errors}
        disabled={wait > 0}
        onComplete={submit}
        footer={
          <button className="btn ghost forgot" onClick={forgot}>
            Forgot PIN?
          </button>
        }
      />
    </main>
  )
}

export type PinMode = 'set' | 'change' | 'off'

/** Full-screen flow from Settings to set, change or turn off the PIN. */
export function PinSetup({ mode, onDone, onCancel }: { mode: PinMode; onDone: (message: string) => void; onCancel: () => void }) {
  const [step, setStep] = useState<'current' | 'new' | 'confirm'>(mode === 'set' ? 'new' : 'current')
  const [first, setFirst] = useState('')
  const [error, setError] = useState('')
  const [errors, setErrors] = useState(0)
  const [wait, refreshWait] = useWait()

  const fail = (msg: string) => {
    setError(msg)
    setErrors((e) => e + 1)
  }

  const submit = async (pin: string) => {
    if (step === 'current') {
      if (!(await checkPin(pin))) {
        refreshWait()
        return fail('That PIN is not right. Try again.')
      }
      if (mode === 'off') {
        clearPin()
        return onDone('PIN turned off')
      }
      setError('')
      setErrors(0)
      setStep('new')
    } else if (step === 'new') {
      if (WEAK_PINS.includes(pin) || /^(\d)\1{3}$/.test(pin)) return fail('That PIN is too easy to guess. Pick another.')
      setFirst(pin)
      setError('')
      setErrors(0)
      setStep('confirm')
    } else if (pin === first) {
      await setPin(pin)
      onDone(mode === 'set' ? 'PIN set. Madi will ask for it when you come back.' : 'PIN changed')
    } else {
      setStep('new')
      fail('The two PINs did not match. Start again.')
    }
  }

  const titles = {
    current: mode === 'off' ? 'Enter your PIN to turn it off' : 'Enter your current PIN',
    new: mode === 'set' ? 'Choose a 4-digit PIN' : 'Choose a new PIN',
    confirm: 'Enter it again',
  }

  return (
    <div className="lock-screen overlay" role="dialog" aria-modal="true" aria-label={titles[step]}>
      <PinPad
        key={step}
        title={titles[step]}
        sub={step === 'new' ? 'Do not use your bank card PIN.' : undefined}
        error={wait ? waitMessage(wait) : error}
        errorCount={errors}
        disabled={wait > 0}
        onComplete={submit}
        extra={
          <button className="key-cancel" onClick={onCancel}>
            Cancel
          </button>
        }
      />
    </div>
  )
}
