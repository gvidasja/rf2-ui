import { HashRouter as Router, Switch, Route, NavLink, Redirect } from 'react-router-dom'
import { SinglePlayer } from '../SinglePlayer/SinglePlayer'
import { MultiPlayer } from '../MultiPlayer/MultiPLayer'
import { Competition } from '../Competition/Competition'
import styles from './App.module.css'
import { asset, quitGame } from '../api'
import { MainMenu } from '../MainMenu/MainMenu'
import { Watch } from '../Watch/Watch'
import { Community } from '../Community/Community'
import { Profile } from '../Profile/Profile'
import { Settings } from '../Settings/Settings'

export function App() {
  return (
    <Router>
      <div className={styles.TopMenu}>
        <div className={styles.Left}>
          <NavLink to="/">rFactor2</NavLink>
        </div>
        <div className={styles.Right}>
          <button onClick={quitGame}>EXIT</button>
        </div>
      </div>
      <div className={styles.AppContainer}>
        <img alt="background" className={styles.BackgroundImage} src={asset('bg.jpg')} />
        <Switch>
          <Route path="/sp" component={SinglePlayer} />
          <Route path="/mp" component={MultiPlayer} />
          <Route path="/cmp" component={Competition} />
          <Route path="/watch" component={Watch} />
          <Route path="/community" component={Community} />
          <Route path="/profile" component={Profile} />
          <Route path="/settings" component={Settings} />
          <Route path="/" component={MainMenu} />
          <Redirect to="/" />
        </Switch>
      </div>
    </Router>
  )
}
