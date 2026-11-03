import { leaveSession, nextSession, restartSession, useSessionInfo, useStandings } from '../../api/session'
import { useSelection } from '../../api/race'
import { fastestLap, gap, isRace, lapTime, sessionName, sessionOver } from '../../session/format'
import { Button, Card, ConfirmButton, EmptyState, Grid, Stack, Stats, Text } from '../../ui'
import { StandingsTable } from './Monitor'

/** Classification of the current (or just finished) session and what to do next. */
export function Results() {
  const { data: info } = useSessionInfo()
  const { data: standings } = useStandings()
  const { data: sel } = useSelection()
  const race = isRace(info?.session)
  const rows = [...(standings ?? [])].sort((a, b) => a.position - b.position)
  const fastest = fastestLap(rows)
  const me = rows.find((v) => v.player)
  const over = sessionOver(info)

  return (
    <Grid grow columns="minmax(0, 1fr) 480px" gap={5} pad={[5, 7]}>
      <Stack gap={4}>
        <Stack>
          <Text variant="h1">
            {sessionName(info?.session)} · {over ? 'finished' : 'so far'}
          </Text>
          <Text tone="muted">
            {sel?.track?.name ?? info?.trackName} · {race ? 'ordered by position' : 'ordered by best lap'}
          </Text>
        </Stack>
        <Card title="Classification" grow scroll>
          {rows.length ? <StandingsTable rows={rows} race={race} fastest={fastest} finished /> : <EmptyState title="No drivers yet" />}
        </Card>
      </Stack>
      <Stack gap={5}>
        <Card title="Your session" pad>
          {me ? (
            <Stack gap={4}>
              <Text variant="display">
                P{me.position} <Text inline variant="title" tone="muted">of {rows.length}</Text>
              </Text>
              <Stats
                columns={2}
                items={[
                  { label: 'Best lap', value: lapTime(me.bestLapTime) },
                  { label: race ? 'Gap' : 'To fastest', value: gap(me, race, fastest) },
                  { label: 'Laps', value: me.lapsCompleted },
                  { label: 'Pit stops', value: me.pitstops },
                ]}
              />
            </Stack>
          ) : (
            <Text tone="muted">You are not in this session.</Text>
          )}
        </Card>
        <Card title="Next" pad>
          <Stack gap={3}>
            {/* Drive stays the one primary action; this is where focus starts */}
            <Button full onClick={() => void nextSession()} autoFocus>
              Next session
            </Button>
            <ConfirmButton full question="Restart this session?" confirmLabel="Restart" onConfirm={() => void restartSession()}>
              Restart session
            </ConfirmButton>
            <Button full variant="quiet" onClick={() => void leaveSession()}>
              Back to race setup
            </Button>
          </Stack>
        </Card>
      </Stack>
    </Grid>
  )
}
