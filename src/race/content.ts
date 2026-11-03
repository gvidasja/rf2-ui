// Groups the flat content lists from the game into what people pick from: car models with liveries,
// and venues with layouts.
import type { Car, RaceTrack } from '../../reference/rf2-api'

export type CarModel = {
  id: string // the car's fullPathTree
  name: string
  /** first path segment: the mod / series it comes from */
  series: string
  /** path between the series and the model: classes */
  classes: string[]
  liveries: Car[]
}

const tidy = (s: string) => s.replace(/\s+/g, ' ').trim()
/** "#5 BWT Lechner 1.11" → "#5 BWT Lechner" */
export const stripVersion = (s: string) => tidy(s).replace(/\s+v?\d+(\.\d+)+$/i, '')

export function groupCars(cars: Car[]): CarModel[] {
  const byPath = new Map<string, CarModel>()
  for (const car of cars) {
    const path = car.fullPathTree ?? car.name ?? '?'
    let model = byPath.get(path)
    if (!model) {
      const parts = path.split(',').map(tidy).filter(Boolean)
      model = {
        id: path,
        name: parts[parts.length - 1] ?? path,
        series: parts[0] ?? 'Other',
        classes: parts.slice(1, -1),
        liveries: [],
      }
      byPath.set(path, model)
    }
    model.liveries.push(car)
  }
  const models = Array.from(byPath.values())
  for (const m of models) m.liveries.sort((a, b) => liveryName(a).localeCompare(liveryName(b), undefined, { numeric: true }))
  return models.sort((a, b) => a.series.localeCompare(b.series) || a.name.localeCompare(b.name))
}

export const liveryName = (car: Car) => stripVersion(car.name ?? car.id ?? '')

export type Venue = { id: string; name: string; kind: TrackKind; layouts: RaceTrack[] }
export type TrackKind = 'Road' | 'Oval' | 'Street' | 'Karting'

export function trackKind(t: RaceTrack & { type?: string }): TrackKind {
  const type = `${t.type ?? ''}`.toLowerCase()
  if (/oval|speedway/.test(type)) return 'Oval'
  if (/street|public|temporary/.test(type)) return 'Street'
  if (/kart/.test(type)) return 'Karting'
  return 'Road'
}

export function groupTracks(tracks: RaceTrack[]): Venue[] {
  const byVenue = new Map<string, Venue>()
  for (const t of tracks) {
    const name = stripVersion(t.shortName ?? t.name ?? '?')
    let v = byVenue.get(name)
    if (!v) {
      v = { id: name, name, kind: trackKind(t), layouts: [] }
      byVenue.set(name, v)
    }
    v.layouts.push(t)
  }
  return Array.from(byVenue.values()).sort((a, b) => a.name.localeCompare(b.name))
}

/** "5.75 km / 3.57 miles" → "5.75 km" */
export function trackLength(t: RaceTrack | undefined) {
  const m = (t?.length ?? '').match(/([\d.,]+)\s*km/i)
  return m ? `${m[1].replace(',', '.')} km` : t?.length ?? ''
}

export function matches(text: string, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const t = text.toLowerCase()
  return q.split(/\s+/).every((w) => t.includes(w))
}
