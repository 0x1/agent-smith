// FIXTURE DATA for development and screenshots only. Loaded by a dynamic import
// when the URL has `?fixture=1`, and the page shows a "FIXTURE DATA" banner.
// `?stage=` picks a state; `&reject=1` takes the path where attempt 1 is rejected.
import type { WatcherState } from "../../../contracts/case.ts";
import type { RelayMessage } from "../../../contracts/relay.ts";
import { AGENT_NAMES } from "../../../contracts/relay.ts";
import type { RelayEntry, StreamEvent } from "../../shared/stream.ts";
import type { LiveCase } from "./live.ts";

const STAGES = ["quiet", "noticed", "checked", "fixing", "rejected", "proved", "waiting", "approved", "escalated", "nolive", "restart"] as const;
type Stage = (typeof STAGES)[number];
type DistOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

export function playFixture(emit: (e: StreamEvent) => void): () => void {
  const q = new URLSearchParams(location.search);
  const stage = (STAGES as readonly string[]).includes(q.get("stage") ?? "") ? (q.get("stage") as Stage) : "waiting";
  const reject = q.get("reject") === "1" || stage === "rejected";
  const t0 = Date.now() - 70_000;
  const at = (s: number) => new Date(t0 + s * 1000).toISOString();
  const nowIso = new Date().toISOString();
  let v = 0;
  const ev = <E extends StreamEvent>(e: Omit<E, "version" | "at">) => emit({ ...e, version: ++v, at: nowIso } as StreamEvent);

  const n = STAGES.indexOf(stage);
  const reached = (s: Stage) => (stage === "escalated" ? STAGES.indexOf(s) <= STAGES.indexOf("rejected") : stage === "restart" ? true : n >= STAGES.indexOf(s));
  const live = stage !== "nolive";

  for (const source of ["terse", "relay", "supplier"] as const) {
    ev({ source, kind: "status", data: live ? { state: "live", since: at(0), lastDataAt: nowIso } : source === "terse" ? { state: "down", since: at(60), lastDataAt: at(58) } : { state: "live", since: at(0), lastDataAt: nowIso } });
  }
  if (!live) return () => {};

  const caseId = "agent-smith-demo.supplier.GET-v1-inventory-sku.stock";
  const quietId = "agent-smith-demo.supplier.GET-v1-inventory-sku.warehouse";
  const hasCase = stage !== "quiet";
  const watcher: WatcherState = {
    endpoint: "GET /v1/inventory/{sku}", lastProbeAt: new Date(Date.now() - 2000).toISOString(), lastChangeAt: hasCase ? at(0) : null,
    probeCount: 234, savedAt: nowIso, pid: stage === "restart" ? 48390 : 48211, caseIds: hasCase ? [quietId, caseId] : [quietId],
  };
  ev({ source: "terse", kind: "watcher", data: watcher });
  if (stage === "restart") ev({ source: "terse", kind: "restart", data: { at: new Date(Date.now() - 3000).toISOString(), oldPid: 48211, newPid: 48390, probeCount: 234, intact: true } });
  ev({ source: "supplier", kind: "sample", data: { version: hasCase ? "v2" : "v1", path: "/v1/inventory/WIDGET-1", body: hasCase ? { sku: "WIDGET-1", inventory: { on_hand: 7, reserved: 5 }, warehouse: "SF-1", updated_at: "" } : { sku: "WIDGET-1", stock: 2, warehouse: "SF-1", updated_at: "" } } });

  ev({ source: "terse", kind: "case", data: {
    ...base(quietId, at(-300)), status: "not_affected",
    headline: "The supplier removed warehouse.", explanation: "The supplier removed warehouse. Your app doesn't read it, so nothing to do.",
    verdict: { result: "not_affected", evidence: ["no reads of warehouse in src/"], at: at(-299) },
  } });
  if (!hasCase) return () => {};

  const final = reject ? 2 : 1;
  const msgs: [number, string, RelayMessage][] = [];
  const m = (s: number, from: string, msg: DistOmit<RelayMessage, "caseId" | "at">) => msgs.push([s, from, { ...msg, caseId, at: at(s) } as RelayMessage]);
  if (reached("checked")) m(6, AGENT_NAMES.observer, { type: "repair.requested", attempt: 1, summary: "stock replaced by inventory", say: "The supplier changed how it reports stock. getStock reads that field, so I opened a repair." });
  if (reached("fixing")) m(14, AGENT_NAMES.repair, { type: "repair.proposed", attempt: 1, headCommit: "7b2a9f0", diffRef: "", say: "Attempt 1: stock you can sell is on hand minus reserved. Your test passes." });
  if (reject && reached("rejected")) m(19, AGENT_NAMES.verifier, { type: "verification.result", attempt: 1, decision: "reject", reason: "WIDGET-3: expected 0, got -2", say: "When more is reserved than on hand, it returns −2. Stock can't be negative." });
  if (reject && reached("proved") && stage !== "escalated") m(27, AGENT_NAMES.repair, { type: "repair.proposed", attempt: 2, headCommit: "9e07d13", diffRef: "", say: "Attempt 2: the same, but never below zero." });
  if (reached("proved") && stage !== "escalated") m(33, AGENT_NAMES.verifier, { type: "verification.result", attempt: final, decision: "accept", reason: "2 of 2 hidden checks pass", say: "Accepted. Your test and 2 of 2 hidden checks pass." });
  if (stage === "escalated") m(40, AGENT_NAMES.verifier, { type: "escalation.needed", attempt: 1, reason: "attempts exhausted", say: "No fix passed every hidden check. A person needs to look." });
  if (reached("checked")) msgs.push([8, "smith-observer", "joined #agent-smith-repairs" as unknown as RelayMessage]);

  for (const [s, from, msg] of msgs) {
    const raw = typeof msg === "string";
    const entry: RelayEntry = { id: `fx-${s}`, from, at: at(s), text: raw ? msg : JSON.stringify(msg), parsed: raw ? null : msg };
    ev({ source: "relay", kind: "message", data: entry });
  }

  const status: LiveCase["status"] =
    stage === "noticed" ? "detected" : stage === "escalated" ? "escalated"
    : stage === "proved" ? "repaired" : stage === "waiting" || stage === "restart" ? "awaiting_approval" : stage === "approved" ? "approved" : "investigating";
  const run = (commit: string, ok: boolean, passed: number, total: number, failure: LiveCase["after"] extends infer R ? R extends { failure: infer F } ? F : never : never) =>
    ({ commit, command: "pnpm test", exitCode: ok ? 0 : 1, logRef: "", passed, total, failure, durationMs: 4200 });
  const c: LiveCase = {
    ...base(caseId, at(0)),
    status,
    headline: reached("proved") && stage !== "escalated" ? "Your supplier changed how it reports stock. Here is a tested fix."
      : reject && reached("rejected") ? "Your supplier changed how it reports stock. The first fix was wrong, so we tried again."
      : "Your supplier changed how it reports stock. getStock would return the wrong number.",
    verdict: reached("checked") ? { result: "affected", evidence: ["src/supplier.ts:15 reads stock"], at: at(5) } : null,
    callSite: reached("checked") ? { path: "src/supplier.ts", line: 15, functionName: "getStock", fieldsRead: ["stock"] } : null,
    attempt: reached("fixing") ? (reject && reached("proved") ? 2 : 1) : 0,
    headCommit: reached("proved") ? (reject ? "9e07d13" : "7b2a9f0") : "",
    before: reached("checked") ? run("4f1c2ab", false, 0, 1, { test: "getStock returns available stock", expected: "2", actual: "undefined" }) : null,
    after: reached("fixing") ? run(reject && reached("proved") ? "9e07d13" : "7b2a9f0", true, 1, 1, null) : null,
    regression: reject && stage === "rejected" ? { ...run("7b2a9f0", false, 1, 2, { test: "WIDGET-3 never below zero", expected: "0", actual: "-2" }), command: "pnpm test:hidden" }
      : reached("proved") && stage !== "escalated" ? { ...run(reject ? "9e07d13" : "7b2a9f0", true, 2, 2, null), command: "pnpm test:hidden" } : null,
    verifier: reached("proved") && stage !== "escalated" ? { decision: "accept", reason: "2 of 2 hidden checks pass", at: at(33) }
      : reject && reached("rejected") ? { decision: "reject", reason: "WIDGET-3: expected 0, got -2", at: at(19) } : null,
    proof: reject && stage === "rejected" ? { sku: "WIDGET-3", onHand: 3, reserved: 5, result: -2, expected: 0 }
      : reached("proved") && stage !== "escalated" ? { sku: "WIDGET-1", onHand: 7, reserved: 5, result: 2, expected: 2 } : null,
    pr: reached("waiting") && stage !== "escalated" ? { number: 1, url: "https://github.com/0x1/agent-smith-demo/pull/1", openedAt: at(40) } : null,
    approval: stage === "approved" ? { state: "approved", by: "hussainarslan", at: at(70) } : { state: "pending", by: "", at: "" },
  };
  if (stage === "escalated") c.after = null;
  ev({ source: "terse", kind: "case", data: c });
  return () => {};
}

function base(caseId: string, seen: string): LiveCase {
  return {
    caseId, status: "detected", headline: "", explanation: "Stock used to be one number. Now the supplier sends what is on hand and what is already reserved.",
    change: { provider: "supplier", endpoint: "GET /v1/inventory/{sku}", changeKind: "breaking", fieldPath: "stock",
      shapeDiff: { removed: ["stock"], added: ["inventory", "inventory.on_hand", "inventory.reserved"], retyped: [] },
      summary: "The supplier stopped sending stock and now sends on hand and reserved.", sourceRef: "/changelog/v2" },
    signals: [{ eventId: `${caseId}-1`, source: "probe", at: seen }],
    verdict: null, callSite: null, attempt: 0, baseCommit: "4f1c2ab", headCommit: "", testCommand: "pnpm test",
    before: null, after: null, regression: null, verifier: null, proof: null, pr: null, approval: { state: "pending", by: "", at: "" },
  };
}
