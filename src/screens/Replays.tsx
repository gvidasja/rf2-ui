import { useMemo, useState } from 'react'
import type { Replay } from '../../reference/rf2-api'
import { optionNumber, useOptions } from '../api/options'
import { deleteReplay, renameReplay, REPLAY_ERRORS, useReplays, watchReplay } from '../api/replays'
import { fileSize, parseReplay, replayDate, type ReplayKind } from '../replays/format'
import { Button, Card, ConfirmButton, DataTable, EmptyState, Grid, PrimaryButton, Segmented, Stack, Stats, Text, TextField } from '../ui'

const KINDS: { value: ReplayKind | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'race', label: 'Race' },
  { value: 'qualifying', label: 'Qualifying' },
  { value: 'practice', label: 'Practice' },
  { value: 'hotlap', label: 'Hot laps' },
]

/** Saved replays: newest first, details and actions for the chosen one. */
export function Replays() {
  const { data, error } = useReplays()
  const { data: options } = useOptions()
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<ReplayKind | 'all'>('all')
  const [chosenId, setChosenId] = useState<number>()

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (data ?? [])
      .map((r) => ({ ...r, ...parseReplay(r) }))
      .filter((r) => (kind === 'all' || r.kind === kind) && (!q || `${r.replayName} ${replayDate(r.timestamp)}`.toLowerCase().includes(q)))
      .sort((a, b) => b.timestamp - a.timestamp)
  }, [data, query, kind])
  const chosen = rows.find((r) => r.id === chosenId) ?? rows[0]
  const total = (data ?? []).reduce((n, r) => n + r.size, 0)
  const recording = optionNumber(options?.REPLAYOPT_record_replays)

  return (
    <Grid grow columns="minmax(0, 1fr) 560px" gap={5} pad={[5, 7]}>
      <Card
        title="Replays"
        action={
          <Stack row gap={4}>
            <TextField value={query} onChange={setQuery} label="Search replays" placeholder="Track or date" search />
            <Segmented options={KINDS} value={kind} onChange={setKind} label="Session type" />
          </Stack>
        }
        grow
        scroll
      >
        {error ? (
          <EmptyState title="Replays are not available">The game did not answer.</EmptyState>
        ) : data && rows.length === 0 ? (
          <EmptyState title={data.length ? 'No replay matches' : 'No replays yet'}>
            {data.length ? 'Try another word or session type.' : 'Replays are saved after each session while recording is on (Settings › Replays).'}
          </EmptyState>
        ) : (
          <DataTable
            label="Replays"
            rows={rows}
            rowKey={(r) => String(r.id)}
            selectedKey={chosen ? String(chosen.id) : undefined}
            onRow={(r) => setChosenId(r.id)}
            onFocusRow={(r) => setChosenId(r.id)}
            columns={[
              { key: 'when', header: 'When', render: (r) => replayDate(r.timestamp), width: '200px' },
              { key: 'track', header: 'Track', render: (r) => r.track },
              { key: 'session', header: 'Session', render: (r) => r.session, muted: true, width: '260px' },
              { key: 'size', header: 'Size', render: (r) => fileSize(r.size), numeric: true, width: '120px' },
            ]}
          />
        )}
        {data && (
          <Stack pad={[3, 4]}>
            <Text variant="small" tone="muted">
              {data.length} replays · {fileSize(total)} · Recording {recording === 1 ? 'on' : recording === 0 ? 'off' : '—'} (Settings › Replays)
            </Text>
          </Stack>
        )}
      </Card>
      {chosen ? <ReplayDetails key={chosen.id} replay={chosen} /> : <Card pad />}
    </Grid>
  )
}

function ReplayDetails({ replay }: { replay: Replay & ReturnType<typeof parseReplay> }) {
  const [name, setName] = useState(replay.replayName ?? '')
  const [message, setMessage] = useState<string>()
  const [loading, setLoading] = useState(false)
  const watch = () => {
    setLoading(true)
    void watchReplay(replay.id)
      .then((res) => {
        if (res !== 'REPLAY_ValidToPlay') {
          setMessage(REPLAY_ERRORS[res] ?? 'The replay could not be loaded.')
          setLoading(false)
        }
      })
      .catch(() => {
        setMessage('The replay could not be loaded.')
        setLoading(false)
      })
  }
  const renamed = name.trim() && name.trim() !== replay.replayName

  return (
    <Card title="Replay" pad>
      <Stack gap={5} fill>
        <Stack gap={2}>
          <Text variant="title" weight="bold">
            {replay.track}
          </Text>
          <Text tone="muted">
            {replay.session} · {replayDate(replay.timestamp)}
          </Text>
        </Stack>
        <Stats
          columns={2}
          items={[
            { label: 'Size', value: fileSize(replay.size) },
            { label: 'Saved', value: new Date(replay.timestamp * 1000).toLocaleString('en-GB') },
          ]}
        />
        <Stack row gap={3}>
          <Stack grow>
            <TextField value={name} onChange={setName} label="Replay name" />
          </Stack>
          <Button
            disabled={!renamed}
            onClick={() =>
              void renameReplay(replay.id, name.trim()).then((s) => setMessage(s === 'OK' ? 'Renamed.' : s === 'FILE_EXIST' ? 'A replay with that name exists.' : 'Rename failed.'))
            }
          >
            Rename
          </Button>
        </Stack>
        {message && <Text tone="muted">{message}</Text>}
        <Stack grow />
        <Stack row gap={3}>
          <ConfirmButton variant="danger" question="Delete this replay?" confirmLabel="Delete" onConfirm={() => void deleteReplay(replay.id)}>
            Delete
          </ConfirmButton>
          <Stack grow />
          <PrimaryButton onClick={watch} hint="Watch" busy={loading && 'Loading…'}>
            Watch replay
          </PrimaryButton>
        </Stack>
      </Stack>
    </Card>
  )
}
