// The bridge. Serves the built page and `/api`, so the browser only talks to
// this process.
//
//   GET  /api/stream             SSE of {source, kind, data, version, at}, snapshot first
//   GET  /api/health             per-source state
//   POST /api/presenter/version  {version} → supplier-mock /admin/version
//   POST /api/presenter/probe    EndpointWatcher.probeNow()
//   POST /api/presenter/reset    close rehearsal PRs, run demo/reset.sh, clear the last run
//   GET  /api/inventory          the real inventory scan() of TARGET_REPO_DIR
import { join, normalize, resolve } from "node:path";
import { config } from "./config.ts";
import { Hub, log } from "./hub.ts";
import { startRelay } from "./relay.ts";
import { pollSupplier, setSupplierVersion } from "./supplier.ts";
import { invoke, startTerse } from "./terse.ts";

const hub = new Hub();
const repoRoot = resolve(import.meta.dir, "../..");
const DEMO_REPO = process.env.TARGET_REPO ?? "0x1/agent-smith-demo";

async function run(cmd: string[]): Promise<{ code: number; out: string }> {
  const proc = Bun.spawn(cmd, { cwd: repoRoot, stdin: "ignore", stdout: "pipe", stderr: "pipe" });
  const out = await new Response(proc.stdout).text();
  return { code: await proc.exited, out };
}

// Closes rehearsal fix PRs without merging them, resets the stack, and clears this
// bridge's copy of the last run so nothing old shows on the next one.
async function resetDemo(): Promise<Response> {
  const listed = await run(["gh", "pr", "list", "--repo", DEMO_REPO, "--state", "open", "--json", "number", "--jq", ".[].number"]);
  const open = listed.out.split("\n").filter(Boolean);
  for (const n of open) await run(["gh", "pr", "close", n, "--repo", DEMO_REPO, "--comment", "Rehearsal PR, closed by Reset demo. Not merged."]);
  const reset = await run(["bash", "demo/reset.sh"]);
  if (reset.code !== 0) return json({ error: "demo/reset.sh failed", closed: open }, 500);
  hub.clearRun();
  return json({ ok: true, closed: open });
}
const json = (body: unknown, status = 200) => Response.json(body, { status });

function stream(): Response {
  let client: ReadableStreamDefaultController<Uint8Array>;
  let ping: ReturnType<typeof setInterval>;
  const body = new ReadableStream<Uint8Array>({
    start(c) {
      client = c;
      hub.addClient(c);
      // Comments keep proxies and the browser from timing the stream out.
      ping = setInterval(() => {
        try {
          c.enqueue(new TextEncoder().encode(": ping\n\n"));
        } catch {
          clearInterval(ping);
        }
      }, 15000);
    },
    cancel() {
      hub.removeClient(client);
      clearInterval(ping);
    },
  });
  return new Response(body, { headers: { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" } });
}

async function staticFile(pathname: string): Promise<Response> {
  // normalize() resolves `..`, and the prefix check keeps requests inside dist/.
  const path = normalize(join(config.dist, pathname === "/" ? "index.html" : pathname));
  const file = Bun.file(path);
  if (path.startsWith(config.dist) && (await file.exists())) return new Response(file);
  const index = Bun.file(join(config.dist, "index.html"));
  return (await index.exists()) ? new Response(index) : new Response("Run `pnpm build` first.", { status: 503 });
}

const INVENTORY_MODULE = "../../inventory/index.ts";

// Runs the deterministic scan from inventory/. Loaded lazily, so a missing
// dependency there only fails this route, never the live stream.
async function inventory(): Promise<Response> {
  const { repoDir, repo } = config.inventory;
  try {
    // inventory/ has its own dependencies, so the bridge doesn't typecheck through it.
    const { scan } = (await import(INVENTORY_MODULE)) as { scan: (dir: string, opts: { repo: string; commit: string | null }) => object };
    const head = Bun.spawnSync(["git", "-C", repoDir, "rev-parse", "HEAD"]);
    const commit = head.exitCode === 0 ? head.stdout.toString().trim() : null;
    return json({ ...scan(repoDir, { repo, commit }), repoDir });
  } catch (err) {
    return json({ error: `inventory scan failed for ${repoDir}: ${String(err).slice(0, 200)}` }, 503);
  }
}

async function routes(req: Request): Promise<Response> {
  const { pathname } = new URL(req.url);
  const post = req.method === "POST";
  if (pathname === "/api/stream") return stream();
  if (pathname === "/api/health") return json(hub.health());
  if (pathname === "/api/presenter/version" && post) {
    const { version } = (await req.json().catch(() => ({}))) as { version?: unknown };
    return setSupplierVersion(version).catch((err) => json({ error: `supplier not reachable: ${String(err)}` }, 502));
  }
  if (pathname === "/api/presenter/probe" && post) {
    return invoke(config.terse.watcherClass, config.terse.watcherId, "probeNow").then(
      (r) => json(r.body, r.status),
      (err) => json({ error: `watcher not reachable: ${String(err)}` }, 502),
    );
  }
  if (pathname === "/api/inventory") return inventory();
  if (pathname === "/api/presenter/reset" && post) return resetDemo();
  if (pathname.startsWith("/api/")) return json({ error: "not found" }, 404);
  return staticFile(pathname);
}

Bun.serve({ port: config.port, hostname: config.host, idleTimeout: 0, fetch: routes });

log(`bridge on http://${config.host}:${config.port} · actors ${config.terse.url} · relay ${config.relay.url} · supplier ${config.supplier.url}`);
startTerse(hub);
void startRelay(hub);
void pollSupplier(hub);
