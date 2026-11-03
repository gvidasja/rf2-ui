// Online status and notifications. The game's online services (Competition System, notifications) run on
// Studio 397's Nakama server; the stock UI signs in with a Steam ticket from the game and keeps the session
// token in localStorage, which this page shares (same origin), so an existing session is reused.
import { get } from './http'
import { useResource } from './resource'

// The game's own client settings (from the stock UI's nakama.service.js).
const NAKAMA = 'https://rf2-prod.eu-central1-a.nakamacloud.io'
const SERVER_KEY = 'bQnb7jQmgy8h75dc'
const TOKEN_KEY = 'nakama.session.auth-token'
const REFRESH_KEY = 'nakama.session.refreshToken'

export type OnlineStatus =
  | { kind: 'online' }
  | { kind: 'steam-offline' }
  | { kind: 'no-account' } // Steam online, but no Competition System account to sign in to
  | { kind: 'unavailable' } // the online service did not answer

function tokenExpiry(token: string) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as { exp?: number }
    return (payload.exp ?? 0) * 1000
  } catch {
    return 0
  }
}

function storedToken() {
  try {
    const token = localStorage.getItem(TOKEN_KEY)
    return token && tokenExpiry(token) > Date.now() + 60_000 ? token : undefined
  } catch {
    return undefined
  }
}

class NakamaError extends Error {
  status: number
  constructor(status: number) {
    super(`nakama ${status}`)
    this.status = status
  }
}

async function signIn(): Promise<string> {
  const ticket = await get<{ authSessionTicket?: string }>('/rest/profile/getAuthSessionTicket')
  if (!ticket?.authSessionTicket) throw new NakamaError(0)
  // create=false: never creates an account; sync=true: keeps the Steam profile in sync (as the stock UI does)
  const res = await fetch(`${NAKAMA}/v2/account/authenticate/steam?create=false&sync=true`, {
    method: 'POST',
    headers: { authorization: `Basic ${btoa(`${SERVER_KEY}:`)}`, 'content-type': 'application/json' },
    body: JSON.stringify({ token: ticket.authSessionTicket }),
  })
  if (!res.ok) throw new NakamaError(res.status)
  const session = (await res.json()) as { token: string; refresh_token?: string }
  try {
    localStorage.setItem(TOKEN_KEY, session.token)
    if (session.refresh_token) localStorage.setItem(REFRESH_KEY, session.refresh_token)
  } catch {
    // storage blocked: the session still works for this page
  }
  return session.token
}

let session: Promise<string> | undefined
const sessionToken = () => (session ??= (async () => storedToken() ?? (await signIn()))().catch((e) => {
  session = undefined
  throw e
}))

async function rpc<T>(id: string, payload: object): Promise<T> {
  const token = await sessionToken()
  const res = await fetch(`${NAKAMA}/v2/rpc/${id}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    // Nakama RPC bodies are a JSON string holding the payload's JSON
    body: JSON.stringify(JSON.stringify(payload)),
  })
  if (res.status === 401) session = undefined
  if (!res.ok) throw new NakamaError(res.status)
  const out = (await res.json()) as { payload?: string }
  return (out.payload ? JSON.parse(out.payload) : undefined) as T
}

async function loadStatus(): Promise<OnlineStatus> {
  const steam = await get<boolean>('/rest/multiplayer/steam/status').catch(() => false)
  if (!steam) return { kind: 'steam-offline' }
  try {
    await sessionToken()
    return { kind: 'online' }
  } catch (e) {
    // Nakama answers 404 when no account is linked to this Steam user (create=false)
    return e instanceof NakamaError && (e.status === 404 || e.status === 401) ? { kind: 'no-account' } : { kind: 'unavailable' }
  }
}

export const useOnlineStatus = () => useResource('account/status', loadStatus)

/** A Studio 397 announcement shown to every player. */
export type Notification = { title?: string; text?: string; image?: string; link?: string; dateFrom: number }

async function loadNotifications(): Promise<Notification[]> {
  const list = await rpc<Notification[] | null>('notifications_global_latest', { type: 'global_notification' })
  return (list ?? []).slice().sort((a, b) => b.dateFrom - a.dateFrom)
}

export const useNotifications = (enabled: boolean) => useResource(enabled ? 'account/notifications' : null, loadNotifications)

// Read state is shared with the stock UI (the same localStorage key).
const SEEN_KEY = 'rf2.rc.global.notification.lastseen'
export function lastSeenNotification() {
  try {
    return Number(localStorage.getItem(SEEN_KEY) ?? -1)
  } catch {
    return -1
  }
}
export function markNotificationsSeen(list: Notification[]) {
  const newest = Math.max(-1, ...list.map((n) => n.dateFrom))
  try {
    localStorage.setItem(SEEN_KEY, String(newest))
  } catch {
    // per-viewer convenience only
  }
}

/** The Competition System driver record (ranks and career totals), as the stock UI reads it. */
export type Rank = { rank: string; tier: number; progress: number }
export type DriverStats = { races: number; wins: number; podiums: number; top5: number; dnfs: number; polePositions: number; fastestLaps: number; lapsLead: number; lapsCompleted: number }
export type Driver = { name?: string; username?: string; driverRank?: Rank; safetyRank?: Rank; stats?: { total?: Partial<DriverStats> } }

export const useDriver = (enabled: boolean) => useResource(enabled ? 'account/driver' : null, () => rpc<Driver>('cs_user_get', {}))
