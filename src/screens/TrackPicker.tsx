import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { RaceTrack } from '../../reference/rf2-api'
import { selectTrack, useSelection, useTrackMap, useTracks } from '../api/race'
import { groupTracks, matches, trackKind, trackLength, type TrackKind } from '../race/content'
import { Button, Card, Chip, EmptyState, Grid, PrimaryButton, Segmented, SelectableList, Stack, Stats, Text, TextField, TrackMap } from '../ui'

type Kind = TrackKind | 'All'
const KINDS: { value: Kind; label: string }[] = ['All', 'Road', 'Oval', 'Street', 'Karting'].map((k) => ({ value: k as Kind, label: k }))

/** Filters | venues | map, layouts and "Use this track". */
export function TrackPicker() {
  const navigate = useNavigate()
  const { data: tracks, error, reload } = useTracks()
  const { data: sel } = useSelection()
  const venues = useMemo(() => groupTracks(tracks ?? []), [tracks])
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<Kind>('All')
  const [venueId, setVenueId] = useState<string>()
  const [layoutId, setLayoutId] = useState<string>()

  const currentVenue = venues.find((v) => v.layouts.some((l) => l.id === sel?.track?.id))
  const venue = venues.find((v) => v.id === (venueId ?? currentVenue?.id))
  const layout: RaceTrack | undefined =
    venue?.layouts.find((l) => l.id === layoutId) ?? venue?.layouts.find((l) => l.id === sel?.track?.id) ?? venue?.layouts[0]
  const { data: map } = useTrackMap(layout?.id)

  const visible = venues.filter((v) => (kind === 'All' || v.layouts.some((l) => trackKind(l) === kind)) && matches(`${v.name} ${v.layouts.map((l) => l.name).join(' ')}`, query))

  const use = () => {
    if (!layout) return
    void selectTrack(layout)
    navigate(-1)
  }

  return (
    <Stack grow gap={5} pad={[5, 7]}>
      <Stack row gap={4}>
        <Button variant="quiet" onClick={() => navigate(-1)}>‹ Race setup</Button>
        <Text variant="h1">Choose track</Text>
        <Text tone="muted">{tracks ? `${venues.length} venues · ${tracks.length} layouts` : 'Loading tracks…'}</Text>
      </Stack>
      <Grid grow columns="360px minmax(0, 1fr) 640px" gap={5}>
        <Card title="Filters" pad>
          <Stack gap={4}>
            <TextField search value={query} onChange={setQuery} label="Search tracks" placeholder="Venue or layout" navId="search" />
            <Stack gap={1}>
              <Text variant="label">Type</Text>
              <Segmented options={KINDS} value={kind} onChange={setKind} label="Track type" navId="kind" />
            </Stack>
          </Stack>
        </Card>
        <Card title="Venues" scroll>
          {error ? (
            <EmptyState title="Couldn’t load tracks" action={<Button onClick={reload}>Retry</Button>}>{String(error)}</EmptyState>
          ) : visible.length === 0 && tracks ? (
            <EmptyState title="No tracks match" action={<Button onClick={() => { setQuery(''); setKind('All') }}>Clear filters</Button>} />
          ) : (
            <SelectableList
              label="Venues"
              navPrefix="venue-"
              selectedId={venue?.id}
              onChoose={(id) => { setVenueId(id); setLayoutId(undefined) }}
              onFocusItem={(id) => { setVenueId(id); setLayoutId(undefined) }}
              groups={[{ items: visible.map((v) => ({ id: v.id, label: v.name, meta: v.layouts.length > 1 ? `${v.layouts.length} layouts` : undefined, chip: v === currentVenue ? <Chip>Current</Chip> : undefined })) }]}
            />
          )}
        </Card>
        <Card title={venue ? venue.name : undefined} pad>
          {venue && layout ? (
            <Stack gap={4} fill>
              <TrackMap points={map} label={`Map of ${layout.name}`} height={320} />
              <Stats
                columns={3}
                items={[
                  { label: 'Length', value: trackLength(layout) || '—' },
                  { label: 'Type', value: trackKind(layout) },
                  { label: 'Layouts', value: venue.layouts.length },
                ]}
              />
              <Text variant="label">Layout</Text>
              <Stack grow scroll>
                <SelectableList
                  label="Layouts"
                  navPrefix="layout-"
                  selectedId={layout.id}
                  onChoose={setLayoutId}
                  groups={[{ items: venue.layouts.map((l) => ({ id: l.id ?? '', label: l.name ?? '?', meta: trackLength(l) })) }]}
                />
              </Stack>
              <Stack row justify="end">
                <PrimaryButton size="l" onClick={use} hint="Use this track">
                  Use this track
                </PrimaryButton>
              </Stack>
            </Stack>
          ) : (
            <EmptyState title="Pick a venue">Its layouts and map show here.</EmptyState>
          )}
        </Card>
      </Grid>
    </Stack>
  )
}
