// The game's UI WebSocket (/websocket/ui) for MOCK mode, on the game's port.
// GET_ASYNC <x>ServerList answers with the lists recorded by reference/capture-servers.ts; SUB InputData
// streams a slowly moving wheel and pedals. Uses Bun.serve: the dev server runs on Bun, whose node:http
// does not hand out raw upgrade sockets.
import type { ServerWebSocket } from 'bun'

type Socket = ServerWebSocket<{ timers: Map<string, ReturnType<typeof setInterval>> }>

function inputData(t: number) {
  const axis = (inputType: string, v: number) => ({ inputType, rawData: Math.round(v * 65535), minValue: 0, maxValue: 65535, calibValue: inputType === 'Steering' ? v * 2 - 1 : v })
  const s = t / 1000
  return [
    axis('Steering', 0.5 + 0.3 * Math.sin(s * 0.8)),
    axis('Throttle', Math.max(0, Math.sin(s * 1.3))),
    axis('Brake', Math.max(0, -Math.sin(s * 1.3))),
    axis('Clutch', 0),
  ]
}

export function serveMockSocket(port: number, sample: (name: string) => unknown) {
  const send = (ws: Socket, m: object) => ws.send(JSON.stringify(m))
  type Data = Socket['data']
  return Bun.serve<Data>({
    port,
    hostname: 'localhost',
    fetch(req, server) {
      if (new URL(req.url).pathname === '/websocket/ui' && server.upgrade(req, { data: { timers: new Map() } })) return undefined
      return new Response('not found', { status: 404 })
    },
    websocket: {
      message(ws: Socket, text) {
        const m = JSON.parse(String(text)) as { messageType: string; topic: string }
        const { timers } = ws.data
        if (m.messageType === 'GET_ASYNC' && m.topic.endsWith('ServerList')) {
          const body = sample(`ws_${m.topic}`) ?? { serverList: [], finished: true }
          setTimeout(() => {
            send(ws, { messageType: 'UPDATE', topic: m.topic, body })
            send(ws, { messageType: 'END_OF_UPDATES', topic: m.topic })
          }, 600)
        } else if (m.messageType === 'SUB' && m.topic === 'InputData' && !timers.has('InputData')) {
          timers.set('InputData', setInterval(() => send(ws, { messageType: 'UPDATE', topic: 'InputData', body: inputData(Date.now()) }), 100))
        } else if (m.messageType === 'UNSUB') {
          clearInterval(timers.get(m.topic))
          timers.delete(m.topic)
        }
      },
      close(ws: Socket) {
        ws.data.timers.forEach((t) => clearInterval(t))
      },
    },
  })
}
