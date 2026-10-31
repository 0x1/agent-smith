import type { Step } from "../model.ts";

// The story at a glance: labels and times. Hover for a sentence, click for the detail.
export function StepStack({ steps, onPick }: { steps: Step[]; onPick: (step: Step) => void }) {
  return (
    <ol className="stepper">
      {steps.map((s) => (
        <li key={s.key} className={`st ${s.state}`}>
          <button onClick={() => onPick(s)} disabled={s.state === "later"} aria-label={`${s.name}: ${s.what}`}>
            <span className="dot" aria-hidden>{s.state === "bad" ? "✕" : s.state === "done" ? "✓" : ""}</span>
            <span className="lb">{s.name}</span>
            <span className="tm">{s.state === "later" ? "" : s.when}</span>
            <span className="tip" role="tooltip">{s.what}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}
