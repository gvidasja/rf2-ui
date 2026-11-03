import { useNavigate } from 'react-router-dom'
import type { SessionType } from '../../reference/rf2-api'
import { carImage, startRace, useSelection, useTrackMap } from '../api/race'
import { setSessionAmount, settingApplies, settingValue, useSessionAmounts, useSessionSettings } from '../api/sessions'
import { liveryName, trackLength } from '../race/content'
import { SettingLine } from '../race/SettingControl'
import { carModelName, sessionSummary } from '../race/summary'
import { Button, Card, Grid, Media, PrimaryButton, SettingRow, Stack, Stepper, Text, Toggle, TrackMap } from '../ui'

/** Everything for an offline race on one page: car, track, opponents, sessions, conditions, rules. */
export function RaceSetup() {
  const navigate = useNavigate()
  const { data: sel } = useSelection()
  const { data: settings } = useSessionSettings()
  const { data: amounts } = useSessionAmounts()

  const start = () => {
    void startRace()
    navigate('/loading')
  }

  return (
    <Stack grow gap={5} pad={[5, 7]}>
      <Stack row gap={4}>
        <Stack grow>
          <Text variant="h1">Race setup</Text>
          <Text tone="muted" truncate>
            {sel?.car && sel.track ? `${carModelName(sel)} at ${sel.track.name} · ` : ''}
            {sessionSummary(settings, amounts)}
          </Text>
        </Stack>
        <PrimaryButton size="l" onClick={start} navId="start" autoFocus>
          Start race
        </PrimaryButton>
      </Stack>

      <Grid grow columns="540px minmax(0, 1fr) 560px" gap={5}>
        <Stack gap={5}>
          <CarCard />
          <TrackCard />
          <Card title="Opponents" action={<Button size="s" onClick={() => navigate('/race/opponents')} navId="edit-field">Edit field</Button>} grow scroll>
            <SettingLine k="SESSSET_Num_Opponents" />
            <SettingLine k="SESSSET_AI_Strength" />
            <SettingLine k="SESSSET_AI_Aggression" />
            <SettingLine k="SESSSET_AI_Limiter" />
          </Card>
        </Stack>

        <Card title="Sessions" scroll>
          <SessionHeader type="PRACTICE" label="Practice" max={4} />
          <Dependent off={!amounts?.PRACTICE} reason="No practice session">
            {(r) => (
              <>
                <SettingLine k="SESSSET_Practice_Length" disabledReason={r} />
                <SettingLine k="SESSSET_practice1_starting_time" disabledReason={r} />
              </>
            )}
          </Dependent>
          <SessionHeader type="QUALIFY" label="Qualifying" max={4} />
          <Dependent off={!amounts?.QUALIFY} reason="No qualifying session">
            {(r) => (
              <>
                <SettingLine k="SESSSET_Qualify_Length" disabledReason={r} />
                <SettingLine k="SESSSET_Qualify_Laps" disabledReason={r} />
                <SettingLine k="SESSSET_qualify_starting_time" disabledReason={r} />
                <SettingLine k="SESSSET_private_qual" disabledReason={r} />
              </>
            )}
          </Dependent>
          <SettingRow header label="Warm-up">
            <Toggle on={!!amounts?.WARMUP} onChange={(on) => void setSessionAmount('WARMUP', on ? 1 : 0)} label="Warm-up" navId="amount-WARMUP" />
          </SettingRow>
          <Dependent off={!amounts?.WARMUP} reason="No warm-up">
            {(r) => (
              <>
                <SettingLine k="SESSSET_WarmUp_Length" disabledReason={r} />
                <SettingLine k="SESSSET_warmup_starting_time" disabledReason={r} />
              </>
            )}
          </Dependent>
          <SessionHeader type="RACE" label="Race" min={1} max={4} />
          <SettingLine k="SESSSET_Finish_Criteria" />
          <SettingLine
            k="SESSSET_race_time"
            disabledReason={settings && !settingApplies(settings, 'SESSSET_race_time') ? 'Not used — race finishes on laps' : undefined}
          />
          <SettingLine
            k="SESSSET_Race_Laps"
            disabledReason={settings && !settingApplies(settings, 'SESSSET_Race_Laps') ? 'Not used — race finishes on time' : undefined}
          />
          <SettingLine k="SESSSET_formation" />
          <SettingLine k="SESSSET_race_starting_time" />
          <SettingLine k="SESSSET_Grid_Position" disabledReason={amounts?.QUALIFY ? 'Set by qualifying' : undefined} />
        </Card>

        <Stack gap={5}>
          <Card title="Conditions">
            <SettingLine k="SESSSET_weather" note={settingValue(settings, 'SESSSET_weather') === 4 ? 'Custom forecast set per session' : undefined} />
            <SettingLine k="SESSSET_race_timescale" />
            <SettingLine k="SESSSET_timescaled_weather" />
          </Card>
          <Card title="Rules & realism" grow scroll>
            <SettingLine k="SESSSET_flag_rules" />
            <SettingLine k="SESSSET_cut_rules" />
            <SettingLine k="SESSSET_cuts_allowed" />
            <SettingLine k="SESSSET_blue_flags" />
            <SettingLine k="SESSSET_Fuel_Usage" />
            <SettingLine k="SESSSET_Tire_Wear" />
            <SettingLine k="SESSSET_Mech_Failures" />
            <SettingLine k="SESSSET_Damage_Multi" />
            <SettingLine k="SESSSET_parc_ferme" as="select" />
          </Card>
        </Stack>
      </Grid>
    </Stack>
  )
}

function Dependent({ off, reason, children }: { off: boolean; reason: string; children: (reason?: string) => React.ReactNode }) {
  return <>{children(off ? reason : undefined)}</>
}

function SessionHeader({ type, label, min = 0, max }: { type: SessionType; label: string; min?: number; max: number }) {
  const { data: amounts } = useSessionAmounts()
  const n = amounts?.[type]
  return (
    <SettingRow header label={label} note={n === 0 ? 'Off' : undefined}>
      <Stepper
        value={n ?? null}
        min={min}
        max={max}
        onChange={(v) => void setSessionAmount(type, v)}
        format={(v) => (v === 0 ? 'Off' : v === 1 ? '1 session' : `${v} sessions`)}
        label={`${label} sessions`}
        navId={`amount-${type}`}
      />
    </SettingRow>
  )
}

function CarCard() {
  const navigate = useNavigate()
  const { data: sel } = useSelection()
  const car = sel?.car
  return (
    <Card title="Car" action={<Button size="s" onClick={() => navigate('/race/car')} navId="change-car">Change</Button>} pad>
      <Grid columns="200px minmax(0, 1fr)" gap={4}>
        <Media src={carImage(car)} label="Car" height={112} />
        <Stack>
          <Text variant="title" truncate>{car ? carModelName(sel) : '—'}</Text>
          <Text tone="muted" truncate>{car ? liveryName(car) : ''}</Text>
          <Text variant="secondary" tone="muted" truncate>{[car?.engine, car?.bhp].filter(Boolean).join(' · ')}</Text>
        </Stack>
      </Grid>
    </Card>
  )
}

function TrackCard() {
  const navigate = useNavigate()
  const { data: sel } = useSelection()
  const track = sel?.track
  const { data: map } = useTrackMap(track?.id)
  return (
    <Card title="Track" action={<Button size="s" onClick={() => navigate('/race/track')} navId="change-track">Change</Button>} pad>
      <Grid columns="200px minmax(0, 1fr)" gap={4}>
        <TrackMap points={map} label={`Map of ${track?.name ?? 'the track'}`} height={112} />
        <Stack>
          <Text variant="title" truncate>{track?.name ?? '—'}</Text>
          <Text tone="muted" truncate>{track?.shortName ?? ''}</Text>
          <Text variant="secondary" tone="muted">{trackLength(track)}</Text>
        </Stack>
      </Grid>
    </Card>
  )
}
