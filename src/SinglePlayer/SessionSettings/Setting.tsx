import c from 'classnames'
import { useCallback } from 'react'
import { usePressAndHold } from '../../usePressAndHold'
import { LABELS } from './Labels'
import styles from './Setting.module.css'

const UPDATE_TYPE_FUNCS: Record<'inc' | 'set', Record<'increase' | 'decrease', (x: number) => number>> = {
  inc: {
    decrease: () => 0,
    increase: () => 1,
  },
  set: {
    decrease: (value) => value - 1,
    increase: (value) => value + 1,
  },
}

export function Setting({
  valueLabel,
  label,
  onChange,
  value,
  updateType,
  disabled,
}: {
  valueLabel: string
  label: string
  onChange: (label: string, value: number) => void
  updateType: 'inc' | 'set'
  value: number | boolean
  disabled: boolean
}) {
  const { decrease, increase } = UPDATE_TYPE_FUNCS[updateType]

  const increaseCallback = useCallback(
    () => onChange(label, increase(Number(value))),
    [value, label, onChange, increase],
  )
  const decreaseCallback = useCallback(
    () => onChange(label, decrease(Number(value))),
    [value, label, onChange, decrease],
  )

  const onPressAndHoldIncrease = usePressAndHold(increaseCallback, 50, 200)
  const onPressAndHoldDecrease = usePressAndHold(decreaseCallback, 50, 200)

  return (
    <>
      <div className={c(styles.Center, styles.Label)}>{LABELS[label] || label}</div>
      <button disabled={disabled} className={c(styles.Button, styles.Center)} {...onPressAndHoldDecrease}>
        ◀
      </button>
      <div className={c({ [styles.Disabled]: disabled }, styles.Center, styles.ValueLabel)}>
        {valueLabel !== undefined ? `${valueLabel} (${value})` : value}
      </div>
      <button disabled={disabled} className={c(styles.Button, styles.Center)} {...onPressAndHoldIncrease}>
        ▶
      </button>
    </>
  )
}
