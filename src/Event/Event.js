import { useEffect, useState } from 'react'
import { Route, Switch, useHistory, useRouteMatch } from 'react-router'
import { addAi, drive, getHistory, getStandings, getState, kickAi } from '../api'

export function Event() {
  const { path } = useRouteMatch()

  return (
    <Switch>
      <Route path={`${path}/loading`} component={EventLoading} />
      <Route path={`${path}/watch`} component={EventWatch} />
    </Switch>
  )
}

export function EventLoading() {
  const [refresh, setRefresh] = useState(Date.now())
  const [state, setState] = useState()
  const [percentage, setPercentage] = useState(0)
  const history = useHistory()

  useEffect(() => {
    setInterval(() => setRefresh(Date.now()), 1000)
  }, [])

  useEffect(() => {
    getState().then(setState)
  }, [refresh])

  useEffect(() => {
    if (state && state.loadingStatus) {
      if (!state.loadingStatus.loading) {
        history.push(`/event/watch`)
      }

      setPercentage(state.loadingStatus.percentage)
    }
  }, [state, history])

  return <div>LOADING {percentage}</div>
}
export function EventWatch() {
  const [refresh, setRefresh] = useState(Date.now())
  const [state, setState] = useState()
  const [history, setHistory] = useState()
  const [standings, setStandings] = useState()

  useEffect(() => {
    setInterval(() => setRefresh(Date.now()), 1000)
  }, [])

  useEffect(() => {
    getState().then(setState)
    getHistory().then(setHistory)
    getStandings().then((r) => setStandings(r.sort((a, b) => a.position - b.position)))
  }, [refresh])

  return (
    <div style={{ color: 'white' }}>
      {(standings || []).map((x) => (
        <div key={x.slotID}>
          {x.slotID} {x.position} {x.carClass} {x.driverName} {x.vehicleName}{' '}
          <button onClick={() => kickAi(x.slotID)}>KICK</button>
        </div>
      ))}
      <button onClick={addAi}>ADD AI</button> <button onClick={drive}>Drive</button>
    </div>
  )
}
