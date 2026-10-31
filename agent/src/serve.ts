import { execFileSync } from "node:child_process";
import { join } from "node:path";
import type { Case, Change, WatcherState } from "../../contracts/case.ts";
import { syncApproval } from "./approval.ts";
import { invoke } from "./case-store.ts";
import { loadEnv } from "./env.ts";
import { investigate } from "./workflow.ts";

loadEnv();
const WATCHER = "EndpointWatcher/supplier.get-inventory";
const REPO_DIR = process.env.TARGET_REPO_DIR ?? join(import.meta.dirname, "..", "..", "..", "agent-smith-demo");
process.env.TARGET_REPO_DIR = REPO_DIR;

const APPROVAL_EVERY_MS = 5000;
const started = new Set<string>();
let lastApprovalCheck = 0;

async function readNote(change: Change): Promise<string> {
  const res = await fetch(change.sourceRef);
  if (!res.ok) throw new Error(`could not read the supplier's note: ${res.status}`);
  return res.text();
}

async function handle(caseId: string): Promise<void> {
  started.add(caseId);
  const record = await invoke<Case | null>(`Case/${caseId}`, "read");
  if (!record || record.status !== "detected" || !record.change) {
    started.delete(caseId);
    return;
  }
  const commit = execFileSync("git", ["-C", REPO_DIR, "rev-parse", "demo-baseline^{commit}"], { encoding: "utf8" }).trim();
  const note = await readNote(record.change);
  const run = await investigate.createRun();
  const result = await run.start({
    inputData: { change: record.change, repoDir: REPO_DIR, repo: "0x1/agent-smith-demo", commit, note },
  });
  console.log(caseId, result.status);
}

// Polls the watcher, and starts one workflow for each case it has not seen.
console.log("agent polling", WATCHER);
for (;;) {
  try {
    const state = await invoke<WatcherState>(WATCHER, "getState");
    // After a demo reset the same case ID is new again.
    for (const caseId of started) {
      if (!state.caseIds?.includes(caseId)) started.delete(caseId);
    }
    if (Date.now() - lastApprovalCheck > APPROVAL_EVERY_MS) {
      lastApprovalCheck = Date.now();
      for (const caseId of state.caseIds ?? []) {
        const record = await invoke<Case | null>(`Case/${caseId}`, "read");
        if (record) await syncApproval(record);
      }
    }
    for (const caseId of state.caseIds ?? []) {
      if (!started.has(caseId)) handle(caseId).catch((error) => console.error(caseId, String(error)));
    }
  } catch {
    // The watcher is not up yet.
  }
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
