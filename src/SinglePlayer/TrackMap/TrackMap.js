import { useState, useEffect } from 'react'
import styles from './TrackMap.module.css'
import { getTrackMap } from '../../api'

export function TrackMap({ id, padding = 10 }) {
  const [path, setPath] = useState([])
  const [ds, setDs] = useState([])
  const [viewbox, setViewbox] = useState([0, 0, 1, 1])

  useEffect(() => {
    let active = true
    getTrackMap(id).then((r) => active && setPath(r))
    return () => (active = false)
  }, [id])

  useEffect(() => {
    const minX = path.reduce((min, { x }) => Math.min(min, x), Number.MAX_SAFE_INTEGER)
    const minZ = path.reduce((min, { z }) => Math.min(min, -z), Number.MAX_SAFE_INTEGER)
    const maxX = path.reduce((max, { x }) => Math.max(max, x), Number.MIN_SAFE_INTEGER)
    const maxZ = path.reduce((max, { z }) => Math.max(max, -z), Number.MIN_SAFE_INTEGER)

    setViewbox([0, 0, maxX - minX + 2 * padding, maxZ - minZ + 2 * padding])
    setDs([
      generateD(
        minX,
        minZ,
        padding,
        path.filter((x) => x.type === 0),
      ),
      generateD(
        minX,
        minZ,
        padding,
        path.filter((x) => x.type === 1),
      ),
    ])
  }, [path, padding])

  return (
    <div className={styles.TrackMap}>
      {viewbox.every((x) => x >= 0) && (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox={viewbox.join(' ')}>
          {ds.map((d, i) => (
            <path className={styles.TrackPath} vectorEffect="non-scaling-stroke" d={d} key={i} />
          ))}
        </svg>
      )}
    </div>
  )
}

function generateD(minX, minZ, padding, path) {
  return path.map(({ x, z }, i) => `${i === 0 ? 'M' : 'L'}${x - minX + padding},${-z - minZ + padding}`).join(' ')
}
