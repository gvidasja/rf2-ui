// The game's UI WebSocket (/websocket/ui): one shared connection. Two kinds of topics:
// - subscribed (SUB / UNSUB): the game pushes UPDATE messages while subscribed (InputData, LiveStandings…);
// - requested (GET_ASYNC / CANCEL_ASYNC): the game sends UPDATEs, then END_OF_UPDATES (server lists).
// Messages: { messageType, topic, body }.
import { useCallback, useEffect, useState } from 'react'

type Message = { messageType: string; topic: string; body?: unknown }
type Listener = (m: Message) => void
type Mode = 'sub' | 'async'

const listeners = new Map<string, { mode: Mode; set: Set<Listener> }>()
let ws: WebSocket | null = null

// In the game the page comes from the game itself. In browser dev the socket goes straight to the game's
// port (the dev server runs on Bun, which cannot proxy WebSockets); in MOCK mode the mock listens there.
const url = () => `ws://${location.port === '5397' ? location.host : 'localhost:5397'}/websocket/ui`

function send(message: object) {
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message))
}

const start = (topic: string, mode: Mode) => send({ messageType: mode === 'sub' ? 'SUB' : 'GET_ASYNC', topic })
const stop = (topic: string, mode: Mode) => send({ messageType: mode === 'sub' ? 'UNSUB' : 'CANCEL_ASYNC', topic })

function connect() {
  if (ws) return
  const socket = new WebSocket(url())
  ws = socket
  socket.onopen = () => listeners.forEach((l, topic) => start(topic, l.mode))
  socket.onmessage = (e) => {
    let m: Message
    try {
      m = JSON.parse(String(e.data))
    } catch {
      return
    }
    if (m.topic) listeners.get(m.topic)?.set.forEach((l) => l(m))
  }
  socket.onclose = () => {
    ws = null
    // reconnect while someone still listens (the game drops the socket on page changes)
    if (listeners.size) window.setTimeout(connect, 1000)
  }
  socket.onerror = () => socket.close()
}

function listen(topic: string, mode: Mode, listener: Listener) {
  let entry = listeners.get(topic)
  if (!entry) {
    entry = { mode, set: new Set() }
    listeners.set(topic, entry)
    start(topic, mode)
  }
  entry.set.add(listener)
  connect()
  return () => {
    entry!.set.delete(listener)
    if (entry!.set.size) return
    listeners.delete(topic)
    stop(topic, mode)
    if (!listeners.size) ws?.close()
  }
}

/** The latest body published on a subscribed topic, or undefined until the first message. */
export function useTopic<T>(topic: string | null): T | undefined {
  const [body, setBody] = useState<T>()
  useEffect(() => {
    if (!topic) return
    return listen(topic, 'sub', (m) => m.messageType === 'UPDATE' && setBody(m.body as T))
  }, [topic])
  return body
}

/** Request a topic once (GET_ASYNC): the latest body, whether the game is done, and a way to ask again. */
export function useRequestedTopic<T>(topic: string | null) {
  const [state, setState] = useState<{ body?: T; done: boolean }>({ done: false })
  const [round, setRound] = useState(0)
  useEffect(() => {
    if (!topic) return
    setState((s) => ({ body: s.body, done: false }))
    return listen(topic, 'async', (m) => {
      if (m.messageType === 'UPDATE') setState((s) => ({ ...s, body: m.body as T }))
      else if (m.messageType === 'END_OF_UPDATES') setState((s) => ({ ...s, done: true }))
    })
  }, [topic, round])
  const refresh = useCallback(() => setRound((r) => r + 1), [])
  return { ...state, refresh }
}
