/** The menu rail's areas; `path` is where the area's screens live. */
export const AREAS = [
  { id: 'race', label: 'Race', path: '/race' },
  { id: 'online', label: 'Online', path: '/online' },
  { id: 'replays', label: 'Replays', path: '/replays' },
  { id: 'content', label: 'Content', path: '/stock/content' },
  { id: 'settings', label: 'Settings', path: '/settings' },
  { id: 'profile', label: 'Profile', path: '/stock/profile' },
]

export const areaLabel = (id: string) => AREAS.find((a) => a.id === id)?.label
