import type { Proof } from "../live.ts";

// onHand − reserved = result, from a real verifier run. When the result is not
// what the check expects, the result is struck through and `expected` sits beside it.
export function Arithmetic({ proof, children }: { proof: Proof; children?: React.ReactNode }) {
  const wrong = proof.result !== proof.expected;
  return (
    <div className="card proof enter">
      <div className="lbl">
        {wrong
          ? `Hidden check · ${proof.sku} · ${proof.onHand} on hand, ${proof.reserved} reserved`
          : `What you can sell · ${proof.sku}`}
      </div>
      <div className={`sum${wrong ? " wrong" : ""}`} aria-label={`${proof.onHand} minus ${proof.reserved} equals ${proof.result}${wrong ? `, expected ${proof.expected}` : ""}`}>
        <span className="n">{proof.onHand}</span><span className="op">−</span>
        <span className="n">{proof.reserved}</span><span className="op">=</span>
        <span className="n res">{fmt(proof.result)}</span>
        {wrong && <span className="fix">{fmt(proof.expected)}</span>}
      </div>
      <div className="gl">{children}</div>
    </div>
  );
}

const fmt = (n: number) => (n < 0 ? `−${Math.abs(n)}` : String(n));
