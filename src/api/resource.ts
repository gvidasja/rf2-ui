import { useCallback, useEffect, useSyncExternalStore } from 'react'

// A tiny shared cache: one entry per key, loaded once, shared by every component that reads it.
// Game calls cost about a frame each, so lists (3000+ cars) must not be refetched per screen.

type Entry<T> = { data?: T; error?: unknown; loading: boolean; loader: () => Promise<T>; version: number }

const entries = new Map<string, Entry<unknown>>()
const listeners = new Map<string, Set<() => void>>()

function notify(key: string) {
  const e = entries.get(key)
  if (e) entries.set(key, { ...e }) // new object for useSyncExternalStore
  listeners.get(key)?.forEach((l) => l())
}

function load<T>(key: string) {
  const e = entries.get(key) as Entry<T>
  const version = ++e.version
  e.loading = true
  e.loader().then(
    (data) => {
      const cur = entries.get(key) as Entry<T>
      if (cur.version !== version) return
      cur.data = data
      cur.error = undefined
      cur.loading = false
      notify(key)
    },
    (error) => {
      const cur = entries.get(key) as Entry<T>
      if (cur.version !== version) return
      cur.error = error
      cur.loading = false
      notify(key)
    },
  )
}

function ensure<T>(key: string, loader: () => Promise<T>) {
  if (!entries.has(key)) {
    entries.set(key, { loading: false, loader, version: 0 })
    load(key)
  }
  return entries.get(key) as Entry<T>
}

export type Resource<T> = { data?: T; error?: unknown; loading: boolean; reload: () => void }

export function useResource<T>(key: string | null, loader: () => Promise<T>): Resource<T> {
  const subscribe = useCallback(
    (cb: () => void) => {
      if (!key) return () => {}
      const set = listeners.get(key) ?? new Set()
      set.add(cb)
      listeners.set(key, set)
      return () => {
        set.delete(cb)
      }
    },
    [key],
  )
  const snapshot = useSyncExternalStore(
    subscribe,
    () => (key ? (entries.get(key) as Entry<T> | undefined) : undefined),
  )
  useEffect(() => {
    if (key && !entries.has(key)) {
      ensure(key, loader)
      notify(key)
    }
  }, [key, loader])
  return {
    data: snapshot?.data,
    error: snapshot?.error,
    loading: !snapshot || snapshot.loading,
    reload: () => key && invalidate(key),
  }
}

/** Read without subscribing (e.g. in event handlers). */
export function peek<T>(key: string): T | undefined {
  return entries.get(key)?.data as T | undefined
}

/** Replace cached data (optimistic updates, or a response that already contains the new state). */
export function mutate<T>(key: string, update: T | ((old: T | undefined) => T)) {
  const e = entries.get(key) as Entry<T> | undefined
  if (!e) return
  e.data = typeof update === 'function' ? (update as (old: T | undefined) => T)(e.data) : update
  e.version++ // drop in-flight loads that would overwrite this
  e.loading = false
  notify(key)
}

/** Refetch; keeps showing the old data meanwhile. */
export function invalidate(key: string) {
  if (!entries.has(key)) return
  load(key)
  notify(key)
}

/** Prefetch so the next screen opens with data already there. */
export function preload<T>(key: string, loader: () => Promise<T>) {
  ensure(key, loader)
}

/** useResource that refetches every `ms` while mounted (live session data). */
export function usePolled<T>(key: string, loader: () => Promise<T>, ms: number): Resource<T> {
  const r = useResource(key, loader)
  useEffect(() => {
    const t = window.setInterval(() => invalidate(key), ms)
    return () => window.clearInterval(t)
  }, [key, ms])
  return r
}
