import c from 'classnames'
import styles from './Tile.module.css'

export function Tile({ row, col, className, style = {}, children, clickable = false, ...props }) {
  return (
    <div
      {...props}
      className={c(className, styles.Tile, { [styles.Clickable]: clickable })}
      style={{ ...style, gridRow: row, gridColumn: col }}
    >
      {children}
    </div>
  )
}
