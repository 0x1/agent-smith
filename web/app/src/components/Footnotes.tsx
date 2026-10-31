import { clock } from "../format.ts";
import type { LiveCase } from "../types.ts";

// Changes the app doesn't read, and repeat sightings of the active change.
export function Footnotes({ quiet, active }: { quiet: LiveCase[]; active: LiveCase | null }) {
  const repeats = active ? active.signals.slice(1) : [];
  if (!quiet.length && !repeats.length) return null;
  return (
    <div className="foot">
      {quiet.map((c) => (
        <div key={c.caseId} className="card enter" title={c.verdict?.evidence.join("\n")}>
          <span className="ok">✓</span> {c.explanation || c.change.summary}
        </div>
      ))}
      {repeats.length > 0 && (
        <div className="card enter">
          ＝ Same change seen again at {clock(repeats[repeats.length - 1].at)}
          {repeats.length > 1 ? ` (${repeats.length} more sightings)` : ""}. Added to this case.
        </div>
      )}
    </div>
  );
}
