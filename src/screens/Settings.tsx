import { useMemo, useState } from 'react'
import { Navigate, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { confirmGraphics, useGraphicsStatus, useOptions } from '../api/options'
import { OptionRow } from '../settings/OptionControl'
import { SECTIONS, type Section } from '../settings/options'
import { Button, Card, EmptyState, Grid, PrimaryButton, SelectableList, Stack, Text, TextField } from '../ui'

const CONTROLS = 'controls'

/** Sections with the options this game build reports, filtered by the search. */
function useSections(query: string) {
  const { data } = useOptions()
  return useMemo(() => {
    const q = query.trim().toLowerCase()
    return SECTIONS.map((s) => ({
      ...s,
      items: s.items.filter((d) => (!data || d.key in data) && (!q || `${d.label} ${d.tags ?? ''} ${s.title}`.toLowerCase().includes(q))),
    })).filter((s) => s.items.length > 0)
  }, [data, query])
}

/**
 * Settings: the section index on the left, one section on the right (its own route, /settings/<id>).
 * While searching, the right side lists the matches from every section. Changes save instantly.
 */
export function SettingsLayout() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { data: graphics } = useGraphicsStatus()
  const [query, setQuery] = useState('')
  const sections = useSections('')
  const matches = useSections(query)
  const current = pathname.split('/')[2]
  const open = (id: string) => navigate(`/settings/${id}`, { replace: true })

  return (
    <Stack grow>
      {graphics && graphics !== 'GRAPH_NO_CHANGE' && (
        <Card pad>
          <Stack row gap={4}>
            <Text weight="bold">Graphics changes need applying</Text>
            <Text tone="muted">The game reloads its graphics.</Text>
            <Stack grow />
            <Button onClick={() => void confirmGraphics(false)}>Revert</Button>
            <PrimaryButton onClick={() => void confirmGraphics(true)}>Apply</PrimaryButton>
          </Stack>
        </Card>
      )}
      <Grid grow columns="280px minmax(0, 1fr)" gap={5} pad={[5, 7]}>
        <Card pad>
          <Stack gap={4}>
            <TextField value={query} onChange={setQuery} label="Find a setting" placeholder="Find a setting" search />
            <SelectableList
              label="Settings sections"
              navPrefix="section-"
              selectedId={query ? undefined : current}
              onChoose={(id) => {
                setQuery('')
                open(id)
              }}
              groups={[
                { items: sections.map((s) => ({ id: s.id, label: s.title, meta: query ? matches.find((m) => m.id === s.id)?.items.length || undefined : undefined })) },
                { items: [{ id: CONTROLS, label: 'Controls' }] },
              ]}
            />
            <Text variant="small" tone="muted">
              Changes save instantly.
            </Text>
          </Stack>
        </Card>
        {query ? <SearchResults sections={matches} /> : <Outlet />}
      </Grid>
    </Stack>
  )
}

/** /settings → the first section. */
export function SettingsIndex() {
  return <Navigate to={`/settings/${SECTIONS[0].id}`} replace />
}

/** One section of options. */
export function SettingsSection() {
  const { section } = useParams()
  const { error } = useOptions()
  const s = useSections('').find((x) => x.id === section)
  if (error) return <EmptyState title="Settings are not available">The game did not answer.</EmptyState>
  if (!s) return SECTIONS.some((x) => x.id === section) ? <Card pad /> : <SettingsIndex />
  return (
    <Stack grow scroll>
      <Card title={s.title} pad>
        {s.items.map((d) => (
          <OptionRow key={d.key} def={d} />
        ))}
      </Card>
    </Stack>
  )
}

function SearchResults({ sections }: { sections: Section[] }) {
  if (!sections.length) return <EmptyState title="No setting matches">Try another word.</EmptyState>
  return (
    <Stack grow scroll gap={5}>
      {sections.map((s) => (
        <Card key={s.id} title={s.title} pad>
          {s.items.map((d) => (
            <OptionRow key={d.key} def={d} />
          ))}
        </Card>
      ))}
    </Stack>
  )
}
