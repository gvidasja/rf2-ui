export function getSelection() {
  return get('/rest/race/selection?locale=en-US')
}

export function getTracks() {
  return get('/rest/race/track?locale=en-US')
}

export function getTrackMap(id) {
  return get(`/rest/race/track/${id}/trackmap`)
}

export function selectTrack(id) {
  return post('/rest/race/track', id)
}

export function getCars() {
  return get('/rest/race/car?locale=en-US')
}

export function selectCar(id) {
  return post('/rest/race/car', id)
}

export function updateSessionCount(key, value) {
  return post(`/rest/sessions/${key}/sessions`, value)
}

const SESSION_COUNT_KEYS = ['PRACTICE', 'QUALIFY', 'WARMUP', 'RACE']
const SESSION_COUNT_MAX = {
  WARMUP: 1,
  DEFAULT: 4,
}

export function updateSetting(key, value) {
  return SESSION_COUNT_KEYS.includes(key)
    ? post(`/rest/sessions/${key.toLowerCase()}/sessions`, value).then(() => ({
        currentValue: Math.min(Math.max(0, value), SESSION_COUNT_MAX[key] || SESSION_COUNT_MAX.DEFAULT),
      }))
    : postJSON('/rest/sessions/settings', { sessionSetting: key, value })
}

export async function getSettings() {
  return {
    ...(await get('/rest/sessions')),
    ...(await getSessionsAmount()),
  }
}

function getSessionsAmount() {
  return get('/rest/sessions/amount').then((r) =>
    Object.fromEntries(Object.entries(r).map(([key, currentValue]) => [key, { valueType: 'LONG', currentValue }])),
  )
}

export function quitGame() {
  return post('/rest/start/quitGame')
}

function get(url) {
  return fetch(url).then(handleResponse)
}

function post(url, data) {
  return fetch(url, { method: 'post', body: data }).then(handleResponse)
}

function postJSON(url, data) {
  return fetch(url, {
    method: 'post',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(data),
  }).then(handleResponse)
}

function handleResponse(response) {
  if ((response.headers.get('content-type') || '').indexOf('application/json') > -1) {
    return response.json()
  } else {
    return response.text()
  }
}

export function asset(src) {
  return process.env.REACT_APP_ASSET_PATH + src
}
