import { useMemo, useState } from 'react'
import type { Setting } from '../../../reference/rf2-api'
import { loadDefaultSetup, loadSetup, saveSetup, setGarageValue, setSymmetric, useGarage, useGarageMeta, useSetups, type GarageMeta } from '../../api/session'
import { GARAGE_CAPTIONS, GARAGE_LABELS, GARAGE_TABS } from '../../session/garageLabels'
import { Button, Card, Chip, EmptyState, Grid, SelectableList, SettingRow, Stack, Stepper, Text, TextField, Toggle } from '../../ui'

const TABS = [
  { id: 'powertrain', label: 'Powertrain', note: 'gears · diff · engine' },
  { id: 'wheels-brakes', label: 'Wheels & brakes' },
  { id: 'suspension-aero', label: 'Suspension & aero' },
  { id: 'dampers', label: 'Dampers' },
  { id: 'chassis', label: 'Chassis' },
  { id: 'strategy', label: 'Strategy', note: 'fuel · pit' },
]
const CORNERS = ['W_FL', 'W_FR', 'W_RL', 'W_RR'] as const
const CORNER_LABELS = ['Front left', 'Front right', 'Rear left', 'Rear right']
// Fuel and pit stops (absent from the stock tab map, which puts fuel under powertrain) live in Strategy.
const STRATEGY = /^VM_(FUEL_LEVEL|NUM_PITSTOPS|PITSTOP_\d+)$/
const tabOf = (key: string) => (STRATEGY.test(key) ? 'strategy' : (GARAGE_TABS[key] ?? 'chassis'))
const NOT_ADJUSTABLE = /^(N\/A|Non-adjustable|Fixed)$/i

type Row = { kind: 'single'; key: string; label: string } | { kind: 'corners'; base: string; label: string; keys: (string | undefined)[] }

/** Setup by category: settings change in place (absolute values), saved setups on the right. */
export function Garage() {
  const { data: garage, error } = useGarage()
  const { data: meta } = useGarageMeta()
  const [tab, setTab] = useState('suspension-aero')

  const rows = useMemo(() => buildRows(garage, meta, tab), [garage, meta, tab])
  const changed = useMemo(() => Object.values(garage ?? {}).filter((s) => s.stringValue !== s.lastSavedStringValue).length, [garage])
  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const t of TABS) c[t.id] = buildRows(garage, meta, t.id).length
    return c
  }, [garage, meta])

  return (
    <Grid grow columns="320px minmax(0, 1fr) 440px" gap={5} pad={[5, 7]}>
      <Card title="Setup" scroll>
        <SelectableList
          label="Setup categories"
          navPrefix="cat-"
          selectedId={tab}
          onChoose={setTab}
          onFocusItem={setTab}
          groups={[{ items: TABS.filter((t) => !garage || counts[t.id] > 0 || t.id === tab).map((t) => ({ id: t.id, label: t.label, meta: counts[t.id] || undefined })) }]}
        />
      </Card>
      <Card
        title={TABS.find((t) => t.id === tab)?.label}
        action={
          <Stack row gap={3}>
            {meta?.fixedSetupRace && <Chip tone="warn">Fixed setup</Chip>}
            {changed > 0 && <Chip tone="warn">{changed} changed</Chip>}
            <Text variant="small" tone="muted">Same left and right</Text>
            <Toggle on={!!garage && isSymmetric(garage)} onChange={(on) => void setSymmetric(on)} label="Same left and right" />
          </Stack>
        }
        scroll
      >
        {error ? (
          <EmptyState title="No car in the garage">Setup is available while your car is in the session.</EmptyState>
        ) : rows.length === 0 ? (
          <EmptyState title="Nothing to adjust here">This car has no adjustable settings in this category.</EmptyState>
        ) : (
          <>
            {rows.some((r) => r.kind === 'corners') && (
              <Grid columns="minmax(0, 1fr) repeat(4, 200px)" gap={2} pad={[2, 4]}>
                <span />
                {CORNER_LABELS.map((c) => (
                  <Text key={c} variant="label">{c}</Text>
                ))}
              </Grid>
            )}
            {rows.map((r) =>
              r.kind === 'single' ? (
                <SettingRow key={r.key} label={r.label} disabledReason={lockedReason(meta, r.key)}>
                  <GarageStepper setting={garage![r.key]} label={r.label} disabled={!!lockedReason(meta, r.key)} />
                </SettingRow>
              ) : (
                <Grid key={r.base} columns="minmax(0, 1fr) repeat(4, 200px)" gap={2} pad={[2, 4]} align="center">
                  <Text>{r.label}</Text>
                  {r.keys.map((k, i) =>
                    k ? <GarageStepper key={k} setting={garage![k]} label={`${r.label}, ${CORNER_LABELS[i]}`} disabled={!!lockedReason(meta, k)} /> : <span key={i} />,
                  )}
                </Grid>
              ),
            )}
          </>
        )}
      </Card>
      <SetupsCard />
    </Grid>
  )
}

function GarageStepper({ setting, label, disabled }: { setting: Setting; label: string; disabled?: boolean }) {
  const changed = setting.stringValue !== setting.lastSavedStringValue
  return (
    <Stepper
      value={setting.value}
      min={setting.minValue}
      max={setting.maxValue}
      format={(v) => (v === setting.value ? (setting.stringValue ?? String(v)).trim() : '…')}
      onChange={(v) => void setGarageValue(setting.key!, v)}
      label={label}
      disabled={disabled}
      was={changed ? setting.lastSavedStringValue : undefined}
      navId={setting.key}
    />
  )
}

function SetupsCard() {
  // the list also has one entry per track folder ("Adelaide\\"); only setups can be loaded
  const setups = useSetups().data?.filter((s) => s.name && !/[\\/]$/.test(s.name))
  const [name, setName] = useState('')
  return (
    <Card title="Saved setups" scroll pad>
      <Stack gap={4}>
        <Stack row gap={2}>
          <Stack grow>
            <TextField value={name} onChange={setName} label="Setup name" placeholder="Name this setup" />
          </Stack>
          <Button onClick={() => name.trim() && void saveSetup(name.trim()).then(() => setName(''))} disabled={!name.trim()}>
            Save
          </Button>
        </Stack>
        <Button full variant="quiet" onClick={() => void loadDefaultSetup()}>
          Load factory defaults
        </Button>
        {(setups ?? []).length === 0 ? (
          <Text tone="muted">No saved setups for this car and track.</Text>
        ) : (
          (setups ?? []).map((s) => (
            <SettingRow key={s.name} label={s.name} note={s.modified}>
              <Button size="s" onClick={() => void loadSetup(s.name!)}>
                Load
              </Button>
            </SettingRow>
          ))
        )}
      </Stack>
    </Card>
  )
}

function isAdjustable(s: Setting | undefined, meta: GarageMeta | undefined, key: string) {
  if (!s) return false
  if (meta) return key in meta.settings
  return s.maxValue > s.minValue && !NOT_ADJUSTABLE.test((s.stringValue ?? '').trim())
}

function lockedReason(meta: GarageMeta | undefined, key: string) {
  return meta?.settings[key]?.locked ? 'Locked by the series rules' : undefined
}

/** The stock labels assume a front/rear section; this page lists them together, so add the side. */
function label(key: string, s: Setting | undefined) {
  const base = baseLabel(key, s)
  const side = /(^|_)FRONT_/.test(key) ? 'Front' : /(^|_)REAR_/.test(key) ? 'Rear' : ''
  const third = /_3RD_/.test(key) ? ' (third spring)' : ''
  if (!side || /front|rear/i.test(base)) return base + third
  return `${side} ${base.charAt(0).toLowerCase()}${base.slice(1)}${third}`
}

function baseLabel(key: string, s: Setting | undefined) {
  if (key === 'VM_NUM_PITSTOPS') return 'Planned pit stops'
  const stop = key.match(/^VM_PITSTOP_(\d+)$/)
  if (stop) return `Fuel at stop ${stop[1]}`
  const caption = s?.caption?.trim()
  if (caption && GARAGE_CAPTIONS[caption]) return GARAGE_CAPTIONS[caption]
  if (GARAGE_LABELS[key]) return GARAGE_LABELS[key]
  if (caption && !/^s_/.test(caption)) return caption
  return key
    .replace(/^(VM|WM)_/, '')
    .replace(/-W_\w+$/, '')
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/^./, (c) => c.toUpperCase())
}

function isSymmetric(garage: Record<string, Setting>) {
  // the API has no getter; same values on both sides is a good proxy for the toggle state
  const pairs = Object.keys(garage).filter((k) => k.endsWith('-W_FL'))
  return pairs.every((k) => garage[k].value === garage[k.replace('-W_FL', '-W_FR')]?.value)
}

function buildRows(garage: Record<string, Setting> | undefined, meta: GarageMeta | undefined, tab: string): Row[] {
  if (!garage) return []
  const rows: Row[] = []
  const seen = new Set<string>()
  for (const key of Object.keys(garage).sort()) {
    if (tabOf(key) !== tab || seen.has(key)) continue
    const corner = key.match(/^(WM_\w+?)-(W_FL|W_FR|W_RL|W_RR)$/)
    if (corner) {
      const base = corner[1]
      const keys = CORNERS.map((c) => (isAdjustable(garage[`${base}-${c}`], meta, `${base}-${c}`) ? `${base}-${c}` : undefined))
      CORNERS.forEach((c) => seen.add(`${base}-${c}`))
      if (keys.some(Boolean)) rows.push({ kind: 'corners', base, label: label(`${base}-W_FL`, garage[`${base}-W_FL`]), keys })
      continue
    }
    seen.add(key)
    if (isAdjustable(garage[key], meta, key)) rows.push({ kind: 'single', key, label: label(key, garage[key]) })
  }
  // per-corner rows first, right under their column headers
  return [...rows.filter((r) => r.kind === 'corners'), ...rows.filter((r) => r.kind === 'single')]
}
