import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useSelection } from '../../api/race'
import { drive, leaveSession, useGameMode, useSessionInfo, useStandings, type GameMode } from '../../api/session'
import { phase, sessionName, timeLeft } from '../../session/format'
import { Chip, ConfirmButton, Frame, PrimaryButton, SessionBar, type Tab } from '../../ui'

type ModeTab = Tab & { when?: (m: GameMode) => boolean }
const SESSION_TABS: ModeTab[] = [
  { id: '/', label: 'Monitor' },
  { id: '/timing', label: 'Timing' },
  { id: '/garage', label: 'Garage', when: (m) => !m.spectator && !m.replay },
  // as in the stock UI: changing car is for drivers in online practice
  { id: '/car', label: 'Car', when: (m) => m.online && m.practice && !m.spectator },
  { id: '/chat', label: 'Chat', when: (m) => m.online },
  { id: '/session', label: 'Session', when: (m) => !m.replay },
  { id: '/results', label: 'Results' },
  { id: '/settings', label: 'Settings' },
]

/** Session bar + tabs around every in-session screen; the monitor tab leaves the 3D view visible. */
export function SessionFrame() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { data: info } = useSessionInfo()
  const { data: standings } = useStandings()
  const { data: sel } = useSelection()
  const me = standings?.find((v) => v.player)
  const { data: mode } = useGameMode()
  const tabs = SESSION_TABS.filter((t) => !t.when || !mode || t.when(mode))
  const canDrive = !mode || (!mode.spectator && !mode.replay)
  const p = phase(info)
  const wet = info ? Math.round(info.averagePathWetness * 100) : 0

  return (
    <Frame
      hole={pathname === '/'}
      top={
        <SessionBar
          leave={
            <ConfirmButton variant="quiet" question="End the weekend?" confirmLabel="Leave" onConfirm={() => void leaveSession()}>
              ‹ Leave session
            </ConfirmButton>
          }
          title={sessionName(info?.session)}
          subtitle={sel?.track?.name ?? info?.trackName}
          status={<Chip tone={p.tone}>{p.label}</Chip>}
          stats={[
            { label: 'Time left', value: timeLeft(info) },
            { label: 'Air / track', value: info ? `${Math.round(info.ambientTemp)} / ${Math.round(info.trackTemp)} °C` : '—' },
            { label: 'Surface', value: !info ? '—' : wet > 0 ? `${wet} % wet` : info.raining > 0 ? 'Rain' : 'Dry' },
            { label: 'Drivers', value: info?.numberOfVehicles ?? '—' },
            { label: 'You', value: me ? `P${me.position}` : '—' },
          ]}
          action={
            canDrive ? (
              <PrimaryButton onClick={() => void drive()} hint="Drive" navId="drive">
                Drive
              </PrimaryButton>
            ) : (
              <Chip>{mode?.replay ? 'Replay' : 'Spectating'}</Chip>
            )
          }
          tabs={tabs}
          current={tabs.find((t) => t.id !== '/' && pathname.startsWith(t.id))?.id ?? pathname}
          onTab={(id) => navigate(id, { replace: true })}
        />
      }
      status={me?.driverName}
    >
      <Outlet />
    </Frame>
  )
}
