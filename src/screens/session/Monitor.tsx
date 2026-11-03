import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { CameraType, Vehicle } from '../../../reference/rf2-api'
import {
  CAMERAS,
  focusCar,
  focusNext,
  focusPrevious,
  fullScreen,
  transport,
  setCamera,
  useGameMode,
  useSessionInfo,
  useStandings,
} from '../../api/session'
import { useReplayMetrics } from '../../api/socket'
import { stripVersion } from '../../race/content'
import { clock, fastestLap, gap, isRace, lapTime, sessionOver, where } from '../../session/format'
import {
  Button,
  Card,
  DataTable,
  Grid,
  Meter,
  MonitorLayout,
  ReplayTransport,
  Segmented,
  Stack,
  Stats,
  Text,
  useAction,
  type TransportCommand,
} from '../../ui'

/** Watch: camera and car above the native 3D view, replay controls and your car below, order beside. */
export function Monitor() {
  const navigate = useNavigate()
  const { data: info } = useSessionInfo()
  const { data: standings } = useStandings()
  const [camera, setCam] = useState<CameraType>('SCV_TV_COCKPIT')
  const [live, setLive] = useState(true)
  const { data: mode } = useGameMode()
  const replay = !!mode?.replay
  const metrics = useReplayMetrics(replay)
  useAction('hideUi', () => void fullScreen())

  const rows = [...(standings ?? [])].sort((a, b) => a.position - b.position)
  const focused = rows.find((v) => v.hasFocus || v.focus)
  const me = rows.find((v) => v.player)
  const race = isRace(info?.session)
  const fastest = fastestLap(rows)
  const leader = rows.find((v) => v.bestLapTime === fastest)

  const command = (cmd: TransportCommand) => {
    setLive(cmd === 'live')
    void transport(cmd)
  }

  return (
    <MonitorLayout
      above={
        <Stack gap={3}>
          <Stack row gap={3}>
            <Segmented
              options={CAMERAS}
              value={camera}
              onChange={(c) => {
                setCam(c)
                void setCamera(c)
              }}
              label="Camera"
              navId="camera"
            />
            <Stack grow />
            <Button size="s" onClick={() => void fullScreen()} navId="fullscreen">
              Full screen
            </Button>
          </Stack>
          <Stack row gap={2}>
            <Button size="s" variant="quiet" label="Previous car" onClick={() => void focusPrevious()}>
              ‹
            </Button>
            <Text weight="medium" truncate>
              {focused ? `P${focused.position} · ${focused.driverName}` : 'No car focused'}
            </Text>
            <Text tone="muted" truncate>
              {focused ? stripVersion(focused.vehicleName ?? '') : ''}
            </Text>
            <Button size="s" variant="quiet" label="Next car" onClick={() => void focusNext()}>
              ›
            </Button>
          </Stack>
        </Stack>
      }
      below={
        <Stack gap={4} fill>
          <ReplayTransport
            onCommand={command}
            live={!replay && live}
            clock={
              replay
                ? metrics
                  ? `${clock(metrics.currentReplayPos)} / ${clock(metrics.replayLength)}`
                  : '—'
                : clock(info?.currentEventTime)
            }
          />
          {sessionOver(info) && (
            <Card pad>
              <Stack row gap={4}>
                <Text weight="bold">Session finished</Text>
                <Stack grow />
                <Button variant="secondary" onClick={() => navigate('/results', { replace: true })} navId="results">
                  See results
                </Button>
              </Stack>
            </Card>
          )}
          {replay ? (
            <Card title={metrics ? `Watching · ${metrics.replayDriver}` : 'Watching'} pad grow>
              {metrics && (
                <Stack gap={4}>
                  <Stats
                    columns={4}
                    items={[
                      { label: 'Position', value: `P${metrics.replayDriverPos}` },
                      { label: 'Lap', value: metrics.lapNumber },
                      { label: 'Speed', value: `${Math.round(metrics.speed)} ${metrics.speedUnit}` },
                      { label: 'Gear', value: metrics.gear < 0 ? 'R' : metrics.gear === 0 ? 'N' : metrics.gear },
                    ]}
                  />
                  <Grid columns="110px minmax(0, 1fr)" gap={3} align="center">
                    <Text tone="muted">Throttle</Text>
                    <Meter value={metrics.throttle} label="Throttle" />
                    <Text tone="muted">Brake</Text>
                    <Meter value={metrics.brakes} label="Brake" />
                  </Grid>
                </Stack>
              )}
            </Card>
          ) : (
            <Card
              title={me ? `Your car · ${where(me).toLowerCase()}` : 'Your car'}
              action={
                <Button size="s" onClick={() => navigate('/garage', { replace: true })}>
                  Setup
                </Button>
              }
              pad
              grow
            >
              {me && (
                <Stats
                  columns={4}
                  items={[
                    { label: 'Position', value: `P${me.position}` },
                    { label: 'Best lap', value: lapTime(me.bestLapTime) },
                    { label: 'Last lap', value: lapTime(me.lastLapTime) },
                    { label: 'Laps', value: me.lapsCompleted },
                    { label: 'Fuel', value: `${Math.round(me.fuelFraction * 100)} %` },
                    { label: race ? 'Gap' : 'To fastest', value: gap(me, race, fastest) },
                    { label: 'Pit stops', value: me.pitstops },
                    { label: 'Penalties', value: me.penalties || 'None' },
                  ]}
                />
              )}
            </Card>
          )}
        </Stack>
      }
      side={
        <Card
          title="Running order"
          action={
            <Text variant="small" tone="muted">
              {leader && fastest > 0 ? `Fastest ${lapTime(fastest)} · ${leader.driverName}` : ''}
            </Text>
          }
          grow
          scroll
        >
          <StandingsTable rows={rows} race={race} fastest={fastest} onRow={(v) => void focusCar(v.slotID)} />
        </Card>
      }
    />
  )
}

export function StandingsTable({
  rows,
  race,
  fastest,
  onRow,
  finished,
}: {
  rows: Vehicle[]
  race: boolean
  fastest: number
  onRow?: (v: Vehicle) => void
  finished?: boolean
}) {
  return (
    <DataTable
      label="Running order"
      rows={rows}
      rowKey={(v) => String(v.slotID)}
      isYou={(v) => v.player}
      onRow={onRow}
      columns={[
        { key: 'pos', header: 'Pos', render: (v) => v.position, width: '48px' },
        { key: 'driver', header: 'Driver', render: (v) => `${v.driverName}${v.carNumber ? ` #${v.carNumber}` : ''}` },
        {
          key: 'car',
          header: 'Car',
          render: (v) => stripVersion(v.vehicleName ?? '').replace(/\s*#\S+$/, ''),
          muted: true,
        },
        { key: 'class', header: 'Class', render: (v) => v.carClass ?? '', muted: true, width: '15%' },
        {
          key: 'gap',
          header: race ? 'Gap' : 'To fastest',
          render: (v) => gap(v, race, fastest),
          numeric: true,
          width: '104px',
        },
        { key: 'last', header: 'Last', render: (v) => lapTime(v.lastLapTime), numeric: true, width: '96px' },
        { key: 'best', header: 'Best', render: (v) => lapTime(v.bestLapTime), numeric: true, width: '96px' },
        { key: 'laps', header: 'Laps', render: (v) => v.lapsCompleted, numeric: true, width: '56px' },
        finished
          ? { key: 'pits', header: 'Stops', render: (v) => v.pitstops, numeric: true, width: '72px' }
          : { key: 'where', header: 'Where', render: where, muted: true, width: '88px' },
      ]}
    />
  )
}
