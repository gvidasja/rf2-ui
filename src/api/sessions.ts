import type { OppFilter, Opponents, SessionsRestOpponentPayload, SessionsSetting, SessionType } from '../../reference/rf2-api'
import { OPTION_ALIASES, REFETCH_AFTER, type SettingKey } from '../race/settings'
import { del, get, postJson } from './http'
import { invalidate, mutate, peek, useResource } from './resource'

export type Settings = Partial<Record<string, SessionsSetting>>
export type Amounts = Partial<Record<SessionType, number>>

const SETTINGS_KEY = 'sessions'
const AMOUNT_KEY = 'sessions/amount'
const OPPONENTS_KEY = 'sessions/opponents'
const FILTERS_KEY = 'sessions/opponents/filter'

const loadSettings = () => get<Settings>('/rest/sessions')
const loadAmounts = () => get<Amounts>('/rest/sessions/amount')
const loadOpponents = () => get<Opponents[]>('/rest/sessions/opponents').then(clean, () => [] as Opponents[])
const loadFilters = () => get<(OppFilter | null)[]>('/rest/sessions/opponents/filter').then(clean)

function clean<T>(list: (T | null)[]): T[] {
  return list.filter((x): x is T => x != null)
}

export const useSessionSettings = () => useResource(SETTINGS_KEY, loadSettings)
export const useSessionAmounts = () => useResource(AMOUNT_KEY, loadAmounts)
export const useOpponents = () => useResource(OPPONENTS_KEY, loadOpponents)
export const useOpponentFilters = () => useResource(FILTERS_KEY, loadFilters)

/** Numeric value of a setting (BOOL → 0/1); null when missing or "N/A". */
export function settingValue(settings: Settings | undefined, key: SettingKey): number | null {
  const s = settings?.[key]
  if (!s) return null
  const v = s.currentValue
  if (typeof v === 'boolean') return s.valueType === 'BOOL' && s.stringValue === 'N/A' ? null : v ? 1 : 0
  if (typeof v === 'number') return OPTION_ALIASES[key] ? Math.round(v * OPTION_ALIASES[key]!.scale) : v
  const n = Number(v)
  return Number.isNaN(n) ? null : n
}

/** "N/A" settings do not apply in the current combination (e.g. race laps when finishing by time). */
export function settingApplies(settings: Settings | undefined, key: SettingKey) {
  const s = settings?.[key]
  return !!s && s.stringValue !== 'N/A'
}

// Writes: optimistic, latest value wins, one request in flight per setting (each step costs a frame).
const pending = new Map<string, { target: number; running: boolean }>()

export function setSetting(key: SettingKey, value: number) {
  const alias = OPTION_ALIASES[key]
  mutate<Settings>(SETTINGS_KEY, (old) => ({
    ...old,
    [key]: { ...(old?.[key] ?? { settingID: -1 }), currentValue: alias ? value / alias.scale : value },
  }))
  const p = pending.get(key) ?? { target: value, running: false }
  p.target = value
  pending.set(key, p)
  if (!p.running) void flush(key)
}

async function flush(key: SettingKey) {
  const p = pending.get(key)!
  p.running = true
  try {
    for (;;) {
      const target = p.target
      const alias = OPTION_ALIASES[key]
      if (alias) {
        await postJson('/rest/options/float', { optionEntry: alias.option, value: target / alias.scale })
      } else {
        const updated = await postJson<SessionsSetting>(`/rest/rf2ui/sessions/settings/${key}`, { value: target })
        if (p.target === target && updated) mutate<Settings>(SETTINGS_KEY, (old) => ({ ...old, [key]: updated }))
      }
      if (p.target === target) break
    }
  } finally {
    p.running = false
    pending.delete(key)
  }
  if (REFETCH_AFTER.includes(key)) refreshSessions()
}

export function refreshSessions() {
  invalidate(SETTINGS_KEY)
  invalidate(AMOUNT_KEY)
}

const AMOUNT_PATHS: Record<SessionType, string> = { PRACTICE: 'practice', QUALIFY: 'qualify', WARMUP: 'warmup', RACE: 'race' }

/** Number of sessions of a type (0 = off). Changes the related settings too, so everything is refetched. */
export async function setSessionAmount(type: SessionType, count: number) {
  mutate<Amounts>(AMOUNT_KEY, (old) => ({ ...old, [type]: count }))
  await postJson(`/rest/sessions/${AMOUNT_PATHS[type]}/sessions`, count)
  refreshSessions()
}

// Opponent field: filters are include (OR) / require (AND) / exclude (NOT) per class or series.
export const FILTER_STATES = ['OP_NOTHING', 'OP_OR', 'OP_AND', 'OP_NOT'] as const

function applyOpponentPayload(r: SessionsRestOpponentPayload) {
  if (r.filters) mutate(FILTERS_KEY, clean(r.filters as (OppFilter | null)[]))
  if (r.opponents) mutate(OPPONENTS_KEY, clean(r.opponents as (Opponents | null)[]))
}

export async function setOpponentFilter(filter: OppFilter, state: number) {
  mutate<OppFilter[]>(FILTERS_KEY, (old) =>
    (old ?? []).map((f) => (f.gSelectedListIndex === filter.gSelectedListIndex ? { ...f, state: FILTER_STATES[state] } : f)),
  )
  applyOpponentPayload(await postJson<SessionsRestOpponentPayload>('/rest/sessions/opponents', { vectorIndex: filter.gSelectedListIndex, state }))
}

export async function clearOpponentFilters() {
  applyOpponentPayload(await del<SessionsRestOpponentPayload>('/rest/sessions/opponents/all'))
}

export function opponentCount() {
  return peek<Opponents[]>(OPPONENTS_KEY)?.length
}
