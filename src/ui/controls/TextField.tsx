import { useRef } from 'react'
import { cx } from '../cx'
import { useAction } from '../input/hooks'
import { focusEl } from '../input/nav'
import styles from './Field.module.css'

/**
 * Single-line input. `search` binds the Search action (/ or Y) to focus it. Esc leaves the field.
 */
export function TextField({
  value,
  onChange,
  label,
  placeholder,
  type = 'text',
  search,
  invalid,
  navId,
  autoFocus,
  onEnter,
}: {
  /** Enter in the field (e.g. send a chat message) */
  onEnter?: () => void
  value: string
  onChange: (value: string) => void
  label: string
  placeholder?: string
  type?: 'text' | 'password' | 'code'
  search?: boolean
  /** message shown below; marks the field invalid */
  invalid?: string
  navId?: string
  autoFocus?: boolean
}) {
  const ref = useRef<HTMLInputElement>(null)
  useAction('search', search && (() => focusEl(ref.current)), search ? 'Search' : undefined)
  return (
    <span className={styles.field}>
      <input
        ref={ref}
        className={cx(styles.input, invalid && styles.invalid)}
        type={type === 'password' ? 'password' : search ? 'search' : 'text'}
        value={value}
        placeholder={placeholder}
        aria-label={label}
        aria-invalid={invalid ? true : undefined}
        spellCheck={false}
        autoComplete="off"
        autoCapitalize={type === 'code' ? 'characters' : undefined}
        data-nav-id={navId}
        data-autofocus={autoFocus || undefined}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={
          onEnter &&
          ((e) => {
            if (e.key !== 'Enter') return
            e.preventDefault()
            onEnter()
          })
        }
      />
      {invalid && <span className={styles.message}>{invalid}</span>}
    </span>
  )
}
