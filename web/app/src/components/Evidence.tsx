import type { Step } from "../model.ts";

export function Evidence({ steps, bare = false }: { steps: Step[]; bare?: boolean }) {
  const shown = steps.filter((s) => s.state !== "later" && s.detail);
  if (!shown.length) return null;
  if (bare) return <div className="evidence">{shown.map((s) => `${s.name}\n${s.detail}`).join("\n\n")}</div>;
  return (
    <details>
      <summary>Show the evidence</summary>
      <div className="evidence">{shown.map((s) => `${s.name}\n${s.detail}`).join("\n\n")}</div>
    </details>
  );
}
