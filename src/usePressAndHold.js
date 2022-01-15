import { useState, useEffect, useCallback } from 'react'

export function usePressAndHold(callback = () => {}, interval = 300, delay = 0) {
  const [startLongPress, setStartLongPress] = useState(false)
  const [refresh, setRefresh] = useState(Date.now())

  useEffect(() => {
    if (startLongPress) {
      callback()
    }
  }, [refresh])

  useEffect(() => {
    let timeoutId
    let intervalId

    if (startLongPress) {
      setRefresh(Date.now())
      timeoutId = setTimeout(() => {
        setRefresh(Date.now())
        intervalId = setInterval(() => setRefresh(Date.now()), interval)
      }, delay)
    } else {
      clearTimeout(timeoutId)
      clearInterval(intervalId)
    }

    return () => {
      clearTimeout(timeoutId)
      clearInterval(intervalId)
    }
  }, [delay, interval, startLongPress])

  const onStart = useCallback(() => setStartLongPress(true), [])
  const onStop = useCallback(() => setStartLongPress(false), [])

  return {
    onMouseDown: onStart,
    onMouseUp: onStop,
    onMouseLeave: onStop,
    onTouchStart: onStart,
    onTouchEnd: onStop,
  }
}
