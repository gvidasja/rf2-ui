import { useState, useEffect } from 'react'
import c from 'classnames'
import { getCars } from './api'
import styles from './CarSelection.module.css'

export function CarSelection({ onSelectCar, selected: initSelected, onHide }) {
  const [cars, setCars] = useState()
  const [selected, setSelected] = useState(initSelected)

  useEffect(() => {
    getCars().then((cars) => {
      const tree = { children: {} }

      cars.forEach((car) => {
        const path = car.fullPathTree.split(',').map((x) => x.trim())
        let node = tree

        while (path.length > 0) {
          const el = path.shift()
          node.children[el] = node.children[el] || { children: {}, parent: node, category: true }
          node = node.children[el]
        }

        node.children[car.name] = car
      })

      setCars(tree)
    })
  }, [])

  return (
    <div className={styles.CarSelection}>
      <div className={styles.Cars}>
        {cars ? <Tree onSelect={setSelected} node={cars} selected={selected} /> : 'Loading'}
      </div>
      <div className={c(styles.Thumbnail, 'FitImage')}>
        <img alt="car" src={selected.image} key={selected.image} />
      </div>
      <div className={styles.Description}>
        <p>BHP: {selected.bhp}</p>
        <button
          onClick={() => {
            onSelectCar(selected)
            onHide()
          }}
        >
          Select
        </button>
      </div>
    </div>
  )
}

function Tree({ node, onSelect, selected }) {
  const [expanded, setExpanded] = useState()

  return Object.entries(node.children)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, child]) => (
      <div key={key}>
        <div
          className={selected.name === key ? styles.Selected : ''}
          onClick={(e) => {
            e.stopPropagation()

            if (child.category) {
              setExpanded(key === expanded ? '' : key)
            } else {
              onSelect(child)
            }
          }}
        >
          {key}
        </div>
        <div className={styles.Indent}>
          {!!child.children && key === expanded ? (
            <Tree node={child} onSelect={onSelect} selected={selected} />
          ) : (
            ''
          )}
        </div>
      </div>
    ))
}
