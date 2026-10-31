import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { RunResult } from "../../contracts/case.ts";
import { TEST_COMMAND } from "./repair.ts";
import { openSandbox } from "./sandbox.ts";

export interface Verification {
  decision: "accept" | "reject";
  reason: string;
  after: RunResult | null;
  regression: RunResult | null;
}

const HIDDEN = join(import.meta.dirname, "..", "hidden-tests", "regression.test.ts");

function changedPaths(diff: string): string[] {
  return [...diff.matchAll(/^diff --git a\/(\S+) b\//gm)].map((m) => m[1]);
}

// No model here. The repair cannot talk its way past this check.
export async function verify(repoDir: string, commit: string, diff: string): Promise<Verification> {
  const outside = changedPaths(diff).filter((path) => !path.startsWith("src/"));
  if (changedPaths(diff).length === 0) return { decision: "reject", reason: "The patch is empty.", after: null, regression: null };
  if (outside.length > 0) {
    return { decision: "reject", reason: `The patch edits files outside src/: ${outside.join(", ")}.`, after: null, regression: null };
  }

  const sandbox = await openSandbox(repoDir, commit);
  try {
    await sandbox.writeFile(".patch.diff", diff);
    const applied = await sandbox.run("git apply .patch.diff && rm .patch.diff");
    if (applied.exitCode !== 0) return { decision: "reject", reason: "The patch does not apply cleanly.", after: null, regression: null };

    const visible = await sandbox.run(TEST_COMMAND);
    const after = { commit, command: TEST_COMMAND, exitCode: visible.exitCode ?? -1, logRef: (visible.stdout + visible.stderr).slice(-2000) };
    if (visible.exitCode !== 0) return { decision: "reject", reason: "The visible tests still fail.", after, regression: null };

    await sandbox.writeFile("test/hidden.test.ts", readFileSync(HIDDEN, "utf8"));
    const hiddenCommand = "SUPPLIER_VERSION=v2 pnpm exec tsx --test test/hidden.test.ts";
    const hidden = await sandbox.run(hiddenCommand);
    const regression = { commit, command: "hidden regression tests", exitCode: hidden.exitCode ?? -1, logRef: (hidden.stdout + hidden.stderr).slice(-2000) };
    if (hidden.exitCode !== 0) return { decision: "reject", reason: "A regression test the repair could not see failed.", after, regression };

    return { decision: "accept", reason: "Visible and hidden tests pass.", after, regression };
  } finally {
    await sandbox.destroy();
  }
}
