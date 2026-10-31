// Pure helpers for the endpoint watcher: flatten a JSON response into a map of
// dotted path -> type, compare two maps, and turn a difference into a `Change`.
// No actor code here, so `bun test` can cover it directly.
import type { Change, ShapeDiff } from "../../contracts/case.ts"

export type Shape = Record<string, string>

export function typeOf(value: unknown): string {
    if (value === null) return "null"
    if (Array.isArray(value)) return "array"
    return typeof value
}

// Objects record their own path as "object" and recurse. Arrays record "array"
// and describe their first element under `path[]`.
export function flatten(value: unknown, prefix = "", out: Shape = {}): Shape {
    const t = typeOf(value)
    if (prefix) out[prefix] = t
    if (t === "object") {
        for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
            flatten(child, prefix ? `${prefix}.${key}` : key, out)
        }
    } else if (t === "array" && (value as unknown[]).length > 0) {
        flatten((value as unknown[])[0], `${prefix}[]`, out)
    }
    return out
}

// A field that is sometimes null (for example `restock_eta`) is not a type change.
function retyped(before: string, after: string): boolean {
    return before !== after && before !== "null" && after !== "null"
}

export function diffShapes(before: Shape, after: Shape): ShapeDiff {
    const sorted = (xs: string[]) => xs.sort()
    return {
        removed: sorted(Object.keys(before).filter((p) => !(p in after))),
        added: sorted(Object.keys(after).filter((p) => !(p in before))),
        retyped: sorted(Object.keys(before).filter((p) => p in after && retyped(before[p], after[p]))),
    }
}

export function isEmptyDiff(d: ShapeDiff): boolean {
    return d.removed.length === 0 && d.added.length === 0 && d.retyped.length === 0
}

// A removed or retyped path breaks readers. Only added paths do not.
export function classify(d: ShapeDiff): Change["changeKind"] | null {
    if (isEmptyDiff(d)) return null
    return d.removed.length > 0 || d.retyped.length > 0 ? "breaking" : "added"
}

// The path the case is about: the shallowest broken path, else the shallowest added.
export function primaryPath(d: ShapeDiff): string {
    const pool = d.removed.length || d.retyped.length ? [...d.removed, ...d.retyped] : d.added
    return [...pool].sort((a, b) => a.split(".").length - b.split(".").length || a.localeCompare(b))[0]
}

function summarize(d: ShapeDiff): string {
    const parts: string[] = []
    if (d.removed.length) parts.push(`${d.removed.join(", ")} removed`)
    if (d.retyped.length) parts.push(`${d.retyped.join(", ")} changed type`)
    if (d.added.length) parts.push(`${d.added.join(", ")} added`)
    return parts.join("; ")
}

// Plain language for people: no field paths or jargon.
export function describe(d: ShapeDiff): { headline: string; explanation: string } {
    if (classify(d) === "added") {
        return {
            headline: "The supplier started sending new information",
            explanation:
                "The supplier added new information to what it sends for each product. Nothing the app could already read was taken away, so the app may not be affected at all.",
        }
    }
    const replaced = d.removed.length > 0 && d.added.length > 0
    return {
        headline: replaced
            ? "The supplier replaced information the app may rely on"
            : "The supplier removed or changed information the app may rely on",
        explanation: replaced
            ? "Something the supplier used to send for each product is gone, and new information appeared in its place. Code that reads the old information may now get nothing back."
            : "Something the supplier used to send for each product is gone or now has a different form. Code that reads it may now get nothing back, or the wrong kind of value.",
    }
}

export function buildChange(
    d: ShapeDiff,
    meta: { provider: string; endpoint: string; sourceRef: string },
): Change | null {
    const changeKind = classify(d)
    if (!changeKind) return null
    return {
        provider: meta.provider,
        endpoint: meta.endpoint,
        changeKind,
        fieldPath: primaryPath(d),
        shapeDiff: d,
        summary: summarize(d),
        sourceRef: meta.sourceRef,
    }
}
