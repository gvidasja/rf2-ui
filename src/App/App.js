import { NavLink, Redirect, Route, HashRouter as Router, Switch } from 'react-router-dom'
import { quitGame } from '../api'
import { Community } from '../Community/Community'
import { Competition } from '../Competition/Competition'
import { Event } from '../Event/Event'
import { MainMenu } from '../MainMenu/MainMenu'
import { MultiPlayer } from '../MultiPlayer/MultiPLayer'
import { Profile } from '../Profile/Profile'
import { Settings } from '../Settings/Settings'
import { SinglePlayer } from '../SinglePlayer/SinglePlayer'
import { Watch } from '../Watch/Watch'
import styles from './App.module.css'

function QuitModal({ onHide }) {
  return (
    <div>
      <div>Quit?</div>
      <div>
        <button onClick={quitGame}>Yes</button>
        <button onClick={onHide}>No</button>
      </div>
    </div>
  )
}

export function App() {
  // const nav = useHistory()

  // const [quitModal, showQuitModal] = useModal(QuitModal)

  // const keys = useMemo({ [KEY.ESC]: showQuitModal }, [nav])

  // useKeyboard(keys)

  return (
    <Router>
      <div className={styles.TopMenu}>
        <div className={styles.Left}>
          <NavLink to="/">rFactor2</NavLink>
          <NavLink to="/event/watch">Race</NavLink>
        </div>
        <div className={styles.Right}>
          <button onClick={quitGame}>EXIT</button>
        </div>
      </div>
      <div className={styles.AppContainer}>
        {/* <img alt="background" className={styles.BackgroundImage} src={asset('bg.jpg')} /> */}
        <Switch>
          <Route path="/sp" component={SinglePlayer} />
          <Route path="/mp" component={MultiPlayer} />
          <Route path="/cmp" component={Competition} />
          <Route path="/watch" component={Watch} />
          <Route path="/community" component={Community} />
          <Route path="/profile" component={Profile} />
          <Route path="/settings" component={Settings} />
          <Route path="/event" component={Event} />
          <Route path="/" component={MainMenu} />
          <Redirect to="/" />
        </Switch>
        {/* {quitModal} */}
      </div>
    </Router>
  )
}
