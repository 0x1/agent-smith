import type { Proof, RunResult } from "../../contracts/case.ts";
import type { RelayMessage } from "../../contracts/relay.ts";
import { getRelay } from "./relay.ts";
import { verify } from "./verifier.ts";

export interface Verdict {
  decision: "accept" | "reject";
  reason: string;
  after: RunResult | null;
  regression: RunResult | null;
  proof: Proof | null;
}

const waiting = new Map<string, (verdict: Verdict) => void>();
const results = new Map<string, Verdict>();
const key = (caseId: string, attempt: number) => `${caseId}#${attempt}`;
let started = false;

// A separate participant on Agent Relay. It sees only what is posted, so it
// cannot be influenced by the repair agent's reasoning.
export async function startVerifierAgent(repoDir = process.env.TARGET_REPO_DIR ?? ""): Promise<void> {
  if (started) return;
  started = true;
  const relay = await getRelay();
  relay.on("repair.proposed", async (message: RelayMessage, messageId: string) => {
    if (message.type !== "repair.proposed") return;
    const { caseId, attempt, headCommit, diffRef } = message;
    const verdict = await verify(repoDir, headCommit, diffRef);
    const { decision, reason } = verdict;
    results.set(key(caseId, attempt), verdict);
    await relay.reply(relay.verifier, messageId, {
      type: "verification.result",
      caseId,
      attempt,
      decision,
      reason,
      at: new Date().toISOString(),
      say: decision === "accept" ? `Accepted. ${reason}` : `Rejected. ${reason}`,
    });
    waiting.get(key(caseId, attempt))?.(results.get(key(caseId, attempt))!);
  });
}

export function waitForVerdict(caseId: string, attempt: number): Promise<Verdict> {
  return new Promise((resolve) => waiting.set(key(caseId, attempt), resolve));
}
