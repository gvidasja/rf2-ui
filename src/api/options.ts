// Game options (the Settings page). Each group endpoint returns { [OptionEntry]: Option }; writes go to
// /rest/options/long or /float by value type and return the updated option.
import type { Option, OptionEntry } from '../../reference/rf2-api'
import { get, postJson } from './http'
import { invalidate, mutate, peek, useResource } from './resource'

export type Options = Partial<Record<OptionEntry, Option>>

const GROUPS = ['difficulty', 'display', 'sound', 'network', 'replay'] as const
const KEY = 'options/all'

async function loadOptions(): Promise<Options> {
  const parts = await Promise.all(GROUPS.map((g) => get<Options>(`/rest/options/${g}`).catch(() => ({}) as Options)))
  return Object.assign({}, ...parts)
}

export const useOptions = () => useResource(KEY, loadOptions)

export const optionNumber = (o: Option | undefined) => (typeof o?.currentValue === 'number' ? o.currentValue : null)

// latest write per option: an older answer must not overwrite a newer optimistic value
const latest = new Map<OptionEntry, number>()

/** Set an option (absolute value); the game answers with the option's new state. */
export async function setOption(entry: OptionEntry, value: number) {
  const type = peek<Options>(KEY)?.[entry]?.valueType === 'FLOAT' ? 'float' : 'long'
  const seq = (latest.get(entry) ?? 0) + 1
  latest.set(entry, seq)
  mutate<Options>(KEY, (old) => ({ ...old, [entry]: { ...old?.[entry], currentValue: value } }))
  try {
    const next = await postJson<Option>(`/rest/options/${type}`, { optionEntry: entry, value: type === 'long' ? Math.round(value) : value })
    if (latest.get(entry) !== seq) return
    if (next && typeof next === 'object') mutate<Options>(KEY, (old) => ({ ...old, [entry]: next }))
    else invalidate(KEY)
  } catch {
    invalidate(KEY)
  }
}

// Graphics changes that need confirming (the game reloads graphics on confirm).
export const useGraphicsStatus = () => useResource('options/graphics/status', () => get<string>('/rest/options/graphics/status').catch(() => 'GRAPH_NO_CHANGE'))
export async function confirmGraphics(confirm: boolean) {
  await postJson(`/rest/options/graphics/${confirm ? 'confirmgraphics' : 'revertgraphics'}`, undefined)
  invalidate('options/graphics/status')
  invalidate(KEY)
}
