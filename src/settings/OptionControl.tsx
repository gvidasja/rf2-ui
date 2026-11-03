import { optionNumber, setOption, useOptions } from '../api/options'
import { SettingRow, Stepper, Toggle } from '../ui'
import type { OptionDef } from './options'

const num = (v: unknown, fallback: number) => (typeof v === 'number' ? v : fallback)

/** The control for one game option, chosen from its definition. */
export function OptionControl({ def }: { def: OptionDef }) {
  const { data } = useOptions()
  const o = data?.[def.key]
  const value = optionNumber(o)
  const min = num(o?.minValue, 0)
  const max = num(o?.maxValue, 0)
  const onChange = (v: number) => void setOption(def.key, v)
  switch (def.kind) {
    case 'toggle': {
      const on = def.on ?? 1
      return <Toggle on={value === on} onChange={(v) => onChange(v ? on : min)} label={def.label} disabled={value == null} navId={def.key} />
    }
    case 'game':
      return (
        <Stepper
          value={value}
          onChange={onChange}
          min={min}
          max={max}
          step={num(o?.stepValue, 1)}
          // only the current value's text is known; a pending step shows … until the game answers
          format={(v) => (v === value ? (o?.stringValue || String(v)).trim() : '…')}
          label={def.label}
          disabled={value == null}
          navId={def.key}
        />
      )
    case 'number':
      return (
        <Stepper
          value={value}
          onChange={onChange}
          min={min}
          max={max}
          step={def.step ?? num(o?.stepValue, 1)}
          format={def.format}
          parse={def.parse}
          label={def.label}
          disabled={value == null}
          navId={def.key}
        />
      )
  }
}

export function OptionRow({ def }: { def: OptionDef }) {
  return (
    <SettingRow label={def.label} help={def.help}>
      <OptionControl def={def} />
    </SettingRow>
  )
}
