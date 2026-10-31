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
  ["Terse", "terse.png", "https://www.useterse.ai/"],
  ["Agent Relay", "agentrelay.svg", "https://agentrelay.com/"],
  ["Mastra", "mastra.png", "https://mastra.ai/"],
  ["Freestyle", "freestyle.png", "https://www.freestyle.sh/"],
  ["OpenAI", "openai.png", "https://openai.com/"],
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
      <Nav demo={demo} onHow={() => { window.location.hash = ""; }} onTry={() => { window.location.hash = "demo"; }} />
      {demo ? <><WatcherChip s={s} now={now} />{body}</> : <Landing />}
      <footer className="built">
        <span>Built with</span>
        {SPONSORS.map(([name, logo, url]) => (
          <a key={name} href={url} target="_blank" rel="noreferrer"><img src={`/logos/${logo}`} alt="" />{name}</a>
        ))}
      </footer>
    </div>
  );
}
