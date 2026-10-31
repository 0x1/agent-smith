import { useState } from "react";
import { isFixture } from "../live.ts";

// The presenter menu drives real actions through the bridge: switch the
// supplier's version and run the watcher's check now.
function Presenter({ onClose }: { onClose: () => void }) {
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);
  const post = async (path: string, body: unknown, label: string) => {
    if (isFixture()) return setResult("fixture mode: no live actions");
    setBusy(true);
    try {
      const res = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const text = await res.text();
      setResult(`${res.ok ? "✓" : "✕"} ${label} · ${res.status} ${text.slice(0, 80)}`);
    } catch (err) {
      setResult(`✕ ${label} · ${String(err)}`);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="presenter enter" role="menu">
      <b>Presenter</b>
      <button disabled={busy} onClick={() => post("/api/presenter/version", { version: "v2" }, "supplier → v2")}>Switch supplier to v2</button>
      <button disabled={busy} onClick={() => post("/api/presenter/version", { version: "v1.1" }, "supplier → v1.1")}>Switch supplier to v1.1</button>
      <button disabled={busy} onClick={() => post("/api/presenter/version", { version: "v1" }, "supplier → v1")}>Switch supplier back to v1</button>
      <button disabled={busy} onClick={() => post("/api/presenter/probe", {}, "check now")}>Check now</button>
      <button onClick={onClose}>Close</button>
      {result && <div className="res">{result}</div>}
    </div>
  );
}

export function Nav({ demo, onHow, onTry }: { demo: boolean; onHow: () => void; onTry: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="nav">
      <div className="logo"><span className="mark" aria-hidden>✱</span>Agent Smith</div>
      {!demo && <button className="lime nav-try" onClick={onTry}>Try now</button>}
      {demo && (
        <div className="navr">
          <span>Controlled demo · mock supplier · nothing deploys</span>
          <button className="btn" onClick={onHow}>How it works</button>
          <button className="btn" onClick={() => setOpen((o) => !o)} aria-expanded={open}>Presenter ▾</button>
          {open && <Presenter onClose={() => setOpen(false)} />}
        </div>
      )}
    </div>
  );
}
