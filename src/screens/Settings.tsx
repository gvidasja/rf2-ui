import { useMemo, useState } from 'react'
import { confirmGraphics, useGraphicsStatus, useOptions } from '../api/options'
import { OptionRow } from '../settings/OptionControl'
import { SECTIONS } from '../settings/options'
import { Button, Card, EmptyState, Grid, PrimaryButton, SelectableList, Stack, Text, TextField } from '../ui'

const scrollTo = (id: string) => document.getElementById(`settings-${id}`)?.scrollIntoView({ block: 'start' })

/** Two balanced columns, in reading order: each section goes to the currently shorter one. */
function columns<T extends { items: unknown[] }>(sections: T[]): [T[], T[]] {
  const cols: [T[], T[]] = [[], []]
  const height = [0, 0]
  for (const s of sections) {
    const i = height[0] <= height[1] ? 0 : 1
    cols[i].push(s)
    height[i] += s.items.length + 2 // + header and padding
  }
  return cols
}

/** Every option on one page; the index only scrolls. Changes save instantly. */
export function Settings() {
  const { data, error } = useOptions()
  const { data: graphics } = useGraphicsStatus()
  const [query, setQuery] = useState('')
  const [current, setCurrent] = useState(SECTIONS[0].id)

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase()
    return SECTIONS.map((s) => ({
      ...s,
      // only options this game build reports, filtered by the search
      items: s.items.filter((d) => (!data || d.key in data) && (!q || `${d.label} ${d.tags ?? ''} ${s.title}`.toLowerCase().includes(q))),
    })).filter((s) => s.items.length > 0)
  }, [data, query])

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
      <Grid grow columns="300px minmax(0, 1fr)" gap={5} pad={[5, 7]}>
        <Card pad>
          <Stack gap={4}>
            <TextField value={query} onChange={setQuery} label="Find a setting" placeholder="Find a setting" search />
            <SelectableList
              label="Settings sections"
              navPrefix="section-"
              selectedId={current}
              onChoose={(id) => {
                setCurrent(id)
                scrollTo(id)
              }}
              onFocusItem={(id) => {
                setCurrent(id)
                scrollTo(id)
              }}
              groups={[{ items: sections.map((s) => ({ id: s.id, label: s.title, meta: query ? s.items.length : undefined })) }]}
            />
            <Text variant="small" tone="muted">
              Changes save instantly.
            </Text>
          </Stack>
        </Card>
        <Stack grow scroll>
          {error ? (
            <EmptyState title="Settings are not available">The game did not answer.</EmptyState>
          ) : sections.length === 0 ? (
            <EmptyState title="No setting matches">Try another word.</EmptyState>
          ) : (
            <Grid columns={2} gap={5} align="start">
              {columns(sections).map((col, i) => (
                <Stack key={i} gap={5}>
                  {col.map((s) => (
                    <Card key={s.id} anchor={`settings-${s.id}`} title={s.title} pad>
                      {s.items.map((d) => (
                        <OptionRow key={d.key} def={d} />
                      ))}
                    </Card>
                  ))}
                </Stack>
              ))}
            </Grid>
          )}
        </Stack>
      </Grid>
    </Stack>
  )
}
