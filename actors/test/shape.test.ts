import { describe as group, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { buildChange, classify, describe, diffShapes, flatten, splitDiff } from "../src/shape.ts"

// The mock supplier's own fixtures, so these tests follow the demo's real responses.
const fixture = (v: string) =>
    JSON.parse(readFileSync(join(import.meta.dir, "../../supplier-mock/fixtures", `${v}.json`), "utf8"))["WIDGET-1"]
const meta = { provider: "supplier", endpoint: "GET /v1/inventory/{sku}", sourceRef: "http://127.0.0.1:7200/changelog/v2" }

group("flatten", () => {
    test("nested objects become dotted paths", () => {
        expect(flatten({ a: 1, b: { c: "x", d: null }, e: [{ f: true }], g: [] })).toEqual({
            a: "number",
            b: "object",
            "b.c": "string",
            "b.d": "null",
            e: "array",
            "e[]": "object",
            "e[].f": "boolean",
            g: "array",
        })
    })

    test("v2 inventory response", () => {
        expect(flatten(fixture("v2"))).toEqual({
            sku: "string",
            inventory: "object",
            "inventory.on_hand": "number",
            "inventory.reserved": "number",
            updated_at: "string",
            restock_eta: "string",
        })
    })
})

group("classify", () => {
    test("no difference is no change", () => {
        expect(classify(diffShapes(flatten(fixture("v1")), flatten(fixture("v1"))))).toBeNull()
    })

    test("only added paths is added", () => {
        expect(classify(diffShapes({ a: "string" }, { a: "string", b: "number" }))).toBe("added")
    })

    test("a retyped path is breaking", () => {
        const d = diffShapes({ a: "number" }, { a: "string" })
        expect(d.retyped).toEqual(["a"])
        expect(classify(d)).toBe("breaking")
    })

    test("null to a value is not a retype", () => {
        expect(classify(diffShapes({ eta: "null" }, { eta: "string" }))).toBeNull()
    })
})

group("supplier versions", () => {
    // v2 builds on v1.1 (supplier-mock bf43518), so v1.1 -> v2 is the stock change alone.
    test("v1.1 to v2 matches the agreed Change", () => {
        const d = diffShapes(flatten(fixture("v1.1")), flatten(fixture("v2")))
        expect(d).toEqual({ removed: ["stock"], added: ["inventory", "inventory.on_hand", "inventory.reserved"], retyped: [] })
        const change = buildChange(d, meta)!
        expect(change.changeKind).toBe("breaking")
        expect(change.fieldPath).toBe("stock")
        expect(change.endpoint).toBe("GET /v1/inventory/{sku}")
    })

    test("v1 to v1.1 removes warehouse and adds restock_eta", () => {
        const d = diffShapes(flatten(fixture("v1")), flatten(fixture("v1.1")))
        expect(d).toEqual({ removed: ["warehouse"], added: ["restock_eta"], retyped: [] })
        expect(buildChange(d, meta)!.fieldPath).toBe("warehouse")
    })

    test("headline and explanation contain no field paths", () => {
        const d = diffShapes(flatten(fixture("v1")), flatten(fixture("v2")))
        const text = Object.values(describe(d)).join(" ")
        for (const path of [...d.removed, ...d.added]) expect(text).not.toContain(path)
    })
})

group("splitDiff (one case per field)", () => {
    const cases = (from: string, to: string) => {
        const after = flatten(fixture(to))
        return splitDiff(diffShapes(flatten(fixture(from)), after), after).map((g) => buildChange(g, meta)!)
    }

    test("v1 to v2 opens stock (with inventory as its replacement), warehouse and restock_eta", () => {
        const out = cases("v1", "v2")
        expect(out.map((c) => [c.changeKind, c.fieldPath, c.shapeDiff])).toEqual([
            ["breaking", "stock", { removed: ["stock"], added: ["inventory", "inventory.on_hand", "inventory.reserved"], retyped: [] }],
            ["breaking", "warehouse", { removed: ["warehouse"], added: [], retyped: [] }],
            ["added", "restock_eta", { removed: [], added: ["restock_eta"], retyped: [] }],
        ])
    })

    test("v1 to v1.1 is a breaking case on warehouse and an added case on restock_eta", () => {
        const out = cases("v1", "v1.1")
        expect(out.map((c) => [c.changeKind, c.fieldPath, c.shapeDiff])).toEqual([
            ["breaking", "warehouse", { removed: ["warehouse"], added: [], retyped: [] }],
            ["added", "restock_eta", { removed: [], added: ["restock_eta"], retyped: [] }],
        ])
    })

    test("only a nested object added is its own added case", () => {
        const after = { a: "string", b: "object", "b.c": "number" }
        expect(splitDiff(diffShapes({ a: "string" }, after), after)).toEqual([{ removed: [], added: ["b", "b.c"], retyped: [] }])
    })

    test("a retyped child stays with its own field", () => {
        const before = { a: "object", "a.x": "number" }
        const after = { a: "object", "a.x": "string", "a.y": "number" }
        expect(splitDiff(diffShapes(before, after), after)).toEqual([{ removed: [], added: ["a.y"], retyped: ["a.x"] }])
    })
})
