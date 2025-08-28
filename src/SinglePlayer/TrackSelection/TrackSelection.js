import { useState, useEffect, useCallback } from 'react'
import { getSelection, getTracks, selectTrack } from '../../api'
import { TrackMap } from '../TrackMap/TrackMap'
import c from 'classnames'
import styles from './TrackSelection.module.css'
import { useHistory } from 'react-router'

const TRACK_TYPE = {
  PERMANENT_ROAD_COURSE: 'Permanent Road Course',
  TEMPORARY_ROAD_COURSE: 'Temporary Road Course',
  STREET_CIRCUIT: 'Street Circuit',
  OVAL: 'Oval',
}

export const TRACK_TYPE_MAP = {
  'permanent road course': TRACK_TYPE.PERMANENT_ROAD_COURSE,
  'temporary road course': TRACK_TYPE.PERMANENT_ROAD_COURSE,
  'road course': TRACK_TYPE.PERMANENT_ROAD_COURSE,
  'street circuit': TRACK_TYPE.STREET_CIRCUIT,
  'cicuito permanente': TRACK_TYPE.PERMANENT_ROAD_COURSE,
  'permenant road course': TRACK_TYPE.PERMANENT_ROAD_COURSE,
  superspeedway: TRACK_TYPE.OVAL,
  'international grade b circuit': TRACK_TYPE.PERMANENT_ROAD_COURSE,
  'temporary circuit': TRACK_TYPE.TEMPORARY_ROAD_COURSE,
  'public roads': TRACK_TYPE.TEMPORARY_ROAD_COURSE,
  'temporary street circuit': TRACK_TYPE.STREET_CIRCUIT,
  permanent: TRACK_TYPE.PERMANENT_ROAD_COURSE,
  'cicuit permanent': TRACK_TYPE.PERMANENT_ROAD_COURSE,
  'permanent circuit': TRACK_TYPE.PERMANENT_ROAD_COURSE,
  speedway: TRACK_TYPE.OVAL,
}

export function TrackSelection() {
  const history = useHistory()
  const [tracks, setTracks] = useState()
  const [layouts, setLayouts] = useState()
  const [trackTypes, setTrackTypes] = useState([])
  const [selected, setSelected] = useState()

  useEffect(() => {
    getSelection().then((r) => setSelected(r.track))
  }, [])

  const onSelectTrack = useCallback((track) => selectTrack(track.id).then(() => history.goBack()), [history])

  useEffect(() => {
    getTracks().then((layouts) => {
      setLayouts(layouts)
      setTracks(Array.from(new Set((layouts || []).map((x) => x.shortName).sort((a, b) => a.localeCompare(b)))))
      setTrackTypes(Array.from(new Set((layouts || []).map((track) => TRACK_TYPE_MAP[track.type.toLowerCase()]))))
    })
  }, [])

  return selected && layouts && tracks && trackTypes ? (
    <div className={styles.TrackSelection}>
      <div className={styles.TrackTypes}>
        {trackTypes.map((t, i) => (
          <div className={styles.TrackTypes} key={i}>
            {t}
          </div>
        ))}
      </div>
      <div className={styles.Tracks}>
        {tracks.map((track, i) => (
          <div
            key={i}
            onClick={() => setSelected(layouts.find((x) => x.shortName === track))}
            className={selected.shortName === track ? styles.Selected : ''}
          >
            {track}
          </div>
        ))}
      </div>
      <div className={styles.Layouts}>
        {layouts
          .filter((x) => x.shortName === selected.shortName)
          .map((layout) => (
            <div
              onClick={() => setSelected(layout)}
              key={layout.id}
              className={selected.id === layout.id ? styles.Selected : ''}
            >
              {layout.name}
            </div>
          ))}
      </div>
      <div className={c(styles.Thumbnail, 'FitImage')}>
        <TrackMap id={selected.id} key={selected.id} />
      </div>
      <div className={styles.Description}>
        <p>
          <b>Length: {selected.name}</b>
        </p>
        <p>Year: {selected.year}</p>
        <p>Length: {selected.length}</p>
        <p>Type: {TRACK_TYPE_MAP[selected.type.toLowerCase()]}</p>
        <button onClick={() => onSelectTrack(selected)}>Select</button>
      </div>
    </div>
  ) : (
    'Loading'
  )
}
