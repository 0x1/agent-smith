import type { LiveCase } from "../live.ts";

// The one action. It links to the real pull request in the case record.
export function ReviewButton({ c }: { c: LiveCase }) {
  if (c.status !== "awaiting_approval" || !c.pr) return null;
  const repo = c.pr.url.match(/github\.com\/([^/]+\/[^/]+)\/pull\//)?.[1];
  return (
    <div className="act enter">
      <a className="lime" href={c.pr.url} target="_blank" rel="noreferrer">Review the fix →</a>
      <span className="note">Pull request #{c.pr.number}{repo ? ` in ${repo}` : ""}.<br />Nothing merges until you approve.</span>
    </div>
  );
}
