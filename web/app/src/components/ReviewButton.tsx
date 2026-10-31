import type { LiveCase } from "../types.ts";

// The one action. It links to the real pull request in the case record.
export function ReviewButton({ c }: { c: LiveCase }) {
  if (c.status !== "awaiting_approval" || !c.pr) return null;
  return (
    <div className="act enter">
      <a className="lime" href={c.pr.url} target="_blank" rel="noreferrer">Review the fix →</a>
      <span className="note">Nothing merges until you approve.</span>
    </div>
  );
}
