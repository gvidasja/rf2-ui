// Records the server lists the running game publishes on its UI WebSocket into
// reference/generated/samples/ws_<topic>.json (used by the mock). Read-only: joins nothing.
//   bun reference/capture-servers.ts
import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'

const OUT = join(import.meta.dir, 'generated', 'samples')
const TOPICS = ['InternetServerList', 'LanServerList', 'FavoritesServerList', 'FriendsServerList']
const TIMEOUT = 90_000

mkdirSync(OUT, { recursive: true })
const steam = await fetch('http://127.0.0.1:5397/rest/multiplayer/steam/status').then((r) => r.json()).catch(() => 'unknown')
console.log('steam online:', steam)

for (const topic of TOPICS) {
  const ws = new WebSocket('ws://127.0.0.1:5397/websocket/ui')
  await new Promise((r) => (ws.onopen = r))
  let last: unknown
  let updates = 0
  const done = new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, TIMEOUT)
    ws.onmessage = (e) => {
      const m = JSON.parse(String(e.data))
      if (m.topic !== topic) return
      if (m.messageType === 'UPDATE') {
        updates++
        last = m.body
      } else if (m.messageType === 'END_OF_UPDATES') {
        clearTimeout(timer)
        resolve()
      }
    }
  })
  ws.send(JSON.stringify({ messageType: 'GET_ASYNC', topic }))
  await done
  ws.send(JSON.stringify({ messageType: 'CANCEL_ASYNC', topic }))
  ws.close()
  const list = (last as { serverList?: unknown[] } | undefined)?.serverList ?? []
  writeFileSync(join(OUT, `ws_${topic}.json`), JSON.stringify(last ?? null, null, 2))
  console.log(`${topic}: ${updates} updates, ${list.length} servers`)
}
