// Every address and ID the bridge uses. Defaults match the local demo machine.
import { join, resolve } from "node:path";

const env = process.env;
const agentDir = resolve(import.meta.dir, env.AGENT_DIR ?? "../../agent");

export const config = {
  port: Number(env.PORT ?? 7300),
  host: env.HOST ?? "127.0.0.1",
  dist: resolve(import.meta.dir, "../dist"),
  terse: {
    url: env.ACTORS_URL ?? "http://127.0.0.1:7100",
    project: env.DURABLE_ACTORS_PROJECT_ID ?? "local",
    watcherClass: env.WATCHER_CLASS ?? "EndpointWatcher",
    watcherId: env.WATCHER_ID ?? "supplier.get-inventory",
    caseClass: env.CASE_CLASS ?? "Case",
    // Extra case IDs to follow without the watcher, for testing: CASE_IDS=a,b
    extraCaseIds: (env.CASE_IDS ?? "").split(",").filter(Boolean),
  },
  relay: {
    url: env.RELAY_BASE_URL ?? "http://127.0.0.1:8787",
    agentDir,
    keyFile: env.RELAY_WORKSPACE_FILE ?? join(agentDir, ".relay-workspace.json"),
    // Optional. Without it the bridge runs `npx relay observer --json`.
    observerToken: env.RELAY_OBSERVER_TOKEN,
  },
  supplier: {
    url: env.SUPPLIER_URL ?? "http://127.0.0.1:7200",
    samplePath: env.SUPPLIER_SAMPLE ?? "/v1/inventory/WIDGET-1",
    pollMs: 2000,
  },
  // A source that keeps failing for this long is reported as down, not connecting.
  downAfterMs: 5000,
} as const;
