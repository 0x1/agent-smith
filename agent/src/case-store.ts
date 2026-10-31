import { randomUUID } from "node:crypto";
import type { Case } from "../../contracts/case.ts";

const ACTORS = process.env.TERSE_ACTOR_URL ?? "http://127.0.0.1:7100/v1/projects/local/actors";

// The Case actor is the record. `agent/` writes through its HTTP call.
export async function patchCase(caseId: string, patch: Partial<Case>): Promise<void> {
  const label = Object.keys(patch).join(", ");
  try {
    const res = await fetch(`${ACTORS}/Case/${caseId}/invoke`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ requestId: randomUUID(), method: "patch", args: [patch] }),
    });
    if (!res.ok) console.warn(`case patch failed (${res.status}): ${label}`);
  } catch {
    console.warn(`case actor unreachable: ${label}`);
  }
}
