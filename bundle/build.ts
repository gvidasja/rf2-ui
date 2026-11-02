// Packs the OSGi bundle that serves this UI from inside rFactor 2.
//
//   bun bundle/build.ts            -> bundle/dist/gvidasja.rf2ui.jar (expects a fresh `vite build` in dist/)
//   bun bundle/build.ts install    -> build + copy into <rF2>/Bin/Bundles, drop its Felix cache entry
//   bun bundle/build.ts uninstall  -> remove jar + cache entry (stock UI comes back)
//
// The game's bootstrap installs every jar in Bin/Bundles, so nothing stock is modified.
import { $ } from "bun";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { join } from "path";

const RF2 = process.env.RF2_DIR ?? "D:/SteamLibrary/steamapps/common/rFactor 2";
const NAME = "gvidasja.rf2ui";
const JAR = `${NAME}.jar`;
const PKG = "net.gvidasja.rf2ui";

const here = import.meta.dir;
const repo = join(here, "..");
const out = join(here, "build");
const dist = join(here, "dist");
const uiDist = join(repo, "dist");
const bundlesDir = join(RF2, "Bin", "Bundles");
const cacheDir = join(RF2, "Bin", "Cache");

type Props = Record<string, string | { type: string; value: unknown }>;
const resource = (prefix: string, pattern: string): Props => ({
  "osgi.http.whiteboard.resource.prefix": prefix,
  "osgi.http.whiteboard.resource.pattern": pattern,
});

// Dependency Manager component descriptors (what the DM annotations would generate).
// Exact resource patterns win over the stock start app's "/start/*"; for an exact match Felix
// serves `prefix` itself as the file.
const components: { id: string; lines: object[] }[] = [
  { id: "StartPage", lines: [component("Resources", resource("/static/start/index.html", "/start/index.html"))] },
  { id: "StockStartPage", lines: [component("Resources", resource("/static/start/stock.html", "/start/stock.html"))] },
  { id: "Ui", lines: [component("Resources", resource("/static/rf2ui", "/rf2ui/*"))] },
  {
    id: "RestApp",
    lines: [
      component("RestApp", { "osgi.jaxrs.application.base": "rest/rf2ui", "osgi.jaxrs.name": "rf2ui" }, "javax.ws.rs.core.Application"),
    ],
  },
  {
    id: "Rest",
    lines: [
      component("Rest", {
        "osgi.jaxrs.application.select": "rf2ui",
        "osgi.jaxrs.resource": { type: "java.lang.Boolean", value: true },
      }),
      { dereference: "true", service: "net.rfactor2.sessions.SessionService", autoConfig: "m_sessionService", type: "ServiceDependency" },
    ],
  },
];

function component(cls: string, properties: Props, provides = "java.lang.Object") {
  return { impl: `${PKG}.${cls}`, provides: [provides], scope: "SINGLETON", type: "Component", properties };
}

const imports = [
  'com.fasterxml.jackson.databind;version="[2.8,3)"',
  'com.fasterxml.jackson.jaxrs.json;version="[2.8,3)"',
  'javax.ws.rs;version="[2.0,3)"',
  'javax.ws.rs.core;version="[2.0,3)"',
  'net.rfactor2.sessions;version="[1.0,2)"',
];

// Jars the Java code compiles against; all are provided by the game at runtime.
const classpath = [
  join(RF2, "Bin", "rFactor2.jar"),
  ...["org.amdatu.web.rest.resteasy-", "jackson-databind-", "jackson-core-", "jackson-annotations-", "jackson-jaxrs-json-provider-", "jackson-jaxrs-base-"].map(
    (prefix) => {
      const jar = readdirSync(bundlesDir).find((f) => f.startsWith(prefix) && f.endsWith(".jar"));
      if (!jar) throw new Error(`missing ${prefix}*.jar in ${bundlesDir}`);
      return join(bundlesDir, jar);
    },
  ),
].join(";");

async function build() {
  if (!existsSync(join(uiDist, "assets", "index.js"))) throw new Error("dist/assets/index.js missing; run `vite build` first");

  rmSync(out, { recursive: true, force: true });
  mkdirSync(join(out, "META-INF", "dependencymanager"), { recursive: true });
  mkdirSync(dist, { recursive: true });

  // The game runs Java 8.
  const sources = readdirSync(join(here, "src", ...PKG.split("."))).map((f) => join(here, "src", ...PKG.split("."), f));
  await $`javac --release 8 -nowarn -encoding UTF-8 -cp ${classpath} -d ${out} ${sources}`;

  cpSync(join(here, "static"), join(out, "static"), { recursive: true });
  cpSync(uiDist, join(out, "static", "rf2ui"), { recursive: true });

  // The stock start page, kept reachable at /start/stock.html. Copied from the installed game so its
  // hashed script names always match.
  const tmp = join(out, ".stock");
  mkdirSync(tmp);
  await $`jar xf ${join(bundlesDir, "net.rfactor2.app.start.jar")} static/start/index.html`.cwd(tmp).quiet();
  const stock = readFileSync(join(tmp, "static", "start", "index.html"), "utf8");
  rmSync(tmp, { recursive: true });
  // A way back to the new UI (clears the flag set by src/stockUi.ts).
  const backButton = `
<div id="rf2ui-back" style="position:fixed;right:4px;bottom:4px;z-index:99999;padding:2px 8px;font:12px sans-serif;color:#000;background:#fc0;border-radius:3px;cursor:pointer">NEW UI</div>
<script>
  document.getElementById('rf2ui-back').onclick = function () {
    try { sessionStorage.removeItem('rf2ui.stockUi') } catch (e) {}
    location.href = '/start/index.html'
  }
</script>
`;
  if (!stock.includes("</body>")) throw new Error("stock start page has no </body>");
  writeFileSync(join(out, "static", "start", "stock.html"), stock.replace("</body>", backButton + "</body>"));

  const descriptors: string[] = [];
  for (const c of components) {
    const file = `META-INF/dependencymanager/${PKG}.${c.id}`;
    writeFileSync(join(out, file), c.lines.map((l) => JSON.stringify(l)).join("\n") + "\n");
    descriptors.push(file);
  }

  const manifestPath = join(here, "build-manifest.mf");
  writeFileSync(
    manifestPath,
    [
      "Bundle-ManifestVersion: 2",
      `Bundle-SymbolicName: ${NAME}`,
      `Bundle-Name: ${NAME}`,
      `Bundle-Version: 0.0.0.${Date.now()}`,
      `Import-Package: ${imports.join(",")}`,
      `DependencyManager-Component: ${descriptors.join(",")}`,
      'Require-Capability: osgi.extender;filter:="(&(osgi.extender=org.apache.felix.dependencymanager.runtime)(version>=4.0.0))"',
      "",
    ].join("\n"),
  );

  rmSync(join(dist, JAR), { force: true });
  await $`jar cfm ${join(dist, JAR)} ${manifestPath} -C ${out} .`.quiet();
  rmSync(manifestPath);
  console.log(`built bundle/dist/${JAR}`);
}

async function assertGameStopped() {
  const procs = await $`tasklist /FI "IMAGENAME eq rFactor2.exe" /NH`.text();
  if (procs.includes("rFactor2.exe")) throw new Error("rFactor 2 is running; close it first");
}

// Felix keeps an installed copy per bundle in Bin/Cache/bundleN; drop ours so the new jar is used.
function purgeCache() {
  if (!existsSync(cacheDir)) return;
  for (const d of readdirSync(cacheDir)) {
    const info = join(cacheDir, d, "bundle.info");
    if (existsSync(info) && readFileSync(info, "utf8").includes(JAR)) {
      rmSync(join(cacheDir, d), { recursive: true, force: true });
      console.log(`purged cache ${d}`);
    }
  }
}

const cmd = Bun.argv[2] ?? "build";
if (cmd === "build") {
  await build();
} else if (cmd === "install") {
  await build();
  await assertGameStopped();
  purgeCache();
  cpSync(join(dist, JAR), join(bundlesDir, JAR));
  console.log(`installed ${join(bundlesDir, JAR)}`);
} else if (cmd === "uninstall") {
  await assertGameStopped();
  rmSync(join(bundlesDir, JAR), { force: true });
  purgeCache();
  console.log("uninstalled");
} else {
  throw new Error(`unknown command: ${cmd}`);
}
