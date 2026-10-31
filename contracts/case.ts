// The handoff record shared by every track. `agent/` and the actors write it,
// and `web/` reads it. Change this file through a PR so all tracks see it.

export const CASE_STATUSES = [
  "detected",
  "not_affected",
  "investigating",
  "repaired",
  "escalated",
  "awaiting_approval",
  "approved",
  "rejected",
] as const;
export type CaseStatus = (typeof CASE_STATUSES)[number];

export type ChangeKind = "breaking" | "added";

export interface ShapeDiff {
  removed: string[];
  added: string[];
  retyped: string[];
}

export interface Change {
  provider: string;
  endpoint: string;
  changeKind: ChangeKind;
  fieldPath: string;
  shapeDiff: ShapeDiff;
  summary: string;
  // URL or path of the supplier's migration note.
  sourceRef: string;
}

// One more sighting of the same change. It attaches to the existing case.
export interface Signal {
  eventId: string;
  source: string;
  at: string;
}

export interface Verdict {
  result: "affected" | "not_affected";
  evidence: string[];
}

export interface CallSite {
  path: string;
  line: number;
  fieldsRead: string[];
}

export interface RunResult {
  commit: string;
  command: string;
  exitCode: number;
  logRef: string;
}

export interface VerifierDecision {
  decision: "accept" | "reject";
  reason: string;
  at: string;
}

export interface Approval {
  state: "pending" | "approved" | "rejected";
  by: string;
  at: string;
}

export interface Case {
  caseId: string;
  status: CaseStatus;
  // Plain language for people. No field paths or jargon in these two.
  headline: string;
  explanation: string;
  change: Change;
  signals: Signal[];
  verdict: Verdict | null;
  callSite: CallSite | null;
  attempt: number;
  baseCommit: string;
  headCommit: string;
  testCommand: string;
  before: RunResult | null;
  after: RunResult | null;
  // Hidden tests. These stay separate from the before and after runs.
  regression: RunResult | null;
  verifier: VerifierDecision | null;
  pr: { number: number; url: string } | null;
  approval: Approval;
}

const CASE_ID_PATTERN = /^[A-Za-z0-9._-]+$/;

// Terse actor IDs allow only letters, digits, `.`, `_` and `-`. The same change
// to the same repo always gives the same ID, which is what deduplicates cases.
export function makeCaseId(
  repo: string,
  provider: string,
  endpoint: string,
  fieldPath: string,
): string {
  const id = [repo, provider, endpoint, fieldPath]
    .map((part) => part.replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, ""))
    .join(".");
  if (!CASE_ID_PATTERN.test(id)) throw new Error(`invalid case ID: ${id}`);
  return id;
}
