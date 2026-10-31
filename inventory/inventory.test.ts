import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { scan, applicability } from "./index.ts";

const change = (name: string) => JSON.parse(readFileSync(new URL(`./examples/${name}.json`, import.meta.url), "utf8"));
const v1 = scan(new URL("./fixtures/app-v1", import.meta.url).pathname, { repo: "app-v1", commit: "abc1234def" });

test("scan finds the used endpoint, its call site and the fields it reads", () => {
  const inv = v1.endpoints.find((e) => e.endpoint === "GET /v1/inventory/{sku}")!;
  assert.equal(inv.status, "used");
  assert.deepEqual(inv.callSites, [{ path: "src/supplier.ts", line: 15, fieldsRead: ["stock"] }]);
  assert.equal(v1.endpoints.find((e) => e.endpoint === "GET /v1/pricing/{sku}")!.status, "not_used");
  assert.ok(v1.packages.some((p) => p.name === "tsx" && p.status === "installed"));
});

test("the v2 change is affected, at the adapter", () => {
  const r = applicability(change("change-v2-breaking"), v1);
  assert.equal(r.verdict.result, "affected");
  assert.deepEqual(r.callSite, { path: "src/supplier.ts", line: 15, fieldsRead: ["stock"] });
});

test("changes the app does not read are not_affected, with evidence", () => {
  for (const name of ["change-v1.1-removed-warehouse", "change-v1.1-added-restock", "change-pricing-breaking"]) {
    const r = applicability(change(name), v1);
    assert.equal(r.verdict.result, "not_affected", name);
    assert.equal(r.callSite, null);
    assert.ok(r.verdict.evidence.length >= 2, name);
  }
});

test("after the repair, destructured nested reads are found and v2 no longer applies", () => {
  const patched = scan(new URL("./fixtures/app-patched", import.meta.url).pathname);
  const site = patched.endpoints[0].callSites[0];
  assert.deepEqual(site.fieldsRead, ["inventory", "inventory.on_hand", "inventory.reserved"]);
  assert.equal(applicability(change("change-v2-breaking"), patched).verdict.result, "not_affected");
});
