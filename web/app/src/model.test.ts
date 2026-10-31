import { describe, expect, test } from "bun:test";
import { AGENT_NAMES, type RelayMessage } from "../../../contracts/relay.ts";
import type { RelayEntry } from "../../shared/stream.ts";
import { rejectedNow, splitDeliberate, steps } from "./model.ts";
import type { LiveCase } from "./types.ts";

const caseId = "demo.supplier.stock";
const T = "2026-10-31T21:00:00.000Z";

function kase(over: Partial<LiveCase> = {}): LiveCase {
  return {
    caseId, status: "investigating", headline: "h",
    explanation: "Stock used to be one number. Now it is two.",
    change: { provider: "supplier", endpoint: "GET /v1/inventory/{sku}", changeKind: "breaking", fieldPath: "stock",
      shapeDiff: { removed: ["stock"], added: ["inventory.on_hand"], retyped: [] }, summary: "stock removed; inventory.on_hand added", sourceRef: "" },
    signals: [{ eventId: "e1", source: "probe", at: T }],
    verdict: { result: "affected", evidence: [], at: T },
    callSite: { path: "src/supplier.ts", line: 15, functionName: "getStock", fieldsRead: ["stock"] },
    attempt: 1, baseCommit: "aaaaaaa", headCommit: "", testCommand: "pnpm test",
    before: null, after: null, regression: null, verifier: null, proof: null, pr: null,
    approval: { state: "pending", by: "", at: "" },
    ...over,
  };
}

let n = 0;
type Draft = RelayMessage extends infer M ? (M extends RelayMessage ? Omit<M, "caseId" | "at" | "say"> & { say?: string } : never) : never;
function msg(m: Draft): RelayEntry {
  const full = { caseId, at: T, say: "", ...m } as RelayMessage;
  return { id: `m${++n}`, from: AGENT_NAMES.verifier, at: T, text: JSON.stringify(full), parsed: full };
}
const proposed = (attempt: number) => msg({ type: "repair.proposed", attempt, headCommit: "bbbbbbb", diffRef: "" });
const verdict = (attempt: number, decision: "accept" | "reject") => msg({ type: "verification.result", attempt, decision, reason: "r", say: decision });
const stateOf = (c: LiveCase, m: RelayEntry[] = []) => Object.fromEntries(steps(c, m).map((s) => [s.key, s.state]));
const run = (passed: number, total: number) => ({ commit: "ccccccc", command: "pnpm test", exitCode: passed === total ? 0 : 1, logRef: "", passed, total, failure: null, durationMs: 1000 });

describe("the rejected state is shown only for a real reject", () => {
  test("first-try acceptance never shows a bad step", () => {
    const msgs = [proposed(1), verdict(1, "accept")];
    for (const status of ["investigating", "repaired", "awaiting_approval", "approved"] as const) {
      expect(Object.values(stateOf(kase({ status }), msgs))).not.toContain("bad");
    }
  });

  test("a verifier reject in Relay turns Fixed pink", () => {
    expect(stateOf(kase(), [proposed(1), verdict(1, "reject")]).fixed).toBe("bad");
  });

  test("a newer attempt clears it, but the reject stays in the thread", () => {
    const msgs = [proposed(1), verdict(1, "reject"), proposed(2)];
    expect(rejectedNow(kase({ attempt: 2 }), msgs)).toBeNull();
    expect(stateOf(kase({ attempt: 2 }), msgs).fixed).toBe("now");
  });

  test("a reject recorded only on the case record, with no Relay message, is not staged", () => {
    const c = kase({ verifier: { decision: "reject", reason: "r", at: T } });
    expect(stateOf(c, [proposed(1)]).fixed).toBe("now");
  });

  test("escalation is the one other bad state", () => {
    expect(stateOf(kase({ status: "escalated" })).fixed).toBe("bad");
  });
});

describe("plain, real text", () => {
  test("Proved uses the real counts", () => {
    const c = kase({ status: "repaired", after: run(1, 1), regression: run(2, 2) });
    expect(steps(c, []).find((s) => s.key === "proved")?.what).toBe("Your test passes (1 of 1) and so do 2 of 2 hidden checks.");
  });

  test("Noticed says the explanation's first sentence, not the field-path summary", () => {
    const noticed = steps(kase({ status: "detected" }), []).find((s) => s.key === "noticed");
    expect(noticed?.what).toBe("Stock used to be one number.");
    expect(noticed?.detail).toContain("stock removed; inventory.on_hand added");
  });

  test("approval never says merged", () => {
    const c = kase({ status: "approved", approval: { state: "approved", by: "hussainarslan", at: T } });
    const you = steps(c, []).find((s) => s.key === "you");
    expect(you?.what).toBe("Approved by hussainarslan · nothing merged or deployed");
  });
});

// The exchange `agent/src/bad-patch.ts` sends: same case ID, its own attempt, labelled in `say`.
describe("the deliberately bad patch", () => {
  const bad = [
    msg({ type: "repair.proposed", attempt: 99, headCommit: "ddddddd", diffRef: "", say: "Deliberately bad patch, for this demo: it forgets that stock can't go below zero. Can the verifier catch it?" }),
    msg({ type: "verification.result", attempt: 99, decision: "reject", reason: "should be 0, but the fix returned -2", say: "Deliberately bad patch: rejected. should be 0, but the fix returned -2" }),
  ];
  const real = [proposed(1), verdict(1, "accept")];

  test("is split out of the real conversation", () => {
    const { real: r, deliberate } = splitDeliberate([...real, ...bad]);
    expect(r).toEqual(real);
    expect(deliberate).toEqual(bad);
  });

  test("never changes the real story", () => {
    for (const status of ["investigating", "repaired", "awaiting_approval", "approved"] as const) {
      const c = kase({ status, after: run(1, 1), regression: run(2, 2) });
      const withBad = steps(c, [...real, ...bad]);
      expect(withBad).toEqual(steps(c, real));
      expect(withBad.map((s) => s.what).join(" ")).not.toContain("Deliberately");
    }
  });

  test("is not a real rejection, even while the real case is still investigating", () => {
    expect(rejectedNow(kase(), [proposed(1), ...bad])).toBeNull();
  });
});
