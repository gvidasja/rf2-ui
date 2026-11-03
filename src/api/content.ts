// Content packages (Content page): the game's package groups (packagesV2), installing / uninstalling by
// setting a target state, and the progress of the work the game then does in the background.
import { get, postJson } from './http'
import { invalidate, mutate, usePolled, useResource } from './resource'

export type PackageState = 'INSTALLED' | 'UNINSTALLED' | 'INCOMPLETE' | string

export type ContentItem = {
  core: boolean
  name: string
  sig: string
  type: string // Vehicle, Location, …
  version: string
  flags: string[]
  deps: { isInstalled: boolean; name: string; sig: string; version: string }[]
  users: { name: string; sig: string; version: string }[]
}

export type PackageGroup = {
  id: number
  groupName: string
  content: ContentItem[]
  isDownloaded: boolean
  isOwned: boolean
  origin: 'STORE' | 'WORKSHOP' | 'LOCAL' | string
  state: PackageState
  targetState: PackageState
  workshopId?: number
}

const KEY = 'content/packages'

async function loadPackages(): Promise<PackageGroup[]> {
  const raw = await get<Record<string, Omit<PackageGroup, 'id'>> | string>('/rest/race/packagesV2')
  const data = typeof raw === 'string' ? (JSON.parse(raw) as Record<string, Omit<PackageGroup, 'id'>>) : raw
  return Object.entries(data ?? {}).map(([id, g]) => ({ id: Number(id), ...g }))
}

export const usePackages = () => useResource(KEY, loadPackages)

/** Ask the game to install or uninstall a group; it works on it in the background. */
export async function setPackageTarget(id: number, install: boolean) {
  mutate<PackageGroup[]>(KEY, (old) => (old ?? []).map((g) => (g.id === id ? { ...g, targetState: install ? 'INSTALLED' : 'UNINSTALLED' } : g)))
  await postJson('/rest/race/packages/setPackageState', { package: id, state: install ? 'INSTALL' : 'UNINSTALL' })
  invalidate(KEY)
}

export type PackagesStatus = { state: string; percentage: number; needUpdating: number }
export type WorkshopStatus = { syncing: boolean; downloadingItemPercentage: number; packagesNeedUpdating: number; subscribedItems: number; restartRequired: boolean; itemsNeedUpdating: number }

export const usePackagesStatus = () => usePolled('content/status', () => get<PackagesStatus>('/rest/race/packages/status'), 1500)
export const useWorkshopStatus = () => usePolled('content/workshop', () => get<WorkshopStatus>('/rest/shop/workshop/status'), 3000)
export async function syncWorkshop() {
  await postJson('/rest/shop/workshop/performsync', undefined)
  invalidate('content/workshop')
}

/** Local mods install from disk; Store and Workshop items install (downloading first) when owned. */
export const canInstall = (g: PackageGroup) => (g.origin === 'LOCAL' ? g.isDownloaded : g.isOwned)

/** Workshop items not downloaded yet only have their Workshop id as a name. */
export const groupName = (g: PackageGroup) => (/^\d+$/.test(g.groupName) ? `Workshop item ${g.groupName}` : g.groupName)

/** Core content (the base game) cannot be uninstalled; the stock UI hides it. */
export const isCore = (g: PackageGroup) => g.content.length > 0 && (g.groupName === 'All Tracks & Cars' || g.content.every((c) => c.core))

/** The newest version among the group's items. */
export const groupVersion = (g: PackageGroup) =>
  g.content
    .map((c) => c.version)
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))[0] ?? ''

const TYPES: Record<string, string> = { Vehicle: 'Car', Location: 'Track' }
export const groupType = (g: PackageGroup) => [...new Set(g.content.map((c) => TYPES[c.type] ?? c.type))].join(', ') || '—'

/** In words, as the stock UI decides: pending work only counts when it can actually happen. */
export function groupStatus(g: PackageGroup): { text: string; tone: 'good' | 'warn' | 'info' | 'neutral' } {
  if (g.state !== g.targetState) return g.targetState === 'INSTALLED' ? { text: g.isDownloaded ? 'Installing' : 'Downloading', tone: 'info' } : { text: 'Uninstalling', tone: 'info' }
  if (g.state === 'INSTALLED') return { text: 'Installed', tone: 'good' }
  if (g.state === 'INCOMPLETE') return { text: 'Incomplete', tone: 'warn' }
  // local mods are the player's own files: the game reports them as not owned, which does not matter
  if (!g.isOwned && g.origin !== 'LOCAL') return { text: 'Not owned', tone: 'neutral' }
  return { text: g.isDownloaded ? 'Not installed' : 'Not downloaded', tone: 'neutral' }
}
