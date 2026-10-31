// Adapter for the supplier's inventory API.
// SUPPLIER_URL is the supplier's base URL, read on every call.

function baseUrl(): string {
  const url = process.env.SUPPLIER_URL;
  if (!url) throw new Error("SUPPLIER_URL is not set");
  return url.replace(/\/$/, "");
}

// Units of `sku` available to sell right now.
export async function getStock(sku: string): Promise<number> {
  const res = await fetch(`${baseUrl()}/v1/inventory/${encodeURIComponent(sku)}`);
  if (!res.ok) throw new Error(`supplier returned ${res.status} for ${sku}`);
  const body = await res.json();
  return body.stock;
}
