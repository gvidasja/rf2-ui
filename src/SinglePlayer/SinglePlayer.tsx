import { Navigate, Routes, useLocation } from 'react-router'
import { Route } from 'react-router-dom'
import { CarSelection } from './CarSelection/CarSelection'
import { OpponentSelection } from './OpponentSelection/OpponentSelection'
import { SinglePlayerHome } from './SinglePlayerHome'
import { TrackSelection } from './TrackSelection/TrackSelection'
import { WeatherSelection } from './WeatherSelection/WeatherSelection'

export function SinglePlayer() {
  const { pathname } = useLocation()

  return (
    <Routes>
      <Route path="car" element={<CarSelection />} />
      <Route path="track" element={<TrackSelection />} />
      <Route path="opponents" element={<OpponentSelection />} />
      <Route path="weather" element={<WeatherSelection />} />
      <Route index element={<SinglePlayerHome />} />
      <Route path="*" element={<Navigate to={pathname} />} />
    </Routes>
  )
}
