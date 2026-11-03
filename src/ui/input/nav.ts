// Spatial focus navigation: arrows move to the nearest focusable element in that direction.
// Components that use arrows themselves (stepper, segmented, select) call preventDefault in their own
// keydown handler, which runs before the window listener in input.ts.

export type Direction = 'up' | 'down' | 'left' | 'right'

const FOCUSABLE =
  'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** The innermost open scope (an open select list, a panel); arrows never leave it. */
export function navRoot(): HTMLElement {
  const scopes = document.querySelectorAll<HTMLElement>('[data-nav-scope]')
  return scopes.length ? scopes[scopes.length - 1] : document.body
}

export function focusables(root: HTMLElement = navRoot()): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => {
    // tabIndex -1 marks mouse-only parts (stepper −/+, segmented options)
    if (el.tabIndex < 0 || el.closest('[data-nav-skip]')) return false
    const r = el.getBoundingClientRect()
    return r.width > 0 && r.height > 0
  })
}

export function focusEl(el: HTMLElement | null | undefined): boolean {
  if (!el) return false
  el.focus({ preventScroll: true })
  el.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  return document.activeElement === el
}

/** Focus a restore target, the screen's preferred element, or the first focusable. */
export function focusInitial(root: HTMLElement, navId?: string): boolean {
  const byId = navId ? root.querySelector<HTMLElement>(`[data-nav-id="${cssEscape(navId)}"]`) : null
  return (
    (byId != null && focusEl(byId)) ||
    focusEl(root.querySelector<HTMLElement>('[data-autofocus]')) ||
    focusEl(focusables(root)[0])
  )
}

export function moveFocus(dir: Direction): boolean {
  const root = navRoot()
  const current = document.activeElement as HTMLElement | null
  const all = focusables(root)
  if (!current || current === document.body || !root.contains(current)) return focusInitial(root)

  const from = current.getBoundingClientRect()
  const cx = from.left + from.width / 2
  const cy = from.top + from.height / 2
  let best: HTMLElement | undefined
  let bestScore = Infinity

  for (const el of all) {
    if (el === current || el.contains(current) || current.contains(el)) continue
    const r = el.getBoundingClientRect()
    let main: number // distance along the direction (edge to edge)
    let cross: number // offset across it
    switch (dir) {
      case 'down':
        main = r.top - from.bottom
        cross = overlap(from.left, from.right, r.left, r.right) ? 0 : Math.abs(r.left + r.width / 2 - cx)
        break
      case 'up':
        main = from.top - r.bottom
        cross = overlap(from.left, from.right, r.left, r.right) ? 0 : Math.abs(r.left + r.width / 2 - cx)
        break
      case 'right':
        main = r.left - from.right
        cross = overlap(from.top, from.bottom, r.top, r.bottom) ? 0 : Math.abs(r.top + r.height / 2 - cy)
        break
      case 'left':
        main = from.left - r.right
        cross = overlap(from.top, from.bottom, r.top, r.bottom) ? 0 : Math.abs(r.top + r.height / 2 - cy)
        break
    }
    if (main < -2) continue // not in that direction
    const score = Math.max(main, 0) + cross * 3
    if (score < bestScore) {
      bestScore = score
      best = el
    }
  }
  return focusEl(best)
}

function overlap(a1: number, a2: number, b1: number, b2: number) {
  return Math.min(a2, b2) - Math.max(a1, b1) > 4
}

function cssEscape(s: string) {
  return s.replace(/["\\]/g, '\\$&')
}

export function isTextInput(el: Element | null): el is HTMLInputElement | HTMLTextAreaElement {
  if (!el) return false
  if (el instanceof HTMLTextAreaElement) return true
  return el instanceof HTMLInputElement && !['button', 'checkbox', 'radio', 'range'].includes(el.type)
}
