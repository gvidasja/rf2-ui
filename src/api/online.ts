// Online: server lists (UI WebSocket), joining a server, favourites, then racing or spectating.
import type { MultiplayerJoinState } from '../../reference/rf2-api'
import { del, get, postText } from './http'
import { useResource } from './resource'
import { useRequestedTopic } from './socket'
import { navigate } from './race'

export type Server = {
  name: string
  host: string
  port: number
  version: number
  password: boolean
  /** usually the track */
  description: string
  maxPlayers: number
  players: number
  ping: number
  ai: number
  versionMatch: boolean
}

export type ServerListKind = 'Internet' | 'Lan' | 'Favorites' | 'Friends'
export const useServerList = (kind: ServerListKind) => useRequestedTopic<{ serverList?: Server[]; finished?: boolean }>(`${kind}ServerList`)
export const useSteamOnline = () => useResource('online/steam', () => get<boolean>('/rest/multiplayer/steam/status'))

const query = (s: Pick<Server, 'host' | 'port'>) => `host=${encodeURIComponent(s.host)}&port=${s.port}`
export const addFavorite = (s: Server) => postText(`/rest/multiplayer/servers/favorites?${query(s)}`)
export const removeFavorite = (s: Server) => del(`/rest/multiplayer/servers/favorites?${query(s)}`)
export const serverKey = (s: Pick<Server, 'host' | 'port'>) => `${s.host}:${s.port}`

/** Start joining; follow progress with joinState(). */
export const joinServer = (s: Server, password = '') => get(`/rest/multiplayer/join?${query(s)}&password=${encodeURIComponent(password)}`)
export const joinState = () => get<MultiplayerJoinState>('/rest/multiplayer/join/state')
export const joinError = () => get<string>('/rest/multiplayer/join/error').catch(() => '')

export async function downloadProgress() {
  const [name, left, percent] = await Promise.all([
    get<string>('/rest/multiplayer/join/downloadname').catch(() => ''),
    get<number>('/rest/multiplayer/join/downloadnumber').catch(() => 0),
    get<number>('/rest/multiplayer/join/downloadpercent').catch(() => 0),
  ])
  return { name, left, percent }
}

/** Joined: go to the track as a driver or as a spectator (the game shows the loading page). */
export async function enterServer(mode: 'race' | 'spectate') {
  await navigate(mode === 'race' ? 'NAV_RACE_MULTIPLAYER' : 'NAV_SPECTATE_MULTIPLAYER')
  location.href = '/loading/index.html'
}

/** Leave the joined server (back to the main menu state). */
export const leaveServer = () => navigate('NAV_TO_MAIN_MENU')

/** What a join state means for the player, or undefined while nothing needs saying. */
export const JOIN_TEXT: Partial<Record<MultiplayerJoinState, string>> = {
  JOIN_INITIALIZE: 'Connecting…',
  JOIN_GETTING_DETAILS: 'Getting server details…',
  JOIN_GOT_DETAILS: 'Getting server details…',
  JOIN_CHECKING_PASSWORD: 'Checking password…',
  JOIN_AWAITING_CHECKING_PASSWORD_RESPONSE: 'Checking password…',
  JOIN_CHECKED_PASSWORD: 'Password accepted',
  JOIN_VERIFYING_MODS: 'Checking content…',
  JOIN_VERIFIED_MODS: 'Content checked',
  JOIN_CHECK_GAME_CONTENT_FOR_DOWNLOAD: 'Checking content…',
  JOIN_INSTALLING_MODS: 'Installing content…',
  JOIN_INSTALL_DOWNLOADED_MODS: 'Installing content…',
  JOIN_DOWNLOADING_MODS: 'Downloading content…',
  JOIN_DOWNLOADING_CONTENT: 'Downloading content…',
  JOIN_DOWNLOADING_CONTENT_IN_PROGRESS: 'Downloading content…',
  JOIN_JOIN_SERVER: 'Joining…',
  JOIN_JOINING_SERVER: 'Joining…',
  JOIN_REJOINING_SERVER: 'Rejoining…',
}
