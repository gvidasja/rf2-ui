import type { ReactNode } from 'react'
import { cx } from '../cx'
import styles from './List.module.css'

export type ListItem = {
  id: string
  label: ReactNode
  /** trailing text, e.g. a count or team */
  meta?: ReactNode
  /** trailing chip */
  chip?: ReactNode
  disabled?: boolean
}

export type ListGroup = { title?: string; items: ListItem[] }

/**
 * Rows with one selected item, optionally grouped. Each row is a focus stop (↑ ↓ move); `onFocusItem`
 * previews, Enter/click chooses. Row nav ids are `${navPrefix}${id}` so focus is restored on Back.
 */
export function SelectableList({
  groups,
  selectedId,
  onChoose,
  onFocusItem,
  label,
  navPrefix = '',
  autoFocus = true,
}: {
  groups: ListGroup[]
  selectedId?: string
  onChoose: (id: string) => void
  onFocusItem?: (id: string) => void
  label: string
  navPrefix?: string
  /** the selected row is where the screen opens (off for filter lists) */
  autoFocus?: boolean
}) {
  return (
    <div className={styles.list} role="listbox" aria-label={label}>
      {groups.map((g, gi) => (
        <div key={g.title ?? gi} role="group" aria-label={g.title}>
          {g.title && <div className={styles.group}>{g.title}</div>}
          {g.items.map((i) => {
            const selected = i.id === selectedId
            return (
              <button
                key={i.id}
                type="button"
                role="option"
                aria-selected={selected}
                disabled={i.disabled}
                data-nav-id={navPrefix + i.id}
                data-autofocus={(autoFocus && selected) || undefined}
                className={cx(styles.item, selected && styles.selected)}
                onClick={() => onChoose(i.id)}
                onFocus={onFocusItem && (() => onFocusItem(i.id))}
              >
                <span className={styles.itemLabel}>{i.label}</span>
                {i.meta != null && <span className={styles.meta}>{i.meta}</span>}
                {i.chip}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}

export type Column<T> = {
  key: string
  header: string
  render: (row: T) => ReactNode
  numeric?: boolean
  muted?: boolean
  width?: string
}

/**
 * Tabular data with hairline rows; the player's row is tinted. Rows are focus stops only when they
 * have an action.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  isYou,
  onRow,
  label,
}: {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  isYou?: (row: T) => boolean
  onRow?: (row: T) => void
  label: string
}) {
  return (
    <table className={styles.table} aria-label={label}>
      <colgroup>
        {columns.map((c) => (
          <col key={c.key} style={c.width ? { width: c.width } : undefined} />
        ))}
      </colgroup>
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c.key} className={cx(c.numeric && styles.num)}>
              {c.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const key = rowKey(r)
          return (
            <tr
              key={key}
              tabIndex={onRow ? 0 : undefined}
              data-nav-id={onRow ? `row-${key}` : undefined}
              className={cx(onRow && styles.rowAction, isYou?.(r) && styles.you)}
              onClick={onRow && (() => onRow(r))}
            >
              {columns.map((c) => (
                <td key={c.key} className={cx(c.numeric && styles.num, c.muted && styles.muted)}>
                  {c.render(r)}
                </td>
              ))}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
