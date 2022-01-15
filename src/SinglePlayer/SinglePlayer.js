import { TrackSelection } from './TrackSelection/TrackSelection'
import { CarSelection } from './CarSelection/CarSelection'
import { useRouteMatch } from 'react-router'
import { Redirect, Switch, Route } from 'react-router-dom'
import { SinglePlayerHome } from './SinglePlayerHome'

export function SinglePlayer() {
  const { path } = useRouteMatch()
  return (
    <Switch>
      <Route path={`${path}/car`} component={CarSelection} />
      <Route path={`${path}/track`} component={TrackSelection} />
      <Route path={path} component={SinglePlayerHome} />
      <Redirect to={path} />
    </Switch>
  )
}
