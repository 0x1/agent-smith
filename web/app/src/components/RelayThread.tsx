import type { RelayEntry } from "../../../shared/stream.ts";
import { clock } from "../live.ts";
import { roleOf, sentBackAttempts, type Role } from "../model.ts";

const PEOPLE: Record<Role, [string, string, string]> = {
  observer: ["W", "Watcher", "Fixer"],
  repair: ["F", "Fixer", "Verifier"],
  verifier: ["V", "Verifier", "Fixer"],
  other: ["?", "", ""],
};

export function RelayMessage({ m, sentBack }: { m: RelayEntry; sentBack: Set<number> }) {
  const role = roleOf(m);
  const [letter, who, to] = PEOPLE[role];
  const p = m.parsed;
  if (!p) {
    return (
      <div className="msg enter">
        <span className={`av ${role}`}>{letter}</span>
        <div>
          <div className="who"><b>{m.from || "unknown"}</b> <span className="tag raw">unstructured</span><span className="t">{clock(m.at)}</span></div>
          <div className="tx raw">{m.text}</div>
        </div>
      </div>
    );
  }
  const rejected = p.type === "verification.result" && p.decision === "reject";
  const gone = p.type === "repair.proposed" && sentBack.has(p.attempt);
  let tag = null;
  if (p.type === "verification.result") tag = rejected ? <span className="tag no">✕ Sent back</span> : <span className="tag yes">✓ Accepted</span>;
  else if (p.type === "escalation.needed") tag = <span className="tag no">✕ Needs a person</span>;
  else if (gone) tag = <span className="tag back">sent back</span>;
  return (
    <div className={`msg enter${gone ? " gone" : ""}${rejected ? " no" : ""}`}>
      <span className={`av ${role}`}>{letter}</span>
      <div>
        <div className="who"><b>{who || m.from}</b>{to && ` → ${to}`} {tag}<span className="t">{clock(p.at || m.at)}</span></div>
        <div className="tx">{p.say || ("reason" in p ? p.reason : "") || ("summary" in p ? p.summary : "")}</div>
      </div>
    </div>
  );
}

// The agents' conversation for one case, grouped by attempt. Rejected attempts stay visible.
export function RelayThread({ msgs, live, since }: { msgs: RelayEntry[]; live: boolean; since: string }) {
  const sentBack = sentBackAttempts(msgs);
  const rows: React.ReactNode[] = [];
  let attempt: number | null = null;
  const multi = new Set(msgs.map((m) => m.parsed?.attempt).filter((a) => a !== undefined && a > 0)).size > 1;
  for (const m of msgs) {
    const a = m.parsed?.attempt;
    if (multi && a !== undefined && a > 0 && a !== attempt) {
      attempt = a;
      rows.push(<div key={`a${a}`} className="attempt">attempt {a}{sentBack.has(a) ? " · sent back" : ""}</div>);
    }
    rows.push(<RelayMessage key={m.id} m={m} sentBack={sentBack} />);
  }
  return (
    <div className="card chat">
      <div className="hd"><b>Agent Relay</b><span>the agents, talking</span></div>
      {!live && <p className="empty no">✕ No live data from Agent Relay since {since}.</p>}
      {rows.length ? rows : live && <p className="empty">The agents' conversation appears here as it happens.</p>}
    </div>
  );
}
