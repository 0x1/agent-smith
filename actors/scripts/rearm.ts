// Run after any restart of the actor server. Alarms are lost on restart but
// state survives, so this touches every known actor and re-issues watch().
// Usage: bun scripts/rearm.ts
// Env: WATCHER_ID (supplier.get-inventory), SUPPLIER_URL (http://127.0.0.1:7200),
//      WATCH_SKU (WIDGET-1), WATCH_EVERY_MS (5000), ACTORS_URL (http://127.0.0.1:7100)
import type { Case } from "../../contracts/case.ts"
import type { WatcherView } from "../src/watcher.ts"
import { invoke } from "./invoke.ts"

const watcherId = process.env.WATCHER_ID ?? "supplier.get-inventory"
const baseUrl = process.env.SUPPLIER_URL ?? "http://127.0.0.1:7200"
const sku = process.env.WATCH_SKU ?? "WIDGET-1"
const everyMs = Number(process.env.WATCH_EVERY_MS ?? 5000)

const before = await invoke<WatcherView>("EndpointWatcher", watcherId, "read")
console.log(`watcher ${watcherId}: probeCount=${before.probeCount} pid=${before.pid} cases=${before.caseIds.length}`)

for (const id of before.caseIds) {
    const c = await invoke<Case | null>("Case", id, "read")
    console.log(`  case ${id}: ${c?.status ?? "missing"}`)
}

// Use the watcher's saved config when it has one, so a restart keeps its settings.
const w = before.watching
const after = await invoke<WatcherView>("EndpointWatcher", watcherId, "watch", [
    w?.baseUrl ?? baseUrl,
    w?.sku ?? sku,
    w?.everyMs ?? everyMs,
])
console.log(`re-armed: next probe at ${after.nextProbeAt}`)
