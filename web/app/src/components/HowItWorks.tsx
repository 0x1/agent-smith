const ICONS: Record<string, React.ReactNode> = {
  repo: <><path d="M6 4h9l3 3v13H6z" /><path d="M15 4v3h3" /><path d="M9 12h6M9 16h6" /></>,
  find: <><circle cx="11" cy="11" r="6" /><path d="M20 20l-4.5-4.5" /></>,
  watch: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></>,
  fix: <><path d="M14 6a4 4 0 0 0 5 5l-9 9a2.8 2.8 0 0 1-4-4z" /><path d="M14 6l3-3" /></>,
  review: <><circle cx="8" cy="6" r="2.5" /><circle cx="8" cy="18" r="2.5" /><circle cx="17" cy="12" r="2.5" /><path d="M8 8.5v7M10 6h3a4 4 0 0 1 4 4" /></>,
  happy: <><circle cx="12" cy="12" r="9" /><path d="M8.5 14a4 4 0 0 0 7 0" /><path d="M9 9.5h.01M15 9.5h.01" /></>,
};

const STEPS = [
  { icon: "repo", title: "Add your repo", sub: "Connect the app you want kept working." },
  { icon: "find", title: "We find your APIs", sub: "The APIs your code calls, and what it reads." },
  { icon: "watch", title: "We watch for changes", sub: "A durable watcher checks them around the clock." },
  { icon: "fix", title: "Agents fix and prove it", sub: "In a sandbox, with tests they can't edit." },
  { icon: "review", title: "You review and merge", sub: "A normal pull request. Your own agent is next." },
  { icon: "happy", title: "Customers stay happy", sub: "Nothing broke, and nobody got paged." },
];

// The product in six steps. "Your own agent" is marked as next because it isn't built.
export function HowItWorks() {
  return (
    <ol className="flow" aria-label="How it works">
      {STEPS.map((s) => (
        <li key={s.title}>
          <span className="flow-ic" aria-hidden>
            <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{ICONS[s.icon]}</svg>
          </span>
          <b>{s.title}</b>
          <span className="flow-sub">{s.sub}</span>
        </li>
      ))}
    </ol>
  );
}

export function HowItWorksModal({ onClose }: { onClose: () => void }) {
  return (
    <>
      <button className="scrim" aria-label="Close" onClick={onClose} />
      <div className="how-modal" role="dialog" aria-label="How it works">
        <div className="drawer-head">
          <h2>How it works</h2>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
        <HowItWorks />
      </div>
    </>
  );
}
