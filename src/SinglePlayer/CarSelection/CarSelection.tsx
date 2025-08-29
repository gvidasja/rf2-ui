import c from 'classnames'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { getCars, getSelection, selectCar, type RaceCar } from '../../api'
import styles from './CarSelection.module.css'
import { Tree } from './Tree'

export function CarSelection() {
  const navigate = useNavigate()
  const [cars, setCars] = useState<RaceCar[]>()
  const [selected, setSelected] = useState<RaceCar>()

  useEffect(() => {
    getSelection().then((r) => setSelected(r.car))
  }, [])

  const onSelectCar = useCallback((car: RaceCar) => selectCar(car.id).then(() => navigate(-1)), [navigate])

  useEffect(() => {
    getCars().then(setCars)
  }, [])

  return selected && cars ? (
    <div className={styles.CarSelection}>
      <div className={styles.Cars}>
        <Tree onSelect={setSelected} data={cars} getPath={getCarPath} getKey={getCarKey} selected={selected} />
      </div>
      <div className={c(styles.Thumbnail, 'FitImage')}>
        <img alt="car" src={selected.image} key={selected.image} />
      </div>
      <div className={styles.Description}>
        <p>BHP: {selected.bhp}</p>
        <button onClick={() => onSelectCar(selected)}>Select</button>
      </div>
    </div>
  ) : (
    'LOADING'
  )
}

function getCarPath(car: RaceCar) {
  return car.fullPathTree.split(',').map((x) => x.trim())
}

function getCarKey(car: RaceCar) {
  return car.name
}
