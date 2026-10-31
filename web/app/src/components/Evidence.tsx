import type { Step } from "../model.ts";

export function Evidence({ steps }: { steps: Step[] }) {
  const shown = steps.filter((s) => s.state !== "later" && s.detail);
  if (!shown.length) return null;
  return (
    <details className="raw">
      <summary>Raw log</summary>
      <div className="evidence">{shown.map((s) => `${s.name}\n${s.detail}`).join("\n\n")}</div>
    </details>
  );
}
