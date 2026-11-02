# Stock UI & API reference

Everything known about the game side, for rebuilding the UI. Generated from the installed game, except `UI_SHELL.md`.

| file | what |
|---|---|
| [SITEMAP.md](SITEMAP.md) | every stock screen (ui-router state) with URL, controller, template, components, screenshots |
| [API.md](API.md) | every REST endpoint with TypeScript contracts, natives it reaches, live samples, recorded stock-UI requests |
| [rf2-api.ts](rf2-api.ts) | the contracts as TypeScript (`Endpoints` map + all DTO types) — importable from `src/` |
| [SETTINGS.md](SETTINGS.md) | all session settings (probed live: values/ranges/side effects), options, weather; quirks |
| [NATIVE.md](NATIVE.md) | every native (JNI) function of `rFactor2.exe`, which service/endpoint reaches it, which aren't exposed |
| [UI_SHELL.md](UI_SHELL.md) | hand-written: native shell (`UI.OSC`), the 3D viewport, browsers, navigation actions, gotchas |

Gitignored, recreated by the scripts: `stock/` (stock UI sources, modules split + formatted), `generated/`
(routes, samples, settings JSON), `screenshots/`, `.classes/`.

## Regenerating

Requires the rf2ui bundle installed (`bun run game:install`) and, for live parts, the game running with
`--remote-debugging-port=9222` in its launch options.

```sh
bun reference/dump.ts                              # extract, contracts, sitemap, settings (settings: main menu only)
bun reference/screenshots.ts                       # stock menu screens (switches to the stock UI and back)
bun reference/session.ts                           # start a session from the main menu (uses current settings)
bun reference/screenshots.ts --app event --window  # in-session screens + real game-window captures
bun reference/newui-screenshots.ts                 # this repo's UI
```

`settings.ts` changes every session setting and restores it (verified against a backup at the end).
Never sample `GET /rest/replay/numberofonboardcameras` outside a replay: it crashes the game.
