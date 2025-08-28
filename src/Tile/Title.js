import styles from './Title.module.css'

export function Title({ children, ...props }) {
  return (
    <div {...props} className={styles.Title}>
      {children}
    </div>
  )
}
