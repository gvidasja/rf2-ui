import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cx } from '../cx'
import { useAction } from '../input/hooks'
import { focusEl } from '../input/nav'
import styles from './Button.module.css'

export type ButtonProps = {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger'
  size?: 's' | 'm' | 'l'
  disabled?: boolean
  /** shows this label instead and ignores clicks (no spinner animation) */
  busy?: string | false
  /** stretch to the container width, content aligned left */
  full?: boolean
  label?: string
  navId?: string
  autoFocus?: boolean
  current?: boolean
}

/** One primary (orange) per screen; everything else neutral. */
export function Button({ children, onClick, variant = 'secondary', size = 'm', disabled, busy, full, label, navId, autoFocus, current }: ButtonProps) {
  return (
    <button
      type="button"
      className={cx(styles.button, styles[variant], size !== 'm' && styles[size], full && cx(styles.full, styles.start), busy && styles.busy)}
      disabled={disabled}
      aria-label={label}
      aria-busy={busy ? true : undefined}
      aria-current={current || undefined}
      data-nav-id={navId}
      data-autofocus={autoFocus || undefined}
      onClick={busy ? undefined : onClick}
    >
      {busy || children}
    </button>
  )
}

/**
 * The screen's primary action: an orange button also bound to S / Start (hint bar shows it).
 */
export function PrimaryButton(props: Omit<ButtonProps, 'variant'> & { hint?: string }) {
  const { onClick, disabled, busy, hint, children } = props
  useAction('primary', !disabled && !busy && onClick, hint ?? (typeof children === 'string' ? children : undefined))
  return <Button {...props} variant="primary" />
}

/**
 * A destructive action that swaps itself for "question · Cancel · confirm" in place (no dialog).
 * Focus moves to Cancel; Esc cancels.
 */
export function ConfirmButton({
  children,
  question,
  confirmLabel,
  onConfirm,
  size,
  variant = 'secondary',
  full,
}: {
  children: ReactNode
  question: string
  confirmLabel: string
  onConfirm: () => void
  size?: 's' | 'm' | 'l'
  variant?: 'secondary' | 'quiet' | 'danger'
  full?: boolean
}) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLSpanElement>(null)
  const wasOpen = useRef(open)
  useAction('back', open && (() => setOpen(false)))
  useEffect(() => {
    // move focus only on an actual open/close, not on mount (StrictMode runs effects twice)
    if (wasOpen.current === open) return
    wasOpen.current = open
    focusEl(box.current?.querySelector('button'))
  }, [open])
  if (!open) {
    return (
      <span ref={box} className={styles.confirm}>
      <Button size={size} variant={variant} full={full} onClick={() => setOpen(true)} navId="confirm-open">
        {children}
      </Button>
      </span>
    )
  }
  return (
    <span ref={box} className={styles.confirm} role="group" aria-label={question}>
      <span className={styles.question}>{question}</span>
      <Button size={size} onClick={() => setOpen(false)}>
        Cancel
      </Button>
      <Button size={size} variant="danger" onClick={onConfirm}>
        {confirmLabel}
      </Button>
    </span>
  )
}
