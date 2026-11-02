// Extracts the stock web UI from the game's bundles into reference/stock/<bundle>/ and
// collects every ui-router state into generated/routes.json.
//
// The app bundles (main-*.js) are TypeScript compiled to named AMD modules and concatenated;
// each define("name", ...) is written to modules/<name>.js and formatted.
import { $ } from "bun";
import { parse } from "acorn";
import { transform } from "esbuild";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { dirname, join, relative } from "path";
import { bundlesDir, genDir, here, stockDir, walk, write } from "./lib";

const TEXT = /\.(js|html|css|json|md|txt)$/i;
const tmpDir = join(here, ".tmp");

export type Route = {
  app: string;
  module: string;
  name: string;
  title?: string;
  url?: string;
  abstract?: boolean;
  controller?: string;
  component?: string;
  templateUrl?: string;
  inlineTemplate?: boolean;
  params?: string[];
  parent?: string;
};

export async function extract() {
  // clear contents (the folder itself may be held open by a shell)
  if (existsSync(stockDir)) for (const f of walk(stockDir)) rmSync(f, { force: true });
  rmSync(tmpDir, { recursive: true, force: true });
  mkdirSync(tmpDir, { recursive: true });

  const routes: Route[] = [];
  const modules: Record<string, string[]> = {};
  const patched: string[] = [];

  for (const jar of readdirSync(bundlesDir).filter((f) => f.startsWith("net.rfactor2.") && f.endsWith(".jar")).sort()) {
    const name = jar.replace(/^net\.rfactor2\./, "").replace(/\.jar$/, "");
    const jarPath = join(bundlesDir, jar);
    const entries = (await $`jar tf ${jarPath}`.text()).split(/\r?\n/);
    const wanted = entries.filter((e) => e.startsWith("static/") && TEXT.test(e) && !e.includes("/new-ui/"));
    if (!wanted.length) continue;
    const dest = join(tmpDir, name);
    mkdirSync(dest, { recursive: true });
    const argfile = join(tmpDir, `${name}.args`);
    writeFileSync(argfile, wanted.map((e) => `"${e}"`).join("\n"));
    await $`jar xf ${jarPath} @${argfile}`.cwd(dest).quiet();

    for (const file of walk(join(dest, "static"))) {
      const rel = relative(join(dest, "static"), file).replaceAll("\\", "/");
      let content = readFileSync(file, "utf8");
      // A previous UI mod wrapped the framework bundle with a hook; keep only the original code.
      const m = content.match(/\/\*%%%INJECT\*\/([\s\S]*)\/\*%%%ENDINJECT\*\//);
      if (m) {
        content = m[1];
        patched.push(jar);
      }
      write(join(stockDir, name, rel), content);
      if (/\/main-[0-9a-f]+\.js$/.test(rel)) {
        const app = rel.split("/")[0];
        modules[app] = await splitBundle(content, join(stockDir, name, dirname(rel), "modules"), app, routes);
      }
    }
  }
  rmSync(tmpDir, { recursive: true, force: true });

  write(join(genDir, "routes.json"), JSON.stringify(routes, null, 2));
  write(join(genDir, "modules.json"), JSON.stringify(modules, null, 2));
  console.log(`extract: ${Object.values(modules).flat().length} modules, ${routes.length} routes${patched.length ? `; unwrapped hook in ${patched.join(", ")}` : ""}`);
  return { routes, modules, patched };
}

async function splitBundle(code: string, dest: string, app: string, routes: Route[]) {
  const ast = parse(code, { ecmaVersion: "latest", sourceType: "script" }) as any;
  const names: string[] = [];
  const defines: any[] = [];
  visit(ast, (n) => {
    if (n.type === "CallExpression" && n.callee.type === "Identifier" && n.callee.name === "define" && n.arguments[0]?.type === "Literal" && typeof n.arguments[0].value === "string") {
      defines.push(n);
      return false; // modules don't nest
    }
  });
  for (const d of defines) {
    const name: string = d.arguments[0].value;
    const src = code.slice(d.start, d.end) + ";";
    let pretty = src;
    try {
      pretty = (await transform(src, { loader: "js" })).code;
    } catch {}
    write(join(dest, name + ".js"), pretty);
    names.push(name);
    collectRoutes(d, app, name, routes);
  }
  return names;
}

function visit(node: any, fn: (n: any) => boolean | void) {
  if (!node || typeof node.type !== "string") return;
  if (fn(node) === false) return;
  for (const k in node) {
    const v = node[k];
    if (Array.isArray(v)) v.forEach((c) => visit(c, fn));
    else if (v && typeof v === "object" && typeof v.type === "string") visit(v, fn);
  }
}

const DYNAMIC = Symbol("dynamic");
type Env = Map<string, unknown>;

/** Best-effort constant evaluation: literals, string concatenation, exports.X / var references, translate("x") -> "x". */
function evaluate(n: any, env: Env): unknown {
  if (!n) return undefined;
  switch (n.type) {
    case "Literal":
      return n.value;
    case "TemplateLiteral":
      return n.expressions.length === 0 ? n.quasis[0].value.cooked : DYNAMIC;
    case "UnaryExpression":
      if (n.operator === "!" && n.argument.type === "Literal") return !n.argument.value; // !0 / !1
      if (n.operator === "void") return undefined;
      return DYNAMIC;
    case "BinaryExpression": {
      if (n.operator !== "+") return DYNAMIC;
      const a = evaluate(n.left, env), b = evaluate(n.right, env);
      return typeof a === "string" && typeof b === "string" ? a + b : DYNAMIC;
    }
    case "Identifier":
      return env.has(n.name) ? env.get(n.name) : DYNAMIC;
    case "MemberExpression": {
      const key = memberKey(n);
      return key && env.has(key) ? env.get(key) : DYNAMIC;
    }
    case "CallExpression": {
      // i18n_translate("x") / i18n_1.default.translate("x")
      const callee = n.callee.type === "Identifier" ? n.callee.name : n.callee.property?.name;
      if (/translate/i.test(callee ?? "") && n.arguments.length >= 1) return evaluate(n.arguments[0], env);
      return DYNAMIC;
    }
    case "ObjectExpression": {
      const r: Record<string, unknown> = {};
      for (const p of n.properties) {
        const key = p.key?.name ?? p.key?.value;
        if (key) r[key] = evaluate(p.value, env);
      }
      return r;
    }
    case "ArrayExpression":
      return n.elements.map((e: any) => evaluate(e, env));
    default:
      return DYNAMIC;
  }
}

function memberKey(n: any): string | undefined {
  if (n.type === "Identifier") return n.name;
  if (n.type === "MemberExpression" && !n.computed) {
    const o = memberKey(n.object);
    return o && `${o}.${n.property.name}`;
  }
}

function collectRoutes(defineNode: any, app: string, module: string, routes: Route[]) {
  // Collect constant assignments first (exports.fooStateName = "start.menu.foo", var pageName = translate("x")).
  const env: Env = new Map();
  visit(defineNode, (n) => {
    if (n.type === "AssignmentExpression" && n.operator === "=") {
      const key = memberKey(n.left);
      const v = evaluate(n.right, env);
      if (key && v !== DYNAMIC) env.set(key, v);
    }
    if (n.type === "VariableDeclarator" && n.id.type === "Identifier" && n.init) {
      const v = evaluate(n.init, env);
      if (v !== DYNAMIC) env.set(n.id.name, v);
    }
  });

  // Route factories, e.g. getSettingStates(baseState, backState) called as getSettingStates("start.menu", ...):
  // route objects inside them are expanded once per call site with literal arguments.
  const funcNames = new Map<any, string>();
  visit(defineNode, (n) => {
    if (n.type === "VariableDeclarator" && n.id.type === "Identifier" && /Function|Arrow/.test(n.init?.type ?? "")) funcNames.set(n.init, n.id.name);
    if (n.type === "FunctionDeclaration" && n.id) funcNames.set(n, n.id.name);
  });
  const callArgs = new Map<string, unknown[][]>();
  visit(defineNode, (n) => {
    if (n.type === "CallExpression" && n.callee.type === "Identifier" && [...funcNames.values()].includes(n.callee.name)) {
      const args = n.arguments.map((a: any) => evaluate(a, env));
      if (args.every((a: unknown) => typeof a === "string")) callArgs.set(n.callee.name, [...(callArgs.get(n.callee.name) ?? []), args]);
    }
  });

  let scope: Env = env;
  const add = (name: string, cfgNode: any) => {
    const cfg = evaluate(cfgNode, scope) as Record<string, any>;
    const s = (v: unknown) => (typeof v === "string" ? v : undefined);
    const data = typeof cfg.data === "object" && cfg.data ? cfg.data : {};
    const title = s(data.tab?.name) ?? s(data.tabName) ?? s(data.linkName) ?? s(data.pageName) ?? s(data.title);
    routes.push({
      app,
      module,
      name,
      title,
      url: s(cfg.url),
      abstract: cfg.abstract === true || undefined,
      controller: s(cfg.controller) ?? (cfg.controller !== undefined ? (s(cfg.controllerAs) ? `(imported) as ${cfg.controllerAs}` : "(imported)") : undefined),
      component: s(cfg.component),
      templateUrl: s(cfg.templateUrl),
      inlineTemplate: cfg.template !== undefined ? true : undefined,
      params: typeof cfg.params === "object" && cfg.params ? Object.keys(cfg.params) : undefined,
      parent: s(cfg.parent),
    });
  };
  const isRouteConfig = (cfg: any) =>
    cfg?.type === "ObjectExpression" && cfg.properties.some((p: any) => ["url", "templateUrl", "template", "controller", "component", "abstract"].includes(p.key?.name ?? p.key?.value));

  const scan = (n: any): void => {
    if (!n || typeof n.type !== "string") return;
    const fname = funcNames.get(n);
    if (fname && callArgs.has(fname)) {
      const outer = scope;
      for (const args of callArgs.get(fname)!) {
        scope = new Map(outer);
        n.params.forEach((p: any, i: number) => p.type === "Identifier" && scope.set(p.name, args[i]));
        scan(n.body);
      }
      scope = outer;
      return;
    }
    // $stateProvider.state("name", {...}) / .state({name, ...})
    if (n.type === "CallExpression" && n.callee.type === "MemberExpression" && (n.callee.property.name ?? n.callee.property.value) === "state") {
      const [a, b] = n.arguments;
      const name = evaluate(a, scope);
      if (typeof name === "string" && isRouteConfig(b)) add(name, b);
      else if (a?.type === "ObjectExpression") {
        const nameProp = a.properties.find((p: any) => (p.key?.name ?? p.key?.value) === "name");
        const nm = nameProp && evaluate(nameProp.value, scope);
        if (typeof nm === "string" && isRouteConfig(a)) add(nm, a);
      }
    }
    // route arrays: [{ name: <expr>, config: {...} }]
    if (n.type === "ObjectExpression") {
      const prop = (k: string) => n.properties.find((p: any) => (p.key?.name ?? p.key?.value) === k);
      const nameProp = prop("name"), configProp = prop("config");
      if (nameProp && isRouteConfig(configProp?.value)) {
        const nm = evaluate(nameProp.value, scope);
        if (typeof nm === "string") add(nm, configProp.value);
      }
    }
    for (const k in n) {
      const v = n[k];
      if (Array.isArray(v)) v.forEach(scan);
      else if (v && typeof v === "object" && typeof v.type === "string") scan(v);
    }
  };
  scan(defineNode);
}

if (import.meta.main) await extract();
