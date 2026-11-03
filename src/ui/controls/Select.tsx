import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { cx } from '../cx'
import { useAction } from '../input/hooks'
import { focusEl } from '../input/nav'
import type { Option } from './Segmented'
import styles from './Value.module.css'

/**
 * A dropdown with − / + beside it to click through the values (they stop at the ends). ← → do the same
 * from the keyboard without opening; Enter opens the list in place (↑ ↓, type-ahead, Enter chooses, Esc closes).
 */
export function Select<T extends string | number>({
  options,
  value,
  onChange,
  label,
  disabled,
  navId,
  placeholder = '—',
}: {
  options: Option<T>[]
  value: T | undefined
  onChange: (value: T) => void
  label: string
  disabled?: boolean
  navId?: string
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [up, setUp] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const typed = useRef({ text: '', at: 0 })
  const index = options.findIndex((o) => o.value === value)

  const close = (refocus = true) => {
    setOpen(false)
    if (refocus) focusEl(button.current)
  }
  useAction('back', open && (() => close()))

  // Open upwards when the list would run past the bottom of its scroll container (or the window).
  useLayoutEffect(() => {
    if (!open || !list.current || !button.current) return setUp(false)
    let clip: HTMLElement | null = button.current.parentElement
    while (clip && getComputedStyle(clip).overflowY === 'visible') clip = clip.parentElement
    const bottom = (clip ?? document.documentElement).getBoundingClientRect().bottom
    const b = button.current.getBoundingClientRect()
    setUp(b.bottom + list.current.offsetHeight > bottom && b.top - list.current.offsetHeight > 0)
  }, [open])

  useEffect(() => {
    if (!open) return
    focusEl(list.current?.querySelector<HTMLElement>('[aria-selected="true"]') ?? list.current?.querySelector<HTMLElement>('button'))
  }, [open])

  const choose = (o: Option<T>) => {
    if (o.disabled) return
    onChange(o.value)
    close()
  }

  // the next enabled option in a direction, or undefined at the end
  const neighbour = (dir: number) => {
    for (let i = index + dir; i >= 0 && i < options.length; i += dir) if (!options[i].disabled) return options[i]
    return undefined
  }
  const step = (dir: number) => {
    const o = neighbour(dir)
    if (o) onChange(o.value)
  }

  const onButtonKey = (e: KeyboardEvent) => {
    if (disabled || open) return
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault()
      step(e.key === 'ArrowLeft' ? -1 : 1)
    }
  }

  const onListKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault() // stay in the list
      return
    }
    if (e.key.length === 1 && /\S/.test(e.key)) {
      const now = Date.now()
      typed.current = { text: (now - typed.current.at < 800 ? typed.current.text : '') + e.key.toLowerCase(), at: now }
      const items = Array.from(list.current?.querySelectorAll<HTMLElement>('button') ?? [])
      const hit = items.find((b) => (b.textContent ?? '').toLowerCase().startsWith(typed.current.text))
      e.preventDefault() // letters must not reach global shortcuts while the list is open
      if (hit) focusEl(hit)
    }
  }

  const current = index >= 0 ? options[index].label : placeholder
  return (
    <span className={cx(styles.select, disabled && styles.disabled)}>
      {/* mouse only: ← → do this from the keyboard */}
      <button type="button" className={styles.stepBtn} tabIndex={-1} aria-label={`Previous ${label}`} disabled={disabled || !neighbour(-1)} onClick={() => step(-1)}>
        −
      </button>
      <button
        ref={button}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label}: ${current}`}
        disabled={disabled}
        data-nav-id={navId}
        className={styles.selectBtn}
        onClick={() => setOpen(!open)}
        onKeyDown={onButtonKey}
      >
        {current}
      </button>
      <button type="button" className={styles.stepBtn} tabIndex={-1} aria-label={`Next ${label}`} disabled={disabled || !neighbour(1)} onClick={() => step(1)}>
        +
      </button>
      {open && (
        <div
          ref={list}
          role="listbox"
          aria-label={label}
          data-nav-scope
          className={cx(styles.listbox, up && styles.listboxUp)}
          onKeyDown={onListKey}
          onBlur={(e) => {
            if (!list.current?.contains(e.relatedTarget as Node)) close(false)
          }}
        >
          {options.map((o) => (
            <button
              key={String(o.value)}
              type="button"
              role="option"
              aria-selected={o.value === value}
              disabled={o.disabled}
              className={cx(styles.option, o.value === value && styles.optionOn)}
              onClick={() => choose(o)}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </span>
  )
}
