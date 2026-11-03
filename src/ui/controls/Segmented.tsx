import type { KeyboardEvent } from 'react'
import { cx } from '../cx'
import styles from './Value.module.css'

export type Option<T> = { value: T; label: string; disabled?: boolean; danger?: boolean }

/** Up to ~5 mutually exclusive options, all visible. One focus stop; ← → change the selection at once. */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
  disabled,
  navId,
  autoFocus,
}: {
  options: Option<T>[]
  value: T | undefined
  onChange: (value: T) => void
  label: string
  disabled?: boolean
  navId?: string
  autoFocus?: boolean
}) {
  const index = options.findIndex((o) => o.value === value)
  const move = (dir: number) => {
    for (let i = index + dir; i >= 0 && i < options.length; i += dir) {
      if (!options[i].disabled) return onChange(options[i].value)
    }
  }
  const onKeyDown = (e: KeyboardEvent) => {
    if (disabled) return
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault()
      move(e.key === 'ArrowLeft' ? -1 : 1)
    }
  }
  return (
    <span
      role="radiogroup"
      aria-label={label}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      data-nav-id={navId}
      data-autofocus={autoFocus || undefined}
      className={cx(styles.seg, disabled && styles.disabled)}
      onKeyDown={onKeyDown}
    >
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={-1}
            disabled={disabled || o.disabled}
            className={cx(styles.segOpt, on && (o.danger ? styles.segDanger : styles.segOn))}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        )
      })}
    </span>
  )
}
