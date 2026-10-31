// Agent Relay messages. Every message carries the case ID and attempt, so the
// observer in `web/` can show the conversation for one case. The message text is
// `JSON.stringify(RelayMessage)`, because live `thread.reply` events drop metadata.

export const REPAIR_CHANNEL = "agent-smith-repairs";

export const AGENT_NAMES = {
  observer: "smith-observer",
  repair: "smith-repair",
  verifier: "smith-verifier",
} as const;

interface MessageBase {
  caseId: string;
  attempt: number;
  at: string;
  // One plain sentence for people, shown in the case view's conversation.
  say: string;
}

export interface RepairRequested extends MessageBase {
  type: "repair.requested";
  summary: string;
}

export interface RepairProposed extends MessageBase {
  type: "repair.proposed";
  headCommit: string;
  diffRef: string;
}

export interface VerificationResult extends MessageBase {
  type: "verification.result";
  decision: "accept" | "reject";
  reason: string;
}

export interface EscalationNeeded extends MessageBase {
  type: "escalation.needed";
  reason: string;
}

export function parseRelayMessage(text: string): RelayMessage | null {
  try {
    const value = JSON.parse(text);
    return typeof value?.type === "string" && typeof value?.caseId === "string" ? value : null;
  } catch {
    return null;
  }
}

export type RelayMessage =
  | RepairRequested
  | RepairProposed
  | VerificationResult
  | EscalationNeeded;
