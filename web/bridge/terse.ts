// Live state from the Terse actors: the watcher, and every case it lists.
import type { Case, WatcherState } from "../../contracts/case.ts";
import { config } from "./config.ts";
import { FIRST_DELAY, gateCase, gateWatcher, nextDelay, unwrapState } from "./gate.ts";
import { type Hub, log } from "./hub.ts";

const { terse } = config;
const actorUrl = (cls: string, id: string) => `${terse.url}/v1/projects/${terse.project}/actors/${cls}/${encodeURIComponent(id)}`;

export async function invoke(cls: string, id: string, method: string, args: unknown[] = []) {
  const res = await fetch(`${actorUrl(cls, id)}/invoke`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ requestId: crypto.randomUUID(), method, args }),
  });
  return { status: res.status, body: (await res.json().catch(() => null)) as unknown };
}

interface Handlers {
  onFrame(state: unknown, version: number, reconnected: boolean): void;
  onClose?(): void;
  onDown?(): void;
}

// One websocket per actor. On close it retries `find-websocket` with backoff from
// 250 ms to 2 s, which carries the page through a `kill -9` of the actor server.
function follow(cls: string, id: string, h: Handlers) {
  let delay = FIRST_DELAY;
  let failingSince: number | null = null;
  let hadSocket = false;

  const retry = () => {
    failingSince ??= Date.now();
    if (Date.now() - failingSince > config.downAfterMs) h.onDown?.();
    setTimeout(connect, delay);
    delay = nextDelay(delay);
  };

  const connect = async () => {
    let url = "";
    try {
      const res = await fetch(`${actorUrl(cls, id)}/find-websocket`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ metadata: null }),
      });
      const body = (await res.json()) as { websocketUrl?: string };
      url = body.websocketUrl ?? "";
      if (!res.ok || !url) throw new Error(`find-websocket ${res.status}`);
    } catch (err) {
      if (failingSince === null) log(`${cls}/${id}: ${String(err)}`);
      return retry();
    }
    const ws = new WebSocket(url);
    const reconnecting = hadSocket;
    hadSocket = true;
    let first = true;
    ws.onmessage = (ev) => {
      let frame: { type?: string; state?: unknown; version?: number };
      try {
        frame = JSON.parse(String(ev.data));
      } catch {
        return;
      }
      if (frame.type !== "state") return;
      delay = FIRST_DELAY;
      failingSince = null;
      h.onFrame(frame.state, Number(frame.version ?? 0), first && reconnecting);
      first = false;
    };
    ws.onclose = () => {
      h.onClose?.();
      retry();
    };
  };

  void connect();
}

export function startTerse(hub: Hub) {
  const following = new Set<string>();

  const followCase = (id: string) => {
    if (following.has(id)) return;
    following.add(id);
    follow(terse.caseClass, id, {
      onFrame(state, version, reconnected) {
        const data = unwrapState<Case>(state);
        if (!data || !gateCase(hub.cases.get(id)?.version, version, reconnected)) return;
        hub.putCase(data, version);
      },
    });
  };

  follow(terse.watcherClass, terse.watcherId, {
    onClose: () => hub.setStatus("terse", "connecting", "watcher socket closed; reconnecting"),
    onDown: () => hub.setStatus("terse", "down", `${terse.watcherClass}/${terse.watcherId} not reachable at ${terse.url}`),
    onFrame(state, version, reconnected) {
      const data = unwrapState<WatcherState>(state);
      if (!data) return;
      const prev = hub.watcher ? { version: hub.watcher.version, pid: hub.watcher.data.pid, probeCount: hub.watcher.data.probeCount } : null;
      const verdict = gateWatcher(prev, { version, pid: data.pid, probeCount: data.probeCount, reconnected });
      if (!verdict.accept) return;
      if (verdict.restart) hub.putRestart({ at: new Date().toISOString(), ...verdict.restart, probeCount: data.probeCount });
      hub.putWatcher(data, version);
      data.caseIds.forEach(followCase);
    },
  });

  terse.extraCaseIds.forEach(followCase);
}
