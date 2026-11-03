import { cx } from '../cx'
import styles from './FilterChip.module.css'

/** An on/off filter, shown as a pill. */
export function FilterChip({ on, onChange, children, navId }: { on: boolean; onChange: (on: boolean) => void; children: string; navId?: string }) {
  return (
    <button type="button" className={cx(styles.chip, on && styles.on)} aria-pressed={on} data-nav-id={navId} onClick={() => onChange(!on)}>
      {children}
    </button>
  )
}
