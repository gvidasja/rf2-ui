import type { ReactNode } from 'react'
import styles from './Monitor.module.css'

/**
 * Places content around the native 3D monitor (see the hole in Frame): `above` it (camera bar),
 * `below` it (transport, your car) and to its `side` (running order). Use inside a Frame with `hole`.
 */
export function MonitorLayout({ above, below, side }: { above?: ReactNode; below?: ReactNode; side?: ReactNode }) {
  return (
    <div className={styles.layout}>
      <div className={styles.above}>{above}</div>
      <div className={styles.below}>{below}</div>
      <section className={styles.side}>{side}</section>
    </div>
  )
}

export type TransportCommand = 'begin' | 'rewind' | 'stepBack' | 'pause' | 'play' | 'stepForward' | 'forward' | 'live'

const BUTTONS: { cmd: TransportCommand; glyph: string; label: string }[] = [
  { cmd: 'begin', glyph: '|◀', label: 'Jump to start' },
  { cmd: 'rewind', glyph: '◀◀', label: 'Rewind' },
  { cmd: 'stepBack', glyph: '◀|', label: 'Slow backwards' },
  { cmd: 'pause', glyph: '❚❚', label: 'Pause' },
  { cmd: 'play', glyph: '▶', label: 'Play' },
  { cmd: 'stepForward', glyph: '|▶', label: 'Slow motion' },
  { cmd: 'forward', glyph: '▶▶', label: 'Fast forward' },
  { cmd: 'live', glyph: '▶|', label: 'Back to live' },
]

/** Replay controls for the monitor: jump, scan, pause/play and back to live. */
export function ReplayTransport({ onCommand, live, clock }: { onCommand: (cmd: TransportCommand) => void; live: boolean; clock?: string }) {
  return (
    <div className={styles.transport} role="toolbar" aria-label="Replay">
      {BUTTONS.map((b) => (
        <button key={b.cmd} type="button" className={styles.transportBtn} aria-label={b.label} title={b.label} data-nav-id={`replay-${b.cmd}`} onClick={() => onCommand(b.cmd)}>
          {b.glyph}
        </button>
      ))}
      <span className={styles.transportGap} />
      <span className={live ? styles.live : styles.replay}>{live ? '● Live' : 'Replay'}</span>
      {clock && <span className={styles.clock}>{clock}</span>}
    </div>
  )
}
