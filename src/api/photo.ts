// Photo mode (in a session, over the full-screen 3D view): its options, the camera target and taking a photo.
import type { Option, PhotoModeEntry } from '../../reference/rf2-api'
import { get, postJson } from './http'
import { invalidate, mutate, peek, useResource } from './resource'

export type PhotoOptions = Partial<Record<PhotoModeEntry, Option>>
const KEY = 'photo/options'
const URL = '/rest/options/photomode'

export const usePhotoOptions = () => useResource(KEY, () => get<PhotoOptions>(`${URL}/options`))

export async function setPhotoOption(entry: PhotoModeEntry, value: number) {
  const type = peek<PhotoOptions>(KEY)?.[entry]?.valueType === 'FLOAT' ? 'float' : 'long'
  mutate<PhotoOptions>(KEY, (old) => ({ ...old, [entry]: { ...old?.[entry], currentValue: value } }))
  const next = await postJson<Option>(`${URL}/${type}`, { photoModeOptionEntry: entry, value: type === 'long' ? Math.round(value) : value }).catch(() => undefined)
  if (next && typeof next === 'object') mutate<PhotoOptions>(KEY, (old) => ({ ...old, [entry]: next }))
  else invalidate(KEY)
}

/** Photo mode on / off (the game freezes the scene and frees the camera). */
export const setPhotoMode = (on: boolean) => postJson(`${URL}/long`, { photoModeOptionEntry: 'PM_Photomode', value: on ? 1 : 0 })
/** Point the camera at the focused car. */
export const setPhotoTarget = () => get(`${URL}/settarget`)
export async function resetPhotoCamera() {
  await get(`${URL}/resetcamera`)
  invalidate(KEY)
}
export async function resetPhotoImage() {
  await get(`${URL}/resetsettings`)
  invalidate(KEY)
}

/** Save the current 3D view as an image; answers with the file path. */
export const takePhoto = () => postJson<string>('/rest/screenshot', { filename: 'photo', cubeFileType: 'PNG', dir: '' })
