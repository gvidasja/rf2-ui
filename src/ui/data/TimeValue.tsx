import { cx } from '../cx'
import styles from './TimeValue.module.css'

export type TimeMark = 'sb' | 'pb' | undefined

/** A timing value; session best (purple) and personal best (green) also carry an SB / PB tag. */
export function TimeValue({ children, mark }: { children: string; mark?: TimeMark }) {
  return (
    <span className={cx(mark && styles[mark])}>
      {children}
      {mark && <span className={styles.tag}>{mark.toUpperCase()}</span>}
    </span>
  )
}
