import { useEffect, useState } from 'react'
import { useDriver, useOnlineStatus, type Rank } from '../api/account'
import { saveProfile, useProfile } from '../api/race'
import { OnlineStatusText } from './account/Account'
import { Button, Card, EmptyState, Grid, Meter, SettingRow, Stack, Stats, Text, TextField } from '../ui'

const rankText = (r?: Rank) => (r ? `${r.rank}${r.tier ? ` ${r.tier}` : ''}` : '—')
// progress is reported 0–100 (or 0–1 on some records)
const rankProgress = (r?: Rank) => (r ? (r.progress > 1 ? r.progress / 100 : r.progress) : undefined)

/** The player: name and nickname used in races, and the online ranks and career totals. */
export function Profile() {
  const { data: profile } = useProfile()
  const { data: status } = useOnlineStatus()
  const online = status?.kind === 'online'
  const { data: driver } = useDriver(online)
  const [name, setName] = useState('')
  const [nick, setNick] = useState('')
  const [saved, setSaved] = useState<string>()

  useEffect(() => {
    if (!profile) return
    setName(profile.name ?? '')
    setNick(profile.nick ?? '')
  }, [profile])

  const changed = !!profile && (name.trim() !== (profile.name ?? '') || nick.trim() !== (profile.nick ?? ''))
  const save = () =>
    void saveProfile({ name: name.trim(), nick: nick.trim(), steamID: profile?.steamID })
      .then(() => setSaved('Saved.'))
      .catch(() => setSaved('The game did not save the profile.'))
  const t = driver?.stats?.total

  return (
    <Grid grow columns="minmax(0, 1fr) minmax(0, 1.3fr)" gap={5} pad={[5, 7]}>
      <Stack gap={5}>
        <Card pad>
          <Stack gap={2}>
            <Text variant="h1">{profile?.name || 'Driver'}</Text>
            <Text tone="muted">{[profile?.nick, profile?.steamID && `Steam ${profile.steamID}`].filter(Boolean).join(' · ')}</Text>
            <OnlineStatusText />
          </Stack>
        </Card>
        <Card title="Identity" pad>
          <SettingRow label="Name shown in races">
            <TextField value={name} onChange={(v) => (setName(v), setSaved(undefined))} label="Name shown in races" />
          </SettingRow>
          <SettingRow label="Nickname">
            <TextField value={nick} onChange={(v) => (setNick(v), setSaved(undefined))} label="Nickname" />
          </SettingRow>
          <Stack row gap={4} pad={[3, 4]}>
            {saved && <Text tone="muted">{saved}</Text>}
            <Stack grow />
            <Button onClick={save} disabled={!changed || !name.trim()}>
              Save
            </Button>
          </Stack>
        </Card>
      </Stack>
      <Stack gap={5}>
        {!online ? (
          <Card pad>
            <EmptyState title="Ranks and career need the online services">
              <OnlineStatusText />
            </EmptyState>
          </Card>
        ) : (
          <>
            <Card title="Online ranks" pad>
              <Grid columns={2} gap={6}>
                {(
                  [
                    ['Driver rank', driver?.driverRank],
                    ['Safety rank', driver?.safetyRank],
                  ] as const
                ).map(([label, r]) => (
                  <Stack key={label} gap={2}>
                    <Text variant="label">{label}</Text>
                    <Text variant="title" weight="bold">
                      {rankText(r)}
                    </Text>
                    {r && <Meter value={rankProgress(r)} label={`${label} progress`} />}
                  </Stack>
                ))}
              </Grid>
            </Card>
            <Card title="Career totals" pad>
              <Stats
                columns={3}
                items={[
                  { label: 'Races', value: t?.races ?? '—' },
                  { label: 'Wins', value: t?.wins ?? '—' },
                  { label: 'Podiums', value: t?.podiums ?? '—' },
                  { label: 'Top 5', value: t?.top5 ?? '—' },
                  { label: 'Poles', value: t?.polePositions ?? '—' },
                  { label: 'Fastest laps', value: t?.fastestLaps ?? '—' },
                  { label: 'Laps led', value: t?.lapsLead ?? '—' },
                  { label: 'Laps', value: t?.lapsCompleted ?? '—' },
                  { label: 'Retirements', value: t?.dnfs ?? '—' },
                ]}
              />
            </Card>
          </>
        )}
      </Stack>
    </Grid>
  )
}
