// `MOCK=1 bun run dev`: serves the game API from the samples saved by reference/dump.ts
// (reference/generated/samples, gitignored), so the UI can be developed and screenshotted without the game.
// Writes are kept in memory so steppers and pickers behave. Standings are a simulated running session
// (dev/mockLive.ts); `MOCK=static` serves the saved sample instead.
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import type { Plugin } from 'vite'
import { liveStandings } from './mockLive'
import { serveMockSocket } from './mockSocket'

const SAMPLES = join(import.meta.dirname, '..', 'reference', 'generated', 'samples')

const state = new Map<string, unknown>()
let joining: { at: number; ok: boolean } | undefined
// the game's own port: the page connects there directly (see src/api/socket.ts); the game isn't running in MOCK mode
const SOCKET_PORT = 5397
// survives Vite's config reloads, which re-run this module while the old server still holds the port
const shared = globalThis as { rf2uiMockSocket?: unknown; rf2uiMockSample?: (name: string) => unknown }

function sample(name: string): unknown {
  if (state.has(name)) return state.get(name)
  const file = join(SAMPLES, `${name}.json`)
  const data = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : undefined
  state.set(name, data)
  return data
}

const nameFor = (path: string) => path.replace(/^\//, '').replace(/\/$/, '').replace(/[/]/g, '_')

export function mockGame(): Plugin {
  return {
    name: 'rf2ui:mock',
    apply: 'serve',
    configureServer(server) {
      shared.rf2uiMockSample = sample
      try {
        shared.rf2uiMockSocket ??= serveMockSocket(SOCKET_PORT, (n) => shared.rf2uiMockSample!(n))
      } catch {
        // the game holds the port: no mock socket (server lists and live input stay empty)
        console.warn(`[mock] port ${SOCKET_PORT} is in use (is the game running?); the UI WebSocket is not mocked`)
      }
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://x')
        if (!/^\/(rest|navigation)\//.test(url.pathname)) return next()
        const body = await new Promise<string>((r) => {
          let b = ''
          req.on('data', (c) => (b += c))
          req.on('end', () => r(b))
        })
        const json = (data: unknown) => {
          res.setHeader('content-type', 'application/json')
          res.end(data === undefined ? '' : JSON.stringify(data))
        }
        const p = url.pathname

        if (req.method === 'GET') {
          if (p === '/rest/sessions/opponents') {
            const cars = sample('rest_race_car') as { id: string; name: string }[]
            return json(cars.slice(0, 31).map((c, i) => ({ id: i, name: c.name })))
          }
          if (/^\/rest\/race\/track\/[^/]+\/trackmap$/.test(p)) {
            const nav = sample('navigation_state') as { loadingStatus?: { track?: { trackmap?: unknown } } }
            return json(nav?.loadingStatus?.track?.trackmap ?? [])
          }
          // joining: details, a short download, then joined; a password server accepts "test"
          if (p === '/rest/multiplayer/join') {
            const pw = url.searchParams.get('password') ?? ''
            joining = { at: Date.now(), ok: pw === '' || pw === 'test' }
            return json(undefined)
          }
          if (p.startsWith('/rest/multiplayer/join/')) {
            const t = joining ? Date.now() - joining.at : Infinity
            const state = !joining ? 'JOIN_IDLE' : t < 800 ? 'JOIN_GETTING_DETAILS' : !joining.ok ? 'JOIN_INVALID_PASSWORD' : t < 3500 ? 'JOIN_DOWNLOADING_CONTENT_IN_PROGRESS' : 'JOIN_JOINED_SERVER'
            const part = p.slice('/rest/multiplayer/join/'.length)
            if (part === 'state') return json(state)
            if (part === 'downloadname') return json('Zandvoort 2021 (mock)')
            if (part === 'downloadnumber') return json(1)
            if (part === 'downloadpercent') return json(Math.min(100, Math.max(0, Math.round(((t - 800) / 2700) * 100))))
            if (part === 'error') return json('')
          }
          if (p === '/rest/watch/standings' && process.env.MOCK !== 'static') {
            return json(liveStandings(sample('rest_watch_standings') as Parameters<typeof liveStandings>[0], (sample('rest_watch_trackmap') ?? []) as Parameters<typeof liveStandings>[1]))
          }
          if (/\/(image|thumbnail)$/.test(p)) return res.writeHead(404).end()
          return json(sample(nameFor(p)))
        }

        // writes
        const sessions = sample('rest_sessions') as Record<string, { currentValue: unknown; stringValue: string; valueType: string }>
        let m: RegExpMatchArray | null
        if ((m = p.match(/^\/rest\/rf2ui\/sessions\/settings\/(\w+)$/))) {
          const s = sessions[m[1]]
          const value = JSON.parse(body).value
          s.currentValue = s.valueType === 'BOOL' ? !!value : value
          s.stringValue = String(value)
          return json(s)
        }
        if ((m = p.match(/^\/rest\/options\/assign\/(CC_\w+)$/))) {
          // the game answers once the player pressed something; pretend they pressed Num 9 after a moment
          const all = sample('rest_options_assign') as Record<string, string>
          await new Promise((r) => setTimeout(r, 2500))
          all[m[1]] = ' KP 9'
          return json(all)
        }
        if (p === '/rest/race/packages/setPackageState') {
          // the mock finishes the game's background work at once
          const { package: id, state } = JSON.parse(body) as { package: number; state: string }
          const all = sample('rest_race_packagesV2') as Record<string, { state: string; targetState: string }>
          const g = all[String(id)]
          if (g) g.targetState = g.state = state === 'INSTALL' ? 'INSTALLED' : 'UNINSTALLED'
          return json(undefined)
        }
        if (p === '/rest/options/float' || p === '/rest/options/long') {
          const { optionEntry, value } = JSON.parse(body)
          const key = { GAMEOPT_ai_aggression: 'SESSSET_AI_Aggression', GAMEOPT_ai_limiter: 'SESSSET_AI_Limiter' }[optionEntry as string]
          if (key) sessions[key].currentValue = value
          // the same option object in every group sample it appears in
          let option: { currentValue: unknown; stringValue: string } | undefined
          for (const g of ['difficulty', 'display', 'sound', 'network', 'replay', 'summary']) {
            const o = (sample(`rest_options_${g}`) as Record<string, typeof option> | undefined)?.[optionEntry]
            if (!o) continue
            o.currentValue = value
            // the game's own text is unknown here: On/Off for switches, the number otherwise
            if (o.stringValue) o.stringValue = /^(On|Off)$/.test(o.stringValue) ? (value ? 'On' : 'Off') : `Level ${value}`
            option = o
          }
          return json(option ?? { currentValue: value })
        }
        if ((m = p.match(/^\/rest\/sessions\/(practice|qualify|warmup|race)\/sessions$/))) {
          const amounts = sample('rest_sessions_amount') as Record<string, number>
          amounts[m[1] === 'qualify' ? 'QUALIFY' : m[1].toUpperCase()] = Number(body)
          return json(undefined)
        }
        if (p === '/rest/race/car' || p === '/rest/race/track') {
          const list = sample(p === '/rest/race/car' ? 'rest_race_car' : 'rest_race_track') as { id: string }[]
          const sel = sample('rest_race_selection') as Record<string, unknown>
          sel[p.endsWith('car') ? 'car' : 'track'] = list.find((x) => x.id === body)
          return json(undefined)
        }
        if ((m = p.match(/^\/rest\/garage\/([A-Z][\w%-]+)$/))) {
          const key = decodeURIComponent(m[1])
          for (const c of ['chassis', 'suspension', 'aerodynamics', 'brakes', 'tires', 'drivetrain', 'gears', 'electronics', 'fuel']) {
            const s = sample(`rest_garage_${c}`) as Record<string, { value: number; stringValue: string }> | undefined
            if (s?.[key]) {
              s[key].value = JSON.parse(body).value
              s[key].stringValue = `#${s[key].value}`
            }
          }
          return json(undefined)
        }
        if (p === '/rest/sessions/opponents') {
          const { vectorIndex, state: st } = JSON.parse(body)
          const filters = sample('rest_sessions_opponents_filter') as ({ gSelectedListIndex: number; state: string } | null)[]
          const f = filters.find((x) => x?.gSelectedListIndex === vectorIndex)
          if (f) f.state = ['OP_NOTHING', 'OP_OR', 'OP_AND', 'OP_NOT'][st]
          return json({ filters })
        }
        return json(undefined)
      })
    },
  }
}
