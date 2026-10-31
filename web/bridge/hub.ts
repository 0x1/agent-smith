// The bridge's view of the world, and the SSE clients it streams to. Every
// change goes through here so a new client always gets a complete snapshot.
import type { Case, WatcherState } from "../../contracts/case.ts";
import type { RelayEntry, Restart, SourceName, SourceStatus, StreamEvent, SupplierSample } from "../shared/stream.ts";

type Client = ReadableStreamDefaultController<Uint8Array>;
type Outgoing = Omit<StreamEvent, "at">;

const now = () => new Date().toISOString();
export const log = (...a: unknown[]) => console.log(new Date().toTimeString().slice(0, 8), ...a);

export class Hub {
  readonly startedAt = now();
  readonly sources: Record<SourceName, SourceStatus> = {
    terse: { state: "connecting", since: now(), lastDataAt: null },
    relay: { state: "connecting", since: now(), lastDataAt: null },
    supplier: { state: "connecting", since: now(), lastDataAt: null },
  };
  watcher: { data: WatcherState; version: number } | null = null;
  readonly cases = new Map<string, { data: Case; version: number }>();
  readonly messages = new Map<string, RelayEntry>();
  restart: Restart | null = null;
  sample: SupplierSample | null = null;

  #clients = new Set<Client>();
  #enc = new TextEncoder();

  #send(c: Client, e: StreamEvent) {
    try {
      c.enqueue(this.#enc.encode(`data: ${JSON.stringify(e)}\n\n`));
    } catch {
      this.#clients.delete(c);
    }
  }

  #broadcast(e: Outgoing) {
    const full = { ...e, at: now() } as StreamEvent;
    for (const c of this.#clients) this.#send(c, full);
  }

  addClient(c: Client) {
    this.#clients.add(c);
    for (const e of this.snapshot()) this.#send(c, e);
  }

  removeClient(c: Client) {
    this.#clients.delete(c);
  }

  snapshot(): StreamEvent[] {
    const at = now();
    const out: StreamEvent[] = [{ source: "bridge", kind: "hello", data: { startedAt: this.startedAt, pid: process.pid }, version: 0, at }];
    for (const s of Object.keys(this.sources) as SourceName[]) out.push({ source: s, kind: "status", data: this.sources[s], version: 0, at });
    if (this.watcher) out.push({ source: "terse", kind: "watcher", data: this.watcher.data, version: this.watcher.version, at });
    for (const c of this.cases.values()) out.push({ source: "terse", kind: "case", data: c.data, version: c.version, at });
    if (this.restart) out.push({ source: "terse", kind: "restart", data: this.restart, version: 0, at });
    if (this.sample) out.push({ source: "supplier", kind: "sample", data: this.sample, version: 0, at });
    for (const m of this.messages.values()) out.push({ source: "relay", kind: "message", data: m, version: 0, at });
    return out;
  }

  setStatus(source: SourceName, state: SourceStatus["state"], detail?: string) {
    const cur = this.sources[source];
    if (cur.state === state && cur.detail === detail) return;
    if (cur.state !== state) log(`${source}: ${state}${detail ? ` (${detail})` : ""}`);
    this.sources[source] = { state, since: cur.state === state ? cur.since : now(), lastDataAt: cur.lastDataAt, detail };
    this.#broadcast({ source, kind: "status", data: this.sources[source], version: 0 });
  }

  #gotData(source: SourceName) {
    this.sources[source] = { ...this.sources[source], lastDataAt: now() };
    this.setStatus(source, "live");
  }

  putWatcher(data: WatcherState, version: number) {
    this.watcher = { data, version };
    this.#gotData("terse");
    this.#broadcast({ source: "terse", kind: "watcher", data, version });
  }

  putRestart(restart: Restart) {
    this.restart = restart;
    log(`watcher restarted: pid ${restart.oldPid} → ${restart.newPid}, ${restart.probeCount} checks`);
    this.#broadcast({ source: "terse", kind: "restart", data: restart, version: 0 });
  }

  putCase(data: Case, version: number) {
    this.cases.set(data.caseId, { data, version });
    this.#gotData("terse");
    this.#broadcast({ source: "terse", kind: "case", data, version });
  }

  putMessage(entry: RelayEntry) {
    if (this.messages.has(entry.id)) return;
    this.messages.set(entry.id, entry);
    this.#gotData("relay");
    this.#broadcast({ source: "relay", kind: "message", data: entry, version: 0 });
  }

  putSample(sample: SupplierSample) {
    const changed = JSON.stringify(sample) !== JSON.stringify(this.sample);
    this.sample = sample;
    this.#gotData("supplier");
    if (changed) this.#broadcast({ source: "supplier", kind: "sample", data: sample, version: 0 });
  }

  health() {
    return {
      ok: true,
      startedAt: this.startedAt,
      sources: this.sources,
      watcher: this.watcher?.data ?? null,
      cases: [...this.cases.values()].map((c) => ({ caseId: c.data.caseId, status: c.data.status, version: c.version })),
      messages: this.messages.size,
      restart: this.restart,
    };
  }
}
