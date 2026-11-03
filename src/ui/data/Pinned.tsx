import type { ReactNode } from 'react'
import styles from './Pinned.module.css'

/** Stays at the top of a scrolling card body while the rest scrolls under it. */
export function Pinned({ children }: { children: ReactNode }) {
  return <div className={styles.pinned}>{children}</div>
}
