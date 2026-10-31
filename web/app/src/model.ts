// Turns the live case and Relay messages into the five human steps. Everything
// here is read from real fields; nothing is scripted or staged.
import type { RunResult } from "../../../contracts/case.ts";
import { AGENT_NAMES, type RelayMessage, type VerificationResult } from "../../../contracts/relay.ts";
import type { RelayEntry } from "../../shared/stream.ts";
import { clock } from "./format.ts";
import type { LiveCase, LiveState } from "./types.ts";

export type StepKey = "noticed" | "checked" | "fixed" | "proved" | "you";
export type StepState = "done" | "now" | "bad" | "later";

export interface Step {
  key: StepKey;
  name: string;
  state: StepState;
  what: string;
  when: string;
  detail: string;
}

export const STEP_NAMES: Record<StepKey, string> = {
  noticed: "Noticed",
  checked: "Checked",
  fixed: "Fixed",
  proved: "Proved",
  you: "You",
};

const ORDER: StepKey[] = ["noticed", "checked", "fixed", "proved", "you"];

// Cases that need the main stage: everything except changes the app doesn't read.
// One supplier release can open several cases at once (one per changed field),
// and until agent/ decides applicability they all sit at `detected`. Lead with
// the newest case agent/ found affecting the app, then the newest breaking
// replacement, then any breaking change, then the newest of the rest.
export function activeCase(s: LiveState): LiveCase | null {
  const ids = s.watcher?.caseIds ?? Object.keys(s.cases);
  const open = ids
    .map((id) => s.cases[id])
    .filter((c): c is LiveCase => !!c && c.status !== "not_affected")
    .reverse();
  const breaking = (c: LiveCase) => c.change?.changeKind === "breaking";
  // The watcher puts a field's replacement (a removal plus the new object that
  // replaces it, e.g. stock -> inventory) in one case; a bare removal is its own.
  const replaced = (c: LiveCase) => breaking(c) && (c.change?.shapeDiff?.added?.length ?? 0) > 0;
  return (
    open.find((c) => c.verdict?.result === "affected") ??
    open.find(replaced) ??
    open.find(breaking) ??
    open[0] ??
    null
  );
}

export function notAffected(s: LiveState): LiveCase[] {
  const ids = s.watcher?.caseIds ?? Object.keys(s.cases);
  return ids.map((id) => s.cases[id]).filter((c): c is LiveCase => !!c && c.status === "not_affected");
}

export function caseMessages(s: LiveState, caseId: string): RelayEntry[] {
  return s.messages.filter((m) => m.parsed?.caseId === caseId);
}

export function unstructured(s: LiveState): RelayEntry[] {
  return s.messages.filter((m) => !m.parsed);
}

function last<T>(xs: T[]): T | undefined {
  return xs[xs.length - 1];
}

function parsedOf<T extends RelayMessage["type"]>(msgs: RelayEntry[], type: T) {
  return msgs.map((m) => m.parsed).filter((p): p is Extract<RelayMessage, { type: T }> => p?.type === type);
}

// The labelled demo patch (`agent/src/bad-patch.ts`) goes through the real
// verifier as its own Relay exchange, on the real case ID. Its messages say so in
// their first words. The whole attempt they belong to is set apart, so it never
// reads as the real repair failing.
export const DELIBERATE_PREFIX = "Deliberately bad patch";

export function splitDeliberate(msgs: RelayEntry[]): { real: RelayEntry[]; deliberate: RelayEntry[] } {
  const key = (p: RelayMessage) => `${p.caseId}#${p.attempt}`;
  const marked = new Set(msgs.flatMap((m) => (m.parsed?.say?.startsWith(DELIBERATE_PREFIX) ? [key(m.parsed)] : [])));
  const real: RelayEntry[] = [];
  const deliberate: RelayEntry[] = [];
  for (const m of msgs) (m.parsed && marked.has(key(m.parsed)) ? deliberate : real).push(m);
  return { real, deliberate };
}

// Relay keeps its whole history, and case IDs repeat across rehearsals. Keep only
// this run's messages, and only the latest labelled bad patch.
export function thisRun(c: LiveCase, msgs: RelayEntry[]): RelayEntry[] {
  const start = c.signals[0]?.at ?? "";
  const run = msgs.filter((m) => m.at >= start);
  const { real, deliberate } = splitDeliberate(run);
  const lastProposal = deliberate.filter((m) => m.parsed?.type === "repair.proposed").at(-1);
  return [...real, ...deliberate.filter((m) => !lastProposal || m.at >= lastProposal.at)].sort((x, y) => x.at.localeCompare(y.at));
}

// The labelled bad patch's rejection, for the notice under the stepper.
export function deliberateRejection(msgs: RelayEntry[]): VerificationResult | null {
  const verdicts = parsedOf(splitDeliberate(msgs).deliberate, "verification.result");
  const v = last(verdicts);
  return v?.decision === "reject" ? v : null;
}

// True only when a real verifier rejection is the latest word on this case.
export function rejectedNow(c: LiveCase, all: RelayEntry[]): VerificationResult | null {
  if (c.status !== "investigating") return null;
  const msgs = splitDeliberate(all).real;
  const verdicts = parsedOf(msgs, "verification.result");
  const v = last(verdicts);
  if (!v || v.decision !== "reject") return null;
  const newer = parsedOf(msgs, "repair.proposed").some((p) => p.attempt > v.attempt);
  return newer ? null : v;
}

export function siteName(c: LiveCase): string {
  if (!c.callSite) return "";
  return c.callSite.functionName ?? `${c.callSite.path}:${c.callSite.line}`;
}

function runLine(label: string, r: RunResult | null): string {
  if (!r) return "";
  const head = `$ ${r.command}   (${label}, commit ${r.commit.slice(0, 7)})   ${(r.durationMs / 1000).toFixed(1)} s`;
  const counts = `${r.exitCode === 0 ? "✓" : "✗"} ${r.passed} of ${r.total} pass`;
  const fail = r.failure ? `\n✗ ${r.failure.test}: expected ${r.failure.expected}, got ${r.failure.actual}` : "";
  return `${head}\n${counts}${fail}`;
}

export function counts(r: RunResult | null): string {
  return r ? `${r.passed} of ${r.total}` : "";
}

function stateFor(c: LiveCase, rejected: boolean): Record<StepKey, StepState> {
  const at = (now: StepKey, bad = false): Record<StepKey, StepState> => {
    const i = ORDER.indexOf(now);
    return Object.fromEntries(
      ORDER.map((k, j) => [k, j < i ? "done" : j === i ? (bad ? "bad" : "now") : "later"]),
    ) as Record<StepKey, StepState>;
  };
  switch (c.status) {
    case "detected":
      return at("noticed");
    case "investigating":
      return c.verdict ? at("fixed", rejected) : at("checked");
    case "repaired":
      return at("proved");
    case "escalated":
      return at("fixed", true);
    case "awaiting_approval":
      return at("you");
    case "approved":
      return { ...at("you"), you: "now" };
    case "rejected":
      return at("you", true);
    case "not_affected":
      return at("checked");
  }
}

export function steps(c: LiveCase, all: RelayEntry[]): Step[] {
  const msgs = splitDeliberate(all).real;
  const rejection = rejectedNow(c, msgs);
  const state = stateFor(c, !!rejection);
  const proposals = parsedOf(msgs, "repair.proposed");
  const proposal = last(proposals);
  const site = siteName(c);
  const field = c.callSite?.fieldsRead.join(", ") ?? c.change.fieldPath;
  const d = c.change.shapeDiff;

  const noticed: Step = {
    key: "noticed", name: STEP_NAMES.noticed, state: state.noticed,
    what: `The supplier changed ${c.change.fieldPath}.`,
    when: clock(c.signals[0]?.at),
    detail: [
      `${c.change.provider} · ${c.change.endpoint} · ${c.change.changeKind}`,
      c.change.summary,
      ...d.removed.map((f) => `- ${f}`),
      ...d.added.map((f) => `+ ${f}`),
      ...d.retyped.map((f) => `~ ${f}`),
      c.change.sourceRef ? `note: ${c.change.sourceRef}` : "",
    ].filter(Boolean).join("\n"),
  };

  const failing = c.before && c.before.exitCode !== 0;
  const checked: Step = {
    key: "checked", name: STEP_NAMES.checked, state: state.checked,
    what: c.verdict
      ? site
        ? `${site} reads that field, so your app is affected.${failing ? " Its test now fails." : ""}`
        : c.verdict.evidence[0] ?? "Your app is affected."
      : "Looking for the code that reads this field.",
    when: clock(c.verdict?.at),
    detail: [
      c.callSite ? `${c.callSite.path}:${c.callSite.line}   reads ${field}` : "",
      ...(c.verdict?.evidence ?? []),
      runLine("before", c.before),
    ].filter(Boolean).join("\n\n"),
  };

  let fixedWhat = c.attempt > 0 ? `The fixer is on attempt ${c.attempt}.` : "The fixer has the case.";
  if (state.fixed === "done") fixedWhat = proposal?.say ?? `Attempt ${c.attempt} passed your test.`;
  if (rejection) fixedWhat = rejection.say || rejection.reason;
  if (c.status === "escalated") fixedWhat = last(parsedOf(msgs, "escalation.needed"))?.say ?? "No fix passed every check. A person needs to look.";
  const fixed: Step = {
    key: "fixed", name: STEP_NAMES.fixed, state: state.fixed,
    what: fixedWhat,
    when: clock(rejection?.at ?? proposal?.at),
    detail: [
      ...proposals.map((p) => `attempt ${p.attempt}: commit ${p.headCommit.slice(0, 7)}${p.diffRef ? `   ${p.diffRef}` : ""}`),
      c.headCommit ? `head ${c.headCommit.slice(0, 7)} on base ${c.baseCommit.slice(0, 7)}` : "",
    ].filter(Boolean).join("\n"),
  };

  const r = c.regression;
  const proved: Step = {
    key: "proved", name: STEP_NAMES.proved, state: state.proved,
    what: c.after && r
      ? `Your test passes (${counts(c.after)}) and so do ${counts(r)} hidden checks.`
      : c.after ? `Your test passes (${counts(c.after)}).` : "Running your test and the hidden checks.",
    when: clock(c.verifier?.at),
    detail: [runLine("after", c.after), runLine("hidden checks", r), c.verifier ? `verifier: ${c.verifier.decision} · ${c.verifier.reason}` : ""]
      .filter(Boolean).join("\n\n"),
  };

  const approval = c.approval;
  let youWhat = "A tested fix is waiting for your review.";
  if (c.status === "approved") youWhat = `Approved by ${approval.by} · nothing merged or deployed`;
  if (c.status === "rejected") youWhat = `${approval.by || "You"} sent the fix back. Nothing merged.`;
  const you: Step = {
    key: "you", name: STEP_NAMES.you, state: state.you,
    what: youWhat,
    when: clock(approval.at || c.pr?.openedAt),
    detail: c.pr ? `${c.pr.url}\nbase ${c.baseCommit.slice(0, 7)} → head ${c.headCommit.slice(0, 7)}` : "",
  };

  return [noticed, checked, fixed, proved, you];
}

export type Role = "observer" | "repair" | "verifier" | "other";

export function roleOf(m: RelayEntry): Role {
  if (m.from === AGENT_NAMES.observer) return "observer";
  if (m.from === AGENT_NAMES.repair) return "repair";
  if (m.from === AGENT_NAMES.verifier) return "verifier";
  switch (m.parsed?.type) {
    case "repair.requested": return "observer";
    case "repair.proposed": return "repair";
    case "verification.result":
    case "escalation.needed": return "verifier";
  }
  return "other";
}

// Attempts the verifier sent back. Their proposals stay visible, marked.
export function sentBackAttempts(msgs: RelayEntry[]): Set<number> {
  return new Set(parsedOf(msgs, "verification.result").filter((v) => v.decision === "reject").map((v) => v.attempt));
}
