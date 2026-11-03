// Mock of a running practice session: the AI drive laps around the sample track map (4× real time) with
// varied lap and sector times, so timing and the track map can be developed without the game. The
// player stays in the garage; the last AI sits in the pit lane.
type Vehicle = Record<string, unknown> & { player?: boolean; slotID: number }
type Waypoint = { type: number; x: number; y: number; z: number }

const START = Date.now()
const SPEED = 4
const SPLIT = [0.3, 0.38, 0.32]

// deterministic noise in [0, 1)
const noise = (a: number, b: number) => {
  const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453
  return s - Math.floor(s)
}

export function liveStandings(base: Vehicle[], map: Waypoint[]): Vehicle[] {
  const line = map.filter((w) => w.type === 0)
  const t = ((Date.now() - START) / 1000) * SPEED + 400
  const out = base.map((v, i) => {
    if (v.player) return v
    const pace = 108 + i * 0.35
    const pitted = i === base.length - 1
    // completed laps and their sectors
    const laps: number[][] = []
    let elapsed = i * 3
    for (;;) {
      const lap = pace + noise(i, laps.length) * 1.4
      if (elapsed + lap > t) break
      elapsed += lap
      laps.push(SPLIT.map((p, k) => lap * p + (noise(i * 7 + k, laps.length) - 0.5) * 0.2))
    }
    const total = (s: number[]) => s[0] + s[1] + s[2]
    const last = laps.at(-1)
    const best = laps.length ? laps.reduce((a, b) => (total(b) < total(a) ? b : a)) : undefined
    const bestS1 = laps.length ? Math.min(...laps.map((l) => l[0])) : -1
    const bestS2 = laps.length ? Math.min(...laps.map((l) => l[1])) : -1
    const frac = pitted ? 0.02 : (t - elapsed) / pace
    const w = line[Math.floor(frac * line.length) % Math.max(line.length, 1)] ?? { x: 0, y: 0, z: 0 }
    return {
      ...v,
      inGarageStall: false,
      pitting: pitted,
      pitState: pitted ? 'STOPPED' : 'NONE',
      lapsCompleted: laps.length,
      pitstops: pitted ? 1 : 0,
      lastLapTime: last ? total(last) : -1,
      lastSectorTime1: last ? last[0] : -1,
      lastSectorTime2: last ? last[0] + last[1] : -1,
      bestLapTime: best ? total(best) : -1,
      bestSectorTime1: bestS1,
      bestSectorTime2: bestS1 > 0 ? bestS1 + bestS2 : -1,
      bestLapSectorTime1: best ? best[0] : -1,
      bestLapSectorTime2: best ? best[0] + best[1] : -1,
      carPosition: { type: -1, x: w.x, y: w.y, z: w.z },
    }
  })
  // practice order: best lap, no time last
  const key = (v: Vehicle) => ((v.bestLapTime as number) > 0 ? (v.bestLapTime as number) : Infinity)
  return out.sort((a, b) => key(a) - key(b)).map((v, i) => ({ ...v, position: i + 1 }))
}
