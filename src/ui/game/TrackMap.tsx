import { useMemo } from 'react'
import styles from './TrackMap.module.css'

export type Waypoint = { type: number; x: number; y: number; z: number }

const SIZE = 1000
const PAD = 40

/**
 * Track outline from the AIW waypoints (x/z plane). Type 0 is the racing line; other types (pit lane)
 * are drawn thinner. Scales to its container; not focusable.
 */
export function TrackMap({ points, label, height }: { points?: Waypoint[]; label: string; height: number | string }) {
  const paths = useMemo(() => {
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
    const byType = new Map<number, string[]>()
    for (const p of points) {
      const list = byType.get(p.type) ?? []
      // z grows towards the viewer in rF2; flip so north is up
      list.push(`${(ox + (p.x - minX) * scale).toFixed(1)},${(SIZE - oz - (p.z - minZ) * scale).toFixed(1)}`)
      byType.set(p.type, list)
    }
    return Array.from(byType, ([type, pts]) => ({ type, d: 'M' + pts.join('L') + (type === 0 ? 'Z' : '') }))
  }, [points])

  return (
    <div className={styles.map} style={{ height }} role="img" aria-label={label}>
      {paths ? (
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} preserveAspectRatio="xMidYMid meet">
          {paths
            .slice()
            .sort((a, b) => b.type - a.type)
            .map((p) => (
              <path key={p.type} d={p.d} className={p.type === 0 ? styles.line : styles.pit} />
            ))}
        </svg>
      ) : (
        <span className={styles.empty}>{points ? 'No map for this layout' : 'Loading map…'}</span>
      )}
    </div>
  )
}
