import { useEffect, useRef, useState, type ReactNode } from 'react'
import Icon from './Icon'

interface Props {
  title: string
  sub?: string
  error?: string
  /** Bump this after a wrong PIN to clear the dots and shake them. */
  errorCount?: number
  disabled?: boolean
  onComplete: (pin: string) => void
  /** Optional button for the empty bottom-left key, e.g. Cancel. */
  extra?: ReactNode
  footer?: ReactNode
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

export default function PinPad({ title, sub, error, errorCount = 0, disabled, onComplete, extra, footer }: Props) {
  const [pin, setPin] = useState('')
  const done = useRef(onComplete)
  done.current = onComplete

  useEffect(() => setPin(''), [errorCount])

  useEffect(() => {
    if (pin.length !== 4) return
    // A short pause so the fourth dot is seen before the screen changes.
    const id = setTimeout(() => {
      done.current(pin)
      setPin('')
    }, 140)
    return () => clearTimeout(id)
  }, [pin])

  const press = (d: string) => !disabled && setPin((p) => (p.length < 4 ? p + d : p))
  const back = () => setPin((p) => p.slice(0, -1))

  // Number keys work too, for anyone on a computer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key)
      else if (e.key === 'Backspace') back()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="pinpad">
      <h1>{title}</h1>
      {sub && <p className="pin-sub">{sub}</p>}
      <div key={errorCount} className={`pin-dots ${errorCount ? 'shake' : ''}`} aria-label={`${pin.length} of 4 digits entered`} role="status">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={i < pin.length ? 'on' : ''} />
        ))}
      </div>
      <p className="pin-error" aria-live="assertive">
        {error}
      </p>
      <div className="keys">
        {KEYS.map((k) => (
          <button key={k} onClick={() => press(k)} disabled={disabled}>
            {k}
          </button>
        ))}
        <div className="key-extra">{extra}</div>
        <button onClick={() => press('0')} disabled={disabled}>
          0
        </button>
        <button className="key-back" onClick={back} aria-label="Delete last digit" disabled={!pin}>
          <Icon name="backspace" size={24} />
        </button>
      </div>
      {footer}
    </div>
  )
}
