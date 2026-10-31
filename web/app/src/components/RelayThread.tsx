import type { RelayMessage as Message } from "../../../../contracts/relay.ts";
import type { RelayEntry } from "../../../shared/stream.ts";
import { clock } from "../format.ts";
import { roleOf, sentBackAttempts, splitDeliberate, type Role } from "../model.ts";

const TO: Record<Message["type"], string> = {
  "repair.requested": "Fixer",
  "repair.proposed": "Verifier",
  "verification.result": "Fixer",
  "escalation.needed": "you",
};

const PEOPLE: Record<Role, [string, string]> = {
  observer: ["W", "Watcher"],
  repair: ["F", "Fixer"],
  verifier: ["V", "Verifier"],
  other: ["?", ""],
};

export function RelayMessage({ m, sentBack }: { m: RelayEntry; sentBack: Set<number> }) {
  const role = roleOf(m);
  const [letter, who] = PEOPLE[role];
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
  // Who it's for follows from what it is, whoever posted it.
  const to = TO[p.type];
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

function Attempts({ msgs }: { msgs: RelayEntry[] }) {
  const sentBack = sentBackAttempts(msgs);
  const multi = new Set(msgs.map((m) => m.parsed?.attempt).filter((a) => a !== undefined && a > 0)).size > 1;
  const rows: React.ReactNode[] = [];
  let attempt: number | null = null;
  for (const m of msgs) {
    const a = m.parsed?.attempt;
    if (multi && a !== undefined && a > 0 && a !== attempt) {
      attempt = a;
      rows.push(<div key={`a${a}`} className="attempt">attempt {a}{sentBack.has(a) ? " · sent back" : ""}</div>);
    }
    rows.push(<RelayMessage key={m.id} m={m} sentBack={sentBack} />);
  }
  return <>{rows}</>;
}

// The labelled demo patch, kept apart from the real repair. The `say` text shows verbatim.
function Deliberate({ msgs }: { msgs: RelayEntry[] }) {
  return (
    <div className="deliberate enter">
      <div className="hd2"><span className="tag no">Deliberately bad patch</span><span>a labelled test of the verifier, not the real repair</span></div>
      <Attempts msgs={msgs} />
    </div>
  );
}

// The agents' conversation for one case, grouped by attempt. Rejected attempts stay visible.
export function RelayThread({ msgs, live, since }: { msgs: RelayEntry[]; live: boolean; since: string }) {
  const { real, deliberate } = splitDeliberate(msgs);
  return (
    <div className="card chat">
      <div className="hd"><b>Agent Relay</b><span>the agents, talking</span></div>
      {!live && <p className="empty no">✕ No live data from Agent Relay since {since}.</p>}
      {real.length ? <Attempts msgs={real} /> : live && <p className="empty">The agents' conversation appears here as it happens.</p>}
      {deliberate.length > 0 && <Deliberate msgs={deliberate} />}
    </div>
  );
}
