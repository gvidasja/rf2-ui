import c from 'classnames'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import {
  getCars,
  getOpponentFilter,
  getOpponents,
  updateOpponentFilter,
  type RaceCar,
  type SessionsOpponent,
  type SessionsOpponentFilter,
} from '../../api'
import { Tile } from '../../Tile/Tile'
import styles from './OpponentSelection.module.css'

type OpponentFilter = SessionsOpponentFilter & { selected: boolean; searchCache: string }

export function OpponentSelection() {
  const navigate = useNavigate()
  const [opponents, setOpponents] = useState<SessionsOpponent[]>()
  const [opponentFilter, setOpponentFilter] = useState<OpponentFilter[]>()
  const [onlySelected, setOnlySelected] = useState(false)
  const [search, setSearch] = useState('')
  const [carCache, setCarCache] = useState<Record<string, string>>({})

  const onDone = useCallback(() => navigate(-1), [navigate])

  const processOpponents = (r: SessionsOpponent[]) => setOpponents(r.filter((x) => x))
  const processOpponentFilters = (r: SessionsOpponentFilter[]) =>
    setOpponentFilter(
      r
        .filter((x) => x)
        .map((x) => ({ ...x, selected: x.state !== 'OP_NOTHING', searchCache: x.stringValue.toLowerCase() })),
    )

  const processCars = (r: RaceCar[]) =>
    setCarCache(
      Object.fromEntries(
        r.map((x) => [
          x.name.trim().replace(/ \d+\.\d+$/, ''),
          x.fullPathTree.split(',').at(-1) || 'MISSING_PATH_SEGMENT',
        ]),
      ),
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
    (filter: OpponentFilter) =>
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
              checked={onlySelected}
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
