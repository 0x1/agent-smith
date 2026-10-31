import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import type { Change } from "../../contracts/case.ts";
import { loadEnv } from "./env.ts";
import { runRepair } from "./repair.ts";
import { openSandbox } from "./sandbox.ts";
import { verify } from "./verifier.ts";

// How often does a first attempt pass? Usage: tsx src/measure.ts <repoDir> <notePath> <runs>
loadEnv();
const [repoDir, notePath, runs = "5"] = process.argv.slice(2);
const note = readFileSync(notePath, "utf8");
const change = JSON.parse(readFileSync(join(import.meta.dirname, "..", "..", "inventory/examples/change-v2-breaking.json"), "utf8")) as Change;
const commit = execFileSync("git", ["-C", repoDir, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();

const once = async () => {
  const sandbox = await openSandbox(repoDir, commit);
  try {
    await sandbox.writeFile("test/support/supplier/notes/v2.md", note);
    await runRepair(sandbox, change, note, null);
    await sandbox.run("git add src");
    const diff = (await sandbox.run("git diff --cached")).stdout;
    const { decision, reason, proof } = await verify(repoDir, commit, diff);
    return { decision, reason: reason.slice(0, 110), proof, line: diff.match(/^\+  return .*/m)?.[0] };
  } finally {
    await sandbox.destroy();
  }
};

for (const r of await Promise.all(Array.from({ length: Number(runs) }, once))) console.log(JSON.stringify(r));
