# Judge Q&A notes

Short, honest answers for the live demo. Each one matches what is built today, and anything planned is labelled as planned.

## "What about POST requests, or any endpoint that writes?"

**Answer for the room:**
> "Reads, we watch live. Writes, we never call. We check the vendor's docs and spec for changes to what the request must send, and prove the break in a sandbox before we touch anything."

**What is built today:** watching works for **GET** endpoints. The watcher, a Terse durable actor, calls `GET /v1/inventory/{sku}` every 5 s and compares the shape of the response (`actors/src/watcher.ts`). The inventory scan records the fields the app **reads from responses** (`inventory/scan.ts`).

**Why we don't probe a POST:** calling a write endpoint every 5 s creates real records, such as orders or payments. You can't watch a write endpoint by calling it.

## How POST works through a docs check (planned, not built)

Only the "notice" and "check" steps change. Repair, verifier, Agent Relay, the PR and the Terse case stay exactly the same.

1. **Notice, from the docs.** A second Terse actor, for example `DocsWatcher/supplier.post-orders`, fetches the vendor's **documentation on its timer**, saves the last version, and compares new versions with it. The mock supplier already publishes a migration note at `GET /changelog`.
2. **Compare the request, not only the response.** For a POST, the break is in what the app *sends*: a field renamed, newly required, or retyped. The same flatten-and-compare code the watcher uses for responses works on a request schema.
3. **Check against what the app sends.** The scan also records the **request body fields at each call site**. For example, `body: JSON.stringify({ sku, qty })` sends `sku` and `qty`. A check then reads: "the vendor now requires `quantity` and rejects `qty`; `createOrder()` in `src/orders.ts` sends `qty`, so the app is affected."
4. **Prove it safely.** In the Freestyle sandbox, the app's test runs against a mock of the new version. It fails on the old request shape (for example a 422), and passes after the fix. Nothing touches production.
5. **Same case IDs.** Endpoints are already keyed by method, so `"POST /v1/orders"` cases fit `makeCaseId`.

### Limits, said plainly

- **It only catches changes the vendor documents.** Undocumented changes to writes are missed. That's why reads stay live-observed: live observation is the differentiator, and docs are the safe route for writes.
- **The format of the docs matters.**
  - A machine-readable spec (OpenAPI or JSON Schema) is compared deterministically, with no model.
  - Prose docs or a changelog need a model to extract the change. Those findings go through the same "does this affect us?" check before any repair.
- **The new work is mostly in the scan.** It records fields read from responses today, and has to learn fields sent in request bodies.

## For the Devpost "What's next" (cto-1's draft)

> **Writes, safely.** Today Agent Smith watches read endpoints live. Next, it covers writes without ever calling them: a durable docs watcher compares the vendor's spec and changelog for request-shape changes, and the code scan learns which fields each call sends. That way a renamed or newly required field is caught, matched to the exact call site, and proven in a sandbox, just like today's read-side repairs.
