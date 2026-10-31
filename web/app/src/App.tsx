import { Evidence } from "./components/Evidence.tsx";
import { Footnotes } from "./components/Footnotes.tsx";
import { Headline } from "./components/Headline.tsx";
import { Nav } from "./components/Nav.tsx";
import { ReviewButton } from "./components/ReviewButton.tsx";
import { StepStack } from "./components/StepStack.tsx";
import { isLive, sinceText, WatcherChip } from "./components/WatcherChip.tsx";
import { Window } from "./components/Window.tsx";
import { clock, outlineFromPaths, outlineOf, printOutline } from "./format.ts";
import { isFixture, useLive, useNow } from "./live.ts";
import { activeCase, caseMessages, notAffected, steps, unstructured } from "./model.ts";
import type { LiveState } from "./types.ts";

// The response shape the watcher has stored, or failing that the supplier's live response.
function QuietWindow({ s }: { s: LiveState }) {
  const w = s.watcher;
  const stored = w?.shape && Object.keys(w.shape).length ? w.shape : null;
  if (!stored && (!isLive(s, "supplier") || !s.sample)) {
    return (
      <div className="win"><span className="spark" aria-hidden>✱</span>
        <div className="card nolive-card"><b>✕ No live data from the supplier since {sinceText(s, "supplier")}.</b></div>
      </div>
    );
  }
  const label = stored ? `The shape the watcher has stored · ${w?.endpoint || "GET /v1/inventory/{sku}"}` : `What the supplier sends now · GET ${s.sample?.path}`;
  const outline = stored ? outlineFromPaths(stored) : outlineOf(s.sample?.body);
  return (
    <div className="win"><span className="spark" aria-hidden>✱</span>
      <div className="card spec enter">
        <div className="lbl">{label}</div>
        <pre>{printOutline(outline)}</pre>
        {w && w.probeCount > 0 && (
          <div className="gl">
            {w.lastChangeAt
              ? <>{w.probeCount} checks so far. Last change seen at {clock(w.lastChangeAt)}.</>
              : <>Same shape for <b>{w.probeCount}</b> checks.</>}
          </div>
        )}
      </div>
    </div>
  );
}

export function App() {
  const s = useLive();
  const now = useNow();
  const c = activeCase(s);
  const quiet = notAffected(s);
  const terseEver = !!s.sources.terse?.lastDataAt || !!s.watcher;

  let body;
  if (!terseEver || (!s.watcher && !c)) {
    body = (
      <div className="grid">
        <div>
          <Headline text={`No live data from Terse since ${sinceText(s, "terse")}.`} dek="The bridge keeps retrying the watcher. This page fills in as soon as it answers." />
        </div>
        <QuietWindow s={s} />
      </div>
    );
  } else if (!c) {
    body = (
      <div className="grid">
        <div>
          <h1 className="h quiet enter">All quiet.</h1>
          <p className="dek quiet">The watcher checks your supplier's inventory endpoint on a timer. When the shape of its response changes, the case opens here.</p>
          <Footnotes quiet={quiet} active={null} />
        </div>
        <QuietWindow s={s} />
      </div>
    );
  } else {
    const msgs = [...caseMessages(s, c.caseId), ...unstructured(s)].sort((x, y) => x.at.localeCompare(y.at));
    const st = steps(c, msgs);
    const waiting = c.status === "awaiting_approval" && !!c.pr;
    body = (
      <div className="grid">
        <div>
          <Headline text={c.headline} />
          <StepStack steps={st} waiting={waiting} />
          <ReviewButton c={c} />
          <Evidence steps={st} />
          <Footnotes quiet={quiet} active={c} />
        </div>
        <Window c={c} msgs={msgs} relayLive={isLive(s, "relay")} relaySince={sinceText(s, "relay")} waiting={waiting} />
      </div>
    );
  }

  return (
    <div className="page">
      {isFixture() && <div className="fixture-banner">FIXTURE DATA · not live · remove ?fixture=1 for the real demo</div>}
      <Nav />
      <WatcherChip s={s} now={now} />
      {body}
    </div>
  );
}
