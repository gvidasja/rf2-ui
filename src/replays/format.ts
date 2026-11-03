// What a replay's file name says: "<track> <session><n>[ <copy>| HOT LAP]", e.g. "Belgium R1 2".
import type { Replay } from '../../reference/rf2-api'

export type ReplayKind = 'race' | 'qualifying' | 'practice' | 'warmup' | 'hotlap' | 'other'

const SESSIONS: Record<string, [string, ReplayKind]> = { P: ['Practice', 'practice'], Q: ['Qualifying', 'qualifying'], R: ['Race', 'race'], W: ['Warm-up', 'warmup'] }

export function parseReplay(r: Replay) {
  const name = r.replayName ?? ''
  const m = name.match(/^(.*) ([PQRW])(\d+)(?: (HOT LAP|\d+))?$/)
  if (!m) return { track: name, session: '—', kind: 'other' as ReplayKind }
  const [label, kind] = SESSIONS[m[2]]
  const hot = m[4] === 'HOT LAP'
  return { track: m[1], session: hot ? `${label} ${m[3]} · hot lap` : `${label} ${m[3]}`, kind: hot ? ('hotlap' as ReplayKind) : kind }
}

export function replayDate(seconds: number, now = new Date()) {
  const d = new Date(seconds * 1000)
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const that = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  if (that === day) return `Today ${time}`
  if (day - that === 86_400_000) return `Yesterday ${time}`
  const date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric' })
  return `${date} ${time}`
}

export function fileSize(bytes: number) {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`
  if (bytes >= 1e6) return `${Math.round(bytes / 1e6)} MB`
  return `${Math.max(1, Math.round(bytes / 1e3))} KB`
}
