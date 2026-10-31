import type { Step, StepKey } from "../model.ts";

// The label says where the work is: still to do, happening now, or done.
const LABELS: Record<StepKey, { later: string; now: string }> = {
  noticed: { later: "Notice", now: "Noticing" },
  checked: { later: "Check", now: "Checking" },
  fixed: { later: "Fix", now: "Fixing" },
  proved: { later: "Prove", now: "Proving" },
  you: { later: "You", now: "Your turn" },
};

function label(s: Step): string {
  if (s.state === "later") return LABELS[s.key].later;
  if (s.state === "now") return LABELS[s.key].now;
  return s.name;
}

// The story at a glance: labels and times. Hover for a sentence, click for the detail.
export function StepStack({ steps, onPick }: { steps: Step[]; onPick: (step: Step) => void }) {
  return (
    <ol className="stepper">
      {steps.map((s) => (
        <li key={s.key} className={`st ${s.state} ${s.key}`}>
          <button onClick={() => onPick(s)} disabled={s.state === "later"} aria-label={`${s.name}: ${s.what}`}>
            <span className="dot" aria-hidden>{s.state === "bad" ? "✕" : s.state === "done" ? "✓" : ""}</span>
            <span className="lb">{label(s)}</span>
            <span className="tm">{s.state === "later" ? "" : s.when}</span>
            <span className="tip" role="tooltip">{s.what}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}
