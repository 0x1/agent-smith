import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Case, WatcherState } from "../../contracts/case.ts";
import { loadEnv } from "./env.ts";
import { investigate } from "./workflow.ts";

loadEnv();
const ACTORS = process.env.TERSE_ACTOR_URL ?? "http://127.0.0.1:7100/v1/projects/local/actors";
const WATCHER = "EndpointWatcher/supplier.get-inventory";
const REPO_DIR = process.env.TARGET_REPO_DIR ?? join(import.meta.dirname, "..", "..", "..", "agent-smith-demo");
process.env.TARGET_REPO_DIR = REPO_DIR;

async function invoke<T>(path: string, method: string, args: unknown[] = []): Promise<T> {
  const res = await fetch(`${ACTORS}/${path}/invoke`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ requestId: randomUUID(), method, args }),
  });
  if (!res.ok) throw new Error(`${path}.${method}: ${res.status}`);
  const body = (await res.json()) as { result?: T };
  return (body.result ?? body) as T;
}

const started = new Set<string>();

async function handle(caseId: string): Promise<void> {
  const record = await invoke<Case>(`Case/${caseId}`, "get");
  if (record.status !== "detected" || !record.change) return;
  started.add(caseId);
  const commit = execFileSync("git", ["-C", REPO_DIR, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const note = readFileSync(join(REPO_DIR, "test/support/supplier/notes/v2.md"), "utf8");
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
    for (const caseId of state.caseIds ?? []) {
      if (!started.has(caseId)) handle(caseId).catch((error) => console.error(caseId, String(error)));
    }
  } catch {
    // The watcher is not up yet.
  }
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
