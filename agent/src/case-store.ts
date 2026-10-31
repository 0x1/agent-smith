import { randomUUID } from "node:crypto";
import type { Case } from "../../contracts/case.ts";

const ACTORS = process.env.TERSE_ACTOR_URL ?? "http://127.0.0.1:7100/v1/projects/local/actors";

interface Outcome<T> {
  outcome: { type: "completed"; result: T } | { type: "failed"; code: string; message: string };
}

// Terse answers HTTP 200 even when the actor fails, so check the outcome.
export async function invoke<T>(path: string, method: string, args: unknown[] = []): Promise<T> {
  const res = await fetch(`${ACTORS}/${path}/invoke`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ requestId: randomUUID(), method, args }),
  });
  if (!res.ok) throw new Error(`${path}.${method}: HTTP ${res.status}`);
  const { outcome } = (await res.json()) as Outcome<T>;
  if (outcome.type === "failed") throw new Error(`${path}.${method}: ${outcome.message}`);
  return outcome.result;
}

// The Case actor is the record. A missed write must not stop a repair.
export async function patchCase(caseId: string, patch: Partial<Case>): Promise<void> {
  try {
    await invoke(`Case/${caseId}`, "patch", [patch]);
  } catch (error) {
    console.warn(`case patch failed (${Object.keys(patch).join(", ")}): ${String(error)}`);
  }
}
