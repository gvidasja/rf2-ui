import { useCallback, useEffect, useRef, type DetailedHTMLProps, type HTMLAttributes, type PointerEvent } from 'react'

export function usePressAndHold(
  callback = (_: PointerEvent<HTMLButtonElement>) => {},
  interval = 300,
  delay = 0,
): Pick<
  DetailedHTMLProps<HTMLAttributes<HTMLButtonElement>, HTMLButtonElement>,
  'onPointerUp' | 'onPointerDown' | 'onPointerCancel'
> {
  const cb = useRef(callback)
  const timeoutRef = useRef(0)
  const intervalRef = useRef(0)

  cb.current = callback

  const onStart = useCallback((e: PointerEvent<HTMLButtonElement>) => {
    clearTimeout(timeoutRef.current)
    clearInterval(intervalRef.current)

    if (e.currentTarget.disabled) {
      return
    }

    cb.current(e)

    timeoutRef.current = window.setTimeout(() => {
      console.log('setting interval', timeoutRef.current, intervalRef.current)
      intervalRef.current = window.setInterval(() => cb.current(e), interval)
    }, delay)
  }, [])

  const onStop = useCallback(() => {
    clearTimeout(timeoutRef.current)
    clearInterval(intervalRef.current)
  }, [])

  useEffect(() => {
    return () => {
      clearTimeout(timeoutRef.current)
      clearInterval(intervalRef.current)
    }
  }, [])

  return {
    onPointerDown: onStart,
    onPointerUp: onStop,
    onPointerCancel: onStop,
  }
}
