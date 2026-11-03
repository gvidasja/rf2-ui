import { useNavigate } from 'react-router-dom'
import type { Vehicle } from '../../../reference/rf2-api'
import { focusCar, useSessionInfo, useStandings, useWatchTrackMap } from '../../api/session'
import { gap, isRace, lapTime } from '../../session/format'
import { interval, sessionBests, timingRow, type TimingCell } from '../../session/timing'
import { Card, DataTable, Grid, Stack, Text, TimeValue, TrackMap, type MapMarker } from '../../ui'

const cell = (c: TimingCell) => <TimeValue mark={c.mark}>{c.text}</TimeValue>
const names = (list: Vehicle[]) => list.map((v) => (v.player ? 'you' : v.driverName)).join(', ')

/** Live timing: cars on the track map and full timing with sectors. Enter watches a driver. */
export function Timing() {
  const navigate = useNavigate()
  const { data: info } = useSessionInfo()
  const { data: standings } = useStandings()
  const { data: map } = useWatchTrackMap()

  const rows = [...(standings ?? [])].sort((a, b) => a.position - b.position)
  const race = isRace(info?.session)
  const me = rows.find((v) => v.player)
  const bests = sessionBests(rows)
  const timing = new Map(rows.map((v) => [v.slotID, timingRow(v, bests)]))
  const garage = rows.filter((v) => v.inGarageStall)
  const pits = rows.filter((v) => !v.inGarageStall && (v.pitting || v.pitState === 'ENTERING' || v.pitState === 'STOPPED' || v.pitState === 'EXITING'))
  const markers: MapMarker[] = rows
    .filter((v) => v.carPosition && !v.inGarageStall)
    .map((v) => ({ id: String(v.slotID), x: v.carPosition!.x, z: v.carPosition!.z, label: String(v.position), tone: v.player ? 'you' : v.hasFocus || v.focus ? 'focus' : undefined }))

  const watch = (v: Vehicle) => {
    void focusCar(v.slotID)
    navigate('/', { replace: true })
  }

  return (
    <Grid grow columns="560px minmax(0, 1fr)" gap={5} pad={[5, 7]}>
      <Card title="Track" pad>
        <Stack gap={4}>
          <TrackMap points={map} label="Track map with car positions" height={520} markers={markers} />
          <Text variant="small" tone="muted">
            {[pits.length ? `Pit lane: ${names(pits)}` : '', garage.length ? `Garage: ${names(garage)}` : ''].filter(Boolean).join(' · ') || 'Everyone is on track'}
          </Text>
          {bests.lap > 0 && (
            <Stack row gap={5}>
              <Text variant="small">
                <TimeValue mark="sb">{lapTime(bests.lap)}</TimeValue> session best
              </Text>
              {(me?.bestLapTime ?? 0) > 0 && (
                <Text variant="small">
                  <TimeValue mark="pb">{lapTime(me!.bestLapTime)}</TimeValue> your best
                </Text>
              )}
            </Stack>
          )}
        </Stack>
      </Card>
      <Card title="Timing" scroll grow>
        <DataTable
          label="Live timing"
          rows={rows}
          rowKey={(v) => String(v.slotID)}
          isYou={(v) => v.player}
          onRow={watch}
          columns={[
            { key: 'pos', header: 'Pos', render: (v) => v.position, width: '56px' },
            {
              key: 'driver',
              header: 'Driver',
              render: (v) => (
                <Stack>
                  <Text weight="medium" truncate>{v.driverName}</Text>
                  <Text variant="small" tone="muted" truncate>
                    {[v.carNumber && `#${v.carNumber}`, v.fullTeamName].filter(Boolean).join(' · ')}
                  </Text>
                </Stack>
              ),
            },
            { key: 'gap', header: race ? 'Gap' : 'To fastest', render: (v) => gap(v, race, bests.lap), numeric: true, width: '104px' },
            { key: 'int', header: 'Int.', render: (v) => interval(v, rows[rows.indexOf(v) - 1], race), numeric: true, width: '96px' },
            { key: 's1', header: 'S1', render: (v) => cell(timing.get(v.slotID)!.s1), numeric: true, width: '104px' },
            { key: 's2', header: 'S2', render: (v) => cell(timing.get(v.slotID)!.s2), numeric: true, width: '104px' },
            { key: 's3', header: 'S3', render: (v) => cell(timing.get(v.slotID)!.s3), numeric: true, width: '88px' },
            { key: 'last', header: 'Last', render: (v) => cell(timing.get(v.slotID)!.last), numeric: true, width: '128px' },
            { key: 'best', header: 'Best', render: (v) => cell(timing.get(v.slotID)!.best), numeric: true, width: '128px' },
            { key: 'laps', header: 'Laps', render: (v) => v.lapsCompleted, numeric: true, width: '64px' },
            { key: 'pit', header: 'Pit', render: (v) => v.pitstops, numeric: true, width: '56px' },
          ]}
        />
      </Card>
    </Grid>
  )
}
