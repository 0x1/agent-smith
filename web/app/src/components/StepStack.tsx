import type { Step, StepKey } from "../model.ts";

const TONES: Record<StepKey, [string, string]> = {
  noticed: ["var(--sky)", "var(--sky-deep)"],
  checked: ["var(--lilac)", "var(--lilac-deep)"],
  fixed: ["var(--mint)", "var(--mint-deep)"],
  proved: ["var(--butter)", "var(--butter-deep)"],
  you: ["var(--lime)", "var(--lime-deep)"],
};
const ICONS: Record<StepKey, string> = { noticed: "◎", checked: "⌕", fixed: "✎", proved: "✓", you: "☺" };

export function StepCard({ step, waiting }: { step: Step; waiting: boolean }) {
  const [tone, deep] = TONES[step.key];
  const big = step.state === "now" || step.state === "bad";
  // While a person must act, the review button is the only lime element.
  const iconBg = step.state === "bad" ? "var(--paper)" : step.state === "later" || (waiting && step.key === "you") ? "var(--paper)" : tone;
  return (
    <div className={`card step ${step.state} enter`} style={{ ["--tone" as string]: tone, ["--tone-deep" as string]: deep }}>
      <span className="ic" style={{ background: iconBg }} aria-hidden>{step.state === "bad" ? "✕" : ICONS[step.key]}</span>
      <div style={{ minWidth: 0 }}>
        <div className="nm">{big ? step.what : step.name}</div>
        {step.state === "done" && <div className="sub">{step.what}</div>}
        {big && <div className="sub">{step.state === "bad" ? `${step.name} · sent back` : step.name}</div>}
      </div>
      <span className="tm">{step.state === "later" ? "" : step.when}</span>
    </div>
  );
}

export function StepStack({ steps, waiting }: { steps: Step[]; waiting: boolean }) {
  return <div className="stack">{steps.map((s) => <StepCard key={s.key} step={s} waiting={waiting} />)}</div>;
}
