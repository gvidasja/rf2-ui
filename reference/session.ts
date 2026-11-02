// Starts a single-player session with the current settings and screenshots the loading page and the
// in-session (event app) screens. Run from the main menu.  bun reference/session.ts
import { join } from "path";
import { cdp, GAME, here, write } from "./lib";

const nav = async () => (await fetch(`${GAME}/navigation/state`)).json() as Promise<any>;
const c = await cdp();
await c.send("Page.enable");
const shot = async (name: string) => {
  const s = await c.send("Page.captureScreenshot", { format: "png" });
  write(join(here, "screenshots", `${name}.png`), Buffer.from(s.data, "base64") as any);
};

console.log("before:", (await nav()).state?.navigationState);
if (!Bun.argv.includes("--no-start")) {
  const r = await fetch(`${GAME}/rest/race/startRace`, { method: "POST" });
  console.log("startRace", r.status);
}

let loadingShots = 0;
const t0 = Date.now();
for (;;) {
  await Bun.sleep(1500);
  let s: any;
  try {
    s = await nav();
  } catch {
    continue; // server busy while loading
  }
  const url = await c.eval("location.pathname").catch(() => "?");
  const loading = s.loadingStatus?.loading;
  process.stdout.write(`\r${Math.round((Date.now() - t0) / 1000)}s ${s.state?.navigationState} loading=${loading} ${s.loadingStatus?.percentage} ${url}      `);
  if (loading && loadingShots < 2 && (s.loadingStatus.percentage > 0.3 * (loadingShots + 1))) await shot(`loadingPage${loadingShots ? "-" + loadingShots : ""}`), loadingShots++;
  if (!loading && /NAV_EVENT|NAV_GARAGE|NAV_REALTIME/.test(s.state?.navigationState) && /event/.test(url)) break;
  if (Date.now() - t0 > 6 * 60_000) throw new Error("session did not load in 6 min");
}
console.log();
await Bun.sleep(5000);
console.log("in session:", (await nav()).state);
c.close();
