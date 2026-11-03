// Keyboard, gamepad and wheel-button input, mapped to the same actions (see the "Keyboard & controller"
// design board). Navigation keys (arrows, Enter, Esc) go through the DOM so components handle them the
// same way for every device; the other actions go to handlers registered with useAction.
import { focusEl, focusInitial, isTextInput, moveFocus, navRoot, type Direction } from './nav'

export type Action =
  | 'back'
  | 'primary'
  | 'tabPrev'
  | 'tabNext'
  | 'search'
  | 'secondary'
  | 'help'
  | 'notifications'
  | 'hideUi'
  | 'pageUp'
  | 'pageDown'

/** Hint-only pseudo actions, always handled by the focus engine itself. */
export type HintAction = Action | 'move' | 'select' | 'change'

export type Device = 'keyboard' | 'gamepad'

type Registration = { id: number; action: Action; label?: string; run: () => void }

const KEYS: Record<string, Action> = {
  s: 'primary',
  q: 'tabPrev',
  e: 'tabNext',
  '/': 'search',
  Delete: 'secondary',
  F1: 'help',
  n: 'notifications',
  h: 'hideUi',
  PageUp: 'pageUp',
  PageDown: 'pageDown',
}

// Standard gamepad mapping.
const PAD_ACTIONS: Record<number, Action> = {
  2: 'secondary', // X
  3: 'search', // Y
  4: 'tabPrev', // LB
  5: 'tabNext', // RB
  6: 'pageUp', // LT
  7: 'pageDown', // RT
  8: 'help', // View
  9: 'primary', // Start / Menu
  11: 'hideUi', // R3
}
const PAD_KEYS: Record<number, string> = { 0: 'Enter', 1: 'Escape', 12: 'ArrowUp', 13: 'ArrowDown', 14: 'ArrowLeft', 15: 'ArrowRight' }
const REPEATING = new Set([12, 13, 14, 15])
const REPEAT_DELAY = 350
const REPEAT_RATE = 70
const STICK = 0.6

export const GLYPHS: Record<Device, Record<HintAction, string>> = {
  keyboard: {
    move: '↑ ↓ ← →',
    select: 'Enter',
    back: 'Esc',
    change: '← →',
    primary: 'S',
    tabPrev: 'Q',
    tabNext: 'E',
    search: '/',
    secondary: 'Del',
    help: 'F1',
    notifications: 'N',
    hideUi: 'H',
    pageUp: 'PgUp',
    pageDown: 'PgDn',
  },
  gamepad: {
    move: 'D-pad',
    select: 'A',
    back: 'B',
    change: '◀ ▶',
    primary: 'Start',
    tabPrev: 'LB',
    tabNext: 'RB',
    search: 'Y',
    secondary: 'X',
    help: 'View',
    notifications: '—',
    hideUi: 'R3',
    pageUp: 'LT',
    pageDown: 'RT',
  },
}

// ---- registry ---------------------------------------------------------------------------------

let nextId = 1
let registrations: Registration[] = []
const listeners = new Set<() => void>()
let device: Device = 'keyboard'

function emit() {
  listeners.forEach((l) => l())
}

export function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function register(action: Action, run: () => void, label?: string) {
  const reg = { id: nextId++, action, run, label }
  registrations = [...registrations, reg]
  emit()
  return {
    update(run: () => void, label?: string) {
      reg.run = run
      if (reg.label !== label) {
        reg.label = label
        registrations = [...registrations]
        emit()
      }
    },
    remove() {
      registrations = registrations.filter((r) => r !== reg)
      emit()
    },
  }
}

export function getRegistrations() {
  return registrations
}

export function getDevice() {
  return device
}

function setDevice(d: Device) {
  if (d !== device) {
    device = d
    emit()
  }
}

/** Runs the most recently registered handler for an action. Returns false if there is none. */
export function trigger(action: Action): boolean {
  for (let i = registrations.length - 1; i >= 0; i--) {
    if (registrations[i].action === action) {
      registrations[i].run()
      return true
    }
  }
  return false
}

// ---- keyboard ---------------------------------------------------------------------------------

const ARROWS: Record<string, Direction> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }

// While the game listens for a control assignment, every key and button belongs to the game.
let suspended = false
export function suspendInput(on: boolean) {
  suspended = on
}

function onKeyDown(e: KeyboardEvent) {
  if (suspended) {
    e.preventDefault()
    return
  }
  if (e.isTrusted) setDevice('keyboard')
  if (e.defaultPrevented) return
  const target = document.activeElement as HTMLElement | null
  const typing = isTextInput(target)

  const dir = ARROWS[e.key]
  if (dir) {
    // Left/right move the caret inside a text field.
    if (typing && (dir === 'left' || dir === 'right')) return
    e.preventDefault()
    moveFocus(dir)
    return
  }

  if (e.key === 'Escape' || (e.key === 'Backspace' && !typing)) {
    e.preventDefault()
    if (typing && e.key === 'Escape') {
      // first Esc leaves the field, like closing an on-screen keyboard
      target!.blur()
      focusEl(target)
      if (target!.closest('[data-nav-scope]') == null) {
        trigger('back')
      }
      return
    }
    trigger('back')
    return
  }

  if ((e.key === 'Enter' || e.key === ' ') && target && !typing) {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault()
      trigger('primary')
      return
    }
    // Native buttons and links activate themselves on trusted key presses.
    const native = target instanceof HTMLButtonElement || target instanceof HTMLAnchorElement
    if (!native || !e.isTrusted) {
      e.preventDefault()
      target.click()
    }
    return
  }

  if (typing || e.altKey || e.metaKey || (e.ctrlKey && e.key !== 'Enter')) return
  const action = KEYS[e.key] ?? KEYS[e.key.toLowerCase()]
  if (action && trigger(action)) e.preventDefault()
}

// ---- gamepad ----------------------------------------------------------------------------------

/** `armed`: seen released at least once; an input held when first seen (an axis resting at full) never fires. */
type PadState = { pressed: boolean; since: number; last: number; armed: boolean }
const pad = new Map<number, PadState>()

function pollGamepads(now: number) {
  const pads = navigator.getGamepads ? Array.from(navigator.getGamepads()) : []
  const merged = new Map<number, boolean>()
  for (const gp of pads) {
    // Only controllers with the standard (Xbox-style) layout: wheels, pedals and vJoy report their own
    // layouts, where button and axis numbers mean something else (a pedal at rest reads as "stick down").
    if (!gp || gp.mapping !== 'standard') continue
    gp.buttons.forEach((b, i) => merged.set(i, (merged.get(i) ?? false) || b.pressed))
    const [x = 0, y = 0] = gp.axes
    if (y < -STICK) merged.set(12, true)
    if (y > STICK) merged.set(13, true)
    if (x < -STICK) merged.set(14, true)
    if (x > STICK) merged.set(15, true)
  }
  merged.forEach((pressed, i) => {
    const s = pad.get(i) ?? { pressed, since: now, last: now, armed: !pressed }
    if (!pressed) s.armed = true
    if (!s.armed) {
      s.pressed = pressed
      pad.set(i, s)
      return
    }
    if (pressed && !s.pressed) {
      s.since = s.last = now
      if (!suspended) press(i)
    } else if (!suspended && pressed && REPEATING.has(i) && now - s.since > REPEAT_DELAY && now - s.last > REPEAT_RATE) {
      s.last = now
      press(i)
    }
    s.pressed = pressed
    pad.set(i, s)
  })
  requestAnimationFrame(pollGamepads)
}

function press(button: number) {
  setDevice('gamepad')
  const key = PAD_KEYS[button]
  if (key) {
    const target = (document.activeElement as HTMLElement | null) ?? document.body
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
    return
  }
  const action = PAD_ACTIONS[button]
  if (action) trigger(action)
}

// ---- setup ------------------------------------------------------------------------------------

let installed = false

export function installInput() {
  if (installed) return
  installed = true
  window.addEventListener('keydown', onKeyDown)
  // Keep something focused at all times (rule 1): clicking empty space must not drop focus to <body>.
  window.addEventListener('mousedown', (e) => {
    if (e.target instanceof HTMLElement && !e.target.closest('button, a, input, textarea, [tabindex]')) e.preventDefault()
  })
  window.addEventListener('focusout', () => {
    requestAnimationFrame(() => {
      if (document.activeElement === document.body) focusInitial(navRoot())
    })
  })
  requestAnimationFrame(pollGamepads)
}
