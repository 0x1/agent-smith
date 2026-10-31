import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Proof, RunResult } from "../../contracts/case.ts";
import { TEST_COMMAND } from "./repair.ts";
import { openSandbox, type Sandbox } from "./sandbox.ts";
import { toRunResult } from "./test-output.ts";

export interface Verification {
  decision: "accept" | "reject";
  reason: string;
  after: RunResult | null;
  regression: RunResult | null;
  proof: Proof | null;
}

const HIDDEN = join(import.meta.dirname, "..", "hidden-tests", "regression.test.ts");

const PROBE = `import { readFileSync } from "node:fs";
import { startSupplier } from "./support/env.ts";
import { getStock } from "../src/supplier.ts";
const stop = await startSupplier();
const sku = process.argv[2];
const { inventory } = JSON.parse(readFileSync("test/support/supplier/fixtures/v2.json", "utf8"))[sku];
console.log(JSON.stringify({ onHand: inventory.on_hand, reserved: inventory.reserved, result: await getStock(sku) }));
stop();
process.exit(0);
`;

// Runs the repaired code for one SKU, so the view shows numbers that really came out of it.
async function measure(sandbox: Sandbox, sku: string, expected: number): Promise<Proof | null> {
  await sandbox.writeFile("test/probe.ts", PROBE);
  const r = await sandbox.run(`SUPPLIER_VERSION=v2 pnpm exec tsx test/probe.ts ${sku}`);
  try {
    return { sku, expected, ...JSON.parse(r.stdout.trim().split("\n").pop() ?? "") };
  } catch {
    return null;
  }
}

function rejectionReason(proof: Proof | null): string {
  if (!proof) return "A regression test the repair could not see failed.";
  return `A hidden check failed: ${proof.sku} has ${proof.onHand} on hand and ${proof.reserved} reserved, so it should be ${proof.expected}, but the fix returned ${proof.result}.`;
}

function changedPaths(diff: string): string[] {
  return [...diff.matchAll(/^diff --git a\/(\S+) b\//gm)].map((m) => m[1]);
}

// No model here. The repair cannot talk its way past this check.
export async function verify(repoDir: string, commit: string, diff: string): Promise<Verification> {
  const outside = changedPaths(diff).filter((path) => !path.startsWith("src/"));
  if (changedPaths(diff).length === 0) return { decision: "reject", reason: "The patch is empty.", after: null, regression: null, proof: null };
  if (outside.length > 0) {
    return { decision: "reject", reason: `The patch edits files outside src/: ${outside.join(", ")}.`, after: null, regression: null, proof: null };
  }

  const sandbox = await openSandbox(repoDir, commit);
  try {
    await sandbox.writeFile(".patch.diff", diff);
    const applied = await sandbox.run("git apply .patch.diff && rm .patch.diff");
    if (applied.exitCode !== 0) return { decision: "reject", reason: "The patch does not apply cleanly.", after: null, regression: null, proof: null };

    const visibleStarted = Date.now();
    const visible = await sandbox.run(TEST_COMMAND);
    const after = toRunResult(commit, TEST_COMMAND, visible, Date.now() - visibleStarted);
    if (visible.exitCode !== 0) return { decision: "reject", reason: "The visible tests still fail.", after, regression: null, proof: null };

    await sandbox.writeFile("test/hidden.test.ts", readFileSync(HIDDEN, "utf8"));
    const hiddenCommand = "SUPPLIER_VERSION=v2 pnpm exec tsx --test test/hidden.test.ts";
    const hiddenStarted = Date.now();
    const hidden = await sandbox.run(hiddenCommand);
    const regression = toRunResult(commit, "hidden regression tests", hidden, Date.now() - hiddenStarted);
    if (hidden.exitCode !== 0) {
      const proof = await measure(sandbox, "WIDGET-3", 0);
      return { decision: "reject", reason: rejectionReason(proof), after, regression, proof };
    }

    return { decision: "accept", reason: "Visible and hidden tests pass.", after, regression, proof: await measure(sandbox, "WIDGET-1", 2) };
  } finally {
    await sandbox.destroy();
  }
}
