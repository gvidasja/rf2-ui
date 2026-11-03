import { useEffect, useMemo, useState } from 'react'
import type { ConfigurableControl } from '../../reference/rf2-api'
import {
  assignControl,
  detectController,
  loadProfile,
  saveProfile,
  setAxisLimit,
  useAssignments,
  useAxisLimits,
  useCurrentProfile,
  useInputData,
  useJoysticks,
  useProfiles,
  type AxisLimits,
  type InputData,
} from '../api/controls'
import { conflicts, formatBinding } from '../settings/bindings'
import { CONTROL_GROUPS } from '../settings/controlLabels'
import { AXES, CONTROL_SECTIONS, type AxisDef } from '../settings/controls'
import { OptionRow } from '../settings/OptionControl'
import { BindingButton, Button, Card, ConfirmButton, Grid, Meter, Select, SettingRow, Stack, suspendInput, Text, TextField } from '../ui'

// share of a raw value within the device's range (as the stock calibration page does)
const share = (v: number, min: number, max: number) => (max === min ? 0 : (v - min) / (max - min))

function axisView(axis: AxisDef, data: InputData[] | undefined, limits: AxisLimits | undefined) {
  const d = data?.find((x) => x.inputType === axis.name)
  if (!d) return { value: undefined, text: '—' }
  const value = share(d.rawData, d.minValue, d.maxValue)
  const range = axis.steps
    .filter((s) => s.entry !== 'CONTROL_SETSTEERINGCENTER')
    .map((s) => limits?.[s.entry]?.[0])
    .filter((x): x is number => typeof x === 'number' && x >= 0)
    .map((x) => share(x, d.minValue, d.maxValue)) as [number, number]
  const calib = d.calibValue ?? 0
  const pct = Math.round(Math.abs(calib) * 100)
  // steering: side only when off centre after rounding
  const text = axis.centered ? (pct ? `${calib < 0 ? 'L' : 'R'} ${pct} %` : 'Centre') : `${Math.round(calib * 100)} %`
  return { value, text, range: range.length === 2 ? range : undefined }
}

/** Inputs (live, with calibration), wheel and force feedback, and every assignable control. */
export function Controls() {
  return (
    <Grid grow columns="820px minmax(0, 1fr)" gap={5} pad={[5, 7]}>
      <Stack gap={5} scroll>
        <ProfileCard />
        <InputsCard />
        {CONTROL_SECTIONS.map((s) => (
          <Card key={s.id} title={s.title} pad>
            {s.items.map((d) => (
              <OptionRow key={d.key} def={d} />
            ))}
          </Card>
        ))}
      </Stack>
      <AssignmentsCard />
    </Grid>
  )
}

function ProfileCard() {
  const { data: profiles } = useProfiles()
  const { data: current } = useCurrentProfile()
  const [chosen, setChosen] = useState<string>()
  const [name, setName] = useState('')
  const [detected, setDetected] = useState<string>()
  const selected = chosen ?? current
  return (
    <Card title="Controller profile" action={current ? <Text variant="small" tone="muted">In use: {current}</Text> : undefined} pad>
      <Stack gap={4}>
        <Stack row gap={3}>
          <Stack grow>
            <Select options={(profiles ?? []).map((p) => ({ value: p, label: p }))} value={selected} onChange={setChosen} label="Profile" />
          </Stack>
          <ConfirmButton question="Replace your current controls?" confirmLabel="Load" disabled={!selected || selected === current} onConfirm={() => void loadProfile(selected!)}>
            Load
          </ConfirmButton>
        </Stack>
        <Stack row gap={3}>
          <Stack grow>
            <TextField value={name} onChange={setName} label="Profile name" placeholder="Save current controls as…" />
          </Stack>
          <Button disabled={!name.trim()} onClick={() => void saveProfile(name.trim()).then(() => setName(''))}>
            Save
          </Button>
          <Button onClick={() => void detectController().then((r) => setDetected(typeof r === 'string' && r ? r : 'No new device found'))}>Detect devices</Button>
        </Stack>
        {detected && <Text variant="small" tone="muted">{detected}</Text>}
      </Stack>
    </Card>
  )
}

function InputsCard() {
  const data = useInputData()
  const { data: limits } = useAxisLimits()
  const [calibrating, setCalibrating] = useState<{ axis: AxisDef; step: number }>()
  return (
    <Card title="Inputs · live" action={!data ? <Text variant="small" tone="muted">Waiting for the game…</Text> : undefined} pad>
      <Stack gap={3}>
        {AXES.map((axis) => {
          const v = axisView(axis, data, limits)
          const active = calibrating?.axis.name === axis.name ? calibrating : undefined
          const step = active && axis.steps[active.step]
          return (
            <Stack key={axis.name} gap={2}>
              <Grid columns="110px minmax(0, 1fr) 80px 140px" gap={4} align="center">
                <Text weight="bold">{axis.label}</Text>
                <Meter value={v.value} label={axis.label} centered={axis.centered} range={v.range} />
                <Text tone="muted">{v.text}</Text>
                <Button size="s" onClick={() => setCalibrating(active ? undefined : { axis, step: 0 })} navId={`calibrate-${axis.name}`}>
                  {active ? 'Cancel' : 'Calibrate'}
                </Button>
              </Grid>
              {step && (
                <SettingRow label={step.prompt} note={`Step ${active!.step + 1} of ${axis.steps.length}`}>
                  <Button
                    autoFocus
                    onClick={() =>
                      void setAxisLimit(step.entry).then(() => setCalibrating(active!.step + 1 < axis.steps.length ? { axis, step: active!.step + 1 } : undefined))
                    }
                  >
                    {step.button}
                  </Button>
                </SettingRow>
              )}
            </Stack>
          )
        })}
      </Stack>
    </Card>
  )
}

function AssignmentsCard() {
  const { data: assigned } = useAssignments()
  const { data: joysticks } = useJoysticks()
  const [query, setQuery] = useState('')
  const [listening, setListening] = useState<{ key: ConfigurableControl; text: string }>()

  useEffect(() => {
    suspendInput(!!listening)
    return () => suspendInput(false)
  }, [listening])

  const labels = useMemo(() => new Map(CONTROL_GROUPS.flatMap((g) => g.items.map((i) => [i.key, i.label] as const))), [])
  // conflicts only among the driving pages: cinematic cameras reuse keys on purpose
  const clashes = useMemo(
    () => conflicts(assigned ?? {}, CONTROL_GROUPS.filter((g) => g.page !== 'Cinematic cameras').flatMap((g) => g.items.map((i) => i.key))),
    [assigned],
  )
  const conflictOf = (key: string) => {
    const raw = assigned?.[key as ConfigurableControl]?.trim()
    const others = raw ? clashes.get(raw)?.filter((k) => k !== key) : undefined
    return others?.length ? `also ${others.map((k) => labels.get(k) ?? k).join(', ')}` : undefined
  }

  const q = query.trim().toLowerCase()
  const groups = CONTROL_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => !q || `${i.label} ${g.title} ${g.page}`.toLowerCase().includes(q)) })).filter((g) => g.items.length)

  const assign = (key: ConfigurableControl) => {
    setListening({ key, text: 'Press a key or button…' })
    void assignControl(key, (text) => setListening((l) => (l?.key === key ? { key, text } : l))).finally(() => setListening(undefined))
  }

  return (
    <Card
      title="Assignments"
      action={
        <Stack row gap={4}>
          {clashes.size > 0 && <Text variant="small" tone="muted">{clashes.size === 1 ? '1 conflict' : `${clashes.size} conflicts`}</Text>}
          <TextField value={query} onChange={setQuery} label="Find an action" placeholder="Find an action" search />
        </Stack>
      }
      scroll
      grow
    >
      {groups.map((g, i) => (
        <Stack key={g.id} pad={[3, 4]}>
          <Text variant="label">{groups[i - 1]?.page === g.page ? g.title : `${g.page} · ${g.title}`}</Text>
          {g.items.map((item) => (
            <SettingRow key={item.key} label={item.label}>
              <BindingButton
                binding={formatBinding(assigned?.[item.key as ConfigurableControl], joysticks)}
                listening={listening?.key === item.key && listening.text}
                conflict={conflictOf(item.key)}
                onPress={() => assign(item.key as ConfigurableControl)}
                label={item.label}
                navId={item.key}
              />
            </SettingRow>
          ))}
        </Stack>
      ))}
    </Card>
  )
}
