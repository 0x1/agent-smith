import { test } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { createSupplier } from "./supplier.ts";

async function withSupplier(fn: (base: string) => Promise<void>) {
  const { server } = createSupplier("v1");
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try { await fn(base); } finally { server.close(); }
}

test("serves v1, switches to v2 on demand, and publishes the note", async () => {
  await withSupplier(async (base) => {
    assert.equal((await (await fetch(`${base}/v1/inventory/WIDGET-1`)).json()).stock, 2);
    assert.deepEqual(await (await fetch(`${base}/changelog`)).json(), []);
    const sw = await fetch(`${base}/admin/version`, { method: "POST", body: JSON.stringify({ version: "v2" }) });
    assert.deepEqual(await sw.json(), { version: "v2" });
    const v2 = await (await fetch(`${base}/v1/inventory/WIDGET-1`)).json();
    assert.deepEqual(v2.inventory, { on_hand: 7, reserved: 5 });
    assert.equal(v2.stock, undefined);
    const log = await (await fetch(`${base}/changelog`)).json();
    assert.deepEqual(log.map((n: { version: string }) => n.version), ["v1.1", "v2"]);
    assert.match(log[1].note, /on_hand - reserved/);
  });
});

test("rejects unknown versions and SKUs", async () => {
  await withSupplier(async (base) => {
    const bad = await fetch(`${base}/admin/version`, { method: "POST", body: JSON.stringify({ version: "v9" }) });
    assert.equal(bad.status, 400);
    assert.equal((await fetch(`${base}/v1/inventory/NOPE`)).status, 404);
  });
});
