import c from 'classnames'
import { useCallback } from 'react'
import type { SessionSettings } from '../../api'
import { usePressAndHold } from '../../usePressAndHold'
import styles from './Setting.module.css'
import { useSessionSettings } from './sessionSettingsContext'

const DISABLED_NOOP = () => false

export function Setting({
  settingKey,
  disabled = DISABLED_NOOP,
}: {
  settingKey: string
  disabled?: (s: SessionSettings) => boolean
}) {
  const { state, inc } = useSessionSettings()

  console.log(JSON.stringify(state[settingKey]), settingKey, inc)

  const increaseCallback = useCallback(() => inc(settingKey, 1), [settingKey, inc])
  const decreaseCallback = useCallback(() => inc(settingKey, -1), [settingKey, inc])

  const onPressAndHoldIncrease = usePressAndHold(increaseCallback, 50, 200)
  const onPressAndHoldDecrease = usePressAndHold(decreaseCallback, 50, 200)

  if (!state[settingKey]) {
    return <></>
  }

  return (
    <>
      <div className={c(styles.Center, styles.Label)}>{state[settingKey].label}</div>
      <button disabled={disabled(state)} className={c(styles.Button, styles.Center)} {...onPressAndHoldDecrease}>
        ◀
      </button>
      <div className={c({ [styles.Disabled]: disabled }, styles.Center, styles.ValueLabel)}>
        {state[settingKey].stringValue || state[settingKey].currentValue}
      </div>
      <button disabled={disabled(state)} className={c(styles.Button, styles.Center)} {...onPressAndHoldIncrease}>
        ▶
      </button>
    </>
  )
}
