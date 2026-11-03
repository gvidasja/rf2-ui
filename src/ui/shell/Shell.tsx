import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { cx } from '../cx'
import { GLYPHS, type HintAction } from '../input/input'
import { useAction, useDevice, useRegistrations } from '../input/hooks'
import { focusEl, focusInitial } from '../input/nav'
import { Kbd } from '../layout/Text'
import styles from './Shell.module.css'

const VIRTUAL_W = 1920
const VIRTUAL_H = 1080

/**
 * Lays the UI out on a 1920×1080 virtual canvas and scales it to the window (the game's browser has the
 * game's resolution). Wider windows get a wider canvas instead of letterboxing.
 * `transparent`: the page background is see-through (event page: the native 3D view sits behind it).
 */
export function AppRoot({ children, transparent }: { children: ReactNode; transparent?: boolean }) {
  const [size, setSize] = useState(measure)
  useLayoutEffect(() => {
    document.documentElement.style.setProperty('--c-page', transparent ? 'transparent' : 'var(--c-ground)')
  }, [transparent])
  useEffect(() => {
    const onResize = () => setSize(measure())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return (
    <div className={styles.root} style={{ zoom: size.zoom, width: size.w, height: size.h } as CSSProperties}>
      {children}
    </div>
  )
}

function measure() {
  const zoom = Math.min(window.innerWidth / VIRTUAL_W, window.innerHeight / VIRTUAL_H) || 1
  return { zoom, w: Math.floor(window.innerWidth / zoom), h: Math.floor(window.innerHeight / zoom) }
}

/**
 * Top bar (optional) + content + hint bar. `hole` leaves the native 3D monitor's rect see-through
 * (needs AppRoot transparent and a top of exactly --h-topbar + --h-subnav); `full` makes all content see-through.
 */
export function Frame({ top, children, status, hints, hole }: { top?: ReactNode; children: ReactNode; status?: ReactNode; hints?: HintAction[]; hole?: boolean | 'full' }) {
  return (
    <div className={styles.frame}>
      {top}
      <div className={cx(styles.content, hole && styles.contentWithHole)}>
        {hole === true && <div className={styles.hole} aria-hidden="true" />}
        {children}
      </div>
      <HintBar base={hints} status={status} />
    </div>
  )
}

const LABELS: Partial<Record<HintAction, string>> = { move: 'Move', select: 'Select', back: 'Back', change: 'Change' }

/**
 * Shortcuts for the current screen with the last-used device's glyphs. Built from the registered
 * actions (useAction with a label), so screens never list their hints by hand.
 */
export function HintBar({ base = ['select', 'back'], status }: { base?: HintAction[]; status?: ReactNode }) {
  const device = useDevice()
  const regs = useRegistrations()
  const seen = new Map<HintAction, string>()
  for (const a of base) seen.set(a, LABELS[a] ?? a)
  for (const r of regs) if (r.label) seen.set(r.action, r.label)
  // Back is always available (it falls back to the previous screen), keep it last like the design.
  const ordered = Array.from(seen).sort(([a], [b]) => Number(a === 'back') - Number(b === 'back'))
  return (
    <footer className={styles.hints} aria-label="Shortcuts">
      {ordered.map(([action, label]) => (
        <span key={action} className={styles.hint}>
          <Kbd>{action === 'tabPrev' ? `${GLYPHS[device].tabPrev} ${GLYPHS[device].tabNext}` : GLYPHS[device][action]}</Kbd>
          <span>{label}</span>
        </span>
      ))}
      {status && <span className={styles.status}>{status}</span>}
    </footer>
  )
}

export type Tab = { id: string; label: string }

/** Brand, area tabs (Q / E or LB / RB switch), and a right-hand slot for status, profile, Quit. */
export function TopBar({ tabs, current, onTab, children }: { tabs: Tab[]; current: string; onTab: (id: string) => void; children?: ReactNode }) {
  return (
    <header className={styles.top}>
      <span className={styles.brand}>rFactor 2</span>
      <Tabs tabs={tabs} current={current} onTab={onTab} label="Areas" />
      <span className={styles.spacer} />
      {children}
    </header>
  )
}

/** A second row of tabs under the top bar (sections of an area); Q / E stay with the area tabs. */
export function SubNav({ tabs, current, onTab, label }: { tabs: Tab[]; current: string; onTab: (id: string) => void; label: string }) {
  return (
    <div className={styles.subnav}>
      <Tabs tabs={tabs} current={current} onTab={onTab} label={label} keys={false} />
    </div>
  )
}

/** A row of tabs; Q / E (LB / RB) move to the previous / next one, wrapping around (unless `keys` is false). */
function Tabs({ tabs, current, onTab, label, keys = true }: { tabs: Tab[]; current: string; onTab: (id: string) => void; label: string; keys?: boolean }) {
  const i = Math.max(0, tabs.findIndex((t) => t.id === current))
  const n = tabs.length
  useAction('tabPrev', keys && n > 1 && (() => onTab(tabs[(i - 1 + n) % n].id)), label === 'Areas' ? 'Area' : 'Tab')
  useAction('tabNext', keys && n > 1 && (() => onTab(tabs[(i + 1) % n].id)))
  return (
    <nav className={styles.tabs} aria-label={label}>
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          className={cx(styles.tab, t.id === current && styles.tabOn)}
          aria-current={t.id === current ? 'page' : undefined}
          data-nav-id={`tab-${t.id}`}
          onClick={() => onTab(t.id)}
        >
          {t.label}
        </button>
      ))}
    </nav>
  )
}

/**
 * In a session: leave · session name and track · live stats · flag · primary action (Drive), then the
 * session's own tabs. Its height is fixed (--h-topbar + --h-subnav) so the monitor hole lines up.
 */
export function SessionBar({
  leave,
  title,
  subtitle,
  status,
  stats,
  action,
  tabs,
  current,
  onTab,
}: {
  leave: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  status?: ReactNode
  stats: { label: string; value: ReactNode }[]
  action?: ReactNode
  tabs: Tab[]
  current: string
  onTab: (id: string) => void
}) {
  return (
    <>
      <header className={styles.sessionBar}>
        {leave}
        <span className={styles.sessionTitle}>
          <strong>{title}</strong>
          {subtitle && <span className={styles.statusText}>{subtitle}</span>}
        </span>
        {status}
        <dl className={styles.sessionStats}>
          {stats.map((s) => (
            <div key={s.label} className={styles.sessionStat}>
              <dt>{s.label}</dt>
              <dd>{s.value}</dd>
            </div>
          ))}
        </dl>
        <span className={styles.spacer} />
        {action}
      </header>
      <div className={styles.subnav}>
        <Tabs tabs={tabs} current={current} onTab={onTab} label="Session" />
      </div>
    </>
  )
}

export type StatusKind = 'online' | 'connecting' | 'offline' | 'error'

/** Online / connecting / offline / error, always with a word next to the dot. */
export function StatusIndicator({ kind, children }: { kind: StatusKind; children: ReactNode }) {
  return (
    <span className={cx(styles.statusText, styles[kind])} role="status">
      <span className={styles.dot} aria-hidden="true" />
      {children}
    </span>
  )
}

/** `sub`: a second line under the label (e.g. the player name and online status under Profile). */
export type MenuItem = { id: string; label: string; sub?: ReactNode; onOpen: () => void }

/**
 * The menu rail on every menu screen: one vertical list of areas (↑ ↓ choose, Enter open), the current
 * area highlighted, its screen on the right.
 * `bottom` sits at the bottom of the list (Quit), `footer` below it (status).
 */
export function MainMenuLayout({
  items,
  bottom,
  footer,
  current,
  autoFocus,
  onHome,
  children,
}: {
  /** the logo goes to the home screen */
  onHome?: () => void
  items: MenuItem[]
  bottom?: ReactNode
  footer?: ReactNode
  /** the area shown on the right (highlighted) */
  current?: string
  /** take the screen's first focus (the home screen, where the rail is all there is) */
  autoFocus?: boolean
  children?: ReactNode
}) {
  // Q / E (LB / RB) step through the areas, like tabs
  const i = items.findIndex((m) => m.id === current)
  const n = items.length
  useAction('tabPrev', n > 1 && (() => items[(i <= 0 ? n : i) - 1].onOpen()), 'Area')
  useAction('tabNext', n > 1 && (() => items[(i + 1) % n].onOpen()))
  return (
    <div className={styles.menuLayout}>
      <nav className={styles.menu} aria-label="Main menu">
        <button type="button" className={styles.menuBrand} onClick={onHome} data-nav-id="menu-home" aria-label="Home">
          rFactor 2
        </button>
        {items.map((m, k) => (
          <button
            key={m.id}
            type="button"
            className={cx(styles.menuItem, m.id === current && styles.menuItemOn)}
            aria-current={m.id === current ? 'page' : undefined}
            data-nav-id={`menu-${m.id}`}
            data-autofocus={(autoFocus && (current ? m.id === current : k === 0)) || undefined}
            onClick={m.onOpen}
          >
            <span className={styles.menuLabel}>
              <span>{m.label}</span>
              {m.sub != null && <span className={styles.menuSub}>{m.sub}</span>}
            </span>
          </button>
        ))}
        <span className={styles.menuGap} />
        {bottom}
        {footer && <div className={styles.menuFooter}>{footer}</div>}
      </nav>
      <main className={styles.preview}>{children}</main>
    </div>
  )
}

/** A big menu-styled button for the bottom of the main menu (e.g. Quit with an inline confirm). */
export function MenuButton({ children, onClick, navId }: { children: ReactNode; onClick: () => void; navId?: string }) {
  return (
    <button type="button" className={styles.menuItem} data-nav-id={navId} onClick={onClick}>
      {children}
    </button>
  )
}

const lastFocus = new Map<string, string>()

/**
 * One route's content. Remembers the last focused element (by data-nav-id) so Back restores focus, and
 * otherwise focuses the element marked autofocus, waiting briefly for data to render.
 */
export function Screen({ id, children }: { id: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const root = ref.current!
    const onFocusIn = (e: FocusEvent) => {
      const navId = (e.target as HTMLElement).closest('[data-nav-id]')?.getAttribute('data-nav-id')
      if (navId) lastFocus.set(id, navId)
    }
    root.addEventListener('focusin', onFocusIn)
    let tries = 0
    const timer = window.setInterval(() => {
      const inside = root.contains(document.activeElement)
      if (inside || tries++ > 30) return window.clearInterval(timer)
      const saved = lastFocus.get(id)
      const target = saved ? root.querySelector<HTMLElement>(`[data-nav-id="${saved}"]`) : null
      // keep waiting for the remembered element while data loads, then fall back
      if (target) focusEl(target)
      else if (!saved || tries > 10) focusInitial(root)
    }, 50)
    return () => {
      window.clearInterval(timer)
      root.removeEventListener('focusin', onFocusIn)
    }
  }, [id])
  return (
    <div ref={ref} className={styles.screen}>
      {children}
    </div>
  )
}
