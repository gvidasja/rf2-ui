import { useEffect, useState } from 'react'
import type { BundledState } from '../../reference/rf2-api'
import { navigationState, useSelection } from '../api/race'
import { useSessionAmounts, useSessionSettings } from '../api/sessions'
import { liveryName, trackLength } from '../race/content'
import { carModelName, sessionSummary } from '../race/summary'
import { Grid, Progress, Stack, Stats, Text, TrackMap, type Waypoint } from '../ui'

const POLL_MS = 250

/** Shown while the track loads; the game switches to the event page by itself when done. */
export function Loading() {
  const { data: sel } = useSelection()
  const { data: settings } = useSessionSettings()
  const { data: amounts } = useSessionAmounts()
  const [state, setState] = useState<BundledState>()

  useEffect(() => {
    let alive = true
    const tick = () =>
      navigationState()
        .then((s) => alive && setState(s))
        .catch(() => {})
        .finally(() => alive && window.setTimeout(tick, POLL_MS))
    tick()
    return () => {
      alive = false
    }
  }, [])

  const status = state?.loadingStatus
  const track = status?.track as ({ trackmap?: Waypoint[]; venue?: string } & Record<string, unknown>) | undefined
  return (
    <Grid grow columns="minmax(0, 1fr) 760px" gap={8} pad={[8, 9]}>
      <Stack gap={4} justify="center">
        <Text variant="label">Single player</Text>
        <Text variant="display">{sel?.track?.name ?? 'Loading'}</Text>
        <Text variant="title" tone="muted">{track?.venue ?? sel?.track?.shortName ?? ''}</Text>
        <Stack pad={[7, 0]}>
          <Progress label={status?.loading === false ? 'Starting' : 'Loading track'} value={(status?.percentage ?? 0) <= 1 ? (status?.percentage ?? 0) * 100 : status!.percentage} />
        </Stack>
      </Stack>
      <Stack gap={6} justify="center">
        <TrackMap points={track?.trackmap ?? []} label="Track map" height={420} />
        <Stats
          columns={2}
          // the race endpoints often don't answer while the game loads: show only what is known
          items={[
            { label: 'Your car', value: sel?.car ? `${carModelName(sel)} · ${liveryName(sel.car)}` : '' },
            { label: 'Length', value: trackLength(sel?.track) || (typeof track?.length === 'string' ? track.length : '') },
            { label: 'Weekend', value: sessionSummary(settings, amounts) || '' },
          ].filter((i) => i.value)}
        />
      </Stack>
    </Grid>
  )
}
