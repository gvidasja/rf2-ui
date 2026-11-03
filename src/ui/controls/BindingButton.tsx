import { cx } from '../cx'
import styles from './BindingButton.module.css'

/** The input bound to an action; pressing it starts listening for a new one. */
export function BindingButton({
  binding,
  listening,
  conflict,
  onPress,
  label,
  navId,
}: {
  binding: string
  /** prompt shown while waiting for the player's input */
  listening?: string | false
  /** why the binding is a problem, e.g. "also Wipers" */
  conflict?: string
  onPress: () => void
  label: string
  navId?: string
}) {
  const empty = !binding
  return (
    <button
      type="button"
      className={cx(styles.binding, empty && styles.empty, listening && styles.listening, !listening && conflict && styles.conflict)}
      aria-label={`${label}: ${listening || binding || 'not set'}${conflict ? `, ${conflict}` : ''}`}
      data-nav-id={navId}
      onClick={listening ? undefined : onPress}
    >
      {listening || (empty ? '— not set' : binding)}
      {!listening && conflict && <span className={styles.note}>{conflict}</span>}
    </button>
  )
}
