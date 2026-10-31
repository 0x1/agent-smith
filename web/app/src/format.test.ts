import { expect, test } from "bun:test";
import { clock, firstSentence, outlineFromPaths, outlineOf, printOutline } from "./format.ts";

test("firstSentence keeps one sentence", () => {
  expect(firstSentence("Stock used to be one number. Now it is two.")).toBe("Stock used to be one number.");
  expect(firstSentence("No full stop")).toBe("No full stop");
  expect(firstSentence("Version 1.1 shipped. Next.")).toBe("Version 1.1 shipped.");
});

test("outlineOf a live response", () => {
  expect(printOutline(outlineOf({ sku: "A", inventory: { on_hand: 7 } }))).toBe('{\n  "sku": string,\n  "inventory": {\n    "on_hand": number\n  }\n}');
});

test("outlineFromPaths nests the watcher's flat shape, children win over `object`", () => {
  const o = outlineFromPaths({ inventory: "object", "inventory.on_hand": "number", sku: "string" });
  expect(o).toEqual({ inventory: { on_hand: "number" }, sku: "string" });
  expect(outlineFromPaths({ "inventory.on_hand": "number", inventory: "object" })).toEqual({ inventory: { on_hand: "number" } });
});

test("clock is empty for missing or bad times", () => {
  expect(clock(null)).toBe("");
  expect(clock("nope")).toBe("");
});
