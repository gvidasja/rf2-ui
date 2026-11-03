import { setSetting, settingValue, useSessionSettings } from '../api/sessions'
import { Segmented, Select, SettingRow, Stepper, Toggle } from '../ui'
import { SETTINGS, type SettingDef, type SettingKey } from './settings'

/** The control for one session setting, chosen from its definition; `as` overrides enum rendering. */
export function SettingControl({ k, disabled, as }: { k: SettingKey; disabled?: boolean; as?: 'segmented' | 'select' }) {
  const { data } = useSessionSettings()
  const def: SettingDef = SETTINGS[k]
  const value = settingValue(data, k)
  const onChange = (v: number) => setSetting(k, v)
  switch (def.kind) {
    case 'number':
      return (
        <Stepper
          value={disabled ? null : value}
          onChange={onChange}
          min={def.min}
          max={def.max}
          step={def.step}
          format={def.format}
          label={def.label}
          disabled={disabled || value == null}
          navId={k}
        />
      )
    case 'bool':
      return <Toggle on={!!value} onChange={(on) => onChange(on ? 1 : 0)} label={def.label} disabled={disabled} navId={k} />
    case 'enum':
      return (as ?? (def.options.length <= 5 ? 'segmented' : 'select')) === 'segmented' ? (
        <Segmented options={def.options} value={value ?? undefined} onChange={onChange} label={def.label} disabled={disabled} navId={k} />
      ) : (
        <Select options={def.options} value={value ?? undefined} onChange={onChange} label={def.label} disabled={disabled} navId={k} />
      )
  }
}

/** A setting row: label, help and note from the definition, plus its control. */
export function SettingLine({ k, note, disabledReason, label, as }: { k: SettingKey; note?: string; disabledReason?: string; label?: string; as?: 'segmented' | 'select' }) {
  const def: SettingDef = SETTINGS[k]
  return (
    <SettingRow label={label ?? def.label} note={note} help={def.help} disabledReason={disabledReason}>
      <SettingControl k={k} disabled={!!disabledReason} as={as} />
    </SettingRow>
  )
}
