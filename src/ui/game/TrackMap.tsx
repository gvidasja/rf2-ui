import { useMemo } from 'react'
import { cx } from '../cx'
import styles from './TrackMap.module.css'

export type Waypoint = { type: number; x: number; y: number; z: number }
/** A car on the map, in the same world coordinates as the waypoints. */
export type MapMarker = { id: string; x: number; z: number; label: string; tone?: 'you' | 'focus' }

const SIZE = 1000
const PAD = 40

const dist = (a: Waypoint, b: Waypoint) => Math.hypot(a.x - b.x, a.z - b.z)

/**
 * SVG path for one waypoint type. A type can hold several separate runs (pit entry and exit, for example);
 * a jump much longer than the usual spacing starts a new run instead of drawing a line across the track.
 * A run is closed only when its ends meet.
 */
function pathData(pts: Waypoint[], project: (x: number, z: number) => [number, number]) {
  const steps = pts.slice(1).map((p, i) => dist(pts[i], p)).sort((a, b) => a - b)
  const usual = steps[Math.floor(steps.length / 2)] ?? 0
  const gap = Math.max(usual * 8, 1)
  const runs: Waypoint[][] = []
  for (const [i, p] of pts.entries()) {
    if (i === 0 || dist(pts[i - 1], p) > gap) runs.push([])
    runs[runs.length - 1].push(p)
  }
  return runs
    .map((run) => {
      const d = run.map((p, i) => {
        const [x, y] = project(p.x, p.z)
        return `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`
      })
      const closed = run.length > 2 && dist(run[0], run[run.length - 1]) <= gap
      return d.join('') + (closed ? 'Z' : '')
    })
    .join('')
}

/**
 * Track outline from the AIW waypoints (x/z plane). Type 0 is the racing line; other types (pit lane)
 * are drawn thinner. Optional markers show cars. Scales to its container; not focusable.
 */
export function TrackMap({ points, label, height, markers }: { points?: Waypoint[]; label: string; height: number | string; markers?: MapMarker[] }) {
  const map = useMemo(() => {
    if (!points?.length) return null
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
    for (const p of points) {
      minX = Math.min(minX, p.x)
      maxX = Math.max(maxX, p.x)
      minZ = Math.min(minZ, p.z)
      maxZ = Math.max(maxZ, p.z)
    }
    const scale = (SIZE - 2 * PAD) / Math.max(maxX - minX, maxZ - minZ, 1)
    const ox = (SIZE - (maxX - minX) * scale) / 2
    const oz = (SIZE - (maxZ - minZ) * scale) / 2
    // z grows towards the viewer in rF2; flip so north is up
    const project = (x: number, z: number): [number, number] => [ox + (x - minX) * scale, SIZE - oz - (z - minZ) * scale]
    const byType = new Map<number, Waypoint[]>()
    for (const p of points) byType.set(p.type, [...(byType.get(p.type) ?? []), p])
    const paths = Array.from(byType, ([type, pts]) => ({ type, d: pathData(pts, project) }))
    return { paths, project }
  }, [points])

  return (
    <div className={styles.map} style={{ height }} role="img" aria-label={label}>
      {map ? (
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} preserveAspectRatio="xMidYMid meet">
          {map.paths
            .slice()
            .sort((a, b) => b.type - a.type)
            .map((p) => (
              <path key={p.type} d={p.d} className={cx(p.type === 0 ? styles.line : styles.pit, markers && styles.dim)} />
            ))}
          {markers
            ?.slice()
            // the player and the focused car on top
            .sort((a, b) => (a.tone ? 1 : 0) - (b.tone ? 1 : 0))
            .map((m) => {
              const [x, y] = map.project(m.x, m.z)
              return (
                <g key={m.id} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`} className={cx(styles.marker, m.tone && styles[m.tone])}>
                  <circle r={26} />
                  <text dy="0.35em">{m.label}</text>
                </g>
              )
            })}
        </svg>
      ) : (
        <span className={styles.empty}>{points ? 'No map for this layout' : 'Loading map…'}</span>
      )}
    </div>
  )
}
