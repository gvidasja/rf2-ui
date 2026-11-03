// What the race setup page knows about each session setting: label, help, and the values it can take.
// Values come from reference/SETTINGS.md (probed live); the game only steps through them, so they are
// listed here to offer absolute choices.
import type { Option } from '../ui'

export type SettingDef =
  | { kind: 'enum'; label: string; help?: string; options: Option<number>[] }
  | { kind: 'number'; label: string; help?: string; min: number; max: number; step?: number; format: (v: number) => string }
  | { kind: 'bool'; label: string; help?: string }

const opts = (pairs: [number, string][]): Option<number>[] => pairs.map(([value, label]) => ({ value, label }))

function clock(minutes: number) {
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

const START_TIMES: Option<number>[] = [
  { value: -1, label: 'Default' },
  { value: -2, label: 'Random daytime' },
  { value: -3, label: 'Random' },
  ...Array.from({ length: 48 }, (_, i) => ({ value: i * 30, label: clock(i * 30) })),
]

const MULTIPLIER = opts([
  [0, 'Off'],
  [1, 'Normal'],
  [2, '2×'],
  [3, '3×'],
  [4, '4×'],
  [5, '5×'],
  [6, '6×'],
  [7, '7×'],
])

const minutes = (v: number) => `${v} min`
const percent = (v: number) => `${Math.round(v)} %`

export const SETTINGS = {
  SESSSET_Num_Opponents: { kind: 'number', label: 'AI drivers', min: 0, max: 103, format: String },
  SESSSET_AI_Strength: { kind: 'number', label: 'Strength', min: 10, max: 120, format: percent, help: 'How fast the AI drives, relative to its default pace.' },
  SESSSET_AI_Aggression: { kind: 'number', label: 'Aggression', min: 0, max: 100, format: percent, help: 'How willing the AI is to attack and defend.' },
  SESSSET_AI_Limiter: { kind: 'number', label: 'Limiter', min: 0, max: 100, format: percent, help: 'How much the AI pace varies lap to lap. Higher = more consistent.' },

  SESSSET_Practice_Length: { kind: 'number', label: 'Length', min: 1, max: 1000, step: 5, format: minutes },
  SESSSET_practice1_starting_time: { kind: 'enum', label: 'Start time', options: START_TIMES },
  SESSSET_private_prac: { kind: 'enum', label: 'Private (drive alone)', options: opts([[0, 'Off'], [1, 'On']]) },
  SESSSET_Qualify_Length: { kind: 'number', label: 'Length', min: 1, max: 1000, step: 5, format: minutes },
  SESSSET_Qualify_Laps: { kind: 'number', label: 'Lap limit', min: 2, max: 254, format: String },
  SESSSET_qualify_starting_time: { kind: 'enum', label: 'Start time', options: START_TIMES },
  SESSSET_private_qual: { kind: 'enum', label: 'Private (drive alone)', options: opts([[0, 'Off'], [1, 'On'], [2, 'Default']]) },
  SESSSET_WarmUp_Length: { kind: 'number', label: 'Length', min: 1, max: 1000, step: 5, format: minutes },
  SESSSET_warmup_starting_time: { kind: 'enum', label: 'Start time', options: START_TIMES },
  SESSSET_Finish_Criteria: {
    kind: 'enum',
    label: 'Finish by',
    options: opts([[1, 'Laps'], [2, 'Time'], [3, 'Laps & time'], [-1, '% of time'], [-2, '% of laps']]),
    help: 'Percent options use a share of the series’ real race distance.',
  },
  SESSSET_race_time: { kind: 'number', label: 'Race time', min: 3, max: 1003, step: 5, format: minutes },
  SESSSET_Race_Laps: { kind: 'number', label: 'Race laps', min: 1, max: 1000, format: String },
  SESSSET_formation: { kind: 'enum', label: 'Start', options: opts([[0, 'Standing'], [1, 'Formation'], [2, 'Rolling'], [4, 'Fast rolling']]) },
  SESSSET_race_starting_time: { kind: 'enum', label: 'Start time', options: START_TIMES },
  SESSSET_Grid_Position: { kind: 'number', label: 'Grid position', min: 0, max: 104, format: (v) => (v === 0 ? 'Random' : `P${v}`) },

  SESSSET_weather: { kind: 'enum', label: 'Weather', options: opts([[0, 'Sunny'], [1, 'Cloudy'], [2, 'Rainy'], [3, 'Default'], [4, 'Custom']]) },
  SESSSET_race_timescale: {
    kind: 'number',
    label: 'Time scale',
    min: -1,
    max: 60,
    format: (v) => (v === -1 ? 'Race %' : v === 0 ? 'None' : v === 1 ? 'Normal' : `${v}×`),
    help: 'How fast the time of day passes. "Race %" fits a full day into the race.',
  },
  SESSSET_timescaled_weather: { kind: 'bool', label: 'Weather follows time scale' },

  SESSSET_flag_rules: { kind: 'enum', label: 'Flags', options: opts([[0, 'None'], [1, 'Black only'], [2, 'Full'], [3, 'No DQ']]) },
  SESSSET_cut_rules: { kind: 'enum', label: 'Track limits', options: opts([[0, 'None'], [1, 'Default'], [2, 'Strict'], [3, 'Relaxed']]) },
  SESSSET_cuts_allowed: { kind: 'number', label: 'Track limit points', min: 0, max: 99, format: String, help: 'Points allowed before a penalty.' },
  SESSSET_blue_flags: {
    kind: 'enum',
    label: 'Blue flags',
    options: opts([
      [7, 'Default'],
      [0, 'None'],
      [1, 'Show, never penalise'],
      [2, 'Penalise within 0.3 s'],
      [3, 'Penalise within 0.5 s'],
      [4, 'Penalise within 0.7 s'],
      [5, 'Penalise within 0.9 s'],
      [6, 'Penalise within 1.1 s'],
    ]),
  },
  SESSSET_Fuel_Usage: { kind: 'enum', label: 'Fuel use', options: MULTIPLIER },
  SESSSET_Tire_Wear: { kind: 'enum', label: 'Tyre wear', options: MULTIPLIER },
  SESSSET_Mech_Failures: { kind: 'enum', label: 'Failures', options: opts([[0, 'Off'], [1, 'Normal'], [2, 'Time scaled']]) },
  SESSSET_Damage_Multi: { kind: 'number', label: 'Damage', min: 0, max: 100, step: 5, format: percent },
  SESSSET_parc_ferme: {
    kind: 'enum',
    label: 'Parc fermé',
    options: opts([[3, 'Default'], [0, 'Off'], [1, 'No changes after qualifying'], [2, 'Unless it rains']]),
  },
} satisfies Record<string, SettingDef>

export type SettingKey = keyof typeof SETTINGS

/** FLOAT settings that are the same values as these options; the option setter is absolute (0…1). */
export const OPTION_ALIASES: Partial<Record<SettingKey, { option: string; scale: number }>> = {
  SESSSET_AI_Aggression: { option: 'GAMEOPT_ai_aggression', scale: 100 },
  SESSSET_AI_Limiter: { option: 'GAMEOPT_ai_limiter', scale: 100 },
}

/** Changing these changes other settings (enabled state, weather nodes, session counts): refetch all. */
export const REFETCH_AFTER: SettingKey[] = ['SESSSET_Finish_Criteria', 'SESSSET_weather']

export function formatSetting(key: SettingKey, value: number): string {
  const def: SettingDef = SETTINGS[key]
  if (def.kind === 'number') return def.format(value)
  if (def.kind === 'bool') return value ? 'On' : 'Off'
  return def.options.find((o) => o.value === value)?.label ?? String(value)
}
