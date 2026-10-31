// Turns the live case and Relay messages into the five human steps. Everything
// here is read from real fields; nothing is scripted or staged.
import type { RunResult } from "../../../contracts/case.ts";
import { AGENT_NAMES, type RelayMessage, type VerificationResult } from "../../../contracts/relay.ts";
import type { RelayEntry } from "../../shared/stream.ts";
import { clock, type LiveCase, type LiveState } from "./live.ts";

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
export function activeCase(s: LiveState): LiveCase | null {
  const ids = s.watcher?.caseIds ?? Object.keys(s.cases);
  for (let i = ids.length - 1; i >= 0; i--) {
    const c = s.cases[ids[i]];
    if (c && c.status !== "not_affected") return c;
  }
  return null;
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

// True only when a real verifier rejection is the latest word on this case.
export function rejectedNow(c: LiveCase, msgs: RelayEntry[]): VerificationResult | null {
  if (c.status !== "investigating") return null;
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

export function steps(c: LiveCase, msgs: RelayEntry[]): Step[] {
  const rejection = rejectedNow(c, msgs);
  const state = stateFor(c, !!rejection);
  const proposals = parsedOf(msgs, "repair.proposed");
  const proposal = last(proposals);
  const site = siteName(c);
  const field = c.callSite?.fieldsRead.join(", ") ?? c.change.fieldPath;
  const d = c.change.shapeDiff;

  const noticed: Step = {
    key: "noticed", name: STEP_NAMES.noticed, state: state.noticed,
    what: c.change.summary,
    when: clock(c.signals[0]?.at),
    detail: [
      `${c.change.provider} · ${c.change.endpoint} · ${c.change.changeKind}`,
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
