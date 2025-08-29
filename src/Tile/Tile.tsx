import c from 'classnames'
import type { DetailedHTMLProps, HTMLAttributes, PropsWithChildren } from 'react'
import styles from './Tile.module.css'

export function Tile({
  row,
  col,
  className,
  style = {},
  children,
  clickable = false,
  ...props
}: DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement> &
  PropsWithChildren<{
    row?: string
    col?: string
    clickable?: boolean
  }>) {
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
