// Decides whether a detected provider change affects this app, from the
// inventory alone. Deterministic: the same inputs always give the same verdict.
import type { Change, CallSite, Verdict } from "../contracts/case.ts";
import type { Inventory } from "./scan.ts";

// A read of `a` is touched by a change to `b` when one path contains the other:
// reading `inventory` is touched by a change to `inventory.on_hand`, and
// reading `stock.count` is touched by removing `stock`.
function overlaps(a: string, b: string): boolean {
  return a === b || a.startsWith(b + ".") || b.startsWith(a + ".");
}

const where = (s: CallSite) => `${s.path}:${s.line}`;

export interface Applicability {
  verdict: Verdict;
  // The first affected call site, for the case record. Null when not affected.
  callSite: CallSite | null;
}

export function applicability(change: Change, inventory: Inventory): Applicability {
  const entry = inventory.endpoints.find((e) => e.provider === change.provider && e.endpoint === change.endpoint);
  const scanned = `Scanned ${inventory.filesScanned.length} source file(s)${inventory.commit ? ` at ${inventory.commit.slice(0, 7)}` : ""}.`;

  if (!entry || entry.status === "not_used") {
    return {
      verdict: {
        result: "not_affected",
        evidence: [`The app never calls ${change.endpoint} on ${change.provider}.`, scanned],
      },
      callSite: null,
    };
  }

  const readList = entry.callSites.map((s) => `${where(s)} reads ${s.fieldsRead.length ? s.fieldsRead.join(", ") : "no response fields"}`);

  if (change.changeKind === "added") {
    return {
      verdict: {
        result: "not_affected",
        evidence: [
          `The change only adds ${change.shapeDiff.added.join(", ") || change.fieldPath}; existing fields still work.`,
          ...readList,
          scanned,
        ],
      },
      callSite: null,
    };
  }

  const touched = [...new Set([change.fieldPath, ...change.shapeDiff.removed, ...change.shapeDiff.retyped].filter(Boolean))];
  const hits = entry.callSites
    .map((s) => ({ site: s, fields: s.fieldsRead.filter((f) => touched.some((t) => overlaps(f, t))) }))
    .filter((h) => h.fields.length);

  if (!hits.length) {
    return {
      verdict: {
        result: "not_affected",
        evidence: [
          `The change touches ${touched.join(", ")}, which the app does not read.`,
          ...readList,
          scanned,
        ],
      },
      callSite: null,
    };
  }

  return {
    verdict: {
      result: "affected",
      evidence: [
        ...hits.map((h) => `${where(h.site)} reads ${h.fields.join(", ")}, which the change ${change.shapeDiff.retyped.some((r) => h.fields.some((f) => overlaps(f, r))) ? "retypes" : "removes"}.`),
        scanned,
      ],
    },
    callSite: hits[0].site,
  };
}
