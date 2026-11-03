import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useSelection } from '../../api/race'
import { drive, leaveSession, useSessionInfo, useStandings } from '../../api/session'
import { phase, sessionName, timeLeft } from '../../session/format'
import { Chip, ConfirmButton, Frame, PrimaryButton, SessionBar, type Tab } from '../../ui'

const SESSION_TABS: Tab[] = [
  { id: '/', label: 'Monitor' },
  { id: '/timing', label: 'Timing' },
  { id: '/garage', label: 'Garage' },
  { id: '/session', label: 'Session' },
  { id: '/results', label: 'Results' },
]

/** Session bar + tabs around every in-session screen; the monitor tab leaves the 3D view visible. */
export function SessionFrame() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { data: info } = useSessionInfo()
  const { data: standings } = useStandings()
  const { data: sel } = useSelection()
  const me = standings?.find((v) => v.player)
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
            <PrimaryButton onClick={() => void drive()} hint="Drive" navId="drive">
              Drive
            </PrimaryButton>
          }
          tabs={SESSION_TABS}
          current={pathname}
          onTab={(id) => navigate(id, { replace: true })}
        />
      }
      status={me?.driverName}
    >
      <Outlet />
    </Frame>
  )
}
