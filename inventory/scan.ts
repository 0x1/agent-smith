// Scans an app's source for calls to known provider endpoints and records which
// response fields each call site reads. Deterministic: no model involved.
import ts from "typescript";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import type { CallSite } from "../contracts/case.ts";
import { PROVIDERS } from "./providers.ts";

export interface PackageEntry {
  name: string;
  version: string;
  dev: boolean;
  // `installed`: listed in the manifest. Package usage is not traced in the demo.
  status: "installed";
}

export interface EndpointEntry {
  provider: string;
  endpoint: string;
  // `used`: at least one call site found. `not_used`: known endpoint, never called.
  status: "used" | "not_used";
  callSites: CallSite[];
}

export interface Inventory {
  repo: string;
  commit: string | null;
  scannedAt: string;
  filesScanned: string[];
  packages: PackageEntry[];
  endpoints: EndpointEntry[];
}

const SKIP_DIRS = new Set(["node_modules", ".git", "test", "tests", "dist", "build"]);

function sourceFiles(root: string, dir = root): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (!SKIP_DIRS.has(name)) out.push(...sourceFiles(root, full));
    } else if (/\.(ts|tsx|js|mjs)$/.test(name) && !/\.(test|spec)\./.test(name) && !name.endsWith(".d.ts")) {
      out.push(full);
    }
  }
  return out;
}

function packages(root: string): PackageEntry[] {
  const file = join(root, "package.json");
  if (!existsSync(file)) return [];
  const pkg = JSON.parse(readFileSync(file, "utf8"));
  const list = (deps: Record<string, string> | undefined, dev: boolean) =>
    Object.entries(deps ?? {}).map(([name, version]) => ({ name, version, dev, status: "installed" as const }));
  return [...list(pkg.dependencies, false), ...list(pkg.devDependencies, true)];
}

// `body.inventory.on_hand` -> ["body", "inventory", "on_hand"]
function accessChain(node: ts.Expression): string[] | null {
  if (ts.isIdentifier(node)) return [node.text];
  if (ts.isPropertyAccessExpression(node)) {
    const left = accessChain(node.expression);
    return left ? [...left, node.name.text] : null;
  }
  if (ts.isElementAccessExpression(node) && ts.isStringLiteral(node.argumentExpression)) {
    const left = accessChain(node.expression);
    return left ? [...left, node.argumentExpression.text] : null;
  }
  if (ts.isParenthesizedExpression(node) || ts.isNonNullExpression(node) || ts.isAsExpression(node)) {
    return accessChain(node.expression);
  }
  return null;
}

function enclosingFunction(node: ts.Node): ts.Node {
  let n: ts.Node | undefined = node.parent;
  while (n && !ts.isFunctionLike(n) && !ts.isSourceFile(n)) n = n.parent;
  return n ?? node.getSourceFile();
}

// `export async function getStock` -> "getStock"; `const getStock = async () =>` -> "getStock".
function functionNameOf(fn: ts.Node): string | undefined {
  if ((ts.isFunctionDeclaration(fn) || ts.isMethodDeclaration(fn) || ts.isFunctionExpression(fn)) && fn.name && ts.isIdentifier(fn.name)) {
    return fn.name.text;
  }
  if ((ts.isArrowFunction(fn) || ts.isFunctionExpression(fn)) && ts.isVariableDeclaration(fn.parent) && ts.isIdentifier(fn.parent.name)) {
    return fn.parent.name.text;
  }
  return undefined;
}

function lineOf(sf: ts.SourceFile, node: ts.Node): number {
  return sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
}

// Within `fn`, finds variables holding the parsed response of `responseVar`
// (`const body = await res.json()`) and the fields read from them.
function fieldsReadFrom(sf: ts.SourceFile, fn: ts.Node, responseVar: string): { fields: string[]; firstLine: number | null } {
  // Variable name -> path prefix it holds. `body` -> "", `{ inventory }` -> "inventory".
  const bodyVars = new Map<string, string>();
  const fields: string[] = [];
  let firstLine: number | null = null;

  const isJsonCall = (e: ts.Expression): boolean => {
    let x = e;
    if (ts.isAwaitExpression(x)) x = x.expression;
    return (
      ts.isCallExpression(x) &&
      ts.isPropertyAccessExpression(x.expression) &&
      x.expression.name.text === "json" &&
      ts.isIdentifier(x.expression.expression) &&
      x.expression.expression.text === responseVar
    );
  };

  const record = (path: string, node: ts.Node) => {
    if (!fields.includes(path)) fields.push(path);
    const line = lineOf(sf, node);
    if (firstLine === null || line < firstLine) firstLine = line;
  };

  // Pass 1: response body variables, including `const { a, b } = await res.json()`.
  const visitDecls = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.initializer && isJsonCall(node.initializer)) {
      if (ts.isIdentifier(node.name)) bodyVars.set(node.name.text, "");
      else if (ts.isObjectBindingPattern(node.name)) {
        for (const el of node.name.elements) {
          const key = el.propertyName && ts.isIdentifier(el.propertyName) ? el.propertyName.text : ts.isIdentifier(el.name) ? el.name.text : null;
          if (key) {
            record(key, el);
            if (ts.isIdentifier(el.name)) bodyVars.set(el.name.text, key);
          }
        }
      }
    }
    ts.forEachChild(node, visitDecls);
  };
  visitDecls(fn);

  // Pass 2: the longest property chains rooted at a body variable, plus `(await res.json()).x`.
  const visitReads = (node: ts.Node) => {
    if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
      const parentIsAccess =
        node.parent && (ts.isPropertyAccessExpression(node.parent) || ts.isElementAccessExpression(node.parent)) && node.parent.expression === node;
      if (!parentIsAccess) {
        const chain = accessChain(node);
        if (chain && bodyVars.has(chain[0]) && chain.length > 1) {
          const prefix = bodyVars.get(chain[0])!;
          record([prefix, ...chain.slice(1)].filter(Boolean).join("."), node);
        } else {
          // `(await res.json()).stock`
          let base: ts.Expression = node;
          const names: string[] = [];
          while (ts.isPropertyAccessExpression(base)) { names.unshift(base.name.text); base = base.expression; }
          while (ts.isParenthesizedExpression(base)) base = base.expression;
          if (names.length && isJsonCall(base)) record(names.join("."), node);
        }
      }
    }
    ts.forEachChild(node, visitReads);
  };
  visitReads(fn);
  return { fields, firstLine };
}

export function scan(repoDir: string, opts: { repo?: string; commit?: string | null } = {}): Inventory {
  const files = sourceFiles(repoDir).sort();
  const sites = new Map<string, CallSite[]>();

  for (const file of files) {
    const text = readFileSync(file, "utf8");
    const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
    const rel = relative(repoDir, file);

    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "fetch" && node.arguments[0]) {
        const urlText = node.arguments[0].getText(sf);
        for (const p of PROVIDERS) {
          for (const e of p.endpoints) {
            if (!e.match.test(urlText)) continue;
            // `const res = await fetch(...)`
            let decl: ts.Node | undefined = node.parent;
            if (decl && ts.isAwaitExpression(decl)) decl = decl.parent;
            const responseVar = decl && ts.isVariableDeclaration(decl) && ts.isIdentifier(decl.name) ? decl.name.text : null;
            const fn = enclosingFunction(node);
            const { fields, firstLine } = responseVar
              ? fieldsReadFrom(sf, fn, responseVar)
              : { fields: [], firstLine: null };
            const functionName = functionNameOf(fn);
            const key = `${p.provider}|${e.endpoint}`;
            const list = sites.get(key) ?? [];
            list.push({ path: rel, line: firstLine ?? lineOf(sf, node), fieldsRead: fields, ...(functionName ? { functionName } : {}) });
            sites.set(key, list);
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }

  const endpoints: EndpointEntry[] = PROVIDERS.flatMap((p) =>
    p.endpoints.map((e) => {
      const callSites = sites.get(`${p.provider}|${e.endpoint}`) ?? [];
      return { provider: p.provider, endpoint: e.endpoint, status: callSites.length ? "used" : "not_used", callSites } as EndpointEntry;
    }),
  );

  return {
    repo: opts.repo ?? (relative(process.cwd(), repoDir) || "."),
    commit: opts.commit ?? null,
    scannedAt: new Date().toISOString(),
    filesScanned: files.map((f) => relative(repoDir, f)),
    packages: packages(repoDir),
    endpoints,
  };
}
