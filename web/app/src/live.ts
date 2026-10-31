// Page state, fed only by the bridge's SSE stream (or, behind `?fixture=1`, by
// fixture events with the same shape).
import { useEffect, useReducer, useState } from "react";
import type { Case, WatcherState } from "../../../contracts/case.ts";
import type { RelayEntry, Restart, SourceName, SourceStatus, StreamEvent, SupplierSample } from "../../shared/stream.ts";

// Mirrors `Proof` on `cto-1/wire-watcher`. Delete this and import `Case` directly
// once that branch merges and `Case.proof` exists on main.
export interface Proof {
  sku: string;
  onHand: number;
  reserved: number;
  result: number;
  expected: number;
}
export type LiveCase = Case & { proof?: Proof | null };

export interface LiveState {
  bridge: "live" | "connecting";
  openedAt: string;
  sources: Record<SourceName, SourceStatus | null>;
  watcher: WatcherState | null;
  cases: Record<string, LiveCase>;
  versions: Record<string, number>;
  messages: RelayEntry[];
  restart: Restart | null;
  sample: SupplierSample | null;
}

type Action = { type: "event"; event: StreamEvent } | { type: "bridge"; state: LiveState["bridge"] } | { type: "reset" };

function initial(): LiveState {
  return {
    bridge: "connecting",
    openedAt: new Date().toISOString(),
    sources: { terse: null, relay: null, supplier: null },
    watcher: null,
    cases: {},
    versions: {},
    messages: [],
    restart: null,
    sample: null,
  };
}

function reduce(s: LiveState, a: Action): LiveState {
  if (a.type === "bridge") return { ...s, bridge: a.state };
  if (a.type === "reset") return { ...initial(), bridge: s.bridge, openedAt: s.openedAt };
  const e = a.event;
  switch (e.kind) {
    case "status":
      return { ...s, sources: { ...s.sources, [e.source]: e.data } };
    case "watcher":
      return { ...s, watcher: e.data };
    case "case": {
      // The bridge already drops stale frames; this guards replays after a reconnect.
      if ((s.versions[e.data.caseId] ?? -1) > e.version) return s;
      return { ...s, cases: { ...s.cases, [e.data.caseId]: e.data }, versions: { ...s.versions, [e.data.caseId]: e.version } };
    }
    case "restart":
      return { ...s, restart: e.data };
    case "message":
      if (s.messages.some((m) => m.id === e.data.id)) return s;
      return { ...s, messages: [...s.messages, e.data].sort((x, y) => x.at.localeCompare(y.at)) };
    case "sample":
      return { ...s, sample: e.data };
    case "hello":
      return s;
  }
}

export const FIXTURE = new URLSearchParams(location.search).get("fixture") === "1";

export function useLive(): LiveState {
  const [state, dispatch] = useReducer(reduce, undefined, initial);
  useEffect(() => {
    if (FIXTURE) {
      // Fixture data is a separate chunk, loaded only when asked for.
      let stop = () => {};
      import("./fixture.ts").then((m) => {
        dispatch({ type: "bridge", state: "live" });
        stop = m.playFixture((event) => dispatch({ type: "event", event }));
      });
      return () => stop();
    }
    const es = new EventSource("/api/stream");
    es.onopen = () => {
      // The bridge sends a full snapshot on every connect.
      dispatch({ type: "reset" });
      dispatch({ type: "bridge", state: "live" });
    };
    es.onerror = () => dispatch({ type: "bridge", state: "connecting" });
    es.onmessage = (m) => dispatch({ type: "event", event: JSON.parse(m.data) as StreamEvent });
    return () => es.close();
  }, []);
  return state;
}

// A one-second clock for "checked N s ago". The value is computed from real times.
export function useNow(): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export function clock(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toTimeString().slice(0, 8);
}
