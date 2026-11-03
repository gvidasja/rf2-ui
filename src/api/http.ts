// The page is served by the game (or by Vite, proxying to the game), so the API is same-origin.

export class HttpError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function parse(res: Response): Promise<unknown> {
  const text = await res.text()
  if (!res.ok) throw new HttpError(res.status, text || res.statusText)
  if (!text) return undefined
  if ((res.headers.get('content-type') ?? '').includes('json')) {
    const data = JSON.parse(text)
    // Several game endpoints answer 200 with {"error": "<native code>"} when not applicable.
    if (data && typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length === 1 && 'error' in data) {
      throw new HttpError(200, String(data.error))
    }
    return data
  }
  return text
}

export async function get<T>(url: string): Promise<T> {
  return (await parse(await fetch(url))) as T
}

/** POST with a raw text body (most stock endpoints take text/plain ids). */
export async function postText<T = unknown>(url: string, body?: string): Promise<T> {
  return (await parse(await fetch(url, { method: 'POST', body, headers: { 'content-type': 'text/plain' } }))) as T
}

export async function postJson<T = unknown>(url: string, body: unknown): Promise<T> {
  return (await parse(await fetch(url, { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }))) as T
}

export async function del<T = unknown>(url: string): Promise<T> {
  return (await parse(await fetch(url, { method: 'DELETE' }))) as T
}

// Public files live under BASE_URL. Resolving against this module's own URL works both when it is
// loaded from the jar (localhost:5397) and from the Vite dev server inside the game's page.
const ASSET_BASE = new URL(/* @vite-ignore */ import.meta.env.BASE_URL, import.meta.url).href

export function asset(src: string) {
  return ASSET_BASE + 'assets/' + src
}
