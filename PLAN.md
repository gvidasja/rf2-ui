# New UI — plan

Based on the stock UI map in `reference/` (81 menu screens, ~24 in-session screens). The design for all screens
is the "rFactor 2 — new UI" Claude design.

## Principles

- **One task, one page.** Merge screens that serve the same task (session settings + opponents + weather + car + track
  = one race setup page). Max two levels deep: page → inline panel. No modal chains.
- **Declutter, don't hide.** Everything used every session is visible. Rarely used options sit in a collapsed
  "Advanced" section on the same page, never in another menu.
- **No waiting.** No intro video, no background video, no transitions; feedback within 100 ms. Long operations show
  progress inline and never block the rest of the page.
- **Flat and legible.** Dark, flat surfaces; one accent colour (race orange) for primary actions only; text contrast ≥ 4.5:1;
  16 px minimum at 1080p; targets ≥ 44 px.
- **Keyboard and controller first.** Every screen fully usable with keyboard, gamepad or wheel buttons
  (spec: "Keyboard & controller" board in the design): one always-visible focus ring, spatial arrow navigation,
  ← → change values directly, Back restores focus, shared hint bar with device-specific glyphs. Replaces the
  game's gamepad-mouse emulation. Built into the shared components from P0, not added later.
- **Honest controls.** Show values with units; type a value or step it (we have absolute setters); dependent settings
  stay visible but disabled with the reason ("Race laps — not used: finish by time").
- **Keep the native shell.** In-session pages keep the native 3D monitor at 30,255 793×465 (`UI.OSC`); full screen
  uses the existing `MONITOR MAXIMIZED` page.

## Information architecture

Top level (persistent top bar): **Race** (single player) · **Online** · **Replays** · **Content** · **Settings** · profile · quit.

| new page | replaces stock screens |
|---|---|
| Race setup | main menu, singleplayer (quick event, series, track, car, edit settings tabs), session settings, opponents, weather |
| Online — servers | server list, server list old, multiplayer car (join), private lobby, host a server, hosted lobbies |
| Online — competitions | online menu, daily races, schedule, special events, event, career, career ladder, leaderboard, race history, race results, stats, profile |
| Replays | replays |
| Content | packages local / workshop / store / pending, store (link out), first-launch content step |
| Settings | gameplay, graphics + display, sound, assign controls (6 tabs), calibrate, controller profiles |
| Profile | player, multiplayer profile |
| Session (in event) | event watch, live timing, session controls, car, setup (7 tabs), event settings, fullscreen, photo mode |
| Loading | loading page |
| — removed | intro video, exit page (inline confirm), purchase success (toast), watch & community news tab, server-list-old |

## Priorities

**P0 — offline race loop** (replaces the slow path people use every day)
1. Main menu (one list + preview of the focused item) and Race setup (car, track, sessions, opponents, conditions, rules) + Start
2. Car picker, track picker (inline panels with search + filters)
3. Loading
4. Session monitor (3D view + timing + session bar + Drive)
5. Session — garage / setup
6. Session — controls (next session, restart, add/remove AI) and results

**P1 — complete daily use**
7. Online — hosted servers: browser + join (password, car, drive/spectate), host a server (paid hosting minutes), private lobby (code, members, ready), in-session chat and car change
8. Settings (gameplay, graphics/display, sound) on one page
9. Controls (assign + calibrate merged, live input meters)
10. Session — live timing (track map + full timing), full-screen monitor, replay controls
11. Replays, notifications, online/auth status
12. Online — Competition System: account sign-up, hub, event, schedule, history & results, leaderboards & stats, career

**P2 — completeness**
13. Content (packages, updates, workshop)
14. Profile
15. Photo mode

**Not planned:** first-launch wizard, legacy server list (a duplicate of the server list), store (keep the stock screen behind a link), material editor (dev tool), showroom/tuning (stock
`/tuning` page stays until P2+).

## Engineering notes

- Session settings: use `/rest/rf2ui/sessions/settings/{key}` (absolute) for LONG/BOOL, the `GAMEOPT_*` options for AI
  floats; re-fetch after weather / finish-criteria changes (see `reference/SETTINGS.md`).
- Event pages stay in the stock `/event` app until P0.4 lands; then serve our own page there (same bundle trick as
  `/start/index.html`).
- The driver-labels browser (`#/driver-labels`) must keep working when the event app is replaced.
