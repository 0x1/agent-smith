import { useState } from "react";
import type { LiveWatcher } from "../types.ts";

// The shape of GET /api/inventory: the real scan() of the one connected demo repo.
interface CallSite { path: string; line: number; functionName?: string; fieldsRead: string[] }
interface Endpoint { provider: string; endpoint: string; status: "used" | "not_used"; callSites: CallSite[] }
interface Inventory { repo: string; commit: string | null; scannedAt: string; endpoints: Endpoint[] }

const REPO = "0x1/agent-smith-demo";

// The opening page. It never implies any repo works today: the field is fixed to
// the one connected demo repo, and the page says so.
export function StartScreen({ watcher, now, others }: { watcher: LiveWatcher | null; now: number; others: number }) {
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
  const last = watcher?.lastProbeAt ? Math.max(0, Math.round((now - Date.parse(watcher.lastProbeAt)) / 1000)) : null;
  return (
    <div className="start">
      <div className="start-left">
        <h1 className="h enter">Keep your app working when the APIs it depends on change.</h1>
        <p className="dek">Connect a repo. We find the APIs it uses, watch them, and bring you a tested fix when one changes.</p>
        <div className="scan">
          <input className="repo" value={REPO} readOnly aria-label="Connected repo" />
          <button className="lime" onClick={run} disabled={busy}>{busy ? "Scanning…" : "Scan this repo"}</button>
        </div>
        {error && <p className="no scan-error">✕ The scan failed: {error}</p>}
        <p className="small">Demo: one connected repo, one known provider.</p>
        {watcher && watcher.probeCount > 0 && last !== null && (
          <p className="small">No changes in {watcher.probeCount} checks. Last checked {last} s ago.</p>
        )}
        {others > 0 && <p className="small"><span className="ok">✓</span> {others === 1 ? "1 change" : `${others} changes`} checked. Your app doesn't use {others === 1 ? "it" : "them"}.</p>}
      </div>
      <div className="start-right">
        <section className="panel found">
          <h2>What we found</h2>
          {!inv && <p className="small">Scan the repo to see the APIs it depends on.</p>}
          {inv && (
            <table className="enter">
              <thead><tr><th>API</th><th>Used by</th><th>Reads</th><th>State</th></tr></thead>
              <tbody>
                {inv.endpoints.map((e) => (
                  <tr key={e.endpoint}>
                    <td className="mono">{e.endpoint}</td>
                    <td>{e.callSites.map((c) => <div key={`${c.path}:${c.line}`}>{c.functionName ? `${c.functionName}()` : `${c.path}:${c.line}`}</div>)}{!e.callSites.length && "—"}</td>
                    <td className="mono">{e.callSites.flatMap((c) => c.fieldsRead).join(", ") || "—"}</td>
                    <td>{e.status === "used" ? <span className="ok">Watching</span> : "Not called"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        <TeamFit />
      </div>
    </div>
  );
}

// How this fits a team. "Next" is marked as not built: it must never read as working.
function TeamFit() {
  return (
    <section className="panel team">
      <h2>How this fits your team</h2>
      <ul>
        <li><span className="state ok">✓ Today</span> Fixes arrive as a normal pull request.</li>
        <li><span className="state ok">✓ Today</span> Agents hand off over Agent Relay.</li>
        <li><span className="state next">Next</span> Your Claude Code or Codex agent joins in.</li>
      </ul>
    </section>
  );
}
