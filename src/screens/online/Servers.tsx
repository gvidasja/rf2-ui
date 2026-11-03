import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { MultiplayerJoinState } from '../../../reference/rf2-api'
import {
  addFavorite,
  downloadProgress,
  enterServer,
  JOIN_TEXT,
  joinError,
  joinServer,
  joinState,
  removeFavorite,
  serverKey,
  useServerList,
  useSteamOnline,
  type Server,
  type ServerListKind,
} from '../../api/online'
import { Button, Card, Chip, DataTable, EmptyState, FilterChip, Grid, PrimaryButton, Progress, Segmented, Stack, Stats, Text, TextField } from '../../ui'

const FILTERS = [
  { id: 'players', label: 'Has players', test: (s: Server) => s.players > 0 },
  { id: 'free', label: 'Not full', test: (s: Server) => s.players < s.maxPlayers },
  { id: 'version', label: 'My version', test: (s: Server) => s.versionMatch },
  { id: 'open', label: 'No password', test: (s: Server) => !s.password },
  { id: 'noai', label: 'No AI', test: (s: Server) => s.ai === 0 },
] as const
type FilterId = (typeof FILTERS)[number]['id']

/** Server browser: lists from the game, filters, details and joining. */
export function Servers() {
  const { data: steam } = useSteamOnline()
  const kinds: { value: ServerListKind; label: string }[] = [
    ...(steam === false ? [] : [{ value: 'Internet' as const, label: 'Internet' }]),
    { value: 'Lan', label: 'LAN' },
    { value: 'Favorites', label: 'Favourites' },
    ...(steam === false ? [] : [{ value: 'Friends' as const, label: 'Friends' }]),
  ]
  const [kind, setKind] = useState<ServerListKind>('Internet')
  const list = useServerList(kind)
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<Set<FilterId>>(new Set(['version']))
  const [chosenKey, setChosenKey] = useState<string>()

  const all = useMemo(() => list.body?.serverList ?? [], [list.body])
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return all
      .filter((s) => FILTERS.every((f) => !filters.has(f.id) || f.test(s)))
      .filter((s) => !q || `${s.name} ${s.description}`.toLowerCase().includes(q))
      .sort((a, b) => b.players - a.players || a.ping - b.ping)
  }, [all, filters, query])
  const chosen = rows.find((s) => serverKey(s) === chosenKey) ?? rows[0]

  const toggle = (id: FilterId, on: boolean) =>
    setFilters((f) => {
      const next = new Set(f)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })

  return (
    <Grid grow columns="minmax(0, 1fr) 560px" gap={5} pad={[5, 7]}>
      <Card
        title="Servers"
        action={
          <Stack row gap={3}>
            <Text variant="small" tone="muted">
              {list.done ? `${rows.length} of ${all.length}` : `Finding servers… ${all.length}`}
            </Text>
            <Button size="s" onClick={list.refresh} disabled={!list.done}>
              Refresh
            </Button>
          </Stack>
        }
        grow
        scroll
      >
        <Stack row gap={3} pad={[0, 4]} wrap>
          <Segmented options={kinds} value={kind} onChange={setKind} label="Server list" />
          <TextField value={query} onChange={setQuery} label="Search servers" placeholder="Server or track" search />
          {FILTERS.map((f) => (
            <FilterChip key={f.id} on={filters.has(f.id)} onChange={(on) => toggle(f.id, on)}>
              {f.label}
            </FilterChip>
          ))}
        </Stack>
        {rows.length === 0 ? (
          <EmptyState title={list.done ? (all.length ? 'No server matches' : 'No servers') : 'Finding servers…'}>
            {list.done && all.length ? 'Turn off a filter or try another word.' : undefined}
          </EmptyState>
        ) : (
          <DataTable
            label="Servers"
            rows={rows}
            rowKey={serverKey}
            selectedKey={chosen && serverKey(chosen)}
            onRow={(s) => setChosenKey(serverKey(s))}
            onFocusRow={(s) => setChosenKey(serverKey(s))}
            columns={[
              { key: 'lock', header: '', render: (s) => (s.password ? '🔒' : ''), width: '40px' },
              { key: 'name', header: 'Server', render: (s) => s.name },
              { key: 'track', header: 'Track', render: (s) => s.description, muted: true },
              { key: 'drivers', header: 'Drivers', render: (s) => `${s.players} / ${s.maxPlayers}${s.ai ? ` · ${s.ai} AI` : ''}`, numeric: true, width: '150px' },
              { key: 'ping', header: 'Ping', render: (s) => (s.ping > 0 ? s.ping : '—'), numeric: true, width: '80px' },
            ]}
          />
        )}
      </Card>
      {chosen ? <ServerDetails key={serverKey(chosen)} server={chosen} favourite={kind === 'Favorites'} /> : <Card pad />}
    </Grid>
  )
}

type Joining = { state?: MultiplayerJoinState; mode: 'race' | 'spectate'; download?: { name: string; left: number; percent: number } }

function ServerDetails({ server, favourite }: { server: Server; favourite: boolean }) {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [joining, setJoining] = useState<Joining>()
  const [message, setMessage] = useState<string>()

  // follow the join until it ends one way or another
  useEffect(() => {
    if (!joining) return
    let alive = true
    const tick = async () => {
      const state = await joinState().catch(() => undefined)
      if (!alive) return
      if (state === 'JOIN_JOINED_SERVER' || state === 'JOIN_REJOINED_SERVER') {
        if (joining.mode === 'spectate') void enterServer('spectate')
        else navigate('/online/joined', { replace: false })
        return
      }
      if (state === 'JOIN_INVALID_PASSWORD' || state === 'JOIN_FAILURE') {
        setJoining(undefined)
        if (state === 'JOIN_INVALID_PASSWORD') setMessage('Wrong password.')
        else {
          const e = await joinError()
          setMessage([e.message || 'Could not join the server.', e.missing.length ? `Missing: ${e.missing.join(', ')}` : ''].filter(Boolean).join(' '))
        }
        return
      }
      const download = state?.startsWith('JOIN_DOWNLOADING') ? await downloadProgress() : undefined
      setJoining((j) => j && { ...j, state, download })
      window.setTimeout(() => alive && void tick(), 500)
    }
    void tick()
    return () => {
      alive = false
    }
    // restart only when a new join begins
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joining?.mode])

  const join = (mode: Joining['mode']) => {
    setMessage(undefined)
    setJoining({ mode })
    void joinServer(server, password).catch(() => {
      setJoining(undefined)
      setMessage('Could not join the server.')
    })
  }

  return (
    <Card title="Server" pad>
      <Stack gap={5} fill>
        <Stack gap={2}>
          <Text variant="title" weight="bold">
            {server.name}
          </Text>
          <Text tone="muted">{server.description}</Text>
        </Stack>
        <Stack row gap={2} wrap>
          <Chip>{`${server.players} / ${server.maxPlayers} drivers`}</Chip>
          {server.ai > 0 && <Chip>{`${server.ai} AI`}</Chip>}
          {server.ping > 0 && <Chip>{`${server.ping} ms`}</Chip>}
          <Chip tone={server.versionMatch ? 'good' : 'warn'}>{server.versionMatch ? 'Same version' : `Version ${server.version}`}</Chip>
          {server.password && <Chip>Password</Chip>}
        </Stack>
        <Stats
          columns={2}
          items={[
            { label: 'Address', value: `${server.host}:${server.port}` },
            { label: 'Game version', value: server.version },
          ]}
        />
        {server.password && <TextField value={password} onChange={setPassword} label="Password" placeholder="Server password" type="password" />}
        <Button size="s" variant="quiet" onClick={() => void (favourite ? removeFavorite(server) : addFavorite(server)).then(() => setMessage(favourite ? 'Removed from favourites.' : 'Added to favourites.'))}>
          {favourite ? 'Remove from favourites' : '☆ Add to favourites'}
        </Button>
        {message && <Text tone="muted">{message}</Text>}
        <Stack grow />
        {joining ? (
          <Stack gap={3}>
            {joining.download ? (
              <Progress label={joining.download.name || 'Downloading content'} value={joining.download.percent} detail={joining.download.left ? `${joining.download.left} items left` : undefined} />
            ) : (
              <Text weight="medium">{(joining.state && JOIN_TEXT[joining.state]) || 'Joining…'}</Text>
            )}
          </Stack>
        ) : (
          <Stack row gap={3}>
            <Button onClick={() => join('spectate')} disabled={server.password && !password}>
              Spectate
            </Button>
            <Stack grow />
            <PrimaryButton onClick={() => join('race')} disabled={!server.versionMatch || (server.password && !password)} hint="Join">
              Join and drive
            </PrimaryButton>
          </Stack>
        )}
      </Stack>
    </Card>
  )
}
