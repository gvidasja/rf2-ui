import { LABELS } from './SinglePlayer/SessionSettings/labels'

export function getSelection(): Promise<RaceSelection> {
  return get('/rest/race/selection?locale=en-US')
}

export function getTracks(): Promise<RaceTrack[]> {
  return get('/rest/race/track?locale=en-US')
}

export function getTrackMap(id: string) {
  return get(`/rest/race/track/${id}/trackmap`)
}

export function selectTrack(id: string) {
  return post('/rest/race/track', id)
}

export function getCars(): Promise<RaceCar[]> {
  return get('/rest/race/car?locale=en-US')
}

export function selectCar(id: string) {
  return post('/rest/race/car', id)
}

// export function updateSessionCount(key: string, value: number) {
//   return post(`/rest/sessions/${key}/sessions`, value)
// }

// const SESSION_COUNT_KEYS = ['PRACTICE', 'QUALIFY', 'WARMUP', 'RACE']
// const SESSION_COUNT_MAX: Record<string, number> = {
//   WARMUP: 1,
//   DEFAULT: 4,
// }

export async function updateSetting(key: string, value: number): Promise<SessionSetting> {
  const updatedSetting = await postJSON('/rest/sessions/settings', { sessionSetting: key, value })
  // return SESSION_COUNT_KEYS.includes(key)
  //   ? post(`/rest/sessions/${key.toLowerCase()}/sessions`, String(value)).then(() => ({
  //       currentValue: Math.min(Math.max(0, value), SESSION_COUNT_MAX[key] || SESSION_COUNT_MAX.DEFAULT),
  //     }))
  //   :
  return {
    label: LABELS[key],
    stringValue: updatedSetting.stringValue,
    currentValue: Number(updatedSetting.currentValue),
  }
}

export async function getSettings(): Promise<SessionSettings> {
  const rawSettings = (await get('/rest/sessions')) as SessionSettingsDTO

  return Object.fromEntries(
    Object.entries(rawSettings).map(([key, value]) => [
      key,
      {
        label: LABELS[key],
        stringValue: value.stringValue,
        currentValue: Number(value.currentValue),
      },
    ]),
  )
}

// async function getSessionsAmount() {
//   const r = (await get('/rest/sessions/amount')) as Record<string, number>

//   return Object.fromEntries(Object.entries(r).map(([key, currentValue]) => [key, { valueType: 'LONG', currentValue }]))
// }

export function getOpponents(): Promise<SessionsOpponent[]> {
  return get('/rest/sessions/opponents')
}

export function getOpponentFilter(): Promise<SessionsOpponentFilter[]> {
  return get('/rest/sessions/opponents/filter')
}

export function updateOpponentFilter({ state, vectorIndex }: { state: number; vectorIndex: number }) {
  return postJSON('/rest/sessions/opponents', { state, vectorIndex })
}

export function quitGame() {
  return post('/rest/start/quitGame')
}

export function startRace() {
  return post('/rest/race/startRace')
}

export function getState(): Promise<NavigationState> {
  return get('/navigation/state')
}

export function getHistory() {
  return get('/rest/watch/standings/history')
}

export function getStandings(): Promise<WatchStanding[]> {
  return get('/rest/watch/standings')
}

export function drive() {
  return post('/rest/garage/drive')
}

export function kickAi(id: string) {
  return post(`/rest/sessions/ai/kick/${id}`)
}

export function addAi() {
  return post('/rest/sessions/ai/add')
}

export function stopRace() {
  return post('/rest/garage/toRaceMenu')
}

// The page is served by the game (or by Vite with a proxy in browser dev), so the API is same-origin.
const API_BASE = ''

function get(url: string) {
  return withRetry(() => fetch(API_BASE + url).then(handleResponse))
}

function post(url: string, data?: BodyInit) {
  return withRetry(() => fetch(API_BASE + url, { method: 'post', body: data }).then(handleResponse))
}

function postJSON<T>(url: string, data: T) {
  return withRetry(() =>
    fetch(API_BASE + url, {
      method: 'post',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data),
    }).then(handleResponse),
  )
}

async function withRetry<T>(action: () => Promise<T>): Promise<T> {
  while (true) {
    const result = await action()

    if (result instanceof Retry) {
      await new Promise((r) => setTimeout(r, 1000))
    } else {
      return result
    }
  }
}

class Retry extends Error {}

function handleResponse(response: Response) {
  if (response.status >= 500) {
    return new Retry()
  }

  if ((response.headers.get('content-type') || '').indexOf('application/json') > -1) {
    return response.json()
  } else {
    return response.text()
  }
}

// Public files live under BASE_URL. Resolving against this module's own URL works both when it is
// loaded from the jar (localhost:5397) and from the Vite dev server inside the game's page.
const ASSET_BASE = new URL(/* @vite-ignore */ import.meta.env.BASE_URL, import.meta.url).href

export function asset(src: string) {
  return ASSET_BASE + 'assets/' + src
}

/** Sets a session setting to an absolute value (bundle endpoint; the stock API only steps +/-). */
export async function setSettingValue(key: string, value: number): Promise<SessionSetting> {
  const updated = await postJSON(`/rest/rf2ui/sessions/settings/${key}`, { value })
  return {
    label: LABELS[key],
    stringValue: updated.stringValue,
    currentValue: Number(updated.currentValue),
  }
}

export interface RaceSelection {
  track: RaceTrack
  car: RaceCar
}

export interface RaceTrack {
  id: string
  shortName: string
  name: string
  year: string
  layout: string
  length: string
  type: 'Road Course'
  image: string
  thumbnail: string
}

export interface RaceCar {
  id: string
  name: string
  fullPathTree: string
  manufacturer: string
  engine: string
  image: string
  bhp: string
}

export interface SessionsOpponent {
  name: string
  id: number
}

export interface SessionsOpponentFilter {
  state: 'OP_NOTHING' // TODO
  stringValue: string
  gSelectedListIndex: number
  gVehFilterIndex: number
}

type SessionSettingsDTO = Record<string, SessionSettingDTO>

type SessionSettingDTO = {
  stringValue: string
  settingID: number
} & (
  | { currentValue: number; valueType: 'LONG' }
  | { valueType: 'FLOAT'; currentValue: number }
  | { valueType: 'BOOL'; currentValue: boolean }
)

export type SessionSettings = Record<string, SessionSetting>

export type SessionSetting = {
  label: string
  stringValue: string
  currentValue: number
}

export type NavigationState = {
  loadingStatus: {
    loading: false
    percentage: number
  }
  state: {}
}

export type WatchStanding = {
  position: number
  slotID: string
  carClass: string
  driverName: string
  vehicleName: string
}
