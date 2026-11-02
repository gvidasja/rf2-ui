// Settings catalogue: SETTINGS.md + generated/settings.json.
//
// Session settings have no metadata in the API, so they are probed live: each one is stepped through its
// values (or to its bounds), side effects on other settings/session counts are recorded, and it is restored.
// Options (graphics, controls, ...) carry min/max/step and are only read, never changed.
// Needs the game in the main menu with the rf2ui bundle installed (absolute set endpoint).
import { readFileSync } from "fs";
import { join } from "path";
import { GAME, gameUp, genDir, here, stockDir, walk, write } from "./lib";

type Setting = { currentValue: unknown; stringValue?: string; valueType?: string; settingID?: number; minValue?: unknown; maxValue?: unknown; stepValue?: unknown };
type Sessions = Record<string, Setting>;

const get = async <T = any>(path: string): Promise<T> => (await fetch(GAME + path)).json() as Promise<T>;
const post = async <T = any>(path: string, body: unknown): Promise<T> => {
  const r = await fetch(GAME + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const t = await r.text();
  return (t ? JSON.parse(t) : undefined) as T;
};
const step = (key: string, direction: number) => post<Setting>("/rest/sessions/settings", { sessionSetting: key, value: direction });
const setAbs = (key: string, value: number) => post<Setting>(`/rest/rf2ui/sessions/settings/${key}`, { value });
const num = (v: unknown) => (typeof v === "boolean" ? (v ? 1 : 0) : Number(v));
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function diff(before: Record<string, any>, after: Record<string, any>, skip?: string) {
  const out: string[] = [];
  for (const k of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (k === skip) continue;
    const a = before[k], b = after[k];
    const close = typeof a?.currentValue === "number" && typeof b?.currentValue === "number" && Math.abs(a.currentValue - b.currentValue) < 1e-5 && a.stringValue === b.stringValue;
    if (!same(a, b) && !close) out.push(`${k}: ${fmt(a)} → ${fmt(b)}`);
  }
  return out;
}
const fmt = (s: any) => (s && typeof s === "object" && "currentValue" in s ? `${JSON.stringify(s.currentValue)}${s.stringValue ? ` (${s.stringValue})` : ""}` : JSON.stringify(s));

/** Stock UI labels per setting key, and the stock module (screen) that shows it. */
function stockLabels() {
  const labels = new Map<string, { label: string; where: Set<string> }>();
  for (const f of walk(stockDir)) {
    if (!f.endsWith(".js") || !f.includes("modules")) continue;
    const code = readFileSync(f, "utf8");
    const where = f.replaceAll("\\", "/").split("/modules/")[1]?.replace(/\.js$/, "") ?? f;
    const add = (key: string, label: string) => {
      const e = labels.get(key) ?? { label, where: new Set() };
      e.where.add(where);
      labels.set(key, e);
    };
    for (const m of code.matchAll(/getSetting\("([A-Z][A-Za-z0-9_]+)",\s*[\w.]*translate\("([^"]+)"\)/g)) add(m[1], m[2]);
    for (const m of code.matchAll(/key:\s*"([A-Z][A-Za-z0-9_]+)",\s*name:\s*[\w.]*translate\("([^"]+)"\)/g)) add(m[1], m[2]);
    for (const m of code.matchAll(/name:\s*[\w.]*translate\("([^"]+)"\),\s*key:\s*"([A-Z][A-Za-z0-9_]+)"/g)) add(m[2], m[1]);
  }
  return labels;
}

export async function settings() {
  if (!(await gameUp())) throw new Error("game not running");
  const labels = stockLabels();

  // ---------- session settings ----------
  const baseline = await get<Sessions>("/rest/sessions");
  const baseCounts = await get<Record<string, number>>("/rest/sessions/amount");
  const baseWeather = await get("/rest/sessions/weather");
  type Probe = { key: string; type?: string; current: Setting; kind: "options" | "range" | "fixed" | "error"; options?: { value: unknown; label?: string }[]; min?: Setting; max?: Setting; stepSize?: number; sideEffects: string[]; restored: boolean; error?: string };
  const probes: Probe[] = [];

  for (const key of Object.keys(baseline).sort()) {
    const orig = baseline[key];
    const p: Probe = { key, type: orig?.valueType, current: orig, kind: "fixed", sideEffects: [], restored: true };
    try {
      if (orig.valueType === "FLOAT") {
        // Float steps accumulate rounding error, so only step once up and back (step size + side effects),
        // then restore exactly through the matching GAMEOPT_* option when there is one.
        const up = await step(key, 1);
        const [after, counts] = await Promise.all([get<Sessions>("/rest/sessions"), get("/rest/sessions/amount")]);
        p.sideEffects = [...diff(baseline, after, key), ...diff(baseCounts, counts).map((d) => `sessions/amount ${d}`)];
        let now = await step(key, -1);
        p.kind = "range";
        p.stepSize = Math.round((num(up.currentValue) - num(orig.currentValue)) * 1e6) / 1e6;
        const alias = FLOAT_OPTION_ALIASES[key];
        if (alias && Math.abs(num(now.currentValue) - num(orig.currentValue)) > 1e-9) {
          await post("/rest/options/float", { optionEntry: alias, value: orig.currentValue });
          now = await get<Setting>(`/rest/sessions/setting/${key}`);
        }
        p.restored = Math.abs(num(now.currentValue) - num(orig.currentValue)) < 1e-3;
        probes.push(p);
        process.stdout.write(p.restored ? "." : "!");
        continue;
      }
      const seq: Setting[] = [orig];
      let s = await step(key, 1);
      // side effects of one step
      const [after, counts, weather] = await Promise.all([get<Sessions>("/rest/sessions"), get("/rest/sessions/amount"), get("/rest/sessions/weather")]);
      p.sideEffects = [...diff(baseline, after, key), ...diff(baseCounts, counts).map((d) => `sessions/amount ${d}`), ...(same(baseWeather, weather) ? [] : ["weather nodes changed"])];
      for (let i = 0; i < 60 && !same(s.currentValue, orig.currentValue); i++) {
        seq.push(s);
        s = await step(key, 1);
      }
      if (same(s.currentValue, orig.currentValue) && seq.length > 1) {
        p.kind = "options";
        p.options = seq.map((x) => ({ value: x.currentValue, label: x.stringValue || undefined })).sort((a, b) => num(a.value) - num(b.value));
      } else if (seq.length === 1) {
        p.kind = "fixed";
      } else {
        p.kind = "range";
        p.min = await setAbs(key, -1e9);
        p.max = await setAbs(key, 1e9);
        const vals = seq.map((x) => num(x.currentValue));
        p.stepSize = vals.length > 1 ? Math.abs(vals[1] - vals[0]) : undefined;
      }
      // restore
      let now = await setAbs(key, num(orig.currentValue));
      if (!same(now.currentValue, orig.currentValue)) {
        for (let i = 0; i < 300 && !same(now.currentValue, orig.currentValue); i++) now = await step(key, 1); // rolls over
      }
      p.restored = same(now.currentValue, orig.currentValue);
    } catch (e) {
      p.kind = "error";
      p.error = String(e);
    }
    probes.push(p);
    process.stdout.write(`${p.restored ? "." : "!"}`);
  }
  console.log();

  // ---------- session counts ----------
  const countProbes: { type: string; current: number; max?: number; sideEffects: string[]; restored: boolean }[] = [];
  for (const [type, current] of Object.entries(baseCounts)) {
    const before = await get<Sessions>("/rest/sessions");
    await post(`/rest/sessions/${type.toLowerCase()}/sessions`, current + 1);
    const after = await get<Sessions>("/rest/sessions");
    const counts1 = await get<Record<string, number>>("/rest/sessions/amount");
    await post(`/rest/sessions/${type.toLowerCase()}/sessions`, 99);
    const max = (await get<Record<string, number>>("/rest/sessions/amount"))[type];
    await post(`/rest/sessions/${type.toLowerCase()}/sessions`, current);
    const restored = (await get<Record<string, number>>("/rest/sessions/amount"))[type] === current;
    countProbes.push({ type, current, max, sideEffects: [...diff(before, after), ...diff(baseCounts, counts1).filter((d) => !d.startsWith(type + ":")).map((d) => `sessions/amount ${d}`)], restored });
  }

  // ---------- final check ----------
  const finalSessions = await get<Sessions>("/rest/sessions");
  const finalCounts = await get("/rest/sessions/amount");
  const finalWeather = await get("/rest/sessions/weather");
  const leftovers = [...diff(baseline, finalSessions), ...diff(baseCounts, finalCounts).map((d) => `amount ${d}`), ...(same(baseWeather, finalWeather) ? [] : ["weather nodes differ"])];

  // ---------- options (read only) ----------
  const options = await get<Record<string, Setting | null>>("/rest/options/settings");
  const categories: Record<string, string[]> = {};
  for (const cat of ["graphics", "display", "sound", "difficulty", "network", "replay", "calibrate"]) {
    try {
      const v = await get(`/rest/options/${cat}`);
      categories[cat] = Object.keys(v ?? {});
    } catch {}
  }
  const catOf = (k: string) => Object.entries(categories).filter(([, ks]) => ks.includes(k)).map(([c]) => c).join(", ");
  const photo = await get<Record<string, Setting | null>>("/rest/options/photomode/options").catch(() => ({}));

  write(join(genDir, "settings.json"), JSON.stringify({ sessions: probes, counts: countProbes, leftovers, options, categories, weather: baseWeather, photo }, null, 2));

  // ---------- SETTINGS.md ----------
  const md: string[] = [];
  const out = (s = "") => md.push(s);
  const lab = (k: string) => labels.get(k)?.label ?? "";
  const valueCell = (s?: Setting | null) => (s ? `${JSON.stringify(s.currentValue)}${s.stringValue ? ` (${s.stringValue})` : ""}` : "");
  out("# Settings catalogue");
  out();
  out("Generated by `bun reference/dump.ts` (session settings probed live in the running game, then restored).");
  out("Labels are the stock UI's. Types and endpoints: [API.md](API.md).");
  out();
  out(NOTES);
  out();
  out("## Session settings (`GET /rest/sessions`, mode SETTING_GRANDPRIX)");
  out();
  out("Change with `POST /rest/sessions/settings {sessionSetting, value: direction}` (relative; `direction` may be >1 to");
  out("skip steps, wraps around) or `POST /rest/rf2ui/sessions/settings/{key} {value}` (absolute, this repo's bundle).");
  out();
  out("| key | stock label | type | current | values | side effects of one step |");
  out("|---|---|---|---|---|---|");
  for (const p of probes) {
    let values = "";
    if (p.kind === "options") values = p.options!.map((o) => `${JSON.stringify(o.value)}${o.label ? `=${o.label}` : ""}`).join(", ");
    else if (p.kind === "range") values = `${valueCell(p.min)} … ${valueCell(p.max)}${p.stepSize ? `, step ${p.stepSize}` : ""}`;
    else if (p.kind === "fixed") values = "_(doesn't change in this context)_";
    else values = `error: ${p.error}`;
    const fx = p.sideEffects.length ? p.sideEffects.slice(0, 6).join("<br>") + (p.sideEffects.length > 6 ? `<br>+${p.sideEffects.length - 6} more` : "") : "";
    out(`| \`${p.key}\`${p.restored ? "" : " ⚠ not restored"} | ${lab(p.key)} | ${p.type ?? ""} | ${valueCell(p.current)} | ${values} | ${fx} |`);
  }
  out();
  const missing = Object.keys(baseline).length;
  out(`${missing} settings. Session setting keys used by the stock UI but absent from \`GET /rest/sessions\`: ${[...labels.keys()].filter((k) => /^SESSSET/.test(k) && !(k in baseline)).map((k) => `\`${k}\``).join(", ") || "none"}.`);
  out();
  out("## Session counts (`GET /rest/sessions/amount`, `POST /rest/sessions/{type}/sessions` with a JSON number)");
  out();
  out("| type | current | max accepted | side effects of +1 |");
  out("|---|---|---|---|");
  for (const c of countProbes) out(`| ${c.type}${c.restored ? "" : " ⚠ not restored"} | ${c.current} | ${c.max} | ${c.sideEffects.join("<br>")} |`);
  out();
  if (leftovers.length) out(`> ⚠ State after probing differs from before: ${leftovers.join("; ")}`), out();
  out("## Weather (`GET /rest/sessions/weather`)");
  out();
  out("`{ PRACTICE|QUALIFY|RACE: { START|NODE_25|NODE_50|NODE_75|FINISH: { <WeatherSetting>: {currentValue, stringValue} } } }`.");
  out("Change with `POST /rest/sessions/weather/{session}/{node}/{setting}/` (JSON number = direction); doing so switches `SESSSET_weather` to Scripted.");
  out();
  const wSample = (baseWeather as any)?.RACE?.START ?? {};
  out("| weather setting | race start (current) |");
  out("|---|---|");
  for (const [k, v] of Object.entries(wSample)) out(`| \`${k}\` | ${valueCell(v as Setting)} |`);
  out();
  out("## Options (`GET /rest/options/settings`, read only here)");
  out();
  out("Change with `POST /rest/options/setting/{key}` (see API.md). `null` = not applicable in the current context. Category = which `/rest/options/<category>` endpoint also returns it.");
  out();
  const groups = new Map<string, string[]>();
  for (const k of Object.keys(options).sort()) {
    const g = k.split("_")[0];
    groups.set(g, [...(groups.get(g) ?? []), k]);
  }
  for (const [g, keys] of groups) {
    out(`### ${g}`);
    out();
    out("| key | stock label | category | type | current | min … max (step) | stock screen |");
    out("|---|---|---|---|---|---|---|");
    for (const k of keys) {
      const o = options[k];
      const range = o && o.minValue !== undefined ? `${o.minValue} … ${o.maxValue}${o.stepValue !== undefined ? ` (${o.stepValue})` : ""}` : "";
      const where = [...(labels.get(k)?.where ?? [])].map((w) => w.split("/").slice(-2).join("/")).join(", ");
      out(`| \`${k}\` | ${lab(k)} | ${catOf(k)} | ${o?.valueType ?? "null"} | ${valueCell(o)} | ${range} | ${where} |`);
    }
    out();
  }
  out("## Photo mode options (`GET /rest/options/photomode/options`)");
  out();
  out("| key | type | current | min … max (step) |");
  out("|---|---|---|---|");
  for (const [k, o] of Object.entries(photo ?? {})) out(`| \`${k}\` | ${o?.valueType ?? "null"} | ${valueCell(o)} | ${o && o.minValue !== undefined ? `${o.minValue} … ${o.maxValue} (${o.stepValue})` : ""} |`);
  write(join(here, "SETTINGS.md"), md.join("\n"));
  console.log(`settings: ${probes.length} session settings (${probes.filter((p) => !p.restored).length} not restored), ${Object.keys(options).length} options; leftovers: ${leftovers.length}`);
}

/** Session FLOAT settings that are the same value as an option (absolute setter: POST /rest/options/float). */
const FLOAT_OPTION_ALIASES: Record<string, string> = {
  SESSSET_AI_Aggression: "GAMEOPT_ai_aggression",
  SESSSET_AI_Limiter: "GAMEOPT_ai_limiter",
};

const NOTES = `## Quirks (from the stock UI code and the live probe below)

- **Session counts live in two places.** \`/rest/sessions/amount\` + \`POST /rest/sessions/{practice|qualify|warmup|race}/sessions\`
  (absolute count; the stock UI shows 0 = Off, 1 = On, n) are what the stock UI uses. The \`SESSSET_pract1..4\`,
  \`SESSSETD_num_qual_sessions\`, \`SESSSET_run_warmup\` settings overlap with them — see the side-effects columns for how they're coupled.
- **\`SESSSET_weather\` is one setting shown in four places** (practice, qualifying, race and general tabs of the stock UI).
  Changing any weather node (\`POST /rest/sessions/weather/...\`) silently switches it to \`Scripted\` (4); changing it away
  from Scripted resets the per-node weather. The stock UI re-fetches all settings after changing it.
- **\`SESSSET_Finish_Criteria\`** decides which of \`SESSSET_Race_Laps\` / \`SESSSET_race_time\` applies; the other reads "N/A".
  The stock UI disables race laps for "Time"/"% Track Time" and race time for "Laps"/"% Track Laps", and re-fetches after a change.
- Stock UI enable/disable rules: RealRoad init/wet only with weather "Scripted"; warmup start time only with a warmup session;
  grid position only without qualifying.
- Session settings are relative: \`value\` in \`POST /rest/sessions/settings\` is a step direction (the stock UI sends multiples
  for its step multiplier) and wraps around at the ends. BOOL settings report \`currentValue\` as true/false.
- **AI settings exist twice**: \`SESSSET_AI_Aggression\`/\`SESSSET_AI_Limiter\` (session, relative steps) are the same values as
  \`GAMEOPT_ai_aggression\`/\`GAMEOPT_ai_limiter\` (options, absolute \`POST /rest/options/float {optionEntry, value}\`). Prefer the
  option setter: stepping a FLOAT setting accumulates float error (0.65 → 0.6499997 shows as "64%").
- \`POST /rest/rf2ui/sessions/settings/{key}\` (this repo) handles LONG/BOOL settings; for FLOAT ones use the options alias above.
- Options are absolute (\`POST /rest/options/{long|float|string}\`; the \`/raw\` variants skip the read-back).
- Settings are per mode (\`SettingMode\`: GRANDPRIX = single player, MULTIPLAYER, CHAMPIONSHIP, ...); the REST layer uses GRANDPRIX.`;

if (import.meta.main) await settings();
