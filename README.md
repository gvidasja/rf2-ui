# rf2-ui

A replacement UI for rFactor 2, shipped as a separate OSGi bundle — no stock game files are modified.

## How it works

rFactor 2 renders its UI with an embedded Chromium 75 (CEF) pointed at `http://localhost:5397/start/index.html`.
That server is Jetty inside the game's Java/OSGi runtime, and the game's bootstrap installs **every jar in
`Bin/Bundles/`**. This repo builds `gvidasja.rf2ui.jar`, which registers:

| URL | What |
|---|---|
| `/start/index.html` | loader page (`bundle/static/start/index.html`); overrides the stock start page |
| `/start/stock.html` | the stock start page, as an escape hatch |
| `/rf2ui/*` | the built React app (`dist/`) |
| `/rest/rf2ui/*` | extra REST endpoints (`bundle/src/`, Java 8) |

The loader checks for the Vite dev server on `localhost:5173`. If it's running, the UI is loaded from it with
hot reload, otherwise the build packed in the jar is used (`?prod` forces the packed build).

## Setup

Needs Bun and a JDK (`javac`, `jar` on PATH; any version, output targets Java 8).
Set `RF2_DIR` if the game isn't at `D:/SteamLibrary/steamapps/common/rFactor 2`.

```sh
bun install
bun run game:install     # build UI + jar, copy into Bin/Bundles (game must be closed)
bun run game:uninstall   # remove it; the stock UI comes back
```

## Development

```sh
bun run dev
```

- **In game:** with the dev server running, start the game (or reload the UI page). A yellow `DEV` badge
  shows the UI comes from Vite; edits hot-reload in the game. Only Java/loader changes need `game:install`.
- **In a browser:** `http://localhost:5173/rf2ui/`. API calls are proxied to the running game.
- DevTools for the in-game page: add `--remote-debugging-port=9222` to the game's launch options and open
  `http://localhost:9222`.

Chromium 75 constraints: no top-level await, optional chaining or `??` in shipped code (Vite lowers syntax to
`chrome75` in both dev and build), and newer runtime APIs need polyfills (`core-js` imports in `src/main.tsx`).

## REST API notes

Stock endpoints are plain JAX-RS classes in `Bin/Bundles/net.rfactor2.*.jar`. They call OSGi services
(`net.rfactor2.sessions.SessionService`, `OptionsService`, `GarageService`, …) whose implementations queue
commands that run on the game thread and call native methods in `rFactor2.exe`. A bundle can depend on the
same services and expose whatever they offer, but can't go below them.

Added endpoints:

- `GET /rest/rf2ui/ping`
- `POST /rest/rf2ui/sessions/settings/{SESSSET_*}` `{"value": n}` — sets a session setting to an absolute value.
  The native call only steps a setting up or down, so this steps toward the target server-side.

## Legacy

`legacy/` holds the previous approach (patching `net.rfactor2.ui.framework.jar` and injecting a hook), kept for
reference only.
