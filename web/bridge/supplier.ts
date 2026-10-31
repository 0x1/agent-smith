// The mock supplier: its version, and one live response for the quiet state.
import { config } from "./config.ts";
import type { Hub } from "./hub.ts";

const { supplier } = config;

export async function setSupplierVersion(version: unknown): Promise<Response> {
  const res = await fetch(`${supplier.url}/admin/version`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ version }),
  });
  return new Response(await res.text(), { status: res.status, headers: { "content-type": "application/json" } });
}

export async function pollSupplier(hub: Hub) {
  for (;;) {
    try {
      const { version } = (await (await fetch(`${supplier.url}/admin/version`)).json()) as { version: string };
      const body = (await (await fetch(`${supplier.url}${supplier.samplePath}`)).json()) as unknown;
      hub.putSample({ version, path: supplier.samplePath, body });
    } catch (err) {
      hub.setStatus("supplier", "down", `${supplier.url}: ${String(err).slice(0, 120)}`);
    }
    await Bun.sleep(supplier.pollMs);
  }
}
