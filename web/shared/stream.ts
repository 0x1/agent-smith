// What the bridge sends the page over `GET /api/stream`. Every event is
// `{source, kind, data, version, at}`; the page never talks to Terse, Relay or
// the supplier directly.
import type { Case, WatcherState } from "../../contracts/case.ts";
import type { RelayMessage } from "../../contracts/relay.ts";

export type SourceName = "terse" | "relay" | "supplier";
export type SourceState = "live" | "connecting" | "down";

export interface SourceStatus {
  state: SourceState;
  // When this state began.
  since: string;
  // The last time this source sent real data. Null if it never has.
  lastDataAt: string | null;
  detail?: string;
}

export interface RelayEntry {
  id: string;
  from: string;
  at: string;
  text: string;
  // Null when the text is not a `RelayMessage`. The page shows it raw, labelled "unstructured".
  parsed: RelayMessage | null;
  threadId?: string;
}

export interface Restart {
  at: string;
  oldPid: number | null;
  newPid: number;
  probeCount: number;
  // True when the new process reports at least as many checks as before it died.
  intact: boolean;
}

// The supplier's current response for one SKU, fetched live from supplier-mock.
export interface SupplierSample {
  version: string;
  path: string;
  body: unknown;
}

interface Base<S extends SourceName | "bridge", K extends string, D> {
  source: S;
  kind: K;
  data: D;
  version: number;
  at: string;
}

export type StreamEvent =
  | Base<SourceName, "status", SourceStatus>
  | Base<"terse", "watcher", WatcherState>
  | Base<"terse", "case", Case>
  | Base<"terse", "restart", Restart>
  | Base<"relay", "message", RelayEntry>
  | Base<"supplier", "sample", SupplierSample>
  | Base<"bridge", "hello", { startedAt: string; pid: number }>;
