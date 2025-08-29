// import { useEffect, useState } from 'react'
// import { Route, Routes, useLocation, useNavigate } from 'react-router'
// import { addAi, drive, getHistory, getStandings, getState, kickAi } from '../api'

// export function Event() {
//   const { pathname } = useLocation()

//   return (
//     <Routes>
//       <Route path={`${pathname}/loading`} element={<EventLoading />} />
//       <Route path={`${pathname}/watch`} element={<EventWatch />} />
//     </Routes>
//   )
// }

// export function EventLoading() {
//   const [refresh, setRefresh] = useState(Date.now())
//   const [state, setState] = useState()
//   const [percentage, setPercentage] = useState(0)
//   const history = useNavigate()

//   useEffect(() => {
//     setInterval(() => setRefresh(Date.now()), 1000)
//   }, [])

//   useEffect(() => {
//     getState().then(setState)
//   }, [refresh])

//   useEffect(() => {
//     if (state && state.loadingStatus) {
//       if (!state.loadingStatus.loading) {
//         history.push(`/event/watch`)
//       }

//       setPercentage(state.loadingStatus.percentage)
//     }
//   }, [state, history])

//   return <div>LOADING {percentage}</div>
// }
// export function EventWatch() {
//   const [refresh, setRefresh] = useState(Date.now())
//   const [state, setState] = useState()
//   const [history, setHistory] = useState()
//   const [standings, setStandings] = useState()

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
