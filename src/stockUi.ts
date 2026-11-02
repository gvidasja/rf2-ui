// Shared with bundle/static/start/index.html and the button injected into stock.html (bundle/build.ts).
const KEY = 'rf2ui.stockUi'

/** Switches to the stock UI until the game is restarted (sessionStorage lives as long as the game's browser). */
export function switchToStockUi() {
  try {
    sessionStorage.setItem(KEY, '1')
  } catch {
    // storage unavailable: still switch, just not sticky
  }
  location.href = '/start/stock.html#/start'
}
