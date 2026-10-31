import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadEnv } from "./env.ts";
import { runRepair, TEST_COMMAND } from "./repair.ts";
import { openSandbox } from "./sandbox.ts";
import { verify } from "./verifier.ts";

loadEnv();
const [repo] = process.argv.slice(2);
const note = readFileSync(join(repo, "test/support/supplier/notes/v2.md"), "utf8");
const change = { provider: "supplier", endpoint: "GET /v1/inventory/{sku}", changeKind: "breaking", fieldPath: "stock", shapeDiff: { removed: ["stock"], added: ["inventory.on_hand", "inventory.reserved"], retyped: [] }, summary: "The stock field was replaced by inventory.on_hand and inventory.reserved.", sourceRef: "notes/v2.md" } as const;
const sandbox = await openSandbox(repo, "HEAD");
try {
  const before = await sandbox.run(TEST_COMMAND);
  console.log("before exit", before.exitCode);
  const t = Date.now();
  console.log("summary:", await runRepair(sandbox, change, note, null), Date.now() - t, "ms");
  await sandbox.run("git add -A");
  const diff = (await sandbox.run("git diff --cached")).stdout;
  console.log(diff);
  console.log(await verify(repo, "HEAD", diff).then(({ decision, reason, after, regression }) => ({ decision, reason, after: after?.exitCode, regression: regression?.exitCode })));
} finally {
  await sandbox.destroy();
}
