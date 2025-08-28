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

export function getOpponents() {
  return get('/rest/sessions/opponents')
}

export function getOpponentFilter() {
  return get('/rest/sessions/opponents/filter')
}

export function updateOpponentFilter({ state, vectorIndex }) {
  return postJSON('/rest/sessions/opponents', { state, vectorIndex })
}

export function quitGame() {
  return post('/rest/start/quitGame')
}

export function startRace() {
  return post('/rest/race/startRace')
}

export function getState() {
  return get('/navigation/state')
}

export function getHistory() {
  return get('/rest/watch/standings/history')
}

export function getStandings() {
  return get('/rest/watch/standings')
}

export function drive() {
  return post('/rest/garage/drive')
}

export function kickAi(id) {
  return post(`/rest/sessions/ai/kick/${id}`)
}

export function addAi() {
  return post('/rest/sessions/ai/add')
}

export function stopRace() {
  return post('/rest/garage/toRaceMenu')
}

function get(url) {
  return withRetry(() => fetch(url).then(handleResponse))
}

function post(url, data) {
  return withRetry(() => fetch(url, { method: 'post', body: data }).then(handleResponse))
}

function postJSON(url, data) {
  return withRetry(() =>
    fetch(url, {
      method: 'post',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data),
    }).then(handleResponse),
  )
}

async function withRetry(action) {
  while (true) {
    const result = await action()

    if (result instanceof Retry) {
      await new Promise((r) => setTimeout(r, 1000))
    } else {
      return result
    }
  }
}

class Retry extends Error {}

function handleResponse(response) {
  if (response.status >= 500) {
    return new Retry()
  }

  if ((response.headers.get('content-type') || '').indexOf('application/json') > -1) {
    return response.json()
  } else {
    return response.text()
  }
}

export function asset(src) {
  return process.env.REACT_APP_ASSET_PATH + src
}
