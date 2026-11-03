// What the Settings page shows: sections, labels and how each game option is edited.
// The API only gives the current value's text, so multi-value options step through the game's own
// labels ('game'); numbers are formatted here.
import type { OptionEntry } from '../../reference/rf2-api'

/** `tags`: extra words the settings search matches. */
export type OptionDef = { tags?: string } & (
  | { key: OptionEntry; label: string; help?: string; kind: 'toggle'; on?: number }
  | { key: OptionEntry; label: string; help?: string; kind: 'game' }
  | { key: OptionEntry; label: string; help?: string; kind: 'number'; format: (v: number) => string; step?: number; parse?: (text: string) => number }
)

export type Section = { id: string; title: string; items: OptionDef[] }

const pct = (v: number) => `${Math.round(v)} %`
const pct01 = (v: number) => `${Math.round(v * 100)} %`
const mbps = (v: number) => `${(v / 1e6).toFixed(2)} Mbps`
const toggle = (key: OptionEntry, label: string, help?: string): OptionDef => ({ key, label, help, kind: 'toggle' })
const game = (key: OptionEntry, label: string, help?: string): OptionDef => ({ key, label, help, kind: 'game' })
// typed-in values are in display units (70 → 0.70 for percentages shown from a 0–1 value)
const PARSE = new Map<(v: number) => string, (text: string) => number>([
  [pct01, (t) => Number.parseFloat(t.replace(',', '.')) / 100],
  [mbps, (t) => Number.parseFloat(t.replace(',', '.')) * 1e6],
])
const num = (key: OptionEntry, label: string, format: (v: number) => string, step?: number, help?: string): OptionDef => ({ key, label, help, kind: 'number', format, step, parse: PARSE.get(format) })
const volume = (key: OptionEntry, label: string): OptionDef => ({ ...num(key, label, pct01, 0.05), tags: 'volume sound' })

export const SECTIONS: Section[] = [
  {
    id: 'gameplay',
    title: 'Gameplay',
    items: [
      num('GAMEOPT_damagemultiplier', 'Damage', pct, 5),
      num('GAMEOPT_ai_driverstrength', 'AI strength', pct, 1, 'How fast the AI drives, relative to its default pace.'),
      num('GAMEOPT_ai_aggression', 'AI aggression', pct01, 0.05, 'How willing the AI is to attack and defend.'),
      num('GAMEOPT_ai_limiter', 'AI limiter', pct01, 0.05, 'How much the AI pace varies lap to lap. Higher = more consistent.'),
      game('GAMEOPT_transparent_trainer_lap', 'Ghost car', 'A see-through car driving a reference lap.'),
      num('GAMEOPT_transparent_trainer_lead_time', 'Ghost car lead', (v) => `${v.toFixed(2)} s`, 0.05),
      toggle('MULTI_download_custom_skins', 'Download custom liveries'),
      toggle('GAMEOPT_wait_for_plugins', 'Wait for plugins'),
    ],
  },
  {
    id: 'aids',
    title: 'Driving aids',
    items: [
      game('DRIVEAIDS_steering_help', 'Steering help'),
      game('DRIVEAIDS_brake_help', 'Braking help'),
      game('DRIVEAIDS_stability_control', 'Stability control'),
      { ...game('DRIVEAIDS_antilock_brakes', 'Anti-lock brakes'), tags: 'abs' },
      { ...game('DRIVEAIDS_throttle_control', 'Traction control'), tags: 'tc throttle' },
      game('DRIVEAIDS_shift_mode', 'Auto shifting'),
      toggle('DRIVEAIDS_auto_clutch', 'Auto clutch'),
      toggle('DRIVEAIDS_auto_blip', 'Auto blip'),
      toggle('DRIVEAIDS_auto_lift', 'Auto lift'),
      toggle('DRIVEAIDS_opposite_lock', 'Opposite lock'),
      toggle('DRIVEAIDS_spin_recovery', 'Spin recovery'),
      toggle('DRIVEAIDS_invulnerable', 'Invulnerable'),
      toggle('DRIVEAIDS_autopit', 'Auto pit'),
      toggle('DRIVEAIDS_hold_brakes', 'Hold brakes'),
      toggle('DRIVEAIDS_hold_clutch', 'Hold clutch'),
      game('DRIVEAIDS_repeat_shifts', 'Repeat shifts'),
      toggle('DRIVEAIDS_start_engine', 'Auto start engine'),
      toggle('CONTROL_auto_reverse', 'Auto reverse'),
      toggle('DRIVEAIDS_auto_wipers', 'Auto wipers'),
      toggle('DRIVEAIDS_auto_headlights', 'Auto headlights'),
      game('DRIVEAIDS_vis_fast_line', 'Racing line'),
    ],
  },
  {
    id: 'graphics',
    title: 'Graphics',
    items: [
      game('GRAPHOPT_track', 'Track detail'),
      game('GRAPHOPT_player_detail', 'Player car detail'),
      game('GRAPHOPT_opponent_detail', 'Opponent detail', 'Model and texture detail of other cars. Lower this first if the frame rate drops with a full grid.'),
      game('GRAPHOPT_texture', 'Texture detail'),
      game('GRAPHOPT_TextureFilter', 'Texture filter'),
      game('GRAPHOPT_shadows', 'Shadows'),
      game('GRAPHOPT_shadow_blur', 'Shadow blur'),
      game('GRAPHOPT_specialfx', 'Special effects'),
      game('GRAPHOPT_soft_particles', 'Soft particles'),
      game('GRAPHOPT_rain_drops', 'Rain drops'),
      game('GRAPHOPT_road_reflections', 'Road reflections'),
      game('GRAPHOPT_env_reflections', 'Environment reflections'),
      num('GRAPHOPT_visible_vehicles', 'Visible cars', String),
    ],
  },
  {
    id: 'view',
    title: 'View',
    items: [
      { ...num('GRAPHOPT_vfov', 'Field of view', (v) => `${v}°`, 1, 'Vertical field of view of the driving view.'), tags: 'fov' },
      game('GRAPHOPT_starting_view', 'Starting view'),
      toggle('GRAPHOPT_rearview', 'Virtual mirror'),
      game('GRAPHOPT_steering_wheel', 'Steering wheel and arms'),
      game('GRAPHOPT_stabilize_horizon', 'Stabilise horizon'),
      game('DISPLAYOPT_showroom', 'Showroom'),
    ],
  },
  {
    id: 'hud',
    title: 'HUD & units',
    items: [
      { key: 'GRAPHOPT_hud', label: 'HUD', kind: 'toggle', on: 7 },
      game('DISPLAYOPT_hud_selection', 'HUD layout'),
      game('GAMEOPT_msg_center_detail', 'Message centre'),
      game('GAMEOPT_kph', 'Speed'),
      game('GAMEOPT_units', 'Units'),
    ],
  },
  {
    id: 'sound',
    title: 'Sound',
    items: [
      num('SOUNDOPT_master_vol', 'Master volume', pct01, 0.05),
      volume('SOUNDOPT_engine_vol', 'Engine'),
      volume('SOUNDOPT_soundfx_vol', 'Effects'),
      { ...num('SOUNDOPT_tire_vol_ratio', 'Tyres', pct01, 0.05), tags: 'volume tires' },
      volume('SOUNDOPT_onboard_vol', 'Onboard'),
      { ...num('SOUNDOPT_external_vol_ratio', 'Other cars', pct01, 0.05), tags: 'volume external' },
      volume('SOUNDOPT_spotter_vol', 'Spotter'),
      volume('SOUNDOPT_options_vol', 'Menus'),
      game('GAMEOPT_spotter_detail', 'Spotter detail'),
      game('GAMEOPT_spotter_laptimes', 'Spotter lap times'),
      game('SOUNDOPT_Channels', 'Speakers'),
      game('SOUNDOPT_hrtf', 'Headphone 3D sound'),
      game('SOUNDOPT_mic_mode', 'Microphone'),
      num('SOUNDOPT_max_effects', 'Sound channels', String, 1),
    ],
  },
  {
    id: 'network',
    title: 'Network',
    items: [
      game('MP_NETWORK_connection_type', 'Connection', 'A preset for upload and download.'),
      num('MP_NETWORK_upstream', 'Upload', mbps, 250_000),
      num('MP_NETWORK_downstream', 'Download', mbps, 250_000),
    ],
  },
  {
    id: 'replays',
    title: 'Replays',
    items: [
      toggle('REPLAYOPT_record_replays', 'Record replays'),
      game('REPLAYOPT_replay_fidelity', 'Replay detail'),
      toggle('REPLAYOPT_record_hotlaps', 'Record hot laps'),
      num('REPLAYOPT_instant_replay', 'Instant replay length', (v) => `${v} s`, 5),
    ],
  },
]
