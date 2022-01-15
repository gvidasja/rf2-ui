import { SettingsSection } from './SettingsSection'
import styles from './SessionSettings.module.css'

export function SessionSettings({ section, state, onPropUpdate }) {
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
