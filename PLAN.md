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

Status (P0, Nov 2026): built, installed and checked in game: menu, loading, the session tabs, garage changes, driving and
coming back, full screen (the 3D view lines up with the hole at 1920×1080).
- Main menu, race setup, car/track pickers, opponent field, loading (`/loading` page).
- Session (`/event` page): monitor (camera, focused car, replay transport, your car, running order, around the native 3D hole),
  garage (all setup categories, per-corner grid, saved setups), session controls (next/finish/restart, add/remove AI), results,
  full-screen monitor bar.
- Not yet: weather forecast editor.

**P1 — complete daily use**
7. Online — hosted servers: browser + join (password, car, drive/spectate), host a server (paid hosting minutes), private lobby (code, members, ready), in-session chat and car change
8. Settings (gameplay, graphics/display, sound) on one page
9. Controls (assign + calibrate merged, live input meters)
10. Session — live timing (track map + full timing), full-screen monitor, replay controls
11. Replays, notifications, online/auth status
12. Online — Competition System: account sign-up, hub, event, schedule, history & results, leaderboards & stats, career

Status (P1, Nov 2026): done, apart from the parts left on the stock UI. Checked in game:
- Live timing (10), settings on one page (8), controls (9: device names on bindings, live input meters, calibration
  call), replays (11: watching, replay mode in the session page with position and telemetry, leaving).
- Online (7): server browser, a real join (public server, AI only), the joined page, driving into the session,
  chat tab (read only: nothing was posted to the public server), leaving the session.
- Online status and notifications (11): signed in to Studio 397's Nakama with the game's Steam ticket (or the stock
  UI's stored session); notifications are `notifications_global_latest` (none were live when tested).
- Under construction (placeholders that open the stock UI): competitions (12), host a server, private lobby, content,
  profile.
- Untested: changing car online (the server was in warm-up; the tab only shows in online practice), sending a chat
  message, assigning a control (it rebinds for real and waits for a physical input), full calibration (it would
  overwrite the user's calibration; only "steering centre at rest" was run).
- Gotchas found: after joining, the game reloads the start page (the app returns to the joined page); after an online
  session `toRaceMenu` does not switch the browser back to the start page (the app does); a join that needs
  non-downloadable content ends on the game's own error page.

**P2 — completeness**
13. Content (packages, updates, workshop)
14. Profile
15. Photo mode

Status (P2, Nov 2026): built, checked in a browser only (mock).
- Content: package groups (`/rest/race/packagesV2`), install / uninstall / cancel by target state
  (`setPackageState`), progress and Steam Workshop status. Deleting package files stays on the stock UI.
- Profile: name and nickname (`POST /rest/profile`), Competition System ranks and career totals (`cs_user_get`).
  Not available: nationality and helmet (no API), personal bests (stock reads local results files).
- Photo mode: from the full-screen bar; target, mouse look, focus, lens and image options, reset, take photo
  (`POST /rest/screenshot`, the panel hides for the shot).
- Untested in game: all three, in particular real installs, the profile save and the screenshot.

**Not planned:** first-launch wizard, legacy server list (a duplicate of the server list), store (keep the stock screen behind a link), material editor (dev tool), showroom/tuning (stock
`/tuning` page stays until P2+).

## Later / on hold

- **Tech debt: "pressed input" in Controls is guessed in the browser** (`src/settings/pressed.ts`). The game has
  no API for the input being pressed now (its natives only give the four calibrated axes, and assignment mode
  rebinds for real). The page reads the browser's gamepads and keys and translates them to the game's names:
  devices are matched to `/rest/options/joysticks` by name and order (two devices with the same name, like the
  FANATEC wheel, can come out swapped), buttons are assumed to be DirectInput order + 1, axes X Y Z RX RY RZ.
  Proper fix: a small native DLL loaded by our Java bundle that reads DirectInput in shared mode and publishes
  presses on a WebSocket topic (exact device / button numbers, same as the game). Needs a C++ toolchain.
- **External launcher** (an app outside the game that starts a race already configured). Findings in
  `reference/EXTERNAL_LAUNCH.md`:
  - Session settings are the `player.JSON` entries. Editing the file while the game is closed works; this was tested.
  - Car and track are file paths in the same file; the track also stores a scene signature, untested.
  - The bundle would call start-race once the game reaches the menu.
- **Native extensions**: see `reference/EXTENDING_NATIVES.md`. Hooking is acceptable, since the game no longer gets updates.

## Engineering notes

- Session settings: use `/rest/rf2ui/sessions/settings/{key}` (absolute) for LONG/BOOL, the `GAMEOPT_*` options for AI
  floats; re-fetch after weather / finish-criteria changes (see `reference/SETTINGS.md`).
- The bundle serves the same loader at `/start`, `/event` and `/loading` (the game's three native pages); the app picks
  its screens by path (`?page=event` in browser dev). Each keeps its stock page at `<page>/stock.html`.
- The driver-labels browser (`/event/index.html#/driver-labels`, a texture for the name tags in 3D) is redirected to the
  stock event page.
- The event page is transparent; `Frame hole` paints everything except the native monitor rect (tokens `--monitor-*`).
