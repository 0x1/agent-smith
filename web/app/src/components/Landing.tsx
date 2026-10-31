import { useEffect, useState } from "react";

const ICONS: React.ReactNode[] = [
  <><path d="M6 4h9l3 3v13H6z" /><path d="M15 4v3h3" /><path d="M9 12h6M9 16h6" /></>,
  <><circle cx="11" cy="11" r="6" /><path d="M20 20l-4.5-4.5" /></>,
  <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></>,
  <><path d="M14 6a4 4 0 0 0 5 5l-9 9a2.8 2.8 0 0 1-4-4z" /><path d="M14 6l3-3" /></>,
  <><circle cx="8" cy="6" r="2.5" /><circle cx="8" cy="18" r="2.5" /><circle cx="17" cy="12" r="2.5" /><path d="M8 8.5v7M10 6h3a4 4 0 0 1 4 4" /></>,
  <><circle cx="12" cy="12" r="9" /><path d="M8.5 14a4 4 0 0 0 7 0" /><path d="M9 9.5h.01M15 9.5h.01" /></>,
];

const STEPS = [
  { title: "Add your repo", say: "Connect the app you want to keep working." },
  { title: "Find its APIs", say: "We read your code and list the APIs it calls and the fields it reads." },
  { title: "Watch for changes", say: "A supplier changes its API. Our watcher sees the new response within seconds." },
  { title: "Fix and prove it", say: "Agents write the fix in a sandbox. A separate verifier proves it with tests they can't edit." },
  { title: "Review and merge", say: "You get a normal pull request. Nothing merges until a person approves." },
  { title: "Happy customers", say: "Your app keeps working, and nobody gets paged." },
];

const X = STEPS.map((_, i) => 116 + i * 233.6);
const Y = 74;
const R = 50;
const STEP_MS = 2200;

// The link between an app and its API, drawn as one line. It breaks when the API
// changes (between Watch and Fix), and the rest of the line is the repair.
function segment(i: number): string {
  const a = X[i] + R + 8;
  const b = X[i + 1] - R - 12;
  if (i !== 2) return `M${a} ${Y}H${b}`;
  const m = (a + b) / 2;
  return `M${a} ${Y}H${m - 26}l10 -20l14 40l14 -40l10 20H${b}`;
}

function usePlayhead() {
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [at, setAt] = useState(still ? STEPS.length - 1 : 0);
  const [paused, setPaused] = useState(still);
  useEffect(() => {
    if (paused) return;
    // One extra beat on the last step before the line starts over.
    const t = setInterval(() => setAt((n) => (n + 1) % (STEPS.length + 1)), STEP_MS);
    return () => clearInterval(t);
  }, [paused]);
  return { at: Math.min(at, STEPS.length - 1), pick: (i: number) => { setPaused(true); setAt(i); } };
}

export function Landing() {
  const { at, pick } = usePlayhead();
  return (
    <main className="lp">
      <header className="lp-top">
        <h1>Keep your app working, even when APIs change</h1>
      </header>

      <svg className="wire" viewBox="0 0 1400 150" role="img" aria-label="Six steps from adding a repo to happy customers">
        {X.slice(0, -1).map((_, i) => (
          <g key={i} className={`seg s${i}${i < at ? " drawn" : ""}`}>
            <path className="base" d={segment(i)} />
            <path className="ink" d={segment(i)} pathLength={1} />
            <path className="head" d={`M${X[i + 1] - R - 20} ${Y - 9}l10 9l-10 9`} />
          </g>
        ))}
        {X.map((x, i) => (
          <g key={i} className={`node${i === at ? " on" : i < at ? " past" : ""}`} onClick={() => pick(i)}>
            <circle cx={x} cy={Y} r={R} />
            <svg x={x - 22} y={Y - 22} width={44} height={44} viewBox="0 0 24 24" fill="none" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">{ICONS[i]}</svg>
          </g>
        ))}
        <text className={`broke${at >= 2 ? " show" : ""}`} x={(X[2] + X[3]) / 2} y={Y + 52} textAnchor="middle">API changed</text>
      </svg>

      <ol className="lp-steps">
        {STEPS.map((s, i) => (
          <li key={s.title}><button className={i === at ? "on" : ""} onClick={() => pick(i)}>{s.title}</button></li>
        ))}
      </ol>

      <p className="lp-say" key={at} aria-live="polite">{STEPS[at].say}</p>
    </main>
  );
}
