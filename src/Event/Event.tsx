// import { useEffect, useRef, useState } from 'react'
// import { Route, Routes, useNavigate } from 'react-router'
// import {
//   addAi,
//   drive,
//   getHistory,
//   getStandings,
//   getState,
//   kickAi,
//   type NavigationState,
//   type WatchStanding,
// } from '../api'

// export function Event() {
//   return (
//     <Routes>
//       <Route path="loading" element={<EventLoading />} />
//       <Route path="watch" element={<EventWatch />} />
//     </Routes>
//   )
// }

// export function EventLoading() {
//   const refreshInterval = useRef(0)

//   const [refresh, setRefresh] = useState(Date.now())
//   const [state, setState] = useState<NavigationState>()
//   const navigate = useNavigate()

//   useEffect(() => {
//     refreshInterval.current = window.setInterval(() => setRefresh(Date.now()), 1000)

//     return () => {
//       clearInterval(refreshInterval.current)
//     }
//   }, [])

//   useEffect(() => {
//     getState().then((state) => {
//       if (state && state.loadingStatus && !state.loadingStatus.loading) {
//         navigate('/event/watch')
//       }

//       setState(state)
//     })
//   }, [refresh])

//   return <div>LOADING {state?.loadingStatus.percentage}</div>
// }
// export function EventWatch() {
//   const [refresh, setRefresh] = useState(Date.now())
//   const [state, setState] = useState<NavigationState>()
//   const [history, setHistory] = useState()
//   const [standings, setStandings] = useState<WatchStanding[]>()

//   useEffect(() => {
//     setInterval(() => setRefresh(Date.now()), 1000)
//   }, [])

//   useEffect(() => {
//     getState().then(setState)
//     getHistory().then(setHistory)
//     getStandings().then((r) => setStandings(r.sort((a, b) => a.position - b.position)))
//   }, [refresh])

//   return (
//     <div style={{ color: 'white' }}>
//       {(standings || []).map((x) => (
//         <div key={x.slotID}>
//           {x.slotID} {x.position} {x.carClass} {x.driverName} {x.vehicleName}{' '}
//           <button onClick={() => kickAi(x.slotID)}>KICK</button>
//         </div>
//       ))}
//       <button onClick={addAi}>ADD AI</button> <button onClick={drive}>Drive</button>
//     </div>
//   )
// }
