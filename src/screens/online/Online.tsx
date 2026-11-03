import { useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { carImage, refreshRaceContent, useSelection } from '../../api/race'
import { enterServer, leaveServer } from '../../api/online'
import { liveryName, stripVersion } from '../../race/content'
import { switchToStockUi } from '../../stockUi'
import { Button, Card, ConfirmButton, Grid, Media, PrimaryButton, Stack, SubNav, Text, UnderConstruction, useAction, type Tab } from '../../ui'

const SECTIONS: Tab[] = [
  { id: '/online', label: 'Servers' },
  { id: '/online/competitions', label: 'Competitions' },
  { id: '/online/host', label: 'Host a server' },
  { id: '/online/lobby', label: 'Private lobby' },
]

/** The Online area: its sections under the area tabs. */
export function OnlineFrame() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const current = SECTIONS.slice(1).find((s) => pathname.startsWith(s.id))?.id ?? '/online'
  return (
    <Stack grow>
      {pathname !== '/online/joined' && <SubNav tabs={SECTIONS} current={current} onTab={(id) => navigate(id, { replace: true })} label="Online" />}
      <Outlet />
    </Stack>
  )
}

/** Joined a server: pick the car, then drive or spectate. */
export function Joined() {
  const navigate = useNavigate()
  // still connected: Back must not quietly leave the page (Leave is explicit)
  useAction('back', () => undefined)
  useEffect(() => refreshRaceContent(), [])
  const { data: sel } = useSelection()
  const car = sel?.car
  return (
    <Grid grow columns="minmax(0, 1fr) 560px" gap={5} pad={[5, 7]}>
      <Card title="Joined server" pad>
        <Stack gap={4}>
          <Text variant="display">{sel?.track?.name ?? 'Server'}</Text>
          <Text tone="muted">Choose your car, then drive or spectate. Leaving disconnects from the server.</Text>
          <Media src={carImage(car)} label={car ? stripVersion(car.name ?? '') : 'Car'} height={420} />
        </Stack>
      </Card>
      <Card title="Your car" pad>
        <Stack gap={5} fill>
          <Stack gap={2}>
            <Text variant="title" weight="bold">
              {car ? stripVersion(car.name ?? '') : '—'}
            </Text>
            <Text tone="muted">{car ? liveryName(car) : ''}</Text>
          </Stack>
          <Button onClick={() => navigate('/race/car')}>Change car</Button>
          <Stack grow />
          <Stack row gap={3}>
            <ConfirmButton question="Leave the server?" confirmLabel="Leave" onConfirm={() => void leaveServer().then(() => navigate('/online', { replace: true }))}>
              Leave
            </ConfirmButton>
            <Button onClick={() => void enterServer('spectate')}>Spectate</Button>
            <Stack grow />
            <PrimaryButton onClick={() => void enterServer('race')} hint="Drive" disabled={!car}>
              Drive
            </PrimaryButton>
          </Stack>
        </Stack>
      </Card>
    </Grid>
  )
}

const PLANS: Record<string, { name: string; plan: string }> = {
  competitions: { name: 'Competitions', plan: 'The Competition System (events, schedule, results, career) comes later; the stock UI has it.' },
  host: { name: 'Host a server', plan: 'Hosting spends paid minutes, so it stays on the stock UI for now.' },
  lobby: { name: 'Private lobby', plan: 'Private lobbies stay on the stock UI for now.' },
}

export function OnlinePlaceholder({ section }: { section: keyof typeof PLANS }) {
  const p = PLANS[section]
  return (
    <UnderConstruction
      name={p.name}
      plan={p.plan}
      action={
        <Button variant="primary" onClick={switchToStockUi}>
          Open the stock UI
        </Button>
      }
    />
  )
}
