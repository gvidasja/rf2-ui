import type { CSSProperties, ReactNode } from 'react'
import { cx } from '../cx'
import styles from './Layout.module.css'

/** Spacing step on the token scale (--sp-1 … --sp-9). */
export type Space = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

const space = (s: Space) => (s === 0 ? '0' : `var(--sp-${s})`)

type Align = 'start' | 'center' | 'end' | 'stretch' | 'baseline'
const flexAlign = (a?: Align) => (a === 'start' ? 'flex-start' : a === 'end' ? 'flex-end' : a)

type BoxProps = {
  children?: ReactNode
  gap?: Space
  /** padding: one step, or [vertical, horizontal] */
  pad?: Space | [Space, Space]
  /** take the remaining space of the parent stack */
  grow?: boolean
  scroll?: boolean
  fill?: boolean
  as?: 'div' | 'section' | 'main' | 'nav' | 'aside' | 'header' | 'footer'
  label?: string
}

function boxStyle({ gap = 0, pad }: BoxProps): CSSProperties {
  const style: CSSProperties & Record<string, string> = { '--gap': space(gap) }
  if (pad !== undefined) style.padding = Array.isArray(pad) ? `${space(pad[0])} ${space(pad[1])}` : space(pad)
  return style
}

/** Children in a column (or a row with `row`), spaced by `gap`. */
export function Stack(
  props: BoxProps & { row?: boolean; align?: Align; justify?: 'start' | 'center' | 'end' | 'between'; wrap?: boolean },
) {
  const { row, align, justify, wrap, grow, scroll, fill, as: Tag = 'div', label, children } = props
  return (
    <Tag
      aria-label={label}
      className={cx(styles.stack, row ? styles.h : styles.v, wrap && styles.wrap, grow && styles.grow, scroll && styles.scroll, fill && styles.fill)}
      style={{
        ...boxStyle(props),
        alignItems: flexAlign(align ?? (row ? 'center' : 'stretch')),
        justifyContent: justify === 'between' ? 'space-between' : flexAlign(justify),
      }}
    >
      {children}
    </Tag>
  )
}

/** CSS grid. `columns` is a grid template, e.g. "540px 1fr 560px" or a repeat count. */
export function Grid(props: BoxProps & { columns: string | number; rows?: string; align?: Align }) {
  const { columns, rows, align, grow, scroll, fill, as: Tag = 'div', label, children, gap = 0 } = props
  return (
    <Tag
      aria-label={label}
      className={cx(styles.grid, grow && styles.grow, scroll && styles.scroll, fill && styles.fill)}
      style={{
        ...boxStyle(props),
        gridGap: space(gap),
        gridTemplateColumns: typeof columns === 'number' ? `repeat(${columns}, minmax(0, 1fr))` : columns,
        gridTemplateRows: rows,
        alignItems: align,
      }}
    >
      {children}
    </Tag>
  )
}

/** Pushes the following siblings of a row to the far end. */
export function Spacer() {
  return <span className={styles.spacer} />
}
