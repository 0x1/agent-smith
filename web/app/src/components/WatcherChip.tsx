import type { SourceName, SourceStatus } from "../../../shared/stream.ts";
import { clock, type LiveState } from "../live.ts";

const LABEL: Record<SourceName, string> = { terse: "Terse", relay: "Agent Relay", supplier: "Supplier" };
// The restart chip shows for this long after a real restart, then the normal chip returns.
const RESTART_MS = 45_000;

export function sinceText(s: LiveState, source: SourceName): string {
  const st = s.sources[source];
  return st?.lastDataAt ? clock(st.lastDataAt) : `the page opened at ${clock(s.openedAt)}`;
}

export function isLive(s: LiveState, source: SourceName): boolean {
  return s.bridge === "live" && s.sources[source]?.state === "live";
}

function SourceChip({ s, source, extra }: { s: LiveState; source: SourceName; extra?: string }) {
  const st: SourceStatus | null = s.sources[source];
  const state = s.bridge === "live" ? st?.state ?? "connecting" : "connecting";
  const word = state === "live" ? "✓ live" : state === "connecting" ? "… connecting" : "✕ down";
  return (
    <span className="chip small" title={st?.detail}>
      <span className={`d ${state}`} />{LABEL[source]}{extra ? ` ${extra}` : ""} · {word}
    </span>
  );
}

export function WatcherChip({ s, now }: { s: LiveState; now: number }) {
  const w = s.watcher;
  const r = s.restart;
  let main;
  if (!isLive(s, "terse") || !w) {
    main = <span className="chip nolive">✕ No live data from Terse since {sinceText(s, "terse")}</span>;
  } else if (r && now - new Date(r.at).getTime() < RESTART_MS) {
    main = (
      <span className="chip restart enter">
        ↻ Restarted the watcher at {clock(r.at)} · pid {r.oldPid ?? "?"} → {r.newPid} · {r.intact ? "state intact" : "state reloaded"} · {w.probeCount} checks
      </span>
    );
  } else {
    const ago = w.lastProbeAt ? Math.max(0, Math.round((now - new Date(w.lastProbeAt).getTime()) / 1000)) : null;
    main = (
      <span className="chip">
        <span className="d" />Watcher · Terse durable actor · {ago === null ? "no check yet" : `checked ${ago} s ago`} · {w.probeCount} checks
      </span>
    );
  }
  return (
    <div className="chips">
      {main}
      <SourceChip s={s} source="relay" />
      <SourceChip s={s} source="supplier" extra={s.sample?.version} />
      {s.bridge !== "live" && <span className="chip nolive">✕ The page lost the bridge · reconnecting</span>}
    </div>
  );
}
