import type { Case } from "../../contracts/case.ts";
import { patchCase } from "./case-store.ts";

const REPO = "0x1/agent-smith-demo";

interface Review {
  state: string;
  user: { login: string };
  submitted_at: string;
}

// Read-only. A person reviews on GitHub, and this copies the result into the case.
export async function syncApproval(record: Case): Promise<void> {
  if (record.status !== "awaiting_approval" || !record.pr) return;
  const res = await fetch(`https://api.github.com/repos/${REPO}/pulls/${record.pr.number}/reviews`, {
    headers: { authorization: `Bearer ${process.env.AGENT_SMITH_GITHUB_TOKEN}`, accept: "application/vnd.github+json" },
    signal: AbortSignal.timeout(3000),
  });
  if (!res.ok) {
    console.warn(`could not read reviews for PR #${record.pr.number}: ${res.status}`);
    return;
  }
  const decided = ((await res.json()) as Review[]).filter((r) => r.state === "APPROVED" || r.state === "CHANGES_REQUESTED");
  const latest = decided.at(-1);
  if (!latest) return;
  const approved = latest.state === "APPROVED";
  await patchCase(record.caseId, {
    status: approved ? "approved" : "rejected",
    headline: approved ? "Approved. Nothing has been merged or deployed." : "A reviewer asked for changes.",
    approval: { state: approved ? "approved" : "rejected", by: latest.user.login, at: latest.submitted_at },
  });
}
