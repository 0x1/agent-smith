import type { Case, WatcherState } from "../../../contracts/case.ts";
import type { RelayEntry, Restart, SourceName, SourceStatus, SupplierSample } from "../../shared/stream.ts";

// Mirrors `Proof` on `cto-1/wire-watcher`. Delete this and use `Case` directly
// once that branch merges and `Case.proof` exists on main.
export interface Proof {
  sku: string;
  onHand: number;
  reserved: number;
  result: number;
  expected: number;
}
export type LiveCase = Case & { proof?: Proof | null };

// The watcher actor also emits the response shape it has stored, as
// `{ "inventory.on_hand": "number", ... }`. It is not in the contract yet, so it is optional here.
export type LiveWatcher = WatcherState & { shape?: Record<string, string> };

export interface LiveState {
  bridge: "live" | "connecting";
  openedAt: string;
  sources: Record<SourceName, SourceStatus | null>;
  watcher: LiveWatcher | null;
  cases: Record<string, LiveCase>;
  versions: Record<string, number>;
  messages: RelayEntry[];
  restart: Restart | null;
  sample: SupplierSample | null;
}
