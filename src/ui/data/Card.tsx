import { useId, type ReactNode } from 'react'
import { cx } from '../cx'
import { Text } from '../layout/Text'
import styles from './Data.module.css'

/**
 * A surface with a caps title and an optional action on the right. The card itself is not focusable.
 * `scroll` lets the body scroll on its own; `pad` adds inner padding for free content.
 */
export function Card({
  title,
  action,
  children,
  grow,
  scroll,
  pad,
}: {
  title?: ReactNode
  action?: ReactNode
  children?: ReactNode
  grow?: boolean
  scroll?: boolean
  pad?: boolean
}) {
  const id = useId()
  return (
    <section className={cx(styles.card, grow && styles.cardGrow)} aria-labelledby={title ? id : undefined}>
      {(title || action) && (
        <div className={styles.cardHead}>
          {title && (
            <Text variant="label" id={id}>
              {title}
            </Text>
          )}
          {action}
        </div>
      )}
      <div className={cx(styles.cardBody, scroll && styles.cardScroll, pad && styles.cardPad)}>{children}</div>
    </section>
  )
}

export type ChipTone = 'neutral' | 'good' | 'warn' | 'info' | 'danger' | 'accent'

/** Short status; always a word or symbol, never colour alone. Not focusable. */
export function Chip({ tone = 'neutral', children }: { tone?: ChipTone; children: ReactNode }) {
  return <span className={cx(styles.chip, styles[tone])}>{children}</span>
}

/** Label over value pairs, laid out in `columns`. */
export function Stats({ items, columns = 2, large }: { items: { label: string; value: ReactNode }[]; columns?: number; large?: boolean }) {
  return (
    <dl className={styles.stats} style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {items.map((i) => (
        <div key={i.label} className={cx(styles.stat, large && styles.statLarge)}>
          <dt>{i.label}</dt>
          <dd>{i.value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Determinate progress; the percentage is always shown as text too. */
export function Progress({ label, value, detail }: { label: string; value: number; detail?: ReactNode }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div className={styles.progress} role="progressbar" aria-label={label} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className={styles.progressHead}>
        <span>{label}</span>
        <span>{pct} %</span>
      </div>
      <div className={styles.track}>
        <div className={styles.bar} style={{ width: `${pct}%` }} />
      </div>
      {detail && <Text variant="secondary" tone="muted">{detail}</Text>}
    </div>
  )
}

/** In place of content: what happened, and the next step as an action. */
export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className={styles.empty}>
      <Text variant="title">{title}</Text>
      {children && <Text tone="muted">{children}</Text>}
      {action}
    </div>
  )
}

/** An image with a fixed height; shows `label` until (or instead of when failing) it loads. */
export function Media({ src, label, height, cover }: { src?: string; label: string; height: number | string; cover?: boolean }) {
  return (
    <div className={cx(styles.media, cover && styles.mediaCover)} style={{ height }}>
      <span className={styles.mediaLabel}>{label}</span>
      {src && (
        <img
          key={src}
          src={src}
          alt={label}
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
      )}
    </div>
  )
}
