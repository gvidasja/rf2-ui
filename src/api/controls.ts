// Controls: assignments, calibration, live input and controller profiles.
import type { ConfigurableControl, Joystick, OptionEntry } from '../../reference/rf2-api'
import { get, postJson, postText } from './http'
import { invalidate, mutate, useResource } from './resource'
import { useTopic } from './socket'

export type Assignments = Partial<Record<ConfigurableControl, string>>
const ASSIGN = 'controls/assign'

export const useAssignments = () => useResource(ASSIGN, () => get<Assignments>('/rest/options/assign'))
export const useJoysticks = () => useResource('controls/joysticks', () => get<Joystick[]>('/rest/options/joysticks'))

/**
 * Wait for the player to press the input for `key`. The game answers once something was pressed;
 * `onStatus` gets the game's prompt while it listens.
 */
export async function assignControl(key: ConfigurableControl, onStatus: (text: string) => void) {
  let done = false
  const poll = async () => {
    while (!done) {
      const status = await get<string[]>('/rest/options/assign/changestatus').catch(() => undefined)
      const text = status?.filter(Boolean).join(' ')
      if (!done && text) onStatus(text)
      await new Promise((r) => setTimeout(r, 200))
    }
  }
  void poll()
  try {
    const res = await fetch(`/rest/options/assign/${key}`, { method: 'PUT', body: key })
    const all = (await res.json().catch(() => undefined)) as Assignments | undefined
    if (all && typeof all === 'object') mutate<Assignments>(ASSIGN, (old) => ({ ...old, ...all }))
    else invalidate(ASSIGN)
  } finally {
    done = true
  }
}

export const detectController = () => postText('/rest/options/assign/detectController')

// Profiles (controller configuration files)
export const useProfiles = () => useResource('controls/profiles', () => get<string[]>('/rest/options/assign/listconfigurations'))
export const useCurrentProfile = () => useResource('controls/profile', () => get<string>('/rest/options/assign/currentconfiguration'))

export async function loadProfile(name: string) {
  await postText('/rest/options/assign/loadconfiguration', name)
  for (const k of [ASSIGN, 'controls/profile', 'controls/axes', 'options/all']) invalidate(k)
}

export async function saveProfile(name: string) {
  const ok = await postText('/rest/options/assign/saveconfiguration', name)
  invalidate('controls/profiles')
  invalidate('controls/profile')
  return ok
}

// Calibration: each limit is set from the axis' current position.
export type AxisName = 'Steering' | 'Throttle' | 'Brake' | 'Clutch'
export type AxisLimits = Partial<Record<OptionEntry, number[]>>
export const useAxisLimits = () => useResource('controls/axes', () => get<AxisLimits>('/rest/options/calibrate/inputaxis'))

export async function setAxisLimit(entry: OptionEntry) {
  await postJson(`/rest/options/calibrate/inputaxis/${entry}`, -1)
  invalidate('controls/axes')
}

/** One axis from the InputData topic: raw device value in its range, and the calibrated 0..1 value. */
export type InputData = { inputType: AxisName; rawData: number; minValue: number; maxValue: number; calibValue?: number }
export const useInputData = () => useTopic<InputData[]>('InputData')
