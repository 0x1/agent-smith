import { useState } from "react";

// The shape of GET /api/inventory: the real scan() of the one connected demo repo.
interface CallSite { path: string; line: number; functionName?: string; fieldsRead: string[] }
interface Endpoint { provider: string; endpoint: string; status: "used" | "not_used"; callSites: CallSite[] }
interface Inventory { repo: string; commit: string | null; scannedAt: string; endpoints: Endpoint[] }

const REPO = "0x1/agent-smith-demo";

// The opening page. It never implies any repo works today: the field is fixed to
// the one connected demo repo, and the page says so.
export function StartScreen() {
  const [inv, setInv] = useState<Inventory | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/inventory");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setInv(body as Inventory);
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="start">
      <h1 className="h enter">Keep your app working when the APIs it depends on change.</h1>
      <p className="dek">Demo: one connected repo, one known provider.</p>
      <div className="scan">
        <input className="repo" value={REPO} readOnly aria-label="Connected repo" />
        <button className="lime" onClick={run} disabled={busy}>{busy ? "Scanning…" : "Scan this repo"}</button>
      </div>
      {error && <p className="no scan-error">✕ The scan failed: {error}</p>}
      {inv && (
        <div className="found enter">
          <h2>What we found</h2>
          <table>
            <thead><tr><th>API</th><th>Used by</th><th>Fields read</th><th>State</th></tr></thead>
            <tbody>
              {inv.endpoints.map((e) => (
                <tr key={e.endpoint}>
                  <td className="mono">{e.provider} · {e.endpoint}</td>
                  <td>{e.callSites.map((c) => <div key={`${c.path}:${c.line}`}>{c.functionName ? `${c.functionName}() in ` : ""}<span className="mono">{c.path}:{c.line}</span></div>)}{!e.callSites.length && "—"}</td>
                  <td className="mono">{e.callSites.flatMap((c) => c.fieldsRead).join(", ") || "—"}</td>
                  <td>{e.status === "used" ? "Watched" : "Not called"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="gl">Scanned {inv.repo}{inv.commit ? ` at ${inv.commit.slice(0, 7)}` : ""}. The watcher checks the APIs your code calls.</p>
        </div>
      )}
      <TeamFit />
    </div>
  );
}

// How this fits a team. "Next" is marked as not built: it must never read as working.
function TeamFit() {
  return (
    <div className="team">
      <h2>How this fits your team</h2>
      <ul>
        <li><span className="state ok">✓ Working today</span> Fixes arrive as a normal GitHub pull request. Nothing merges until a person approves.</li>
        <li><span className="state ok">✓ Working today</span> The watcher, fixer and verifier hand off over Agent Relay, and you can read the whole conversation.</li>
        <li><span className="state next">Next · not built yet</span> Your team's own Claude Code or Codex agent joins that same channel.</li>
      </ul>
    </div>
  );
}
