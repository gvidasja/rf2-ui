# How the game hosts the web UI (native shell, 3D views, browsers)

Hand-written findings (not generated). Evidence: `Core/UIData/defaultui.mas` → `UI.OSC`, DevTools on the game's CEF,
and real game-window captures (`screenshots/game/`).

## The native shell: `UI.OSC`

The game's UI is still gMotor's legacy page system. `UI.OSC` (inside `Core/UIData/defaultui.mas`, a UI *component*
with manifest `rFactor2 UI.mft`, `Type=11`) defines a handful of native pages. Each page has:

- a **`GENERIC_HTML` gizmo**: a CEF browser with a URL, position and size (`Context="UI"`), and optionally
- an **`APP_PICTURE_REPLAYDISPLAY`** (3D track view) or **`APP_PICTURE_VEHICLEDISPLAY`** (3D car showroom) gizmo.

| native page | browser URL | browser rect | 3D gizmo rect |
|---|---|---|---|
| `RF2_MAIN` (DoPage) | `/start/index.html` | 0,0 1920×1080 | — |
| `RF2_CLIENT_CAR_LIST` | `/start/index.html#/multiplayer/car` | 0,0 1920×1080 | — |
| `MONITORPAGE` (event, Watch tab) | `/event/index.html` | 0,0 1920×1080 | REPLAYDISPLAY **30,255 793×465** |
| `MONITOR MAXIMIZED` | `/event/index.html#/fullscreen` | 0,0 1920×1080 | REPLAYDISPLAY −2,0 1921×1081 |
| `MPCLIENTGRID` | `/event/index.html` | 0,0 1920×1080 | REPLAYDISPLAY 30,255 793×465 |
| `RF2_CAR_UPGRADES` (showroom) | `/tuning/index.html` | 0,0 **1920×280** | VEHICLEDISPLAY 1,0 1920×1080 |
| `RF2_CLIENT_TEAM_*`, `RF2_MULTI_JOIN_MAIN`, `CHAT_EXPANDED` | — | — | — |

Coordinates are in a 1920×1080 virtual screen (`Screen_Rez_X/Y`), scaled to the window.

## The Watch-tab viewport

- The 3D view is **not** a full-screen render behind a transparent page. It's a native gizmo drawn into a fixed rect
  from `UI.OSC`; the web page (transparent background) just leaves a hole there: `.mini-monitor .game-view`
  (an empty div, `background: transparent`, height 22.25rem) in `event/watch/mini-monitor`.
- Proof: making the whole page transparent shows black everywhere except 30,255 793×465; and putting the page on its
  `#/fullscreen` route while the native page is still `MONITORPAGE` keeps the 3D view small
  (`screenshots/game/fullscreen.png`).
- **Nothing in JS reports the hole's position.** Moving/resizing the HTML hole doesn't move the 3D view.
- **Full screen** = a different native page: `POST /navigation/action/NAV_TO_FULL_EVENT_MONITOR` (→ `MONITOR MAXIMIZED`,
  whose browser loads `#/fullscreen`), back with `NAV_TO_EVENT_MONITOR`. That's the only runtime control.
- Camera/target are controlled separately: `PUT /rest/watch/focus/{cameraType}/{trackSideGroup}/{shouldAdvance}`,
  `PUT /rest/replay/camera/{slotid}`, `GET /rest/watch/activeCamera`, replay transport under `/rest/replay` (API.md).

### Options to move/resize it

1. **Custom UI component** (most promising): ship our own `UI.OSC` in a UIData component (`.mas` + `.mft`), with the
   REPLAYDISPLAY rect we want, more pages, and browser URLs pointing straight at `/rf2ui/...`. The game supports
   per-mod UIs (`player.JSON`: `"UI Auto Switch with Mod"`). Open questions: how a non-core UI component is selected and
   whether its manifest `Signature`/`MASFile` hash must be valid (ModMgr can package/sign); writing MAS2 is the decoder
   run in reverse (the header "encryption" is an XOR keystream).
2. Per-page layouts are fixed at load time, so a dynamic layout would mean several native pages with different
   rects and switching between them with navigation actions — only possible with (1) plus native actions that
   target those pages.
3. `rFactor2.exe` has a `SetRenderSceneViewportScale` string; unexplored.

## Browsers

- One CEF 75 (Chromium 75.0.3770.100) browser per HTML gizmo, rendered off-screen and composited by the game.
  `--remote-debugging-port=9222` on the game's command line exposes them all.
- **In a session there's a second browser**: 1024×1024 at `/event/index.html#/driver-labels`. Its content is used as a
  texture for the name tags above cars in the 3D views. (Navigating it elsewhere puts that page into the 3D scene.)
  Tools in this folder attach to the other one (`lib.ts` → `cdp()`).
- Page switches between `/start`, `/event`, `/loading`, `/tuning` are done by the game (native page change), driven by
  navigation actions; the JS only reads `GET /navigation/state`.

## Navigation actions (`POST /navigation/action/{action}`)

All values of `net.rfactor2.game.NavigationAction` (bold = used by the stock UI):
**NAV_TO_MAIN_MENU**, **NAV_BACK_TO_MAIN_MENU**, **NAV_TO_TUNING**, **NAV_TO_GARAGE**, **NAV_TO_EVENT_MONITOR**,
**NAV_TO_FULL_EVENT_MONITOR**, **NAV_BACK_TO_EVENT**, **NAV_TO_EVENT_INPUT**, **NAV_FOCUS_EVENT**, **NAV_RACE_MULTIPLAYER**,
**NAV_SPECTATE_MULTIPLAYER**, **NAV_REQUEST_PASSENGER**, NAV_TO_REALTIME, NAV_TO_REPLAY, NAV_RACE_SINGLE, NAV_RESTART,
NAV_RESTART_RACE, NAV_RESTART_WEEKEND, NAV_NEXT_SESSION, NAV_NEXT_TRACK, NAV_FINISH_SESSION, NAV_FROM_COMPETITION, NAV_EXIT.

`navigationState` values: NAV_MAIN_MENU, NAV_TUNING, NAV_EVENT, NAV_EVENT_MONITOR_FULL, NAV_REALTIME, NAV_GARAGE, NAV_EVENT_INPUT.

## Gotchas found while probing

- `GET /rest/replay/numberofonboardcameras` **crashes the game** outside a replay (native access violation).
- `GET /rest/sessions/opponents` returns `{"error": "FDEBFF-00xx"}` in some states (in a session; sometimes in the menu).
- In-session AI: `POST /rest/sessions/ai/add` with the opponent *vehicle name* as `text/plain` body
  (e.g. `Porsche 992 Cup #10`); a session started with "50 opponents" still began with only the player.
- `/navigation/state` has no `state` object while loading; `loadingStatus.percentage` is 0–1.
