import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { cx } from '../cx'
import styles from './Value.module.css'

export type StepperProps = {
  value: number | null
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  /** text shown for a value; units belong here ("30 min", "65 %") */
  format?: (value: number) => string
  /** typed text → value; defaults to the leading number */
  parse?: (text: string) => number | undefined
  label: string
  disabled?: boolean
  /** previous value, shown as "was …" with a changed outline */
  was?: string
  navId?: string
  autoFocus?: boolean
}

const HOLD_DELAY = 350
const HOLD_RATE = 60

/**
 * A number with − / +. One focus stop: ← → step (Shift ×10), digits start typing a value, Enter commits,
 * Esc cancels. The buttons are for the mouse (press and hold repeats).
 */
export function Stepper({ value, onChange, min = -Infinity, max = Infinity, step = 1, format = String, parse, label, disabled, was, navId, autoFocus }: StepperProps) {
  const [draft, setDraft] = useState<string | null>(null)
  const latest = useRef(value)
  latest.current = value
  const hold = useRef<{ timeout?: number; interval?: number }>({})

  const clamp = (v: number) => Math.min(max, Math.max(min, v))
  const stepBy = (n: number) => {
    const current = latest.current ?? (Number.isFinite(min) ? min : 0)
    const next = clamp(Math.round((current + n * step) / step) * step)
    if (next !== current) {
      latest.current = next
      onChange(next)
    }
  }

  const commit = () => {
    if (draft == null) return
    const parsed = parse ? parse(draft) : Number.parseFloat(draft.replace(',', '.'))
    setDraft(null)
    if (parsed !== undefined && !Number.isNaN(parsed)) onChange(clamp(parsed))
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (disabled) return
    const k = e.key
    if (k === 'ArrowLeft' || k === 'ArrowRight') {
      e.preventDefault()
      setDraft(null)
      stepBy((k === 'ArrowLeft' ? -1 : 1) * (e.shiftKey ? 10 : 1))
    } else if (/^[0-9.,:-]$/.test(k)) {
      e.preventDefault()
      setDraft((d) => (d ?? '') + k)
    } else if (draft != null && k === 'Backspace') {
      e.preventDefault()
      setDraft((d) => (d ? d.slice(0, -1) : ''))
    } else if (draft != null && k === 'Enter') {
      e.preventDefault()
      commit()
    } else if (draft != null && k === 'Escape') {
      e.preventDefault()
      setDraft(null)
    }
  }

  const stopHold = () => {
    clearTimeout(hold.current.timeout)
    clearInterval(hold.current.interval)
  }
  useEffect(() => stopHold, [])
  const startHold = (dir: number) => (e: PointerEvent) => {
    if (disabled || e.button !== 0) return
    e.preventDefault()
    stepBy(dir)
    stopHold()
    hold.current.timeout = window.setTimeout(() => {
      hold.current.interval = window.setInterval(() => stepBy(dir), HOLD_RATE)
    }, HOLD_DELAY)
  }

  const text = value == null ? '—' : format(value)
  return (
    <span className={cx(styles.stepper, disabled && styles.disabled, was !== undefined && styles.changed)}>
      <button
        type="button"
        tabIndex={-1}
        className={styles.stepBtn}
        aria-label={`Decrease ${label}`}
        disabled={disabled || (value != null && value <= min)}
        onPointerDown={startHold(-1)}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
      >
        −
      </button>
      <span
        role="spinbutton"
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        aria-valuenow={value ?? undefined}
        aria-valuetext={text}
        aria-valuemin={Number.isFinite(min) ? min : undefined}
        aria-valuemax={Number.isFinite(max) ? max : undefined}
        aria-disabled={disabled || undefined}
        data-nav-id={navId}
        data-autofocus={autoFocus || undefined}
        className={cx(styles.value, draft != null && styles.editing)}
        onKeyDown={onKeyDown}
        onBlur={commit}
      >
        {draft != null ? (
          <>
            {draft}
            <span className={styles.caret} />
          </>
        ) : (
          text
        )}
      </span>
      <button
        type="button"
        tabIndex={-1}
        className={styles.stepBtn}
        aria-label={`Increase ${label}`}
        disabled={disabled || (value != null && value >= max)}
        onPointerDown={startHold(1)}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
      >
        +
      </button>
      {was !== undefined && <span className={styles.was}>was {was}</span>}
    </span>
  )
}
