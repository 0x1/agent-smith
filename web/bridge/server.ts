// The bridge. Serves the built page and `/api`, so the browser only talks to
// this process.
//
//   GET  /api/stream             SSE of {source, kind, data, version, at}, snapshot first
//   GET  /api/health             per-source state
//   POST /api/presenter/version  {version} → supplier-mock /admin/version
//   POST /api/presenter/probe    EndpointWatcher.probeNow()
import { join, normalize } from "node:path";
import { config } from "./config.ts";
import { Hub, log } from "./hub.ts";
import { startRelay } from "./relay.ts";
import { pollSupplier, setSupplierVersion } from "./supplier.ts";
import { invoke, startTerse } from "./terse.ts";

const hub = new Hub();
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
  if (pathname.startsWith("/api/")) return json({ error: "not found" }, 404);
  return staticFile(pathname);
}

Bun.serve({ port: config.port, hostname: config.host, idleTimeout: 0, fetch: routes });

log(`bridge on http://${config.host}:${config.port} · actors ${config.terse.url} · relay ${config.relay.url} · supplier ${config.supplier.url}`);
startTerse(hub);
void startRelay(hub);
void pollSupplier(hub);
