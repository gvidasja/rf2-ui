import { useEffect } from 'react'
import { Navigate, Route, HashRouter as Router, Routes, useLocation, useNavigate } from 'react-router-dom'
import { quitGame } from '../api'
import { Community } from '../Community/Community'
import { Competition } from '../Competition/Competition'
// import { Event } from '../Event/Event'
import { MainMenu } from '../MainMenu/MainMenu'
import { MultiPlayer } from '../MultiPlayer/MultiPLayer'
import { Profile } from '../Profile/Profile'
import { Settings } from '../Settings/Settings'
import { switchToStockUi } from '../stockUi'
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
      <KeyboardHandler />
      <div className={styles.TopMenu}>
        <div className={styles.Left}>
          <Breadcrumbs />
        </div>
        <div className={styles.Right}>
          <button onClick={switchToStockUi}>OLD UI</button>
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
          {/* <Route path="/event/*" element={<Event />} /> */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  )
}

function KeyboardHandler() {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (location.pathname === '/') {
          console.log('EXIT?')
        }

        navigate(-1)
      }

      if (e.key === 'F5') {
        window.location.reload()
      }
    }

    window.addEventListener('keydown', handler)

    return () => {
      window.removeEventListener('keydown', handler)
    }
  }, [navigate])

  return <></>
}

function Breadcrumbs() {
  const location = useLocation()

  return <div>{location.pathname.slice(1)}</div>
}
