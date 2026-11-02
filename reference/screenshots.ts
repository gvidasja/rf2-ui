// Walks the stock UI in the running game over DevTools and screenshots every screen.
//
//   bun reference/screenshots.ts [--app start|event] [--only <regex>]
//
// Needs the game started with --remote-debugging-port=9222. For "start" it switches to the stock UI
// (/start/stock.html) and back afterwards; "event" screens need a running session (see session.ts).
// Output: reference/screenshots/<state>.png + screenshots/index.json (gitignored).
import { $ } from "bun";
import { join } from "path";
import type { Route } from "./extract";
import { cdp, genDir, here, readJson, write } from "./lib";

const args = Bun.argv.slice(2);
const opt = (k: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : undefined);
const app = opt("--app") ?? "start";
const only = opt("--only") ? new RegExp(opt("--only")!) : undefined;
const windowShots = args.includes("--window"); // also capture the real game window (3D + UI)
const outDir = join(here, "screenshots");

const routes = readJson<Route[]>(join(genDir, "routes.json"));
const page = app === "event" ? "/event/index.html" : "/start/stock.html";
const prefixes = app === "event" ? ["event", "event-settings", "fullscreen", "photo-mode", "driver-labels"] : ["start"];
const targets = routes
  .filter((r) => !r.abstract && prefixes.some((p) => r.name === p || r.name.startsWith(p + ".")))
  .filter((r) => !only || only.test(r.name))
  .sort((a, b) => Number(/exit$|^fullscreen$|^photo-mode$/.test(a.name)) - Number(/exit$|^fullscreen$|^photo-mode$/.test(b.name)) || a.name.localeCompare(b.name)); // exit screens last

const c = await cdp();
await c.send("Page.enable");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Angular helpers, ES5 only (the page is Chromium 75).
const inj = "angular.element(document.body).injector()";
async function waitIdle(timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const pending = await c.eval(`(function(){try{return ${inj}.get('$http').pendingRequests.length}catch(e){return -1}})()`);
    if (pending === 0) break;
    await sleep(200);
  }
  await sleep(1500); // animations, images
}

async function load(url: string) {
  await c.send("Page.navigate", { url: `http://localhost:5397${url}` });
  await c.send("Page.reload", { ignoreCache: true }); // a hash-only navigation keeps the document (and any injected CSS)
  for (let i = 0; i < 50; i++) {
    await sleep(300);
    const ready = await c.eval(`(function(){try{return !!${inj}}catch(e){return false}})()`).catch(() => false);
    if (ready) break;
  }
  await waitIdle();
}

// Clicking around is only safe on screens whose tabs are plain views (multiplayer tabs can open a join-server dialog).
const TAB_SAFE = new Set(["start.menu.main-menu", "start.menu.singleplayer"]);

/** In-page tabs (tab-menu) that don't change the route: click each and save <state>~<tab>.png. */
async function shootTabs(state: string): Promise<string[]> {
  if (!TAB_SAFE.has(state)) return [];
  const tabSel = "[].slice.call(document.querySelectorAll('ul.menu-tabs > li > button')).filter(function(b){return b.offsetParent})";
  const names: string[] = (await c.eval(`${tabSel}.map(function(b){var n=b.querySelector('.name');return (n||b).textContent.trim()})`)) ?? [];
  const shot: string[] = [];
  for (let i = 1; i < names.length; i++) {
    await c.eval(`(function(){var b=${tabSel}[${i}]; b && b.click(); return 1})()`);
    await waitIdle();
    const now = await c.eval(`${inj}.get('$state').current.name`);
    if (now !== state) {
      // this tab is a route of its own (captured separately): go back
      await c.eval(`${inj}.get('$state').go(${JSON.stringify(state)}), 1`);
      await waitIdle();
      continue;
    }
    const slug = names[i].toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const img = await c.send("Page.captureScreenshot", { format: "png" });
    write(join(outDir, `${state}~${slug}.png`), Buffer.from(img.data, "base64") as any);
    shot.push(names[i]);
  }
  if (names.length > 1) {
    await c.eval(`(function(){var b=${tabSel}[0]; b && b.click(); return 1})()`); // restore first tab
    await waitIdle();
  }
  return shot;
}

if (app === "start") await c.eval("sessionStorage.setItem('rf2ui.stockUi','1'), 1");
await load(`${page}#${app === "event" ? "/" : "/start"}`);

// A modal left open (e.g. the join-server Cancel/Spectate/Drive dialog) would end up in every later shot.
const modalOpen = () =>
  c.eval(
    "(function(){var e=document.elementFromPoint(innerWidth/2,innerHeight/2);for(;e;e=e.parentElement){if(typeof e.className==='string'&&/modal|dialog|popup/i.test(e.className))return true}return false})()",
  );

/** Some screens open a dialog on entry (multiplayer.car: Cancel/Spectate/Drive). Click its Cancel/Close. */
async function dismissModal() {
  if (!(await modalOpen())) return true;
  await c.eval(
    "(function(){var b=[].slice.call(document.querySelectorAll('button, a, .btn')).filter(function(e){return e.offsetParent!==null&&/^\\s*(cancel|close|no|back)\\s*$/i.test(e.textContent)});b.length&&b[0].click();return b.length})()",
  );
  await waitIdle();
  return !(await modalOpen());
}

const results: Record<string, { ok: boolean; error?: string; landedOn?: string; tabs?: string[]; dialog?: boolean }> = {};
for (const r of targets) {
  if (await modalOpen()) {
    console.log(`STOP: a modal dialog is open before ${r.name}; close it in game and rerun with --only`);
    break;
  }
  const go = await c.eval(
    `(function(){var $state=${inj}.get('$state');return $state.go(${JSON.stringify(r.name)}).then(function(){return 'ok'},function(e){return 'error: '+(e&&(e.message||e.detail||e.type)||e)})})()`,
  );
  await waitIdle();
  const landedOn = await c.eval(`${inj}.get('$state').current.name`);
  const shot = await c.send("Page.captureScreenshot", { format: "png" });
  const ok = go === "ok" && landedOn === r.name;
  if (ok) write(join(outDir, `${r.name}.png`), Buffer.from(shot.data, "base64") as any);
  if (ok && windowShots) await $`pwsh -NoProfile -File ${join(here, "capture-window.ps1")} ${join(outDir, "game", `${r.name}.png`)} -CropUi`.quiet().nothrow();
  const dialog = await modalOpen();
  if (dialog && !(await dismissModal())) {
    console.log(`STOP: could not dismiss the dialog ${r.name} opened; close it in game and rerun with --only`);
    results[r.name] = { ok, dialog };
    break;
  }
  const tabs = ok && !dialog ? await shootTabs(r.name) : [];
  results[r.name] = { ok, ...(dialog ? { dialog } : {}), ...(tabs.length ? { tabs } : {}), ...(go !== "ok" ? { error: String(go) } : {}), ...(landedOn !== r.name ? { landedOn } : {}) };
  console.log(`${ok ? "ok  " : "FAIL"} ${r.name}${ok ? "" : ` (${go}, landed on ${landedOn})`}`);
}

const indexPath = join(outDir, "index.json");
let index: Record<string, unknown> = {};
try {
  index = readJson(indexPath);
} catch {}
write(indexPath, JSON.stringify({ ...index, ...results }, null, 2));

if (app === "start") {
  await c.eval("sessionStorage.removeItem('rf2ui.stockUi'), 1");
  await c.send("Page.navigate", { url: "http://localhost:5397/start/index.html" });
}
c.close();
console.log(`screenshots: ${Object.values(results).filter((r) => r.ok).length}/${targets.length}`);
