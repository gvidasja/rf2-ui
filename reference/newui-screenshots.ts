// Screenshots of this repo's new UI (served by the bundle / Vite dev server) for every route.
//   bun reference/newui-screenshots.ts   -> reference/screenshots/new-ui/<route>.png (gitignored)
import { join } from "path";
import { cdp, here, write } from "./lib";

const ROUTES = ["/", "/sp", "/sp/track", "/sp/car", "/sp/opponents", "/sp/weather", "/mp", "/cmp", "/watch", "/community", "/profile", "/settings"];
const c = await cdp();
await c.send("Page.enable");
await c.eval("sessionStorage.removeItem('rf2ui.stockUi'), 1");
await c.send("Page.navigate", { url: "http://localhost:5397/start/index.html#/" });
await Bun.sleep(6000);
for (const r of ROUTES) {
  await c.eval(`location.hash = ${JSON.stringify("#" + r)}, 1`);
  await Bun.sleep(3000);
  const shot = await c.send("Page.captureScreenshot", { format: "png" });
  const name = r === "/" ? "home" : r.slice(1).replaceAll("/", "-");
  write(join(here, "screenshots", "new-ui", `${name}.png`), Buffer.from(shot.data, "base64") as any);
  console.log("ok", r);
}
await c.eval("location.hash = '#/', 1");
c.close();
