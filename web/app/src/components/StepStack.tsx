import type { Step, StepKey } from "../model.ts";

const ICONS: Record<StepKey, string> = { noticed: "◎", checked: "⌕", fixed: "✎", proved: "✓", you: "☺" };

export function StepCard({ step }: { step: Step }) {
  const big = step.state === "now" || step.state === "bad";
  return (
    <div className={`card step ${step.state} enter`}>
      <span className="ic" aria-hidden>{step.state === "bad" ? "✕" : step.state === "done" ? "✓" : ICONS[step.key]}</span>
      <div style={{ minWidth: 0 }}>
        <div className="nm">{big ? step.what : step.name}</div>
        {step.state === "done" && <div className="sub">{step.what}</div>}
        {big && <div className="sub">{step.state === "bad" ? `${step.name} · sent back` : step.name}</div>}
      </div>
      <span className="tm">{step.state === "later" ? "" : step.when}</span>
    </div>
  );
}

export function StepStack({ steps }: { steps: Step[] }) {
  return <div className="stack">{steps.map((s) => <StepCard key={s.key} step={s} />)}</div>;
}
