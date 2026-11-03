import { useSessionAmounts, useSessionSettings, settingValue } from '../../api/sessions'
import { addAi, finishSession, kickAi, nextSession, restartSession, restartWeekend, useSessionInfo, useStandings } from '../../api/session'
import { stripVersion } from '../../race/content'
import { formatSetting } from '../../race/settings'
import { sessionName } from '../../session/format'
import { Button, Card, Chip, ConfirmButton, Grid, SettingRow, Stack, Stats, Text } from '../../ui'

/** Weekend overview, session actions, and the drivers on track (add / remove AI). */
export function SessionControls() {
  const { data: info } = useSessionInfo()
  const { data: standings } = useStandings()
  const { data: amounts } = useSessionAmounts()
  const { data: settings } = useSessionSettings()
  const me = standings?.find((v) => v.player)
  const drivers = [...(standings ?? [])].sort((a, b) => a.position - b.position)
  const len = (k: 'SESSSET_Practice_Length' | 'SESSSET_Qualify_Length' | 'SESSSET_WarmUp_Length' | 'SESSSET_race_time') => {
    const v = settingValue(settings, k)
    return v == null ? '—' : formatSetting(k, v)
  }

  return (
    <Grid grow columns="minmax(0, 1fr) 640px" gap={5} pad={[5, 7]}>
      <Stack gap={5}>
        <Card title="Weekend" action={<Text variant="small" tone="muted">Now: {sessionName(info?.session)}</Text>} pad>
          <Stats
            columns={4}
            items={[
              { label: 'Practice', value: amounts?.PRACTICE ? `${amounts.PRACTICE} × ${len('SESSSET_Practice_Length')}` : 'Off' },
              { label: 'Qualifying', value: amounts?.QUALIFY ? `${amounts.QUALIFY} × ${len('SESSSET_Qualify_Length')}` : 'Off' },
              { label: 'Warm-up', value: amounts?.WARMUP ? len('SESSSET_WarmUp_Length') : 'Off' },
              { label: 'Race', value: amounts?.RACE ? `${amounts.RACE} × ${len('SESSSET_race_time')}` : 'Off' },
            ]}
          />
        </Card>
        <Card title="Session actions">
          <SettingRow label="Next session" note="Ends this session now; times so far are kept.">
            <Button onClick={() => void nextSession()} navId="next">
              Next session
            </Button>
          </SettingRow>
          <SettingRow label="Finish this session" note="Shows the results; you choose what is next.">
            <Button onClick={() => void finishSession()}>Finish session</Button>
          </SettingRow>
          <SettingRow label="Restart this session" note="Clock and times reset.">
            <ConfirmButton question="Restart?" confirmLabel="Restart" onConfirm={() => void restartSession()}>
              Restart session
            </ConfirmButton>
          </SettingRow>
          <SettingRow label="Restart the whole weekend" note="All sessions start over from the first one.">
            <ConfirmButton question="Restart weekend?" confirmLabel="Restart" onConfirm={() => void restartWeekend()}>
              Restart weekend
            </ConfirmButton>
          </SettingRow>
        </Card>
      </Stack>
      <Card title={`Drivers on track · ${drivers.length}`} scroll>
        <SettingRow label="Add AI" note={me ? `Same car as yours: ${stripVersion(me.vehicleName ?? '')}` : 'Needs your car in the session'}>
          <Button onClick={() => me?.vehicleName && void addAi(me.vehicleName)} disabled={!me} navId="add-ai">
            Add
          </Button>
        </SettingRow>
        {drivers.map((v) => (
          <SettingRow key={v.slotID} label={v.driverName} note={stripVersion(v.vehicleName ?? '')}>
            {v.player ? (
              <Chip tone="accent">You</Chip>
            ) : (
              <Button size="s" variant="quiet" onClick={() => void kickAi(v.slotID)}>
                Remove
              </Button>
            )}
          </SettingRow>
        ))}
      </Card>
    </Grid>
  )
}
