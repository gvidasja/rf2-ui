// In-session data and actions (the event page).
import type { CameraType, ReplayCommand, SessionInfo, Setting, Setup, Vehicle } from '../../reference/rf2-api'
import type { TransportCommand } from '../ui'
import { get, postJson, postText } from './http'
import { invalidate, mutate, usePolled, useResource } from './resource'
import { navigate } from './race'

const put = async (url: string) => {
  const res = await fetch(url, { method: 'PUT' })
  if (!res.ok) throw new Error(`${res.status} ${url}`)
}

const loadInfo = () => get<SessionInfo>('/rest/watch/sessionInfo')
const loadStandings = () => get<Vehicle[]>('/rest/watch/standings')

export const useSessionInfo = () => usePolled('watch/sessionInfo', loadInfo, 1000)
export const useStandings = () => usePolled('watch/standings', loadStandings, 500)

/** Leave the garage/monitor and drive. */
export const drive = () => postText('/rest/garage/drive')
/** End the weekend and go back to race setup. */
export const leaveSession = () => postText('/rest/garage/toRaceMenu')

export const nextSession = () => navigate('NAV_NEXT_SESSION')
export const finishSession = () => navigate('NAV_FINISH_SESSION')
export const restartSession = () => navigate('NAV_RESTART_RACE')
export const restartWeekend = () => navigate('NAV_RESTART_WEEKEND')
export const fullScreen = () => navigate('NAV_TO_FULL_EVENT_MONITOR')
export const exitFullScreen = () => navigate('NAV_TO_EVENT_MONITOR')

// Cameras and replay
export const CAMERAS: { value: CameraType; label: string }[] = [
  { value: 'SCV_COCKPIT', label: 'Driving' },
  { value: 'SCV_TV_COCKPIT', label: 'Onboard' },
  { value: 'SCV_NOSECAM', label: 'Nose' },
  { value: 'SCV_SWINGMAN', label: 'Chase' },
  { value: 'SCV_TRACKSIDE', label: 'Trackside' },
]
export const setCamera = (camera: CameraType, advance = false) => put(`/rest/watch/focus/${camera}/GROUP1/${advance}`)
export const focusCar = (slotId: number) => put(`/rest/watch/focus/${slotId}`)
export const focusNext = () => put('/rest/watch/focusForward')
export const focusPrevious = () => put('/rest/watch/focusBackward')
export const replayCommand = (cmd: ReplayCommand) => put(`/rest/watch/replayCommand/${cmd}`)

const TRANSPORT: Record<TransportCommand, ReplayCommand> = {
  begin: 'VCRCOMMAND_BEGIN',
  rewind: 'VCRCOMMAND_REVERSESCANFAST',
  stepBack: 'VCRCOMMAND_SLOWBACKWARDS',
  pause: 'VCRCOMMAND_STOP',
  play: 'VCRCOMMAND_PLAY',
  stepForward: 'VCRCOMMAND_SLOW',
  forward: 'VCRCOMMAND_FORWARDSCANFAST',
  live: 'VCRCOMMAND_END',
}
/** A ReplayTransport button press. */
export const transport = (cmd: TransportCommand) => replayCommand(TRANSPORT[cmd])

// AI
export const addAi = (vehicleName: string) => postText('/rest/sessions/ai/add', vehicleName)
export const kickAi = (slotId: number) => postText(`/rest/sessions/ai/kick/${slotId}`)

// Garage: settings come from several category endpoints; values are indexes set absolutely.
export const GARAGE_CATEGORIES = ['chassis', 'suspension', 'aerodynamics', 'brakes', 'tires', 'drivetrain', 'gears', 'electronics', 'fuel'] as const
export type GarageSettings = Record<string, Setting>
export type GarageMeta = { fixedSetupRace: boolean; settings: Record<string, { locked: boolean; special?: string }> }

const GARAGE_KEY = 'garage/all'
async function loadGarage(): Promise<GarageSettings> {
  const all: GarageSettings = {}
  for (const c of GARAGE_CATEGORIES) {
    const part = await get<Record<string, Setting | boolean>>(`/rest/garage/${c}`).catch(() => ({}) as Record<string, Setting | boolean>)
    for (const [k, v] of Object.entries(part)) if (typeof v === 'object' && v) all[k] = v
  }
  return all
}
const loadMeta = () => get<GarageMeta>('/rest/rf2ui/garage/meta').catch(() => undefined)
const loadSetups = () => get<Setup[]>('/rest/garage/setup')

export const useGarage = () => useResource(GARAGE_KEY, loadGarage)
export const useGarageMeta = () => useResource('garage/meta', loadMeta)
export const useSetups = () => useResource('garage/setups', loadSetups)

/** Set one garage value (an index); the game may change related values, so everything is refetched. */
export async function setGarageValue(key: string, value: number) {
  mutate<GarageSettings>(GARAGE_KEY, (old) => ({ ...old, [key]: { ...old![key], value } }))
  await postJson(`/rest/garage/${encodeURIComponent(key)}`, { value })
  invalidate(GARAGE_KEY)
}

export async function setSymmetric(symmetric: boolean) {
  await fetch('/rest/garage', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ symmetric }) })
  invalidate(GARAGE_KEY)
}

export async function loadSetup(name: string) {
  await fetch('/rest/garage/setup', { method: 'PUT', body: name, headers: { 'content-type': 'text/plain' } })
  invalidate(GARAGE_KEY)
}

export async function saveSetup(name: string) {
  await postText('/rest/garage/setup', name)
  invalidate('garage/setups')
  invalidate(GARAGE_KEY)
}

export async function loadDefaultSetup() {
  await postText('/rest/garage/setup/default')
  invalidate(GARAGE_KEY)
}
