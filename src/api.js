export function getSelection() {
  return fetch('/rest/race/selection?locale=en-US').then((r) => r.json())
}

export function getTracks() {
  return fetch('/rest/race/track?locale=en-US').then((r) => r.json())
}

export function selectTrack(id) {
  return fetch('/rest/race/track', { method: 'post', body: id })
}

export function getCars() {
  return fetch('/rest/race/car?locale=en-US').then((r) => r.json())
}

export function selectCar(id) {
  return fetch('/rest/race/car', { method: 'post', body: id })
}
