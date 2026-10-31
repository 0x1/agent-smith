// Mock supplier API for the Agent Smith demo. No dependencies.
// The same code is copied into agent-smith-demo/test/support/ by sync.ts,
// so the live demo and the target app's tests serve identical responses.
import { createServer, type Server } from "node:http";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const VERSIONS = ["v1", "v1.1", "v2"] as const;
export type Version = (typeof VERSIONS)[number];

// Each version after v1 has a migration note, published at /changelog.
const NOTES: Record<Version, string | null> = { v1: null, "v1.1": "v1.1.md", v2: "v2.md" };

const here = dirname(fileURLToPath(import.meta.url));

function loadJson(file: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(here, "fixtures", file), "utf8"));
}

export function isVersion(v: unknown): v is Version {
  return typeof v === "string" && (VERSIONS as readonly string[]).includes(v);
}

export function inventoryResponse(version: Version, sku: string): unknown | undefined {
  return loadJson(`${version}.json`)[sku];
}

export function changelog(version: Version) {
  const upTo = VERSIONS.indexOf(version);
  return VERSIONS.slice(0, upTo + 1)
    .filter((v) => NOTES[v])
    .map((v) => ({
      version: v,
      ref: `/changelog/${v}`,
      note: readFileSync(join(here, "notes", NOTES[v]!), "utf8"),
    }));
}

function send(res: import("node:http").ServerResponse, status: number, body: unknown, type = "application/json") {
  res.writeHead(status, { "content-type": type, "access-control-allow-origin": "*", "access-control-allow-headers": "content-type" });
  res.end(type === "application/json" ? JSON.stringify(body) : String(body));
}

export function createSupplier(initial: Version): { server: Server; getVersion: () => Version } {
  let version: Version = initial;
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const path = url.pathname;
    if (req.method === "OPTIONS") return send(res, 204, "", "text/plain");

    const inv = path.match(/^\/v1\/inventory\/([^/]+)$/);
    if (req.method === "GET" && inv) {
      const body = inventoryResponse(version, decodeURIComponent(inv[1]));
      return body === undefined ? send(res, 404, { error: "unknown sku" }) : send(res, 200, body);
    }
    if (req.method === "GET" && path === "/admin/version") return send(res, 200, { version });
    if (req.method === "POST" && path === "/admin/version") {
      let raw = "";
      req.on("data", (c) => (raw += c));
      req.on("end", () => {
        let next: unknown;
        try { next = JSON.parse(raw).version; } catch { next = undefined; }
        if (!isVersion(next)) return send(res, 400, { error: `version must be one of ${VERSIONS.join(", ")}` });
        version = next;
        send(res, 200, { version });
      });
      return;
    }
    if (req.method === "GET" && path === "/changelog") return send(res, 200, changelog(version));
    const note = path.match(/^\/changelog\/([^/]+)$/);
    if (req.method === "GET" && note && isVersion(note[1]) && NOTES[note[1]]) {
      return send(res, 200, readFileSync(join(here, "notes", NOTES[note[1]]!), "utf8"), "text/markdown");
    }
    send(res, 404, { error: "not found" });
  });
  return { server, getVersion: () => version };
}
