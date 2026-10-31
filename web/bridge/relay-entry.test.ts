import { expect, test } from "bun:test";
import { findObserverToken, toEntry } from "./relay-entry.ts";

const at = "2026-10-31T21:00:00.000Z";

test("parses a RelayMessage and uses its own time", () => {
  const msg = { type: "verification.result", caseId: "c1", attempt: 1, at: "2026-10-31T20:59:00.000Z", say: "Sent back.", decision: "reject", reason: "r" };
  const e = toEntry({ messageId: "m1", text: JSON.stringify(msg), from: { name: "smith-verifier" } }, at);
  expect(e?.parsed?.type).toBe("verification.result");
  expect(e?.at).toBe(msg.at);
  expect(e?.from).toBe("smith-verifier");
});

test("keeps unparseable text, unparsed", () => {
  const e = toEntry({ id: "m2", text: "joined the channel", createdAt: "2026-10-31T20:58:00.000Z" }, at);
  expect(e).toMatchObject({ id: "m2", parsed: null, text: "joined the channel", at: "2026-10-31T20:58:00.000Z" });
});

test("skips events without an id or text", () => {
  expect(toEntry({ text: "x" }, at)).toBeNull();
  expect(toEntry({ id: "m3" }, at)).toBeNull();
});

test("finds the observer token in CLI output", () => {
  expect(findObserverToken('{"token":"ot_live_abc-123"}')).toBe("ot_live_abc-123");
  expect(findObserverToken("error: not logged in")).toBeNull();
});
