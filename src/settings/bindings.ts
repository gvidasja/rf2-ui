// Readable names for the game's input bindings ("JOY4 B2", "KP_STAR", "CTRL X_KEY", "(SHIFT) RT_BRKT").
import type { Joystick } from '../../reference/rf2-api'

export const isEmpty = (raw: string | undefined) => !raw || raw.trim() === '' || raw.trim() === '-EMPTY-'

const KEYS: Record<string, string> = {
  KP_STAR: 'Num *', 'KP PLUS': 'Num +', 'KP MNUS': 'Num −', 'KP SLSH': 'Num /', 'KP DOT': 'Num .', 'KP ENT': 'Num Enter',
  UP_ARR: '↑', DN_ARR: '↓', LF_ARR: '←', RT_ARR: '→', PG_UP: 'Page Up', PG_DN: 'Page Down', BACKSP: 'Backspace',
  SPACE: 'Space', TAB: 'Tab', HOME: 'Home', END: 'End', INSERT: 'Insert', DELETE: 'Delete', ENTER: 'Enter', ESC: 'Esc',
  TILDE: '`', LF_BRKT: '[', RT_BRKT: ']', SEMICOL: ';', APOSTR: "'", COMMA: ',', PERIOD: '.', SLASH: '/', BKSLSH: '\\',
  MINUS: '-', EQUALS: '=', RT_CTRL: 'Right Ctrl', LF_CTRL: 'Left Ctrl', RT_SHFT: 'Right Shift', LF_SHFT: 'Left Shift', RT_ALT: 'Right Alt', LF_ALT: 'Left Alt',
}

const AXES: Record<string, string> = { X: 'X axis', Y: 'Y axis', Z: 'Z axis', RX: 'X rotation', RY: 'Y rotation', RZ: 'Z rotation' }
const POV: Record<string, string> = { U: 'up', D: 'down', L: 'left', R: 'right' }

function key(k: string) {
  if (KEYS[k]) return KEYS[k]
  let m: RegExpMatchArray | null
  if ((m = k.match(/^([A-Z0-9])_KEY$/))) return m[1]
  if ((m = k.match(/^NUM_(\d)$/))) return m[1]
  if ((m = k.match(/^KP (\d)$/))) return `Num ${m[1]}`
  if (/^F\d+$/.test(k)) return k
  return k.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase())
}

/** "JOY4 B2" → "<device 4> · Button 2"; devices are numbered from 1 in the joystick list. */
export function formatBinding(raw: string | undefined, joysticks?: Joystick[]) {
  if (isEmpty(raw)) return ''
  const s = raw!.trim()
  const joy = s.match(/^JOY(\d+) (.+)$/)
  if (joy) {
    const device = joysticks?.[Number(joy[1]) - 1]?.name ?? `Controller ${joy[1]}`
    const input = joy[2]
    let m: RegExpMatchArray | null
    let what = input
    if ((m = input.match(/^B(\d+)$/))) what = `Button ${m[1]}`
    else if ((m = input.match(/^P(\d+)([UDLR])$/))) what = `D-pad ${POV[m[2]]}`
    else if ((m = input.match(/^(R?[XYZ])([+-])$/))) what = `${AXES[m[1]]} ${m[2] === '+' ? '+' : '−'}`
    else if ((m = input.match(/^S(\d+)([+-])$/))) what = `Slider ${Number(m[1]) + 1} ${m[2] === '+' ? '+' : '−'}`
    return `${device} · ${what}`
  }
  // keyboard, with modifiers: "CTRL X_KEY", "CTRL/ALT T_KEY", "(SHIFT) RT_BRKT"
  const mods: string[] = []
  let rest = s
  const m = rest.match(/^\(?((?:CTRL|ALT|SHIFT)(?:\/(?:CTRL|ALT|SHIFT))*)\)? (.+)$/)
  if (m) {
    mods.push(...m[1].split('/').map((x) => x.charAt(0) + x.slice(1).toLowerCase()))
    rest = m[2]
  }
  return [...mods, key(rest)].join(' + ')
}

/** Bindings used by more than one control: binding → control keys. */
export function conflicts(assigned: Record<string, string | undefined>, keys: string[]) {
  const by = new Map<string, string[]>()
  for (const k of keys) {
    const raw = assigned[k]
    if (isEmpty(raw)) continue
    const b = raw!.trim()
    by.set(b, [...(by.get(b) ?? []), k])
  }
  return new Map([...by].filter(([, ks]) => ks.length > 1))
}
