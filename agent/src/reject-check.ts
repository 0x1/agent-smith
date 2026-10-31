import { execFileSync } from "node:child_process";
import { loadEnv } from "./env.ts";
import { verify } from "./verifier.ts";

// Proves the verifier rejects bad patches. Usage: tsx src/reject-check.ts <repoDir>
loadEnv();
const [repo] = process.argv.slice(2);
const commit = execFileSync("git", ["-C", repo, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
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
const a = await verify(repo, commit, diff);
console.log("no clamp:", a.decision, "|", a.reason, "|", JSON.stringify(a.proof), "| hidden", a.regression?.passed, "of", a.regression?.total);
const b = await verify(repo, commit, diff.replaceAll("src/supplier.ts", "test/stock.test.ts"));
console.log("edits test:", b.decision, "|", b.reason);
