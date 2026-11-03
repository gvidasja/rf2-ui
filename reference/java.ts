// Parses `javap -p -c` output of the game's classes into a model: types, members and a call graph.
import { $ } from "bun";
import { join, relative } from "path";
import { classesDir, walk } from "./lib";

export type JType = { name: string; args: JType[]; array: number }; // name "?" for wildcards
export type Field = { name: string; type: string; isPublic: boolean; isStatic: boolean };
export type Method = {
  name: string;
  ret: string;
  params: string[];
  isPublic: boolean;
  isStatic: boolean;
  isNative: boolean;
  calls: { owner: string; name: string }[];
  news: string[];
  indy: boolean; // contains invokedynamic (lambdas)
};
export type ClassInfo = {
  name: string; // dotted, inner classes with $
  kind: "class" | "interface" | "enum";
  superName?: string;
  interfaces: string[];
  fields: Field[];
  methods: Method[];
  enumConstants: string[];
};

const MODIFIERS = new Set(["public", "private", "protected", "static", "final", "abstract", "synchronized", "native", "volatile", "transient", "default", "strictfp"]);

export async function loadClasses(): Promise<Map<string, ClassInfo>> {
  const files = [...walk(join(classesDir, "net"))].filter((f) => f.endsWith(".class")).map((f) => relative(classesDir, f).replaceAll("\\", "/"));
  const classes = new Map<string, ClassInfo>();
  for (let i = 0; i < files.length; i += 150) {
    const out = await $`javap -p -c ${files.slice(i, i + 150)}`.cwd(classesDir).quiet().text();
    for (const c of parseJavap(out)) classes.set(c.name, c);
  }
  return classes;
}

export function parseJavap(text: string): ClassInfo[] {
  const result: ClassInfo[] = [];
  let cur: ClassInfo | undefined;
  let method: Method | undefined;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+$/, "");
    const header = line.match(/^(?:[a-z]+ )*(class|interface|enum) ([\w.$]+)(?:<.*?>)?(?: extends ([\w.$]+)(?:<.*?>)?)?(?: implements (.+))? \{$/);
    if (header && !line.startsWith(" ")) {
      const isEnum = /\bextends java\.lang\.Enum</.test(line);
      cur = {
        name: header[2],
        kind: isEnum ? "enum" : (header[1] as ClassInfo["kind"]),
        superName: header[1] === "interface" ? undefined : header[3],
        interfaces: header[1] === "interface" ? splitTop(header[3] ?? "").map(baseName) : splitTop(header[4] ?? "").map(baseName),
        fields: [],
        methods: [],
        enumConstants: [],
      };
      if (header[1] === "interface" && header[3]) cur.interfaces = splitTop(header[3]).map(baseName);
      result.push(cur);
      method = undefined;
      continue;
    }
    if (!cur) continue;
    // member declaration: two-space indent
    if (/^ {2}\S/.test(line) && line.endsWith(";")) {
      method = undefined;
      const decl = line.trim().slice(0, -1).replace(/ throws .*$/, "");
      const mods = new Set<string>();
      let rest = decl;
      for (;;) {
        const m = rest.match(/^(\w+) /);
        if (m && MODIFIERS.has(m[1])) {
          mods.add(m[1]);
          rest = rest.slice(m[0].length);
        } else break;
      }
      rest = rest.replace(/^<[^()]*?>\s+/, ""); // generic method type params
      const paren = rest.indexOf("(");
      if (paren >= 0) {
        const before = rest.slice(0, paren).trim();
        const params = rest.slice(paren + 1, rest.lastIndexOf(")"));
        const sp = lastTopSpace(before);
        const name = sp < 0 ? "<init>" : before.slice(sp + 1);
        const ret = sp < 0 ? "void" : before.slice(0, sp);
        method = {
          name: name === cur.name ? "<init>" : name,
          ret,
          params: splitTop(params),
          isPublic: mods.has("public"),
          isStatic: mods.has("static"),
          isNative: mods.has("native"),
          calls: [],
          news: [],
          indy: false,
        };
        cur.methods.push(method);
      } else if (rest !== "{}" && rest.trim()) {
        const sp = lastTopSpace(rest);
        const type = rest.slice(0, sp), name = rest.slice(sp + 1);
        if (cur.kind === "enum" && mods.has("static") && type === cur.name) cur.enumConstants.push(name);
        else cur.fields.push({ name, type, isPublic: mods.has("public"), isStatic: mods.has("static") });
      }
      continue;
    }
    if (method) {
      const call = line.match(/\/\/ (?:Interface)?Method ([\w/$]+)\.([\w$<>"]+):/) ?? line.match(/\/\/ (?:Interface)?Method ([\w$<>"]+):/);
      if (call && /invoke/.test(line)) {
        const owner = call.length === 3 ? call[1].replaceAll("/", ".") : cur.name;
        const name = (call.length === 3 ? call[2] : call[1]).replaceAll('"', "");
        method.calls.push({ owner, name });
      }
      const nw = line.match(/\bnew\s+#\d+\s+\/\/ class ([\w/$]+)/);
      if (nw) method.news.push(nw[1].replaceAll("/", "."));
      if (/invokedynamic/.test(line)) method.indy = true;
    }
  }
  return result;
}

function lastTopSpace(s: string) {
  let depth = 0;
  for (let i = s.length - 1; i >= 0; i--) {
    if (s[i] === ">") depth++;
    else if (s[i] === "<") depth--;
    else if (s[i] === " " && depth === 0) return i;
  }
  return -1;
}

export function splitTop(s: string): string[] {
  const out: string[] = [];
  let depth = 0, start = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "<") depth++;
    else if (s[i] === ">") depth--;
    else if (s[i] === "," && depth === 0) {
      out.push(s.slice(start, i).trim());
      start = i + 1;
    }
  }
  if (s.slice(start).trim()) out.push(s.slice(start).trim());
  return out;
}

function baseName(t: string) {
  return t.replace(/<.*$/, "").trim();
}

export function parseType(s: string): JType {
  s = s.trim();
  let array = 0;
  while (s.endsWith("[]")) {
    array++;
    s = s.slice(0, -2).trim();
  }
  if (s.endsWith("...")) {
    array++;
    s = s.slice(0, -3);
  }
  if (s.startsWith("?")) {
    const m = s.match(/^\?\s+(extends|super)\s+(.+)$/);
    return m && m[1] === "extends" ? { ...parseType(m[2]), array } : { name: "?", args: [], array };
  }
  const lt = s.indexOf("<");
  if (lt < 0) return { name: s, args: [], array };
  return { name: s.slice(0, lt), args: splitTop(s.slice(lt + 1, s.lastIndexOf(">"))).map(parseType), array };
}

/** Jackson 2.8 property name for a getter/setter suffix: leading upper-case run is lower-cased. */
export function jacksonName(suffix: string) {
  let i = 0;
  while (i < suffix.length && suffix[i] >= "A" && suffix[i] <= "Z") i++;
  return suffix.slice(0, i).toLowerCase() + suffix.slice(i);
}
