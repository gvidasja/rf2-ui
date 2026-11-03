import type { ReactNode } from 'react'
import { Chip, EmptyState } from './Card'

/** A page that is not rebuilt yet: says so, and offers a way to the stock screen when there is one. */
export function UnderConstruction({ name, plan, action }: { name: string; plan?: ReactNode; action?: ReactNode }) {
  return (
    <EmptyState title={name} action={action}>
      <Chip tone="warn">Under construction</Chip> {plan ?? 'This page is not rebuilt yet.'}
    </EmptyState>
  )
}
