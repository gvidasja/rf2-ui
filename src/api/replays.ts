// Saved replays (UserData/Replays): list, watch, rename, delete.
import type { Replay, ReplayActionStatus, ReplayReturns } from '../../reference/rf2-api'
import { del, get } from './http'
import { invalidate, mutate, useResource } from './resource'

const KEY = 'replays'
export const useReplays = () => useResource(KEY, () => get<Replay[]>('/rest/watch/replays'))

/** Loads the replay; the game then shows the loading page and the event page in replay mode. */
export async function watchReplay(id: number) {
  const res = await get<ReplayReturns>(`/rest/watch/play/${id}`)
  if (res === 'REPLAY_ValidToPlay') location.href = '/loading/index.html'
  return res
}

export async function renameReplay(id: number, name: string) {
  const res = await fetch(`/rest/watch/replay/rename/${id}`, { method: 'PUT', body: name, headers: { 'content-type': 'text/plain' } })
  const status = (await res.json().catch(() => 'ERROR')) as ReplayActionStatus
  invalidate(KEY)
  return status
}

export async function deleteReplay(id: number) {
  mutate<Replay[]>(KEY, (old) => (old ?? []).filter((r) => r.id !== id))
  await del(`/rest/watch/replay/${id}`)
  invalidate(KEY)
}

/** Why a replay can't be played, in words. */
export const REPLAY_ERRORS: Partial<Record<ReplayReturns, string>> = {
  REPLAY_RFMnotFound: 'The series of this replay is not installed.',
  REPLAY_FileNameInvalid: 'The replay file is missing or damaged.',
  REPLAY_GameStateNotInSetup: 'Leave the current session first.',
  REPLAY_itemIDinvalid: 'The replay list changed; try again.',
  REPLAY_InvalidList: 'The replay list changed; try again.',
  REPLAY_NoScenes: 'The track of this replay is not installed.',
  REPLAY_NoVehicles: 'The cars of this replay are not installed.',
}
