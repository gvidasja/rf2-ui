import { useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { navigationState, preloadContent } from './api/race'
import { Notifications } from './screens/account/Account'
import { CarPicker } from './screens/CarPicker'
import { Loading } from './screens/Loading'
import { areaLabel } from './screens/areas'
import { MenuFrame, StockArea } from './screens/MainMenu'
import { Opponents } from './screens/Opponents'
import { Controls } from './screens/Controls'
import { RaceSetup } from './screens/RaceSetup'
import { Joined, OnlineFrame, OnlinePlaceholder } from './screens/online/Online'
import { Servers } from './screens/online/Servers'
import { Replays } from './screens/Replays'
import { SettingsIndex, SettingsLayout, SettingsSection } from './screens/Settings'
import { ChangeCar, Chat } from './screens/session/Chat'
import { Fullscreen } from './screens/session/Fullscreen'
import { Garage } from './screens/session/Garage'
import { Monitor } from './screens/session/Monitor'
import { Results } from './screens/session/Results'
import { SessionControls } from './screens/session/SessionControls'
import { SessionFrame } from './screens/session/SessionFrame'
import { Timing } from './screens/session/Timing'
import { TrackPicker } from './screens/TrackPicker'
import { AppRoot, Frame, Screen, useAction } from './ui'


/**
 * The game shows three native pages, all served the same loader: /start (menus), /event (in a session)
 * and /loading. Browser dev picks one with ?page=event|loading.
 */
type Page = 'start' | 'event' | 'loading'
const PAGE: Page = (() => {
  const forced = new URLSearchParams(location.search).get('page')
  const name = forced ?? location.pathname.split('/')[1]
  return name === 'event' || name === 'loading' ? name : 'start'
})()

export function App() {
  if (PAGE === 'event') return <EventApp />
  if (PAGE === 'loading')
    return (
      <AppRoot>
        <HashRouter>
          <Routed id="loading" frame="bare" element={<Loading />} />
        </HashRouter>
      </AppRoot>
    )
  return <StartApp />
}

function EventApp() {
  return (
    <AppRoot transparent>
      <HashRouter>
        <BackToMonitor />
        <Routes>
          <Route element={<SessionFrame />}>
            <Route index element={<Screen id="event/monitor"><Monitor /></Screen>} />
            <Route path="timing" element={<Screen id="event/timing"><Timing /></Screen>} />
            <Route path="garage" element={<Screen id="event/garage"><Garage /></Screen>} />
            <Route path="session" element={<Screen id="event/session"><SessionControls /></Screen>} />
            <Route path="results" element={<Screen id="event/results"><Results /></Screen>} />
            <Route path="settings" element={<SettingsLayout />}>
              <Route index element={<SettingsIndex />} />
              <Route path="controls" element={<Screen id="event/controls"><Controls /></Screen>} />
              <Route path=":section" element={<Screen id="event/settings"><SettingsSection /></Screen>} />
            </Route>
            <Route path="chat" element={<Screen id="event/chat"><Chat /></Screen>} />
            <Route path="car" element={<Screen id="event/car"><ChangeCar /></Screen>} />
          </Route>
          {/* native page MONITOR MAXIMIZED opens #/fullscreen */}
          <Route path="fullscreen" element={<Frame hole="full" hints={['select']}><Screen id="event/fullscreen"><Fullscreen /></Screen></Frame>} />
          {/* stock routes the game may open (#/watch, #/setup/…) */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AppRoot>
  )
}

/** In a session, Back returns to the monitor; on the monitor it does nothing (Leave is explicit). */
function BackToMonitor() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  useAction('back', pathname !== '/' && pathname !== '/fullscreen' && (() => navigate('/', { replace: true })))
  return null
}

function StartApp() {
  useEffect(preloadContent, [])
  return (
    <AppRoot>
      <HashRouter>
        <BackToPrevious />
        <ResumeJoined />
        <Routes>
          <Route element={<MenuFrame />}>
            <Route index element={null} />
            <Route path="race" element={<Routed id="race" element={<RaceSetup />} />} />
            <Route path="race/car" element={<Routed id="race/car" element={<CarPicker />} />} />
            <Route path="race/track" element={<Routed id="race/track" element={<TrackPicker />} />} />
            <Route path="race/opponents" element={<Routed id="race/opponents" element={<Opponents />} />} />
            <Route path="online" element={<OnlineFrame />}>
              <Route index element={<Routed id="online" element={<Servers />} />} />
              <Route path="joined" element={<Routed id="online/joined" element={<Joined />} />} />
              <Route path="competitions" element={<Routed id="online/competitions" element={<OnlinePlaceholder section="competitions" />} />} />
              <Route path="host" element={<Routed id="online/host" element={<OnlinePlaceholder section="host" />} />} />
              <Route path="lobby" element={<Routed id="online/lobby" element={<OnlinePlaceholder section="lobby" />} />} />
            </Route>
            <Route path="replays" element={<Routed id="replays" element={<Replays />} />} />
            <Route path="notifications" element={<Routed id="notifications" element={<Notifications />} />} />
            <Route path="settings" element={<SettingsLayout />}>
              <Route index element={<SettingsIndex />} />
              <Route path="controls" element={<Routed id="settings/controls" element={<Controls />} />} />
              <Route path=":section" element={<Routed id="settings/section" element={<SettingsSection />} />} />
            </Route>
            <Route path="stock/:area" element={<StockRoute />} />
          </Route>
          <Route path="loading" element={<Routed id="loading" frame="bare" element={<Loading />} />} />
          {/* the game opens the start page at #/start */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AppRoot>
  )
}

/** Back goes to the previous screen; on the main menu it does nothing (Quit is explicit). */
/** The game reloads the start page after joining a server: go back to the joined page. */
function ResumeJoined() {
  const navigate = useNavigate()
  useEffect(() => {
    void navigationState().then((s) => {
      if (s.state?.settingMode === 'SETTING_MULTIPLAYER' && s.state.navigationState === 'NAV_MAIN_MENU') navigate('/online/joined', { replace: true })
    })
  }, [navigate])
  return null
}

function BackToPrevious() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  useAction('back', pathname !== '/' && pathname !== '/loading' && (() => navigate(-1)))
  return null
}

function Routed({ id, element, frame }: { id: string; element: React.ReactNode; frame?: 'bare' }) {
  const screen = <Screen id={id}>{element}</Screen>
  return frame === 'bare' ? <Frame hints={id === 'menu' ? ['move', 'select'] : []}>{screen}</Frame> : screen
}

function StockRoute() {
  const { area = '' } = useParams()
  const name = areaLabel(area) ?? area.charAt(0).toUpperCase() + area.slice(1)
  return (
    <Screen id={`stock/${area}`}>
      <StockArea name={name} />
    </Screen>
  )
}
