import type { SessionSettings } from '../../api'
import { Setting } from './Setting'
import { DISABLED, SETTING_TYPE } from './SettingsCategories'

export function SettingsSection({
  keys,
  settings,
  onPropUpdate,
}: {
  keys: string[]
  settings: SessionSettings
  onPropUpdate: (label: string, value: number) => void
}) {
  return keys
    .filter((key) => settings[key])
    .map((key) => {
      const { stringValue, currentValue } = settings[key]
      return (
        <Setting
          key={key}
          label={key}
          value={currentValue}
          updateType={SETTING_TYPE[key] || SETTING_TYPE.DEFAULT}
          valueLabel={stringValue}
          onChange={onPropUpdate}
          disabled={DISABLED[key] && DISABLED[key](settings)}
        />
      )
    })
}
