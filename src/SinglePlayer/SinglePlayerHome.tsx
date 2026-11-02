import c from 'classnames'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Link } from 'react-router-dom'
import { getSelection, type RaceCar, type RaceSelection, type RaceTrack, type SessionSettings, startRace } from '../api'
import { Tile } from '../Tile/Tile'
import { Title } from '../Tile/Title'
import { useSessionSettings } from './SessionSettings/sessionSettingsContext'
import { Setting } from './SessionSettings/Setting'
import styles from './SinglePlayerHome.module.css'
import { TrackMap } from './TrackMap/TrackMap'
import { TRACK_TYPE_MAP } from './TrackSelection/TrackSelection'

export function SinglePlayerHome() {
  const [selection, setSelection] = useState<RaceSelection>()

  const navigate = useNavigate()

  useEffect(() => {
    getSelection().then((s) => setSelection(s))
  }, [])

  const sessionSettings = useSessionSettings()

  const onStartRace = useCallback(() => {
    startRace().then(() => navigate('/event/loading'))
  }, [navigate])

  return selection && sessionSettings.state ? (
    <div className={styles.SinglePlayerRaceSetup}>
      <SessionSettings />

      <Link to="track">
        <TrackDisplay track={selection.track} />
      </Link>

      <Link to="car">
        <CarDisplay car={selection.car} />
      </Link>

      <OpponentSettings />

      <ConditionSettings />

      <Tile clickable className={styles.Race} onClick={onStartRace} row="3" col="2/-1">
        RACE
      </Tile>
    </div>
  ) : (
    'Loading'
  )
}

function SessionSettings({}) {
  return (
    <Tile className={c(styles.GeneralSettings, styles.Settings)} row="1/-1">
      <Title>Session settings</Title>

      <div className={styles.SettingsList}>
        <div className={styles.Category}>Practice</div>
        <Setting settingKey="SESSSET_pract1" />
        <Setting settingKey="SESSSET_private_prac" disabled={IF_PRACTICE_IS_DISABLED} />
        <Setting settingKey="SESSSET_Practice_Length" disabled={IF_PRACTICE_IS_DISABLED} />
        <Setting settingKey="SESSSET_practice1_starting_time" disabled={IF_PRACTICE_IS_DISABLED} />

        <div className={styles.Category}>Qualifying</div>
        <Setting settingKey="SESSSETD_num_qual_sessions" />
        <Setting settingKey="SESSSET_private_qual" disabled={IF_QUALIFYTING_IS_DISABLED} />
        <Setting settingKey="SESSSET_Qualify_Length" disabled={IF_QUALIFYTING_IS_DISABLED} />
        <Setting settingKey="SESSSET_Qualify_Laps" disabled={IF_QUALIFYTING_IS_DISABLED} />
        <Setting settingKey="SESSSET_qualify_starting_time" disabled={IF_QUALIFYTING_IS_DISABLED} />

        <div className={styles.Category}>Warmup</div>
        <Setting settingKey="SESSSET_run_warmup" />
        <Setting settingKey="SESSSET_WarmUp_Length" disabled={IF_WARMUP_IS_DISABLED} />
        <Setting settingKey="SESSSET_warmup_starting_time" disabled={IF_WARMUP_IS_DISABLED} />

        <div className={styles.Category}>Race</div>
        <Setting settingKey="SESSSET_num_race_sessions" />
        <Setting settingKey="SESSSET_formation" disabled={IF_RACE_IS_DISABLED} />
        <Setting settingKey="SESSSET_Grid_Position" disabled={IF_RACE_IS_DISABLED} />
        <Setting settingKey="SESSSET_Finish_Criteria" disabled={IF_RACE_IS_DISABLED} />
        <Setting settingKey="SESSSET_race_time" disabled={IF_RACE_IS_DISABLED} />
        <Setting settingKey="SESSSET_Race_Laps" disabled={IF_RACE_IS_DISABLED} />
        <Setting settingKey="SESSSET_race_starting_time" disabled={IF_RACE_IS_DISABLED} />

        <div className={styles.Category}>General</div>
        <Setting settingKey="SESSSET_race_timescale" />
        <Setting settingKey="SESSSET_flag_rules" />
        <Setting settingKey="SESSSET_Fuel_Usage" />
        <Setting settingKey="SESSSET_Tire_Wear" />
        <Setting settingKey="SESSSET_Mech_Failures" />
        <Setting settingKey="SESSSET_Damage_Multi" />
      </div>
    </Tile>
  )
}

function TrackDisplay({ track }: { track: RaceTrack }) {
  return (
    <Tile clickable className={styles.Track} row="1" col="2">
      <Title>Track</Title>
      <div className={c(styles.Image, 'FitImage')}>
        <TrackMap id={track.id} />
      </div>
      <div>
        <p className={styles.Title}>{track.shortName}</p>
        <p>{track.name}</p>
        <p>Year: {track.year}</p>
        <p>Length: {track.length}</p>
        <p>Type: {TRACK_TYPE_MAP[track.type.toLowerCase()]}</p>
      </div>
    </Tile>
  )
}

function CarDisplay({ car }: { car: RaceCar }) {
  return (
    <Tile clickable className={styles.Car} row="2" col="2">
      <Title>Car</Title>
      <div className={c(styles.Image, 'FitImage')}>
        <img alt="car" src={car.image} />
      </div>
      <div>
        <Title>{car.fullPathTree.split(',').at(-1)?.trim()}</Title>
        <p>{car.name}</p>
        <p>Manufacturer: {car.manufacturer}</p>
        <p>Engine: {car.engine}</p>
      </div>
    </Tile>
  )
}

function OpponentSettings() {
  return (
    <Tile className={styles.Opponents} row="1" col="3">
      <Title>Opponents</Title>

      <div className={styles.SettingsList}>
        <Setting settingKey="SESSSET_Num_Opponents" />
        <Setting settingKey="SESSSET_AI_Strength" />
        <Setting settingKey="SESSSET_AI_Aggression" />
        <Setting settingKey="SESSSET_AI_Limiter" />
      </div>

      <Link to="opponents">
        <button>Choose opponents</button>
      </Link>
    </Tile>
  )
}

function ConditionSettings() {
  return (
    <Tile className={styles.Conditions} row="2" col="3">
      <Title>Conditions</Title>

      <div className={styles.SettingsList}>
        <div className={styles.Category}>Weather</div>
        <Setting settingKey="SESSSET_weather" />

        <div className={styles.Category}>RealRoad</div>
        <Setting
          settingKey="SESSSET_pract1_realroad_init"
          disabled={EITHER(IF_PRACTICE_IS_DISABLED, WEATHER_IS_NOT_SCRIPTED)}
        />
        <Setting settingKey="SESSSET_realroad_timescale_practice" disabled={IF_PRACTICE_IS_DISABLED} />
        <Setting
          settingKey="SESSSET_qual1_realroad_init"
          disabled={EITHER(IF_QUALIFYTING_IS_DISABLED, WEATHER_IS_NOT_SCRIPTED)}
        />
        <Setting settingKey="SESSSET_realroad_timescale_qualify" disabled={IF_QUALIFYTING_IS_DISABLED} />
        <Setting
          settingKey="SESSSET_race_realroad_init"
          disabled={EITHER(IF_RACE_IS_DISABLED, WEATHER_IS_NOT_SCRIPTED)}
        />
        <Setting settingKey="SESSSET_realroad_timescale_race" disabled={IF_RACE_IS_DISABLED} />
      </div>
    </Tile>
  )
}

function IF_PRACTICE_IS_DISABLED(state: SessionSettings) {
  return state['SESSSET_pract1'].currentValue === 0
}

function IF_QUALIFYTING_IS_DISABLED(state: SessionSettings) {
  return state['SESSSETD_num_qual_sessions'].currentValue === 0
}

function IF_WARMUP_IS_DISABLED(state: SessionSettings) {
  return state['SESSSET_run_warmup'].currentValue === 0
}

function IF_RACE_IS_DISABLED(state: SessionSettings) {
  return state['SESSSET_num_race_sessions'].currentValue === 0
}

function WEATHER_IS_NOT_SCRIPTED(state: SessionSettings) {
  return state['SESSSET_weather'].currentValue !== 4
}

function EITHER(...conditions: ((state: SessionSettings) => boolean)[]) {
  return function (state: SessionSettings) {
    return conditions.every((condition) => condition(state))
  }
}
