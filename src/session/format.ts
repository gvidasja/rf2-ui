import type { SessionInfo, Sessions, Vehicle } from '../../reference/rf2-api'
import type { ChipTone } from '../ui'

/** 108.761 → "1:48.761"; unset (≤ 0) → "—" */
export function lapTime(s: number | undefined) {
  if (s == null || s <= 0) return '—'
  const m = Math.floor(s / 60)
  const rest = (s - m * 60).toFixed(3).padStart(6, '0')
  return m ? `${m}:${rest}` : rest
}

/** seconds → "1:53:03" or "53:03" */
export function clock(s: number | undefined) {
  if (s == null || !Number.isFinite(s) || s < 0) return '—'
  const t = Math.floor(s)
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  const sec = String(t % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

export function sessionName(s: Sessions | undefined) {
  if (!s || s === 'INVALID') return 'Session'
  if (s === 'TESTDAY') return 'Test day'
  if (s === 'WARMUP') return 'Warm-up'
  const m = s.match(/^(PRACTICE|QUALIFY|RACE)(\d)$/)
  if (!m) return s
  const name = { PRACTICE: 'Practice', QUALIFY: 'Qualifying', RACE: 'Race' }[m[1]]
  return `${name} ${m[2]}`
}

export const isRace = (s: Sessions | undefined) => !!s && s.startsWith('RACE')

export function timeLeft(info: SessionInfo | undefined) {
  if (!info) return '—'
  if (info.maximumLaps > 0 && info.maximumLaps < 100000 && info.endEventTime <= 0) return `${info.maximumLaps} laps`
  return clock(info.endEventTime - info.currentEventTime)
}

/** gamePhase (rF2 internals): 0 before session, 1 recon, 2 grid walk, 3 formation, 4 countdown, 5 green,
 *  6 full course yellow, 7 stopped, 8 session over, 9 paused. */
export function phase(info: SessionInfo | undefined): { label: string; tone: ChipTone } {
  const p = info?.gamePhase
  if (info?.yellowFlagState && info.yellowFlagState !== 'NONE' && p === 6) return { label: 'Full course yellow', tone: 'warn' }
  switch (p) {
    case 0:
      return { label: 'Not started', tone: 'neutral' }
    case 1:
    case 2:
      return { label: 'Pre-session', tone: 'neutral' }
    case 3:
      return { label: 'Formation', tone: 'warn' }
    case 4:
      return { label: 'Countdown', tone: 'warn' }
    case 5:
      return { label: 'Green', tone: 'good' }
    case 6:
      return { label: 'Yellow', tone: 'warn' }
    case 7:
      return { label: 'Stopped', tone: 'danger' }
    case 8:
      return { label: 'Finished', tone: 'info' }
    case 9:
      return { label: 'Paused', tone: 'neutral' }
    default:
      return { label: '—', tone: 'neutral' }
  }
}

export const sessionOver = (info: SessionInfo | undefined) => info?.gamePhase === 8

/** Gap column: to the leader in a race, to the fastest lap otherwise. */
export function gap(v: Vehicle, race: boolean, fastest: number) {
  if (race) {
    if (v.position === 1) return 'Leader'
    if (v.lapsBehindLeader > 0) return `+${v.lapsBehindLeader} lap${v.lapsBehindLeader > 1 ? 's' : ''}`
    return `+${v.timeBehindLeader.toFixed(3)}`
  }
  if (v.bestLapTime <= 0 || fastest <= 0) return '—'
  return v.bestLapTime === fastest ? 'Fastest' : `+${(v.bestLapTime - fastest).toFixed(3)}`
}

export function where(v: Vehicle) {
  if (v.inGarageStall) return 'Garage'
  if (v.pitting || v.pitState === 'ENTERING' || v.pitState === 'STOPPED' || v.pitState === 'EXITING') return 'Pits'
  if (v.finishStatus === 'FSTAT_FINISHED') return 'Finished'
  if (v.finishStatus === 'FSTAT_DNF') return 'Retired'
  if (v.finishStatus === 'FSTAT_DQ') return 'Disqualified'
  return 'Track'
}

export function fastestLap(list: Vehicle[] | undefined) {
  const laps = (list ?? []).map((v) => v.bestLapTime).filter((t) => t > 0)
  return laps.length ? Math.min(...laps) : 0
}
