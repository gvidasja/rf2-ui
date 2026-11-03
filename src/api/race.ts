import type { BundledState, Car, NavigationAction, RaceSelection, RaceTrack, Waypoint } from '../../reference/rf2-api'
import { get, postText } from './http'
import { invalidate, mutate, preload, useResource } from './resource'

const SELECTION = 'race/selection'
const CARS = 'race/cars'
const TRACKS = 'race/tracks'

const loadSelection = () => get<RaceSelection>('/rest/race/selection?locale=en-US')
const loadCars = () => get<Car[]>('/rest/race/car?locale=en-US')
const loadTracks = () => get<RaceTrack[]>('/rest/race/track?locale=en-US')
const loadProfile = () => get<{ name?: string; nick?: string }>('/rest/profile')

export const useSelection = () => useResource(SELECTION, loadSelection)
export const useCars = () => useResource(CARS, loadCars)

/** After joining a server the series, car list and selection are the server's. */
export function refreshRaceContent() {
  invalidate(CARS)
  invalidate(SELECTION)
}
export const useTracks = () => useResource(TRACKS, loadTracks)
export const useProfile = () => useResource('profile', loadProfile)

const mapLoaders = new Map<string, () => Promise<Waypoint[]>>()
export function useTrackMap(trackId: string | undefined) {
  let loader = trackId ? mapLoaders.get(trackId) : undefined
  if (trackId && !loader) {
    loader = () => get<Waypoint[]>(`/rest/race/track/${trackId}/trackmap`).catch(() => [])
    mapLoaders.set(trackId, loader)
  }
  return useResource(trackId ? `trackmap/${trackId}` : null, loader ?? (() => Promise.resolve([])))
}

/** Start loading the big lists in the background (the car list is 3000+ entries). */
export function preloadContent() {
  preload(CARS, loadCars)
  preload(TRACKS, loadTracks)
}

export async function selectCar(car: Car) {
  mutate<RaceSelection>(SELECTION, (old) => ({ ...old, car }))
  await postText('/rest/race/car', car.id)
  invalidate(SELECTION)
}

export async function selectTrack(track: RaceTrack) {
  mutate<RaceSelection>(SELECTION, (old) => ({ ...old, track }))
  await postText('/rest/race/track', track.id)
  // The car list depends on the track's series filter; the selection too.
  invalidate(SELECTION)
  invalidate(CARS)
}

export const startRace = () => postText('/rest/race/startRace')
export const quitGame = () => postText('/rest/start/quitGame')
export const navigationState = () => get<BundledState>('/navigation/state')
export const navigate = (action: NavigationAction) => postText(`/navigation/action/${action}`)

export const carImage = (car: Car | undefined) => car?.id && `/rest/race/car/${car.id}/image?type=IMAGE_SMALL`
export const trackImage = (track: RaceTrack | undefined) => track?.id && `/rest/race/track/${track.id}/image`
