import type { KeyboardEvent } from 'react'
import { cx } from '../cx'
import styles from './Value.module.css'

/** On/off switch; the state is part of its accessible name. Enter flips it, ← off, → on. */
export function Toggle({ on, onChange, label, disabled, navId }: { on: boolean; onChange: (on: boolean) => void; label: string; disabled?: boolean; navId?: string }) {
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault()
      const next = e.key === 'ArrowRight'
      if (next !== on && !disabled) onChange(next)
    }
  }
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={`${label}: ${on ? 'on' : 'off'}`}
      disabled={disabled}
      data-nav-id={navId}
      className={cx(styles.toggle, on && styles.toggleOn)}
      onClick={() => onChange(!on)}
      onKeyDown={onKeyDown}
    />
  )
}
