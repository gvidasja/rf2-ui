// Regenerates the reference docs from the installed game.
//
//   bun reference/dump.ts            extract + contracts + sitemap (+ settings if the game is in the main menu)
//
// Screenshots are separate (they drive the game UI): screenshots.ts, newui-screenshots.ts, session.ts.
import { extract } from "./extract";
import { contracts } from "./contracts";
import { sitemap } from "./sitemap";
import { settings } from "./settings";
import { GAME, gameUp } from "./lib";

await extract();
await contracts(); // live samples only when the game runs
sitemap();
if (await gameUp()) {
  const nav = await (await fetch(`${GAME}/navigation/state`)).json();
  if (nav.state?.navigationState === "NAV_MAIN_MENU") await settings();
  else console.log(`settings: skipped (game is in ${nav.state?.navigationState ?? "loading"}, needs the main menu)`);
} else console.log("settings: skipped (game not running)");
