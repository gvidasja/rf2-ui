import { useCallback, useState, useEffect } from 'react'
import c from 'classnames'
import { getCars, getOpponentFilter, getOpponents, updateOpponentFilter } from '../../api'
import { Tile } from '../../Tile/Tile'
import styles from './OpponentSelection.module.css'
import { useHistory } from 'react-router'

export function OpponentSelection() {
  const history = useHistory()
  const [opponents, setOpponents] = useState()
  const [opponentFilter, setOpponentFilter] = useState()
  const [onlySelected, setOnlySelected] = useState(false)
  const [search, setSearch] = useState('')
  const [carCache, setCarCache] = useState({})

  const onDone = useCallback(() => history.goBack(), [history])

  const processOpponents = (r) => setOpponents(r.filter((x) => x))
  const processOpponentFilters = (r) =>
    setOpponentFilter(
      r
        .filter((x) => x)
        .map((x) => ({ ...x, selected: x.state !== 'OP_NOTHING', searchCache: x.stringValue.toLowerCase() })),
    )

  const processCars = (r) =>
    setCarCache(
      Object.fromEntries(r.map((x) => [x.name.trim().replace(/ \d+\.\d+$/, ''), x.fullPathTree.split(',').at(-1)])),
    )

  useEffect(() => {
    getCars().then(processCars)
  }, [])

  useEffect(() => {
    getOpponentFilter().then(processOpponentFilters)
  }, [])

  useEffect(() => {
    getOpponents().then(processOpponents)
  }, [])

  const onToggleFilter = useCallback(
    (filter) =>
      updateOpponentFilter({ vectorIndex: filter.gSelectedListIndex, state: filter.selected ? 0 : 1 }).then(
        ({ opponents, filters }) => {
          processOpponents(opponents)
          processOpponentFilters(filters)
        },
      ),
    [],
  )

  return opponents && opponentFilter ? (
    <div className={styles.OpponentSelection}>
      <Tile row="1/-1" col="1" className={styles.Filter}>
        <div className={styles.Options}>
          <input value={search} placeholder="Search..." onChange={(e) => setSearch(e.target.value)} />
          <label htmlFor="onlySelected">
            <input
              id="onlySelected"
              type="checkbox"
              value={onlySelected}
              onChange={() => setOnlySelected(!onlySelected)}
            />
            <span>Selected Only</span>
          </label>
        </div>
        <div className={styles.List}>
          {opponentFilter
            .filter((x) => (!onlySelected || x.selected) && (!search || x.searchCache.includes(search)))
            .map((x) => (
              <div
                onClick={() => onToggleFilter(x)}
                key={x.gSelectedListIndex}
                style={x.selected ? { background: 'red' } : {}}
              >
                {x.stringValue}
              </div>
            ))}
        </div>
      </Tile>
      <Tile row="1/-1" col="2/-1" className={styles.OpponentsContainer}>
        <div className={c(styles.List, styles.Opponents)}>
          {opponents.map((x) => (
            <>
              <div key={'car_' + x.id}>{carCache[x.name]}</div>
              <div key={'name_' + x.id}>{x.name}</div>
            </>
          ))}
        </div>
        <button onClick={onDone}>Done</button>
      </Tile>
    </div>
  ) : (
    'LOADING'
  )
}
