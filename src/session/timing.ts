// Live timing: sectors, best marks and intervals from the standings.
// rF2 sector times are cumulative: sector 2 fields hold S1 + S2, and S3 = lap − (S1 + S2).
import type { Vehicle } from '../../reference/rf2-api'
import type { TimeMark } from '../ui'
import { lapTime } from './format'

const ok = (t: number) => t > 0
const split = (t: number) => (ok(t) ? (t < 60 ? t.toFixed(3) : lapTime(t)) : '—')

export type Sectors = [number, number, number]

/** The last completed lap's sectors (0 when unknown). */
export function lastSectors(v: Vehicle): Sectors {
  const s1 = v.lastSectorTime1
  const s12 = v.lastSectorTime2
  return [ok(s1) ? s1 : 0, ok(s12) && ok(s1) ? s12 - s1 : 0, ok(v.lastLapTime) && ok(s12) ? v.lastLapTime - s12 : 0]
}

/** Personal best S1 and S2 (best of each sector, not necessarily from the same lap). */
function bestSectors(v: Vehicle): [number, number] {
  const s1 = v.bestSectorTime1
  const s12 = v.bestSectorTime2
  return [ok(s1) ? s1 : 0, ok(s12) && ok(s1) ? s12 - s1 : 0]
}

export type SessionBests = { lap: number; s1: number; s2: number }

export function sessionBests(rows: Vehicle[]): SessionBests {
  const min = (xs: number[]) => {
    const v = xs.filter(ok)
    return v.length ? Math.min(...v) : 0
  }
  return {
    lap: min(rows.map((v) => v.bestLapTime)),
    s1: min(rows.map((v) => bestSectors(v)[0])),
    s2: min(rows.map((v) => bestSectors(v)[1])),
  }
}

// equal to the millisecond (the game rounds sector times the same way)
const same = (a: number, b: number) => ok(a) && ok(b) && Math.abs(a - b) < 0.0005

function mark(t: number, sessionBest: number, personalBest: number): TimeMark {
  if (same(t, sessionBest)) return 'sb'
  if (same(t, personalBest)) return 'pb'
  return undefined
}

export type TimingCell = { text: string; mark?: TimeMark }

export function timingRow(v: Vehicle, bests: SessionBests) {
  const [s1, s2, s3] = lastSectors(v)
  const [b1, b2] = bestSectors(v)
  return {
    s1: { text: split(s1), mark: mark(s1, bests.s1, b1) } as TimingCell,
    s2: { text: split(s2), mark: mark(s2, bests.s2, b2) } as TimingCell,
    s3: { text: split(s3) } as TimingCell,
    last: { text: lapTime(v.lastLapTime), mark: mark(v.lastLapTime, bests.lap, v.bestLapTime) } as TimingCell,
    best: { text: lapTime(v.bestLapTime), mark: same(v.bestLapTime, bests.lap) ? 'sb' : undefined } as TimingCell,
  }
}

/** Interval to the car ahead: on track in a race, by best lap otherwise. `ahead` is the previous row. */
export function interval(v: Vehicle, ahead: Vehicle | undefined, race: boolean) {
  if (!ahead) return '—'
  if (race) {
    if (v.lapsBehindNext > 0) return `+${v.lapsBehindNext} lap${v.lapsBehindNext > 1 ? 's' : ''}`
    return `+${v.timeBehindNext.toFixed(3)}`
  }
  if (!ok(v.bestLapTime) || !ok(ahead.bestLapTime)) return '—'
  return `+${(v.bestLapTime - ahead.bestLapTime).toFixed(3)}`
}
