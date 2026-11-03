// `MOCK=1 bun run dev`: serves the game API from the samples saved by reference/dump.ts
// (reference/generated/samples, gitignored), so the UI can be developed and screenshotted without the game.
// Writes are kept in memory so steppers and pickers behave. Standings are a simulated running session
// (dev/mockLive.ts); `MOCK=static` serves the saved sample instead.
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import type { Plugin } from 'vite'
import { liveStandings } from './mockLive'

const SAMPLES = join(import.meta.dirname, '..', 'reference', 'generated', 'samples')

const state = new Map<string, unknown>()

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
