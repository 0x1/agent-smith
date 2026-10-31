# actors

Terse durable actors for Agent Smith: `Case` (one per detected change) and `EndpointWatcher` (one per watched endpoint). Types come from `contracts/case.ts`.

Needs Bun 1.4.2 or later. Terse uses bun, not pnpm.

## Run

```sh
cd supplier-mock && SUPPLIER_VERSION=v1 node server.ts        # :7200, separate terminal
cd actors && bun install && bunx durable-actors dev           # :7100
bun scripts/invoke.ts EndpointWatcher supplier.get-inventory watch '"http://127.0.0.1:7200"' '"WIDGET-1"' 5000
```

Then flip the supplier and watch a case appear:

```sh
curl -s -X POST localhost:7200/admin/version -d '{"version":"v2"}'
bun scripts/invoke.ts EndpointWatcher supplier.get-inventory read      # caseIds
bun scripts/invoke.ts Case agent-smith-demo.supplier.GET-v1-inventory-sku.stock read
```

Checks: `bun run --bun check` (typecheck) and `bun test` (shape flattening and classification).

## Methods

| Actor / ID | Method | Notes |
|---|---|---|
| `Case/{makeCaseId(...)}` | `create(init)` | `init` = `Change` + `headline`, `explanation`, optional `signal`. Idempotent: an existing case only gets the signal attached. Starts as `detected`. |
| | `patch(partial)` | Shallow merge of top-level keys, returns the new state. `caseId` can't change. |
| | `addSignal(signal)` | Exact repeat `eventId` is ignored (`{attached:false}`). |
| | `read()`, `get()` | The full `Case`, or `null`. |
| `EndpointWatcher/supplier.get-inventory` | `watch(baseUrl, sku, everyMs=5000)` | Saves config and arms the alarm. |
| | `probeNow()` | Probes immediately. |
| | `read()`, `getState()` | `WatcherState` plus `watching`, `shape`, `history`, `lastError`, `nextProbeAt`. |
| | `reset()` | Forgets the baseline and `caseIds` for a demo rerun. Cases stay. |
| | `stop()` | Cancels the alarm. |

Every detected change opens a case, `added` included; `agent/` decides `affected` or `not_affected`. A removed or retyped path is `breaking`. One case per detected change, keyed on the shallowest broken path (or the shallowest added path).

## HTTP invoke

```sh
curl -s -X POST http://127.0.0.1:7100/v1/projects/local/actors/Case/$CASE_ID/invoke \
  -H 'content-type: application/json' \
  -d '{"requestId":"r1","method":"patch","args":[{"status":"investigating"}]}'
```

- Success: `{"outcome":{"type":"completed","result":...}}`.
- Actor error: HTTP **200** with `{"outcome":{"type":"failed","code":"actor_error","message":"..."}}`.
- Host unavailable: HTTP 503 (see Restart).

`scripts/invoke.ts` wraps this, retries 503 for up to 60 s, and works as a CLI: `bun scripts/invoke.ts <Class> <id> <method> [jsonArg ...]`.

## Live state (websocket)

`POST .../actors/{Class}/{id}/find-websocket` with `{"metadata":null}` returns `websocketUrl`. Both actors emit one field named `state`:

- First frame: `{"type":"state","version":n,"state":{"state":{...}}}`
- After that: `{"type":"state_update","version":n,"changes":{"state":{...}}}`

## Restart

State survives a restart; alarms do not. Every watcher method re-arms the alarm, so any call resumes probing.

```sh
pgrep -f "durable-actors|DURABLE_ACTORS_SDK_HOST" | xargs kill -9
bunx durable-actors dev
bun scripts/rearm.ts
```

After `kill -9`, the dead host holds its actor leases for about 30 seconds, and calls return 503 `previous owner lease is still active` until then. `rearm.ts` retries through that, reads the watcher and every case in `caseIds`, and calls `watch()` with the saved config. Env overrides: `WATCHER_ID`, `SUPPLIER_URL`, `WATCH_SKU`, `WATCH_EVERY_MS`, `ACTORS_URL`.
