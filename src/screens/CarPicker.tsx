import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Car } from '../../reference/rf2-api'
import { carImage, selectCar, useCars, useSelection } from '../api/race'
import { groupCars, liveryName, matches, type CarModel } from '../race/content'
import { Button, Card, Chip, EmptyState, Grid, Media, PrimaryButton, SelectableList, Stack, Stats, Text, TextField, type ListGroup } from '../ui'

const ALL = '*'

/** Filters | car models grouped by series | details with liveries and "Use this car". */
/**
 * Choose a car and livery. By default the choice becomes the selection and the picker goes back;
 * `onUse` replaces that (in a session the car is changed differently), `back` names where Back goes.
 */
export function CarPicker({ onUse, back = 'Race setup', note }: { onUse?: (car: Car) => void; back?: string | false; note?: string } = {}) {
  const navigate = useNavigate()
  const { data: cars, error, reload } = useCars()
  const { data: sel } = useSelection()
  const models = useMemo(() => groupCars(cars ?? []), [cars])
  const [query, setQuery] = useState('')
  const [series, setSeries] = useState(ALL)
  const [modelId, setModelId] = useState<string>()
  const [liveryId, setLiveryId] = useState<string>()

  const currentModel = models.find((m) => m.liveries.some((l) => l.id === sel?.car?.id))
  const model = models.find((m) => m.id === (modelId ?? currentModel?.id))
  const livery = model?.liveries.find((l) => l.id === liveryId) ?? model?.liveries.find((l) => l.id === sel?.car?.id) ?? model?.liveries[0]

  const seriesCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const m of models) counts.set(m.series, (counts.get(m.series) ?? 0) + 1)
    return Array.from(counts).sort((a, b) => a[0].localeCompare(b[0]))
  }, [models])

  const groups: ListGroup[] = useMemo(() => {
    const byGroup = new Map<string, CarModel[]>()
    for (const m of models) {
      if (series !== ALL && m.series !== series) continue
      if (!matches(`${m.id} ${m.liveries.map((l) => l.name).join(' ')}`, query)) continue
      const g = m.classes.length ? `${m.series} · ${m.classes.join(' · ')}` : m.series
      byGroup.set(g, [...(byGroup.get(g) ?? []), m])
    }
    return Array.from(byGroup, ([title, ms]) => ({
      title,
      items: ms.map((m) => ({ id: m.id, label: m.name, meta: `${m.liveries.length}`, chip: m === currentModel ? <Chip>Current</Chip> : undefined })),
    }))
  }, [models, series, query, currentModel])

  const use = (car: Car | undefined) => {
    if (!car) return
    if (onUse) return onUse(car)
    void selectCar(car)
    navigate(-1)
  }

  return (
    <Stack grow gap={5} pad={[5, 7]}>
      <Stack row gap={4}>
        {back && <Button variant="quiet" onClick={() => navigate(-1)}>‹ {back}</Button>}
        <Text variant="h1">Choose car</Text>
        <Text tone="muted">{cars ? `${models.length} cars · ${cars.length} liveries` : 'Loading cars…'}</Text>
        {note && <Text tone="muted">· {note}</Text>}
      </Stack>
      <Grid grow columns="360px minmax(0, 1fr) 640px" gap={5}>
        <Card title="Filters" scroll pad>
          <Stack gap={4}>
            <TextField search value={query} onChange={setQuery} label="Search cars" placeholder="Car, team or number" navId="search" />
            <Stack gap={1}>
              <Text variant="label">Series</Text>
              <SelectableList
                label="Series"
                navPrefix="series-"
                autoFocus={false}
                selectedId={series}
                onChoose={setSeries}
                groups={[{ items: [{ id: ALL, label: 'All series', meta: models.length }, ...seriesCounts.map(([s, n]) => ({ id: s, label: s, meta: n }))] }]}
              />
            </Stack>
          </Stack>
        </Card>
        <Card title="Cars" scroll>
          {error ? (
            <EmptyState title="Couldn’t load cars" action={<Button onClick={reload}>Retry</Button>}>{String(error)}</EmptyState>
          ) : groups.length === 0 && cars ? (
            <EmptyState title="No cars match" action={<Button onClick={() => { setQuery(''); setSeries(ALL) }}>Clear filters</Button>} />
          ) : (
            <SelectableList label="Cars" navPrefix="car-" groups={groups} selectedId={model?.id} onChoose={(id) => { setModelId(id); setLiveryId(undefined) }} onFocusItem={(id) => { setModelId(id); setLiveryId(undefined) }} />
          )}
        </Card>
        <Card title={model ? 'Selected car' : undefined} pad>
          {model && livery ? (
            <Stack gap={4} fill>
              <Media src={carImage(livery)} label={liveryName(livery)} height={300} />
              <Stack>
                <Text variant="title">{model.name}</Text>
                <Text tone="muted">{liveryName(livery)}</Text>
              </Stack>
              <Stats
                columns={3}
                items={[
                  { label: 'Power', value: livery.bhp || '—' },
                  { label: 'Engine', value: livery.engine || '—' },
                  { label: 'Maker', value: livery.manufacturer || '—' },
                ]}
              />
              <Text variant="label">Livery · {model.liveries.length}</Text>
              <Stack grow scroll>
                <SelectableList
                  label="Liveries"
                  navPrefix="livery-"
                  selectedId={livery.id}
                  onChoose={setLiveryId}
                  groups={[{ items: model.liveries.map((l) => ({ id: l.id ?? '', label: liveryName(l) })) }]}
                />
              </Stack>
              <Stack row justify="end">
                <PrimaryButton size="l" onClick={() => use(livery)} hint="Use this car">
                  Use this car
                </PrimaryButton>
              </Stack>
            </Stack>
          ) : (
            <EmptyState title="Pick a car">Details and liveries show here.</EmptyState>
          )}
        </Card>
      </Grid>
    </Stack>
  )
}
