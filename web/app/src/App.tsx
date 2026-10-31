import { useEffect, useState } from "react";
import { CaseView } from "./components/CaseView.tsx";
import { Landing } from "./components/Landing.tsx";
import { Headline } from "./components/Headline.tsx";
import { Nav } from "./components/Nav.tsx";
import { StartScreen } from "./components/StartScreen.tsx";
import { isLive, sinceText, WatcherChip } from "./components/WatcherChip.tsx";
import { isFixture, useLive, useNow } from "./live.ts";
import { activeCase, caseMessages, notAffected, unstructured } from "./model.ts";

const SPONSORS = [
  ["Terse", "terse.png"],
  ["Agent Relay", "agentrelay.svg"],
  ["Mastra", "mastra.png"],
  ["Freestyle", "freestyle.png"],
  ["OpenAI", ""],
];

export function App() {
  const [demo, setDemo] = useState(() => window.location.hash === "#demo" || isFixture());
  useEffect(() => {
    const sync = () => setDemo(window.location.hash === "#demo" || isFixture());
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  const s = useLive();
  const now = useNow();
  const c = activeCase(s);
  const quiet = notAffected(s);
  const terseEver = !!s.sources.terse?.lastDataAt || !!s.watcher;

  let body;
  if (!terseEver || (!s.watcher && !c)) {
    body = <Headline text={`No live data from Terse since ${sinceText(s, "terse")}.`} dek="The bridge keeps retrying the watcher. This page fills in as soon as it answers." />;
  } else if (!c) {
    body = <StartScreen watcher={s.watcher} now={now} others={quiet.length} />;
  } else {
    const msgs = [...caseMessages(s, c.caseId), ...unstructured(s)].sort((x, y) => x.at.localeCompare(y.at));
    body = <CaseView c={c} msgs={msgs} others={quiet.length} relayLive={isLive(s, "relay")} relaySince={sinceText(s, "relay")} />;
  }

  return (
    <div className="page">
      {isFixture() && <div className="fixture-banner">FIXTURE DATA · not live · remove ?fixture=1 for the real demo</div>}
      <Nav demo={demo} onHow={() => { window.location.hash = ""; }} />
      {demo ? <><WatcherChip s={s} now={now} />{body}</> : <Landing onDemo={() => { window.location.hash = "demo"; }} />}
      <footer className="built">
        <span>Built with</span>
        {SPONSORS.map(([name, logo]) => (
          <b key={name}>{logo && <img src={`/logos/${logo}`} alt="" />}{name}</b>
        ))}
      </footer>
    </div>
  );
}
