import { useState } from "react";
import type { RelayEntry } from "../../../shared/stream.ts";
import { counts, deliberateRejection, rejectedNow, siteName, steps as buildSteps, thisRun, type StepKey } from "../model.ts";
import type { LiveCase, Proof } from "../types.ts";
import { Evidence } from "./Evidence.tsx";
import { RelayThread } from "./RelayThread.tsx";
import { ReviewButton } from "./ReviewButton.tsx";
import { StepStack } from "./StepStack.tsx";

const plain = (path: string) => (path.split(".").pop() ?? path).replaceAll("_", " ");

// Field paths, without a parent that is listed along with its own children.
function leaves(paths: string[]): string[] {
  return paths.filter((p) => !paths.some((q) => q.startsWith(`${p}.`)));
}

// A diff reduced to the lines that changed.
function changedLines(diff: string): string {
  return diff.split("\n").filter((line) => /^[-+](?![-+])/.test(line)).join("\n") || diff;
}

const fmt = (n: number) => (n < 0 ? `−${Math.abs(n)}` : String(n));

function Sell({ proof }: { proof: Proof }) {
  const wrong = proof.result !== proof.expected;
  return (
    <div className={`sell${wrong ? " wrong" : ""}`}>
      <span className="k">You can sell</span>
      <span className="math" aria-label={`${proof.onHand} minus ${proof.reserved} equals ${proof.result}`}>
        {proof.onHand} − {proof.reserved} = <b>{fmt(proof.result)}</b>
        {wrong && <em> should be {fmt(proof.expected)}</em>}
      </span>
    </div>
  );
}

function WhatChanged({ c }: { c: LiveCase }) {
  const d = c.change.shapeDiff;
  const before = leaves(d.removed.concat(d.retyped)).map(plain);
  const now = leaves(d.added.concat(d.retyped)).map(plain);
  return (
    <section className="panel">
      <h2>What changed</h2>
      <dl>
        <div><dt>Before</dt><dd>{before.join(", ") || "—"}</dd></div>
        <div><dt>Now</dt><dd>{now.join(", ") || "—"}</dd></div>
      </dl>
      {c.proof && <Sell proof={c.proof} />}
    </section>
  );
}

type Mark = "ok" | "no" | "wait";

function Row({ mark, label, value }: { mark: Mark; label: string; value: string }) {
  return (
    <li className={mark}>
      <span className="m" aria-hidden>{mark === "ok" ? "✓" : mark === "no" ? "✕" : "·"}</span>
      <span>{label}</span>
      <b>{value}</b>
    </li>
  );
}

function WhatWeDid({ c, others, sentBack }: { c: LiveCase; others: number; sentBack: boolean }) {
  const pass = (exitCode: number | undefined): Mark => (exitCode === undefined ? "wait" : exitCode === 0 ? "ok" : "no");
  return (
    <section className="panel">
      <h2>What we did</h2>
      <ul className="did">
        <Row mark={c.verdict ? "ok" : "wait"} label="Found the code" value={siteName(c) || "Looking"} />
        <Row mark={c.before ? "ok" : "wait"} label="Saw it break" value={c.before ? `${counts(c.before)} tests passing` : "Waiting"} />
        <Row mark={sentBack ? "no" : pass(c.after?.exitCode)} label="Your tests" value={c.after ? counts(c.after) : "Waiting"} />
        <Row mark={sentBack ? "no" : pass(c.regression?.exitCode)} label="Hidden checks" value={c.regression ? counts(c.regression) : "Waiting"} />
        <Row mark="ok" label="Other changes" value={others ? `${others}, no impact` : "None"} />
      </ul>
    </section>
  );
}

function Drawer({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <>
      <button className="scrim" aria-label="Close" onClick={onClose} />
      <aside className="drawer" aria-label="How we know">
        <div className="drawer-head">
          <h2>How we know</h2>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
        {children}
      </aside>
    </>
  );
}

export function CaseView({ c, msgs, others, relayLive, relaySince }: { c: LiveCase; msgs: RelayEntry[]; others: number; relayLive: boolean; relaySince: string }) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<StepKey | null>(null);
  const run = thisRun(c, msgs);
  const st = buildSteps(c, run);
  const bad = deliberateRejection(run);
  const step = st.find((x) => x.key === picked);
  const approved = c.status === "approved" && c.approval.by;
  return (
    <div className="case">
      <header className="case-head">
        <div>
          <h1 className="h enter" key={c.headline}>{c.headline}</h1>
          <p className="dek">Your supplier changed how it reports {plain(c.change.fieldPath)}.</p>
        </div>
        {approved && <p className="approved ok">✓ Approved by {c.approval.by} · nothing merged or deployed</p>}
      </header>
      <StepStack steps={st} onPick={(step) => { setPicked(step.key); setOpen(true); }} />
      <ReviewButton c={c} />
      {bad && <p className="notice">{bad.say || bad.reason}</p>}
      <div className="panels">
        <WhatChanged c={c} />
        <WhatWeDid c={c} others={others} sentBack={!!rejectedNow(c, run)} />
      </div>
      <button className="how-link" onClick={() => { setPicked(null); setOpen(true); }}>See how we know ›</button>
      {open && (
        <Drawer onClose={() => setOpen(false)}>
          {step && (
            <section className="panel step-detail">
              <h2>{step.name}</h2>
              <p>{step.what}</p>
              {step.detail && <pre>{step.key === "fixed" ? changedLines(step.detail) : step.detail}</pre>}
            </section>
          )}
          {(!step || step.key === "fixed" || step.key === "proved") && <RelayThread msgs={run} live={relayLive} since={relaySince} />}
          <Evidence steps={st} />
        </Drawer>
      )}
    </div>
  );
}
