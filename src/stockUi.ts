// Shared with bundle/static/start/index.html and the button injected into stock.html (bundle/build.ts).
const KEY = 'rf2ui.stockUi'

/** Switches to the stock UI until the game is restarted (sessionStorage lives as long as the game's browser). */
export function switchToStockUi() {
  try {
    sessionStorage.setItem(KEY, '1')
  } catch {
    // storage unavailable: still switch, just not sticky
  }
  // the same native page's stock copy (bundle/build.ts): /start, /event or /loading
  const page = location.pathname.match(/^\/(start|event|loading)\//)?.[1] ?? 'start'
  location.href = `/${page}/stock.html${page === 'start' ? '#/start' : location.hash}`
}
