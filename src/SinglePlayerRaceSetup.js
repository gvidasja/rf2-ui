import { useState, useEffect, useCallback } from 'react'
import styles from './SinglePlayerRaceSetup.module.css'
import { getSelection, selectTrack, selectCar } from './api'
import { useModal } from './Modal'
import { TrackSelection } from './TrackSelection'
import { CarSelection } from './CarSelection'
import { TrackMap } from './TrackMap'
import c from 'classnames'

export function SinglePlayerRaceSetup() {
  const [selection, setSelection] = useState()
  const [refresh, setRefresh] = useState(Date.now())

  useEffect(() => {
    let active = true
    getSelection().then((s) => active && setSelection(s))
    return () => (active = false)
  }, [refresh])

  const onSelectTrack = useCallback(
    (track) => selectTrack(track.id).then(() => setRefresh(Date.now())),
    []
  )

  const onSelectCar = useCallback((car) => selectCar(car.id).then(() => setRefresh(Date.now())), [])

  const [trackSelectionModal, showTrackSelection] = useModal(TrackSelection, { onSelectTrack })
  const [carSelectionModal, showCarSelection] = useModal(CarSelection, { onSelectCar })

  return selection ? (
    <div className={styles.SinglePlayerRaceSetup}>
      {trackSelectionModal}
      <div
        onClick={() => showTrackSelection({ selected: selection.track })}
        className={c(styles.SelectedTrack, 'MenuItem')}
      >
        <div>Track</div>
        <div>{selection.track.shortName}</div>
        <div>{selection.track.name}</div>
        <div className="FitImage">
          <TrackMap id={selection.track.id} />
        </div>
      </div>

      {carSelectionModal}
      <div
        onClick={() => showCarSelection({ selected: selection.car })}
        className={c(styles.SelectedCar, 'MenuItem')}
      >
        <div>Car</div>
        <div>{selection.car.name}</div>
        <div className="FitImage">
          <img alt="car" src={selection.car.image} />
        </div>
      </div>
    </div>
  ) : (
    'Loading'
  )
}
