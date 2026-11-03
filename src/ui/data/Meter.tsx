import { cx } from '../cx'
import styles from './Meter.module.css'

/**
 * A live input level, 0..1. `centered` fills from the middle (steering). `range` marks the calibrated
 * limits on the same 0..1 scale.
 */
export function Meter({ value, label, centered, range }: { value: number | undefined; label: string; centered?: boolean; range?: [number, number] }) {
  const v = value == null ? undefined : Math.max(0, Math.min(1, value))
  const pct = (x: number) => `${(x * 100).toFixed(1)}%`
  const fill = v == null ? undefined : centered ? { left: pct(Math.min(v, 0.5)), width: pct(Math.abs(v - 0.5)) } : { left: 0, width: pct(v) }
  return (
    <div className={styles.meter} role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={v == null ? undefined : Math.round(v * 100)}>
      {fill && <span className={styles.fill} style={fill} />}
      {centered && <span className={cx(styles.mark, styles.center)} />}
      {range?.map((r, i) => <span key={i} className={styles.mark} style={{ left: pct(Math.max(0, Math.min(1, r))) }} />)}
    </div>
  )
}
