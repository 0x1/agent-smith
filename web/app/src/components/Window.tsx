import type { RelayEntry } from "../../../shared/stream.ts";
import type { LiveCase } from "../types.ts";
import { counts, rejectedNow, siteName } from "../model.ts";
import { Arithmetic } from "./Arithmetic.tsx";
import { RelayThread } from "./RelayThread.tsx";

// The current step's proof, visible without a click.
function ProofCard({ c, msgs }: { c: LiveCase; msgs: RelayEntry[] }) {
  const rejection = rejectedNow(c, msgs);
  const late = rejection || ["repaired", "awaiting_approval", "approved", "rejected"].includes(c.status);
  if (late && c.proof) {
    const wrong = c.proof.result !== c.proof.expected;
    return (
      <Arithmetic proof={c.proof}>
        {wrong ? (
          <><span className="no">✕ Expected {c.proof.expected}.</span> {rejection?.say ?? "The verifier sent this attempt back."}</>
        ) : (
          <>on hand − reserved, never below 0
            {c.after && <> · <span className="ok">✓ your test {counts(c.after)}</span></>}
            {c.regression && <> · <span className={c.regression.exitCode === 0 ? "ok" : "no"}>{c.regression.exitCode === 0 ? "✓" : "✕"} {counts(c.regression)} hidden checks</span></>}
          </>
        )}
      </Arithmetic>
    );
  }
  if (late && (c.after || c.regression)) {
    const r = c.regression;
    const ok = !rejection && (!r || r.exitCode === 0);
    return (
      <div className="card proof enter">
        <div className="lbl">{rejection ? "The verifier's checks" : "The checks, on the fixed code"}</div>
        <div className={`sum${ok ? "" : " wrong"}`}><span className="n mid">{r ? `${ok ? "✓" : "✕"} ${counts(r)} hidden checks` : `✓ your test ${counts(c.after)}`}</span></div>
        <div className="gl">
          {r?.failure ? <span className="no">✕ {r.failure.test}: expected {r.failure.expected}, got {r.failure.actual}</span>
            : c.after && <span className="ok">✓ your test {counts(c.after)}</span>}
        </div>
      </div>
    );
  }
  const f = c.before?.failure;
  if (c.verdict && f) {
    return (
      <div className="card proof enter">
        <div className="lbl">{siteName(c)}{c.callSite?.functionName ? ` · ${c.callSite.path}:${c.callSite.line}` : ""}</div>
        <div className="sum wrong"><span className="n mid">expected {f.expected}, got {f.actual}</span></div>
        <div className="gl">Your test fails on the new response: <span className="mono">{f.test}</span></div>
      </div>
    );
  }
  const d = c.change.shapeDiff;
  return (
    <div className="card proof enter">
      <div className="lbl">The supplier's response changed · {c.change.endpoint}</div>
      <div className="shape">
        {d.removed.map((x) => <div key={`r${x}`} className="del">− {x}</div>)}
        {d.added.map((x) => <div key={`a${x}`}>+ {x}</div>)}
        {d.retyped.map((x) => <div key={`t${x}`}>~ {x}</div>)}
      </div>
      <div className="gl">{c.explanation}</div>
    </div>
  );
}

export function Window({ c, msgs, relayLive, relaySince, waiting }: { c: LiveCase; msgs: RelayEntry[]; relayLive: boolean; relaySince: string; waiting: boolean }) {
  return (
    <div className={`win${waiting ? " waiting" : ""}`}>
      <ProofCard c={c} msgs={msgs} />
      <RelayThread msgs={msgs} live={relayLive} since={relaySince} />
    </div>
  );
}
