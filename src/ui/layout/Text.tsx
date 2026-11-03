import type { ReactNode } from 'react'
import { cx } from '../cx'
import styles from './Text.module.css'

export type TextVariant = 'display' | 'h1' | 'title' | 'body' | 'secondary' | 'small' | 'label'
export type Tone = 'default' | 'muted' | 'disabled' | 'accent' | 'good' | 'warn' | 'error'

const TAGS: Record<TextVariant, 'h1' | 'h2' | 'h3' | 'span' | 'div'> = {
  display: 'h1',
  h1: 'h1',
  title: 'h3',
  body: 'div',
  secondary: 'div',
  small: 'div',
  label: 'h2',
}

export function Text({
  variant = 'body',
  tone = 'default',
  weight,
  truncate,
  inline,
  id,
  children,
}: {
  variant?: TextVariant
  tone?: Tone
  weight?: 'medium' | 'bold'
  truncate?: boolean
  /** render as a span, e.g. inside a sentence or a row */
  inline?: boolean
  id?: string
  children: ReactNode
}) {
  const Tag = inline ? 'span' : TAGS[variant]
  return (
    <Tag
      id={id}
      className={cx(styles.text, styles[variant], styles[tone], weight && styles[weight], truncate && styles.truncate)}
      title={truncate && typeof children === 'string' ? children : undefined}
    >
      {children}
    </Tag>
  )
}

/** A key or button glyph. */
export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className={styles.kbd}>{children}</kbd>
}
