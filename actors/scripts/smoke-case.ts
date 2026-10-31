// End-to-end check of the Case actor against a running dev server.
// Usage: bun scripts/smoke-case.ts
import { makeCaseId, type Case } from "../../contracts/case.ts"
import { invoke } from "./invoke.ts"

const id = makeCaseId("agent-smith-demo", "supplier", "GET /v1/inventory/{sku}", `smoke-${Date.now()}`)
const init = {
    provider: "supplier",
    endpoint: "GET /v1/inventory/{sku}",
    changeKind: "breaking",
    fieldPath: "stock",
    shapeDiff: { removed: ["stock"], added: ["inventory", "inventory.on_hand", "inventory.reserved"], retyped: [] },
    summary: "stock replaced by inventory.on_hand and inventory.reserved",
    sourceRef: "http://127.0.0.1:7200/changelog/v2",
    headline: "The supplier changed how it reports stock",
    explanation: "The supplier no longer sends a single stock number. It now sends what is on hand and what is reserved.",
    signal: { eventId: "probe-1", source: "watcher", at: new Date().toISOString() },
}
const s = (c: Case | null) => c && { status: c.status, signals: c.signals.map((x) => x.eventId), verdict: c.verdict }

console.log("id", id)
console.log("create", s(await invoke<Case>("Case", id, "create", [init])))
console.log("create again, same event", s(await invoke<Case>("Case", id, "create", [init])))
console.log("create again, new event", s(await invoke<Case>("Case", id, "create", [{ ...init, signal: { ...init.signal, eventId: "probe-2" } }])))
console.log("addSignal repeat", await invoke<{ attached: boolean }>("Case", id, "addSignal", [{ eventId: "probe-2", source: "watcher", at: "x" }]).then((r) => r.attached))
console.log("addSignal new", await invoke<{ attached: boolean }>("Case", id, "addSignal", [{ eventId: "inventory-1", source: "inventory", at: "x" }]).then((r) => r.attached))
console.log("patch", s(await invoke<Case>("Case", id, "patch", [{ status: "not_affected", caseId: "ignored", verdict: { result: "not_affected", evidence: ["no reads of stock"] } }])))
const final = await invoke<Case>("Case", id, "read")
console.log("read caseId matches", final?.caseId === id, "headline", JSON.stringify(final?.headline))
