import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { carImage, quitGame, startRace, useProfile, useSelection, useTrackMap } from '../api/race'
import { useSessionAmounts, useSessionSettings } from '../api/sessions'
import { liveryName } from '../race/content'
import { carModelName, sessionSummary } from '../race/summary'
import { OnlineStatusText } from './account/Account'
import { switchToStockUi } from '../stockUi'
import { Button, ConfirmButton, EmptyState, Grid, MainMenuLayout, Media, PrimaryButton, Stack, Text, TrackMap, UnderConstruction, type MenuItem } from '../ui'

/** One list of destinations on the left; the right side previews the focused one. */
export function MainMenu() {
  const navigate = useNavigate()
  const { data: sel } = useSelection()
  const { data: settings } = useSessionSettings()
  const { data: amounts } = useSessionAmounts()
  const { data: profile } = useProfile()
  const [focused, setFocused] = useState('race')

  const stock = (id: string, label: string, hint?: string): MenuItem => ({ id, label, hint, onOpen: () => navigate(`/stock/${id}`) })
  const items: MenuItem[] = [
    { id: 'race', label: 'Race', hint: sel?.track ? `${carModelName(sel)} · ${sel.track.shortName ?? ''}` : undefined, onOpen: () => navigate('/race') },
    { id: 'online', label: 'Online servers', onOpen: () => navigate('/online') },
    { id: 'competitions', label: 'Competitions', onOpen: () => navigate('/online/competitions') },
    { id: 'replays', label: 'Replays', onOpen: () => navigate('/replays') },
    stock('content', 'Content'),
    { id: 'settings', label: 'Settings', onOpen: () => navigate('/settings') },
    stock('profile', 'Profile', profile?.nick ?? profile?.name),
  ]

  const start = () => {
    void startRace()
    navigate('/loading')
  }

  return (
    <MainMenuLayout
      items={items}
      focused={focused}
      onFocusItem={setFocused}
      bottom={
        <Stack gap={2}>
          <Button variant="quiet" full onClick={switchToStockUi} navId="stock-ui">
            Switch to the stock UI
          </Button>
          <ConfirmButton variant="quiet" full question="Quit rFactor 2?" confirmLabel="Quit" onConfirm={() => void quitGame()}>
            Quit
          </ConfirmButton>
        </Stack>
      }
      footer={<OnlineStatusText />}
    >
      {focused === 'race' ? (
        <Stack grow gap={6} pad={[8, 9]}>
          <Stack gap={3}>
            <Text variant="label">Race · single player</Text>
            <Text variant="display">{sel?.car && sel.track ? `${carModelName(sel)} at ${sel.track.name}` : 'Race'}</Text>
            <Text variant="title" tone="muted">
              {sessionSummary(settings, amounts)}
            </Text>
          </Stack>
          <Grid grow columns={2} gap={6}>
            <Media src={carImage(sel?.car)} label={sel?.car ? liveryName(sel.car) : 'Car'} height="100%" />
            <RaceTrackMap />
          </Grid>
          <Stack row gap={4}>
            <PrimaryButton size="l" onClick={start} navId="start">
              Start race
            </PrimaryButton>
            <Button size="l" onClick={() => navigate('/race')} navId="setup">
              Change setup
            </Button>
          </Stack>
        </Stack>
      ) : (
        <EmptyState title={items.find((i) => i.id === focused)?.label ?? ''}>
          Not rebuilt yet: this opens the stock screen (P1/P2 in the plan).
        </EmptyState>
      )}
    </MainMenuLayout>
  )
}

function RaceTrackMap() {
  const { data: sel } = useSelection()
  const { data: map } = useTrackMap(sel?.track?.id)
  return <TrackMap points={map} label={`Map of ${sel?.track?.name ?? 'the track'}`} height="100%" />
}

/** Areas not rebuilt yet: say so and offer the stock screen. */
/** An area that is not rebuilt yet; the stock UI still has it. */
export function StockArea({ name }: { name: string }) {
  return (
    <UnderConstruction
      name={name}
      plan="Until then the stock UI has it; its NEW UI button brings you back."
      action={<Button variant="primary" onClick={switchToStockUi}>Open the stock UI</Button>}
    />
  )
}
