import { useState, useEffect, useCallback } from 'react'
import c from 'classnames'
import { getCars, getSelection, selectCar } from '../../api'
import styles from './CarSelection.module.css'
import { useHistory } from 'react-router'
import { Tree } from './Tree'

export function CarSelection() {
  const history = useHistory()
  const [cars, setCars] = useState()
  const [selected, setSelected] = useState()

  useEffect(() => {
    getSelection().then((r) => setSelected(r.car))
  }, [])

  const onSelectCar = useCallback((car) => selectCar(car.id).then(() => history.goBack()), [history])

  useEffect(() => getCars().then(setCars), [])

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

function getCarPath(car) {
  return car.fullPathTree.split(',').map((x) => x.trim())
}

function getCarKey(car) {
  return car.name
}
