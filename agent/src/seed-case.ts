import { readFileSync } from "node:fs";
import { makeCaseId, type Case, type Change } from "../../contracts/case.ts";
import { invoke } from "./case-store.ts";

// Opens a case by hand when no watcher is running. Usage: tsx src/seed-case.ts <changePath> [read]
const [path, action] = process.argv.slice(2);
const change = JSON.parse(readFileSync(path, "utf8")) as Change;
const id = makeCaseId("agent-smith-demo", change.provider, change.endpoint, change.fieldPath);
if (action !== "read") {
  await invoke(`Case/${id}`, "create", [{ ...change, headline: "A supplier change was detected.", explanation: change.summary, signal: { eventId: `seed-${Date.now()}`, source: "seed", at: new Date().toISOString() } }]);
}
const c = await invoke<Case>(`Case/${id}`, "read");
const { logRef: _a, ...before } = c.before ?? ({} as never);
const { logRef: _b, ...after } = c.after ?? ({} as never);
const { logRef: _c, ...regression } = c.regression ?? ({} as never);
console.log(JSON.stringify({ id, status: c.status, headline: c.headline, explanation: c.explanation, verdict: c.verdict?.result, callSite: c.callSite, attempt: c.attempt, before, after, regression, proof: c.proof, verifier: c.verifier, pr: c.pr }, null, 1));
