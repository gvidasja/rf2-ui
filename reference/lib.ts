// Shared helpers for the reference/ scripts.
import { $ } from "bun";
import { mkdirSync, writeFileSync, existsSync, readdirSync, readFileSync, statSync } from "fs";
import { dirname, join } from "path";

export const RF2 = process.env.RF2_DIR ?? "D:/SteamLibrary/steamapps/common/rFactor 2";
export const GAME = "http://localhost:5397";
export const DEVTOOLS = "http://localhost:9222";
export const bundlesDir = join(RF2, "Bin", "Bundles");
export const here = import.meta.dir;
export const stockDir = join(here, "stock");
export const genDir = join(here, "generated"); // gitignored machine-readable outputs
export const classesDir = join(here, ".classes"); // gitignored: game .class files for javap

/** The game's own bundles plus this repo's (so /rest/rf2ui is documented too). */
export const isGameJar = (f: string) => (f.startsWith("net.rfactor2.") || f === "gvidasja.rf2ui.jar") && f.endsWith(".jar");

export function write(path: string, content: string) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

export function readJson<T = any>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function* walk(dir: string): Generator<string> {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) yield* walk(p);
    else yield p;
  }
}

export async function gameUp() {
  try {
    await fetch(`${GAME}/rest/rf2ui/ping`, { signal: AbortSignal.timeout(2000) });
    return true;
  } catch {
    return false;
  }
}

/** All net.rfactor2 classes (rFactor2.jar = native service API, Bundles = apps) extracted for javap. */
export async function ensureClasses() {
  if (existsSync(join(classesDir, "net"))) return;
  mkdirSync(classesDir, { recursive: true });
  await $`jar xf ${join(RF2, "Bin", "rFactor2.jar")} net`.cwd(classesDir).quiet();
  for (const jar of readdirSync(bundlesDir).filter(isGameJar)) {
    await $`jar xf ${join(bundlesDir, jar)} net`.cwd(classesDir).quiet().nothrow();
  }
}

/** Dependency Manager descriptors of every net.rfactor2 bundle: bundle name -> component lines. */
export async function dmDescriptors(): Promise<Record<string, any[]>> {
  const result: Record<string, any[]> = {};
  for (const jar of readdirSync(bundlesDir).filter(isGameJar).sort()) {
    const entries = (await $`jar tf ${join(bundlesDir, jar)}`.text()).split(/\r?\n/).filter((e) => e.startsWith("META-INF/dependencymanager/") && !e.endsWith("/"));
    const lines: any[] = [];
    for (const e of entries) {
      const txt = await $`jar xf ${join(bundlesDir, jar)} ${e}`.cwd(classesDir).quiet().then(() => readFileSync(join(classesDir, e), "utf8"));
      for (const l of txt.split(/\r?\n/).filter(Boolean)) lines.push(JSON.parse(l));
    }
    result[jar.replace(/^net\.rfactor2\./, "").replace(/\.jar$/, "")] = lines;
  }
  return result;
}

/** Minimal Chrome DevTools Protocol client for the game's CEF page. */
export async function cdp() {
  // In a session there are two browsers: the main UI and the 1024x1024 driver-labels texture (#/driver-labels).
  const pages = (await (await fetch(`${DEVTOOLS}/json`)).json()).filter((t: any) => t.type === "page");
  const page = pages.find((t: any) => !t.url.includes("driver-labels")) ?? pages[0];
  if (!page) throw new Error("no CEF page; start the game with --remote-debugging-port=9222");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map<number, { res: (v: any) => void; rej: (e: any) => void }>();
  const listeners: ((m: any) => void)[] = [];
  ws.onmessage = (e) => {
    const m = JSON.parse(String(e.data));
    if (m.id && pending.has(m.id)) {
      const p = pending.get(m.id)!;
      pending.delete(m.id);
      m.error ? p.rej(new Error(m.error.message)) : p.res(m.result);
    } else listeners.forEach((l) => l(m));
  };
  await new Promise((r, j) => ((ws.onopen = r), (ws.onerror = j)));
  const send = (method: string, params: any = {}) =>
    new Promise<any>((res, rej) => {
      const i = ++id;
      pending.set(i, { res, rej });
      ws.send(JSON.stringify({ id: i, method, params }));
    });
  return {
    send,
    on: (l: (m: any) => void) => listeners.push(l),
    /** Evaluate an ES5 expression (the page is Chromium 75). */
    eval: async (expression: string) => (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result?.value,
    close: () => ws.close(),
  };
}
