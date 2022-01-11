import { HashRouter as Router, Switch, Route, NavLink, Redirect } from 'react-router-dom'
import { SinglePlayerRaceSetup } from './SinglePlayerRaceSetup'
import { MultiPlayerRaceSetup } from './MultiPlayerRaceSetup'
import { CompetitionRaceSetup } from './CompetitionRaceSetup'
import styles from './App.module.css'

export function App() {
  return (
    <Router>
      <div className={styles.TopMenu}>
        <div className={styles.Left}>
          <NavLink to="/">rFactor2</NavLink>
        </div>
        <div className={styles.Right}>
          <button onClick={() => fetch('/rest/start/quitGame', { method: 'post' })}>EXIT</button>
        </div>
      </div>
      <Switch>
        <Route path="/sp" component={SinglePlayerRaceSetup} />
        <Route path="/mp" component={MultiPlayerRaceSetup} />
        <Route path="/cmp" component={CompetitionRaceSetup} />
        <Route path="/" component={MainMenu} />
        <Redirect to="/" />
      </Switch>
    </Router>
  )
}

function MainMenu() {
  return (
    <div className={styles.MenuGrid}>
      <NavLink to="/sp">
        <div className={styles.MenuItem}>Single Player Race</div>
      </NavLink>
      <NavLink to="/mp">
        <div className={styles.MenuItem}>Multiplayer</div>
      </NavLink>
      <NavLink to="/cmp">
        <div className={styles.MenuItem}>Competition</div>
      </NavLink>
    </div>
  )
}
