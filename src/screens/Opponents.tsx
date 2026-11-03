import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clearOpponentFilters, FILTER_STATES, setOpponentFilter, useOpponentFilters, useOpponents } from '../api/sessions'
import { matches, stripVersion } from '../race/content'
import { SettingLine } from '../race/SettingControl'
import { Button, Card, Chip, DataTable, EmptyState, Grid, PrimaryButton, SettingRow, Stack, Text, TextField, TriStateFilter } from '../ui'

/** Which cars the AI may use: include / require / exclude per class or series, with the result live. */
export function Opponents() {
  const navigate = useNavigate()
  const { data: filters } = useOpponentFilters()
  const { data: opponents } = useOpponents()
  const [query, setQuery] = useState('')

  const rows = useMemo(() => {
    const named = (filters ?? []).filter((f) => f.stringValue && f.stringValue !== '-')
    const active = named.filter((f) => f.state && f.state !== 'OP_NOTHING')
    const rest = named.filter((f) => !active.includes(f) && matches(f.stringValue ?? '', query))
    // active filters first, so what shapes the field is always visible
    return [...active.filter((f) => matches(f.stringValue ?? '', query)), ...rest].slice(0, 200)
  }, [filters, query])

  const activeCount = (filters ?? []).filter((f) => f.state && f.state !== 'OP_NOTHING').length

  return (
    <Stack grow gap={5} pad={[5, 7]}>
      <Stack row gap={4}>
        <Button variant="quiet" onClick={() => navigate(-1)}>‹ Race setup</Button>
        <Text variant="h1">Opponent field</Text>
        <Text tone="muted">AI pick their cars from this field</Text>
      </Stack>
      <Grid grow columns="minmax(0, 1fr) minmax(0, 1fr) 480px" gap={5}>
        <Card title={`Filters${activeCount ? ` · ${activeCount} active` : ''}`} action={<Button size="s" variant="quiet" onClick={() => void clearOpponentFilters()} disabled={!activeCount}>Clear all</Button>} scroll>
          <Stack pad={[0, 4]}>
            <TextField search value={query} onChange={setQuery} label="Find a class or series" placeholder="Find a class or series" navId="search" />
          </Stack>
          {rows.map((f) => (
            <SettingRow key={f.gSelectedListIndex} label={f.stringValue}>
              <TriStateFilter
                value={Math.max(0, FILTER_STATES.indexOf((f.state ?? 'OP_NOTHING') as (typeof FILTER_STATES)[number]))}
                onChange={(v) => void setOpponentFilter(f, v)}
                label={f.stringValue ?? ''}
                navId={`filter-${f.gSelectedListIndex}`}
              />
            </SettingRow>
          ))}
        </Card>
        <Card title={`Matching cars · ${opponents?.length ?? '…'}`} action={<Text variant="small" tone="muted">Include any · require all · exclude none</Text>} scroll>
          {opponents && opponents.length === 0 ? (
            <EmptyState title="No cars match">Loosen a filter, or clear all to use every car.</EmptyState>
          ) : (
            <DataTable
              label="Matching cars"
              rows={opponents ?? []}
              rowKey={(o) => String(o.id)}
              columns={[{ key: 'car', header: 'Car', render: (o) => stripVersion(o.name ?? '') }]}
            />
          )}
        </Card>
        <Card title="Grid">
          <SettingLine k="SESSSET_Num_Opponents" note="Up to 103" />
          <SettingRow label="Cars in field">
            <Chip>{opponents?.length ?? '…'}</Chip>
          </SettingRow>
          <Stack row justify="end" pad={4}>
            <PrimaryButton onClick={() => navigate(-1)} hint="Done">
              Done
            </PrimaryButton>
          </Stack>
        </Card>
      </Grid>
    </Stack>
  )
}
