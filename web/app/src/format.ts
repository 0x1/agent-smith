// Small, pure text helpers for the view.

export function clock(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toTimeString().slice(0, 8);
}

// "A. B." → "A." Used where one plain sentence fits and the rest goes to the evidence.
export function firstSentence(text: string): string {
  const m = text.trim().match(/^.+?[.!?](?=\s|$)/);
  return m ? m[0] : text.trim();
}

// A type outline: `{ "sku": string, "inventory": { "on_hand": number } }`.
// A node is a nested object of names, or a type name at a leaf.
type Outline = string | { [key: string]: Outline };

// From a live JSON value.
export function outlineOf(v: unknown): Outline {
  if (Array.isArray(v)) return `${v.length ? printOutline(outlineOf(v[0])) : "unknown"}[]`;
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, outlineOf(x)]));
  return v === null ? "null" : typeof v;
}

// From the watcher's flat paths (`inventory.on_hand: number`). A parent listed
// as `object` gives way to its children.
export function outlineFromPaths(flat: Record<string, string>): Outline {
  const root: { [key: string]: Outline } = {};
  for (const [path, type] of Object.entries(flat)) {
    const parts = path.split(".");
    let node = root;
    for (const p of parts.slice(0, -1)) {
      if (typeof node[p] !== "object") node[p] = {};
      node = node[p] as { [key: string]: Outline };
    }
    const leaf = parts[parts.length - 1];
    if (typeof node[leaf] !== "object") node[leaf] = type;
  }
  return root;
}

export function printOutline(o: Outline, pad = ""): string {
  if (typeof o === "string") return o;
  const inner = Object.entries(o).map(([k, x]) => `${pad}  "${k}": ${printOutline(x, pad + "  ")}`);
  return inner.length ? `{\n${inner.join(",\n")}\n${pad}}` : "{}";
}
