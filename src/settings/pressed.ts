// The input being pressed right now, as the game's binding name ("JOY2 B5", "JOY4 RX+", "V_KEY"), read from
// the browser's gamepad and keyboard events. The game has no API for this (see PLAN.md, tech debt): device
// numbers come from matching the browser's gamepads to the game's device list by name, and button / axis
// numbers follow DirectInput order, so this is a best effort that may be off for some devices.
import { useEffect, useState } from 'react'
import type { Joystick } from '../../reference/rf2-api'

const AXES = ['X', 'Y', 'Z', 'RX', 'RY', 'RZ', 'S0', 'S1']
const AXIS_MOVED = 0.5

/** Browser gamepad index → the game's device number (JOY<n>, from 1). */
function deviceNumbers(pads: Gamepad[], joysticks: Joystick[]) {
  const norm = (s: string) => s.replace(/\s*\(.*$/, '').toLowerCase()
  const first = (s: string) => norm(s).split(/[\s-]+/)[0]
  const taken = new Set<number>()
  const map = new Map<number, number>()
  const assign = (match: (pad: string, joy: string) => boolean) => {
    for (const pad of pads) {
      if (map.has(pad.index)) continue
      const j = joysticks.findIndex((x, i) => !taken.has(i) && match(norm(pad.id), (x.name ?? '').toLowerCase()))
      if (j < 0) continue
      taken.add(j)
      map.set(pad.index, j + 1)
    }
  }
  // same name in the same order first ("FANATEC Wheel" twice), then the same first word ("vJoy …")
  assign((pad, joy) => pad === joy)
  assign((pad, joy) => first(pad) === joy.split(/[\s-]+/)[0])
  return map
}

const KEYS: Record<string, string> = {
  Space: 'SPACE', Tab: 'TAB', Backspace: 'BACKSP', Enter: 'ENTER', Escape: 'ESC', Home: 'HOME', End: 'END',
  PageUp: 'PG_UP', PageDown: 'PG_DN', Insert: 'INSERT', Delete: 'DELETE',
  ArrowUp: 'UP_ARR', ArrowDown: 'DN_ARR', ArrowLeft: 'LF_ARR', ArrowRight: 'RT_ARR',
  NumpadMultiply: 'KP_STAR', NumpadAdd: 'KP PLUS', NumpadSubtract: 'KP MNUS', NumpadDivide: 'KP SLSH',
  NumpadDecimal: 'KP DOT', NumpadEnter: 'KP ENT', Backquote: 'TILDE', BracketLeft: 'LF_BRKT', BracketRight: 'RT_BRKT',
  ControlLeft: 'LF_CTRL', ControlRight: 'RT_CTRL', ShiftLeft: 'LF_SHFT', ShiftRight: 'RT_SHFT', AltLeft: 'LF_ALT', AltRight: 'RT_ALT',
}

/** KeyboardEvent.code → the game's key name (without modifiers). */
export function keyName(code: string) {
  if (KEYS[code]) return KEYS[code]
  let m: RegExpMatchArray | null
  if ((m = code.match(/^Key([A-Z])$/))) return `${m[1]}_KEY`
  if ((m = code.match(/^Digit(\d)$/))) return `NUM_${m[1]}`
  if ((m = code.match(/^Numpad(\d)$/))) return `KP ${m[1]}`
  if (/^F\d+$/.test(code)) return code
  return undefined
}

/** Whether a binding string ("CTRL X_KEY", " JOY2 B5") is this input (keys match without modifiers). */
export function bindingIs(raw: string | undefined, input: string) {
  const b = raw?.trim()
  if (!b) return false
  if (b === input) return true
  return !input.startsWith('JOY') && b.split(' ').slice(-1)[0] === input
}

/** The game's names of every input held right now (gamepad buttons and moved axes, keys). */
export function usePressedInputs(joysticks: Joystick[] | undefined, enabled = true): string[] {
  const [pressed, setPressed] = useState<string[]>([])
  useEffect(() => {
    if (!enabled) return
    const keys = new Set<string>()
    const rest = new Map<string, number>() // axis value when first seen
    const down = (e: KeyboardEvent) => {
      const k = keyName(e.code)
      if (k) keys.add(k)
    }
    const up = (e: KeyboardEvent) => {
      const k = keyName(e.code)
      if (k) keys.delete(k)
    }
    window.addEventListener('keydown', down, true)
    window.addEventListener('keyup', up, true)
    let last = ''
    const timer = window.setInterval(() => {
      const pads = navigator.getGamepads ? (Array.from(navigator.getGamepads()).filter(Boolean) as Gamepad[]) : []
      const numbers = deviceNumbers(pads, joysticks ?? [])
      const now: string[] = [...keys]
      for (const pad of pads) {
        const n = numbers.get(pad.index)
        if (!n) continue
        pad.buttons.forEach((b, i) => b.pressed && now.push(`JOY${n} B${i + 1}`))
        pad.axes.forEach((v, i) => {
          if (!Number.isFinite(v) || !AXES[i]) return
          const id = `${pad.index}:${i}`
          if (!rest.has(id)) rest.set(id, v)
          const d = v - rest.get(id)!
          if (Math.abs(d) > AXIS_MOVED) now.push(`JOY${n} ${AXES[i]}${d > 0 ? '+' : '-'}`)
        })
      }
      const key = now.join('|')
      if (key !== last) {
        last = key
        setPressed(now)
      }
    }, 50)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('keydown', down, true)
      window.removeEventListener('keyup', up, true)
    }
  }, [joysticks, enabled])
  return pressed
}
