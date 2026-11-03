import type { ReactNode } from 'react'
import { cx } from '../cx'
import styles from './Field.module.css'

/**
 * The building block of every settings list: label (+ note) and a control. `help` shows as a tooltip on
 * focus and hover. A disabled row stays visible and says why (`disabledReason` replaces the note).
 */
export function SettingRow({
  label,
  note,
  help,
  disabledReason,
  header,
  children,
}: {
  label: ReactNode
  note?: ReactNode
  help?: string
  /** set when the setting does not apply; the control should be disabled too */
  disabledReason?: string
  /** a section header row (e.g. a session with its count stepper) */
  header?: boolean
  children?: ReactNode
}) {
  const sub = disabledReason ?? note
  return (
    <div className={cx(styles.row, header && styles.header, disabledReason && styles.rowDisabled)}>
      <span className={styles.label}>
        {label}
        {help && <span className={styles.helpMark} aria-hidden="true">?</span>}
        {sub && <div className={styles.note}>{sub}</div>}
      </span>
      {children}
      {help && (
        <span role="tooltip" className={styles.tooltip}>
          {help}
        </span>
      )}
    </div>
  )
}
