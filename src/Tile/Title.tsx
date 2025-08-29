import type { PropsWithChildren } from 'react'
import styles from './Title.module.css'

export function Title({ children }: PropsWithChildren) {
  return <div className={styles.Title}>{children}</div>
}
