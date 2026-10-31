import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startSupplier } from "./support/env.ts";
import { getStock } from "../src/supplier.ts";

let stop: () => void;
before(async () => { stop = await startSupplier(); });
after(() => stop());

test("nothing reserved means everything on hand is available", async () => {
  assert.equal(await getStock("WIDGET-2"), 4);
});

test("available stock is never negative", async () => {
  assert.equal(await getStock("WIDGET-3"), 0);
});
