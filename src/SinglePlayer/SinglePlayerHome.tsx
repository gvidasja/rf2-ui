import c from 'classnames'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Link } from 'react-router-dom'
import { getSelection, getSettings, type RaceSelection, startRace, updateSetting } from '../api'
import { Tile } from '../Tile/Tile'
import { Title } from '../Tile/Title'
import { SessionSettings } from './SessionSettings/SessionSettings'
import { SETTING_CATEGORIES, SHOULD_RELOAD } from './SessionSettings/SettingsCategories'
import { useSettingsReducer } from './SessionSettings/useSettingsReducer'
import styles from './SinglePlayerHome.module.css'
import { TrackMap } from './TrackMap/TrackMap'
import { TRACK_TYPE_MAP } from './TrackSelection/TrackSelection'

export function SinglePlayerHome() {
  const [selection, setSelection] = useState<RaceSelection>()

  const navigate = useNavigate()

  useEffect(() => {
    getSelection().then((s) => setSelection(s))
  }, [])

  const [state, dispatch] = useSettingsReducer()

  useEffect(() => {
    getSettings().then((r) => dispatch({ type: 'SET_STATE', value: r }))
  }, [dispatch])

  const onPropUpdate = useCallback(
    (key: string, value: number) =>
      updateSetting(key, value).then((r) => {
        dispatch({ type: 'UPDATE_PROP', key, value: r })
        if (SHOULD_RELOAD[key]) {
          getSettings().then((r) => dispatch({ type: 'SET_STATE', value: r }))
        }
      }),
    [dispatch],
  )

  const onStartRace = useCallback(() => {
    startRace().then(() => navigate('/event/loading'))
  }, [navigate])

  return selection && state ? (
    <div className={styles.SinglePlayerRaceSetup}>
      <Tile className={c(styles.GeneralSettings, styles.Settings)} row="1/-1">
        <Title>Session settings</Title>
        <SessionSettings state={state} onPropUpdate={onPropUpdate} section={SETTING_CATEGORIES.MAIN} />
      </Tile>

      <Link to="track">
        <Tile clickable className={styles.Track} row="1" col="2">
          <Title>Track</Title>
          <div className={c(styles.Image, 'FitImage')}>
            <TrackMap id={selection.track.id} />
          </div>
          <div>
            <p className={styles.Title}>{selection.track.shortName}</p>
            <p>{selection.track.name}</p>
            <p>Year: {selection.track.year}</p>
            <p>Length: {selection.track.length}</p>
            <p>Type: {TRACK_TYPE_MAP[selection.track.type.toLowerCase()]}</p>
          </div>
        </Tile>
      </Link>

      <Link to="car">
        <Tile clickable className={styles.Car} row="2" col="2">
          <Title>Car</Title>
          <div className={c(styles.Image, 'FitImage')}>
            <img alt="car" src={selection.car.image} />
          </div>
          <div>
            <Title>{selection.car.fullPathTree.split(',').at(-1).trim()}</Title>
            <p>{selection.car.name}</p>
            <p>Manufacturer: {selection.car.manufacturer}</p>
            <p>Engine: {selection.car.engine}</p>
          </div>
        </Tile>
      </Link>

      <Tile className={styles.Opponents} row="1" col="3">
        <Title>Opponents</Title>
        <SessionSettings state={state} onPropUpdate={onPropUpdate} section={SETTING_CATEGORIES.OPPONENTS} />
        <Link to="opponents">
          <button>Choose opponents</button>
        </Link>
      </Tile>

      <Tile className={styles.Conditions} row="2" col="3">
        <Title>Contiditions</Title>
        <SessionSettings state={state} onPropUpdate={onPropUpdate} section={SETTING_CATEGORIES.CONDITIONS} />
      </Tile>

      <Tile clickable className={styles.Race} onClick={onStartRace} row="3" col="2/-1">
        RACE
      </Tile>
    </div>
  ) : (
    'Loading'
  )
}
