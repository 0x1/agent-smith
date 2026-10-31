import { describe, expect, test } from "bun:test";
import { gateCase, gateWatcher, nextDelay, unwrapState } from "./gate.ts";

const seen = { version: 10, pid: 100, probeCount: 50 };

describe("gateWatcher", () => {
  test("accepts the first frame", () => {
    expect(gateWatcher(null, { version: 0, pid: 1, probeCount: 0, reconnected: false })).toEqual({ accept: true, restart: null });
  });

  test("drops a stale frame from the same process", () => {
    expect(gateWatcher(seen, { version: 9, pid: 100, probeCount: 50, reconnected: false }).accept).toBe(false);
    expect(gateWatcher(seen, { version: 9, pid: 100, probeCount: 50, reconnected: true }).accept).toBe(false);
  });

  test("reports a restart when the pid changes, with state intact", () => {
    const v = gateWatcher(seen, { version: 11, pid: 200, probeCount: 51, reconnected: true });
    expect(v).toEqual({ accept: true, restart: { oldPid: 100, newPid: 200, intact: true } });
  });

  test("accepts a lower version only after a reconnect to a new process", () => {
    expect(gateWatcher(seen, { version: 1, pid: 200, probeCount: 50, reconnected: true }).accept).toBe(true);
    expect(gateWatcher(seen, { version: 1, pid: 200, probeCount: 50, reconnected: false }).accept).toBe(false);
  });

  test("says when the new process lost checks", () => {
    expect(gateWatcher(seen, { version: 11, pid: 200, probeCount: 3, reconnected: true }).restart?.intact).toBe(false);
  });
});

test("gateCase drops older versions except right after a reconnect", () => {
  expect(gateCase(undefined, 0, false)).toBe(true);
  expect(gateCase(5, 5, false)).toBe(true);
  expect(gateCase(5, 4, false)).toBe(false);
  expect(gateCase(5, 1, true)).toBe(true);
});

test("unwrapState reads the actor's `state` field", () => {
  expect(unwrapState({ state: { caseId: "a" } })).toEqual({ caseId: "a" });
  expect(unwrapState({ state: null })).toBeNull();
  expect(unwrapState({ caseId: "a" })).toEqual({ caseId: "a" });
});

test("backoff doubles from 250 ms and stops at 2 s", () => {
  const seq = [250];
  while (seq.length < 6) seq.push(nextDelay(seq[seq.length - 1]));
  expect(seq).toEqual([250, 500, 1000, 2000, 2000, 2000]);
});
