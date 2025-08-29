import { Navigate, NavLink, Route, HashRouter as Router, Routes } from 'react-router-dom'
import { quitGame } from '../api'
import { Community } from '../Community/Community'
import { Competition } from '../Competition/Competition'
// import { Event } from '../Event/Event'
import { MainMenu } from '../MainMenu/MainMenu'
import { MultiPlayer } from '../MultiPlayer/MultiPLayer'
import { Profile } from '../Profile/Profile'
import { Settings } from '../Settings/Settings'
import { SinglePlayer } from '../SinglePlayer/SinglePlayer'
import { Watch } from '../Watch/Watch'
import styles from './App.module.css'

// function QuitModal({ onHide }: { onHide: () => void }) {
//   return (
//     <div>
//       <div>Quit?</div>
//       <div>
//         <button onClick={quitGame}>Yes</button>
//         <button onClick={onHide}>No</button>
//       </div>
//     </div>
//   )
// }

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
        <Routes>
          <Route index element={<MainMenu />} />
          <Route path="/sp/*" element={<SinglePlayer />} />
          <Route path="/mp" element={<MultiPlayer />} />
          <Route path="/cmp" element={<Competition />} />
          <Route path="/watch" element={<Watch />} />
          <Route path="/community" element={<Community />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          {/* <Route path="/event" element={<Event />} /> */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  )
}
