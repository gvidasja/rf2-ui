import { useState, useEffect, useCallback } from 'react'
import styles from './SinglePlayerHome.module.css'
import { getSelection, getSettings, updateSetting } from '../api'
import { TrackMap } from './TrackMap/TrackMap'
import c from 'classnames'
import { SessionSettings } from './SessionSettings/SessionSettings'
import { TRACK_TYPE_MAP } from './TrackSelection/TrackSelection'
import { Link } from 'react-router-dom'
import { useRouteMatch } from 'react-router'
import { SETTING_CATEGORIES, SHOULD_RELOAD } from './SessionSettings/SettingsCategories'
import { SET_STATE, UPDATE_PROP, useSettingsReducer } from './SessionSettings/useSettingsReducer'

export function SinglePlayerHome() {
  const [selection, setSelection] = useState()
  const { path } = useRouteMatch()

  useEffect(() => {
    getSelection().then((s) => setSelection(s))
  }, [])

  const [state, dispatch] = useSettingsReducer()

  useEffect(() => {
    getSettings().then((r) => dispatch({ type: SET_STATE, value: r }))
  }, [dispatch])

  const onPropUpdate = useCallback(
    (key, value) =>
      updateSetting(key, value).then((r) => {
        dispatch({ type: UPDATE_PROP, key, value: r })
        if (SHOULD_RELOAD[key]) {
          getSettings().then((r) => dispatch({ type: SET_STATE, value: r }))
        }
      }),
    [dispatch],
  )

  return selection ? (
    <div className={styles.SinglePlayerRaceSetup}>
      <div className={c(styles.GeneralSettings, styles.Tile, styles.Settings)}>
        <div className={styles.Title}>Session settings</div>
        <SessionSettings state={state} onPropUpdate={onPropUpdate} section={SETTING_CATEGORIES.MAIN} />
      </div>

      <Link to={`${path}/track`}>
        <div className={c(styles.Tile, styles.Clickable, styles.Track)}>
          <div className={styles.Title}>Track</div>
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
        </div>
      </Link>
      <Link to={`${path}/car`}>
        <div className={c(styles.Tile, styles.Clickable, styles.Car)}>
          <div className={styles.Title}>Car</div>
          <div className={c(styles.Image, 'FitImage')}>
            <img alt="car" src={selection.car.image} />
          </div>
          <div>
            <div className={styles.Title}>{selection.car.fullPathTree.split(',').at(-1).trim()}</div>
            <p>{selection.car.name}</p>
            <p>Manufacturer: {selection.car.manufacturer}</p>
            <p>Engine: {selection.car.engine}</p>
          </div>
        </div>
      </Link>
      <div className={c(styles.Tile, styles.Opponents)}>
        <div className={styles.Title}>Opponents</div>{' '}
        <SessionSettings state={state} onPropUpdate={onPropUpdate} section={SETTING_CATEGORIES.OPPONENTS} />
      </div>
      <div className={c(styles.Tile, styles.Conditions)}>
        <div className={styles.Title}>Contiditions</div>{' '}
        <SessionSettings state={state} onPropUpdate={onPropUpdate} section={SETTING_CATEGORIES.CONDITIONS} />
      </div>
      <button className={styles.Race} onClick={() => {}}>
        RACE
      </button>
    </div>
  ) : (
    'Loading'
  )
}
