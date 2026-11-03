// The game's UI WebSocket (ws://<game>/websocket/ui): one shared connection, topics subscribed while
// a component uses them. Messages: { messageType: 'UPDATE', topic, body }.
import { useEffect, useState } from 'react'

type Listener = (body: unknown) => void

const listeners = new Map<string, Set<Listener>>()
let ws: WebSocket | null = null

function url() {
  // in the game the page is served by the game itself; in browser dev the game runs on localhost
  const host = location.port === '5397' ? location.host : 'localhost:5397'
  return `ws://${host}/websocket/ui`
}

function send(message: object) {
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message))
}

function connect() {
  if (ws) return
  const socket = new WebSocket(url())
  ws = socket
  socket.onopen = () => {
    for (const topic of listeners.keys()) send({ messageType: 'SUB', topic })
  }
  socket.onmessage = (e) => {
    let m: { topic?: string; body?: unknown }
    try {
      m = JSON.parse(String(e.data))
    } catch {
      return
    }
    if (m.topic) listeners.get(m.topic)?.forEach((l) => l(m.body))
  }
  socket.onclose = () => {
    ws = null
    // reconnect while someone still listens (the game drops the socket on page changes)
    if (listeners.size) window.setTimeout(connect, 1000)
  }
  socket.onerror = () => socket.close()
}

function subscribe(topic: string, listener: Listener) {
  let set = listeners.get(topic)
  if (!set) {
    set = new Set()
    listeners.set(topic, set)
    send({ messageType: 'SUB', topic })
  }
  set.add(listener)
  connect()
  return () => {
    set!.delete(listener)
    if (set!.size) return
    listeners.delete(topic)
    send({ messageType: 'UNSUB', topic })
    if (!listeners.size) ws?.close()
  }
}

/** The latest body published on a topic, or undefined until the first message. */
export function useTopic<T>(topic: string | null): T | undefined {
  const [body, setBody] = useState<T>()
  useEffect(() => {
    if (!topic) return
    return subscribe(topic, (b) => setBody(b as T))
  }, [topic])
  return body
}
