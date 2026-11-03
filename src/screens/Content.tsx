import { useMemo, useState } from 'react'
import { canInstall, groupName, groupStatus, groupType, groupVersion, isCore, setPackageTarget, syncWorkshop, usePackages, usePackagesStatus, useWorkshopStatus, type PackageGroup } from '../api/content'
import { Button, Card, Chip, DataTable, EmptyState, Grid, Progress, Segmented, Stack, Text, TextField } from '../ui'

type Show = 'all' | 'installed' | 'not-installed' | 'pending'
type Source = 'all' | 'STORE' | 'WORKSHOP' | 'LOCAL'

const SHOW: { value: Show; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'installed', label: 'Installed' },
  { value: 'not-installed', label: 'Not installed' },
  { value: 'pending', label: 'Pending' },
]
const SOURCES: { value: Source; label: string }[] = [
  { value: 'all', label: 'Any source' },
  { value: 'STORE', label: 'Store' },
  { value: 'WORKSHOP', label: 'Workshop' },
  { value: 'LOCAL', label: 'Local' },
]
const SOURCE_LABEL: Record<string, string> = { STORE: 'Store', WORKSHOP: 'Workshop', LOCAL: 'Local' }

const matchesShow = (g: PackageGroup, show: Show) =>
  show === 'all' ||
  (show === 'installed' && g.state === 'INSTALLED') ||
  (show === 'not-installed' && g.state !== 'INSTALLED') ||
  (show === 'pending' && g.state !== g.targetState)

/** Installed and available content packages; install / uninstall runs in the background. */
export function Content() {
  const { data, error } = usePackages()
  const { data: status } = usePackagesStatus()
  const { data: workshop } = useWorkshopStatus()
  const [show, setShow] = useState<Show>('all')
  const [source, setSource] = useState<Source>('all')
  const [query, setQuery] = useState('')

  const all = useMemo(() => (data ?? []).filter((g) => !isCore(g)), [data])
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return all
      .filter((g) => matchesShow(g, show) && (source === 'all' || g.origin === source))
      .filter((g) => !q || `${g.groupName} ${g.content.map((c) => c.name).join(' ')}`.toLowerCase().includes(q))
      .sort((a, b) => groupName(a).localeCompare(groupName(b)))
  }, [all, show, source, query])
  const installed = all.filter((g) => g.state === 'INSTALLED').length
  const pending = all.filter((g) => g.state !== g.targetState).length
  const busy = status && status.state !== 'IDLE'

  return (
    <Stack grow gap={5} pad={[5, 7]}>
      <Grid columns="repeat(3, minmax(0, 1fr))" gap={5}>
        <Card title="Packages" pad>
          <Text variant="title" weight="bold">
            {data ? `${installed} of ${all.length} installed` : '—'}
          </Text>
          <Text tone="muted">{pending ? `${pending} waiting to install or uninstall` : 'Nothing pending'}</Text>
        </Card>
        <Card title="Installing" pad>
          {busy ? (
            <Progress label={status!.state.toLowerCase().replace(/_/g, ' ')} value={status!.percentage <= 1 ? status!.percentage * 100 : status!.percentage} />
          ) : (
            <Text tone="muted">Idle</Text>
          )}
        </Card>
        <Card title="Steam Workshop" action={<Button size="s" onClick={() => void syncWorkshop()} disabled={!workshop || workshop.syncing}>{workshop?.syncing ? 'Syncing…' : 'Sync'}</Button>} pad>
          <Text variant="title" weight="bold">
            {workshop ? `${workshop.subscribedItems} subscribed` : '—'}
          </Text>
          <Text tone="muted">
            {!workshop
              ? ''
              : workshop.restartRequired
                ? 'Restart the game to finish updating'
                : workshop.itemsNeedUpdating
                  ? `${workshop.itemsNeedUpdating} items need updating`
                  : 'Up to date'}
          </Text>
        </Card>
      </Grid>
      <Card
        title="Content"
        action={
          <Stack row gap={3}>
            <Segmented options={SHOW} value={show} onChange={setShow} label="Show" />
            <Segmented options={SOURCES} value={source} onChange={setSource} label="Source" />
            <TextField value={query} onChange={setQuery} label="Search content" placeholder="Name" search />
          </Stack>
        }
        grow
        scroll
      >
        {error ? (
          <EmptyState title="Content is not available">The game did not answer.</EmptyState>
        ) : data && !rows.length ? (
          <EmptyState title="No package matches">Change the filters or the search.</EmptyState>
        ) : (
          <DataTable
            label="Packages"
            rows={rows}
            rowKey={(g) => String(g.id)}
            columns={[
              { key: 'name', header: 'Package', render: groupName },
              { key: 'type', header: 'Type', render: groupType, muted: true, width: '160px' },
              { key: 'source', header: 'Source', render: (g) => SOURCE_LABEL[g.origin] ?? g.origin, muted: true, width: '130px' },
              { key: 'version', header: 'Version', render: groupVersion, width: '120px' },
              {
                key: 'status',
                header: 'Status',
                render: (g) => {
                  const s = groupStatus(g)
                  return <Chip tone={s.tone}>{s.text}</Chip>
                },
                width: '170px',
              },
              { key: 'action', header: '', render: (g) => <PackageAction g={g} />, width: '150px' },
            ]}
          />
        )}
      </Card>
    </Stack>
  )
}

function PackageAction({ g }: { g: PackageGroup }) {
  const installed = g.targetState === 'INSTALLED'
  if (!installed && !canInstall(g)) return null
  // still on its way in: taking the install back is a cancel
  const text = !installed ? 'Install' : g.state !== 'INSTALLED' ? 'Cancel' : 'Uninstall'
  return (
    <Button size="s" variant={installed ? 'quiet' : 'secondary'} onClick={() => void setPackageTarget(g.id, !installed)} label={`${text} ${groupName(g)}`}>
      {text}
    </Button>
  )
}
