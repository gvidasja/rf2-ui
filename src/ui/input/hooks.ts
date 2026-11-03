import { useEffect, useRef, useSyncExternalStore } from 'react'
import { getDevice, getRegistrations, register, subscribe, type Action } from './input'

/**
 * Registers a handler for an action while the component is mounted. The most recently mounted handler
 * wins, so an open panel's Back overrides the screen's. `label` puts it in the hint bar.
 */
export function useAction(action: Action, run: (() => void) | false | undefined, label?: string) {
  const ref = useRef<ReturnType<typeof register> | null>(null)
  const enabled = typeof run === 'function'
  const runRef = useRef(run)
  runRef.current = run

  useEffect(() => {
    if (!enabled) return
    const reg = register(action, () => (runRef.current as () => void)(), label)
    ref.current = reg
    return () => {
      reg.remove()
      ref.current = null
    }
    // label changes are pushed below without re-registering (keeps the order stable)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action, enabled])

  useEffect(() => {
    ref.current?.update(() => (runRef.current as () => void)(), label)
  }, [label])
}

export function useDevice() {
  return useSyncExternalStore(subscribe, getDevice)
}

export function useRegistrations() {
  return useSyncExternalStore(subscribe, getRegistrations)
}
