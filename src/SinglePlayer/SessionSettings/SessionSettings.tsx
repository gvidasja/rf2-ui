import type { SessionSettings } from '../../api'
import styles from './SessionSettings.module.css'
import { SettingsSection } from './SettingsSection'

export function SessionSettings({
  section,
  state,
  onPropUpdate,
}: {
  section: Record<string, string[]>
  state: SessionSettings
  onPropUpdate: (label: string, value: number) => void
}) {
  return (
    state && (
      <div className={styles.Settings}>
        {Object.entries(section).map(([categoryKey, settings]) => (
          <SettingsSection key={categoryKey} keys={settings} settings={state} onPropUpdate={onPropUpdate} />
        ))}
      </div>
    )
  )
}
