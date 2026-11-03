import { useMemo } from 'react'
import { cx } from '../cx'
import styles from './TrackMap.module.css'

export type Waypoint = { type: number; x: number; y: number; z: number }
/** A car on the map, in the same world coordinates as the waypoints. */
export type MapMarker = { id: string; x: number; z: number; label: string; tone?: 'you' | 'focus' }

const SIZE = 1000
const PAD = 40

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
    const byType = new Map<number, string[]>()
    for (const p of points) {
      const list = byType.get(p.type) ?? []
      const [px, py] = project(p.x, p.z)
      list.push(`${px.toFixed(1)},${py.toFixed(1)}`)
      byType.set(p.type, list)
    }
    const paths = Array.from(byType, ([type, pts]) => ({ type, d: 'M' + pts.join('L') + (type === 0 ? 'Z' : '') }))
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
