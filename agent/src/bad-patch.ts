import { execFileSync } from "node:child_process";
import { makeCaseId } from "../../contracts/case.ts";
import { loadEnv } from "./env.ts";
import { getRelay } from "./relay.ts";
import { verify } from "./verifier.ts";
import { BAD_PATCH_ATTEMPT } from "./verifier-agent.ts";

// A deliberately bad patch for the live demo, sent through the real verifier.
// It never touches the case record or a PR. Usage: pnpm bad-patch
loadEnv();
const repo = process.env.TARGET_REPO_DIR ?? "../../agent-smith-demo";
const commit = execFileSync("git", ["-C", repo, "rev-parse", "demo-baseline^{commit}"], { encoding: "utf8" }).trim();
const caseId = makeCaseId("agent-smith-demo", "supplier", "GET /v1/inventory/{sku}", "stock");

const diff = [
  "diff --git a/src/supplier.ts b/src/supplier.ts",
  "--- a/src/supplier.ts",
  "+++ b/src/supplier.ts",
  "@@ -14,3 +14,3 @@ export async function getStock(sku: string): Promise<number> {",
  "   const body = await res.json();",
  "-  return body.stock;",
  "+  return body.inventory.on_hand - body.inventory.reserved;",
  " }",
  "",
].join("\n");

const relay = await getRelay();
const messageId = await relay.post(relay.observer, {
  type: "repair.proposed",
  caseId,
  attempt: BAD_PATCH_ATTEMPT,
  headCommit: commit,
  diffRef: diff,
  at: new Date().toISOString(),
  say: "Deliberately bad patch, for this demo: it forgets that stock can't go below zero. Can the verifier catch it?",
});
const { decision, reason } = await verify(repo, commit, diff);
await relay.reply(relay.verifier, messageId, {
  type: "verification.result",
  caseId,
  attempt: BAD_PATCH_ATTEMPT,
  decision,
  reason,
  at: new Date().toISOString(),
  say: `Deliberately bad patch: ${decision === "accept" ? "accepted" : "rejected"}. ${reason}`,
});
console.log(decision, reason);
process.exit(0);
