# haroon-agent-1-inventory-signal: Inventory and change signal

- Status: working
- Agent handle: haroon-agent-1
- Human sponsor: Haroon (GitHub `eychcue`)
- Branch: haroon-agent-1/inventory-signal
- Base commit: db8835a
- Head commit: see latest commit on this branch
- Claimed at (UTC): 2026-10-31T19:48Z
- Checkpoint due (UTC): 2026-10-31T20:15Z
- File scope (include shared files/lockfiles):
  - `0x1/agent-smith-demo` (separate repo, per Ahmed's D3-B): the target app, with a supplier adapter exposing `getStock(sku)`, its tests, and its own `package.json` and `pnpm-lock.yaml`. Its first commit is a baseline where `pnpm test` passes against supplier `v1`.
  - `supplier-mock/`: the mock supplier server, which can switch between `v1` and `v2` on demand. Also its response fixtures, changelog fixtures and migration note.
  - `inventory/`: the manifest and call-site scan, and the applicability check (`affected` or `not_affected`, with evidence).
  - This task file and one row in `coordination/BOARD.md`.
  - Not in scope: any root `package.json`, `pnpm-workspace.yaml` or other shared config. I will agree those with cto-1 first.
- Dependencies / overlapping claims checked: at db8835a and 19:47Z, `cto-1-demo-architecture` and `cto-1-kickoff` are coordination only. `hussain-claude-1-review` is on PR #1, also coordination only. No overlap. Note the possible boundary with the endpoint watcher actor below.

## Outcome and acceptance criteria

The other tracks get a target app, a supplier that changes on demand, and evidence of which code a change affects.

1. `demo-app` passes `pnpm test` against supplier `v1`. The same command fails against `v2`, for the adapter reason and not a setup error.
2. `supplier-mock` serves `v1` or `v2` from a switch, so the demo can trigger the change live. It publishes a changelog or migration note for each change.
3. `inventory` outputs JSON. It lists each provider and endpoint as `installed` or `used`. For `used` ones it gives the file, line and fields each call site reads.
4. Applicability, from deterministic code with no model:
   - The breaking change maps to the adapter call site and ends `affected`, with the file, line and field.
   - A change to a field or endpoint the app does not read ends `not_affected`, with the evidence.
5. The output fits the handoff record in the proposal (`change`, `callSite`). If cto-1 publishes it as code at 20:15Z, I follow that version.

## Checkpoints

2026-10-31T19:48Z / haroon-agent-1 / claimed; no code until the 20:15Z build start / 2266bc2 / 20:15Z
2026-10-31T19:55Z / haroon-agent-1 / put the decisions for Ahmed in their own section; acknowledged cto-1 (9a8ec03) and hussain-claude-1 (6d5e7a5); committed to the interfaces / c8eb1a7 / 20:15Z
2026-10-31T20:06Z / haroon-agent-1 / acknowledged Ahmed's decisions (2c32a5f). Scope change: the target app moves to `0x1/agent-smith-demo`; Haroon has accepted the invite and the repo is cloned, still empty. Code starts at 20:15Z / 7c2d435 / 20:25Z
2026-10-31T20:21Z / haroon-agent-1 / acceptance criteria 1 to 4 met locally: `agent-smith-demo` baseline on its `main`, `supplier-mock/` and `inventory/` on this branch. Interfaces published below. Next: run the live supplier against Hussain's watcher once it exists, and review cto-1's VM test setup / 26116c4 (agent-smith), 5360c49 (agent-smith-demo) / 20:40Z

## Evidence

- Changes / exact paths:
  - `agent-smith` at 26116c4: `supplier-mock/`, `inventory/`, this task file.
  - `agent-smith-demo` at 5360c49 (its `main`, first commit): `src/supplier.ts`, `src/storefront.ts`, `test/`, `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `README.md`.
- Checks passed, at 20:17 to 20:20Z:
  - `agent-smith-demo` 5360c49: `SUPPLIER_VERSION=v1 pnpm test` passes 2 of 2. `pnpm typecheck` passes. `SUPPLIER_VERSION=v1.1 pnpm test` passes. That is the `not_affected` change, and the app really doesn't break.
  - `agent-smith-demo` 5360c49: `SUPPLIER_VERSION=v2 pnpm test` fails 2 of 2 for the right reason (`actual: undefined, expected: 2`). With `SUPPLIER_VERSION` unset, it fails loudly.
  - Local trial patches, not committed: the naive rename `body.inventory.on_hand` still fails on v2 (returns 7). `Math.max(0, on_hand - reserved)` passes on v2.
  - `supplier-mock` 26116c4: `node --test supplier.test.ts` passes 2 of 2. `node sync.ts ../../agent-smith-demo --check` reports 6 files in sync.
  - `inventory` 26116c4: `node --test inventory.test.ts` passes 4 of 4. `node cli.ts check ../../agent-smith-demo examples/<change>.json` gives `affected` at `src/supplier.ts:15` for v2, and `not_affected` with evidence for the other three examples.
  - `tsc --noEmit --strict` over `inventory/*.ts` and `supplier-mock/*.ts` is clean.
- Checks failed: none outstanding.
- Checks not run and why: not run inside a Freestyle VM, which has no keys yet and belongs to cto-1. Not run against Hussain's watcher, which doesn't exist on a branch yet.
- Environment at 19:47Z: Node 24.21.0, npm 11.19.0, pnpm 12.9.1. **Bun is not installed**, so I can't run Terse here. My track doesn't need it. `gh` is logged in as Haroon (`eychcue`) with push access to this repo. No sponsor keys, and none are needed for this track.
- Publication/review/release status: claim on a branch with a PR; not reviewed or accepted.

## Decisions for Ahmed

**Decided by Ahmed, recorded by cto-1 at 2c32a5f (19:56Z): D1-A, D2-A, D3-B (separate repo `0x1/agent-smith-demo`).** The options are kept below for the record.

### D1. No fallback for Terse and Agent Relay at the 20:35Z cutoff

- Proposed: 2026-10-31T19:48Z, haroon-agent-1 for Haroon.
- Deciding human: Ahmed.
- Options:
  - **A:** Terse and Relay stay in for the demo. If they break, we fix them rather than switch to the fallback. The direct-call `send()` stays as insurance only, and we revisit at the 21:30Z end-to-end check. Freestyle and Mastra keep their fallbacks.
  - **B:** keep the original plan. Anything not working at 20:35Z moves to the local JSON file or direct calls.
- Supports A: Haroon, and cto-1 (9a8ec03). hussain-claude-1 has already run both tools locally (PR #1).
- Reason for A: they are the judges' two named criteria and the two category prizes.
- Affects: Case and view, Investigation and repair.
- Default until decided: A.

### D2. The fixed test assertion

- Proposed: hussain-claude-1 (PR #1, concern 2). Recommended by cto-1 (4b09b12, 9a8ec03).
- Deciding human: Ahmed.
- Options:
  - **A:** `{stock: 7}` becomes `{inventory: {on_hand: 7, reserved: 5}}`. `getStock(sku)` must return `2`, the supplier publishes a migration note, and the test command is `pnpm test`.
  - **B:** the kickoff's rename, `{stock: 7}` becomes `{available_quantity: 7}`, with an assertion of `7` and `npm test`.
- Supports A: hussain-claude-1, cto-1, and haroon-agent-1.
- Reason for A: a rename is a one-line fix any model gets right first time. A meaning change shows the agent reading the migration note, not just fitting the test.
- Affects: all tracks. The kickoff text also changes.
- Default until decided: A. The fixtures make B a one-line switch.

### D3. Where the target app lives (cto-1 open ask #6)

- Proposed: cto-1 (proposal, 3cfb953).
- Deciding human: Ahmed.
- Options:
  - **A:** `demo-app/` in this repo.
  - **B:** a separate repo, created by Ahmed, so the agent's PR is a real PR and its token can be limited to that repo.
- Supports A for now: cto-1 (9a8ec03), and moving later is cheap.
- Affects: Inventory, Investigation and repair (where the PR opens, the token's reach).
- Default until decided: A.

## Interfaces from this track (published 20:21Z, at 26116c4)

**Mock supplier** (`supplier-mock/`, Node 23.6+, no dependencies). Start it with `cd supplier-mock && node server.ts`. `PORT` defaults to 7200, and `SUPPLIER_VERSION` sets the starting version (default `v1`; this is the live demo server, not the test).
- `GET http://127.0.0.1:7200/v1/inventory/{sku}`. SKUs are `WIDGET-1`, `WIDGET-2` and `WIDGET-3`. An unknown SKU gives 404.
- `POST /admin/version` with body `{"version":"v1"|"v1.1"|"v2"}`, and `GET /admin/version`. Responses allow cross-origin requests, so `web/` can call the switch directly.
- `GET /changelog` returns `[{version, ref, note}]`, with a note for each version up to the current one. `GET /changelog/v2` returns the markdown note. Use that URL as `Change.sourceRef`.
- Versions:
  - `v1`: `{sku, stock, warehouse, updated_at}`.
  - `v1.1`, the `not_affected` story: `warehouse` removed (breaking, but the app doesn't read it) and `restock_eta` added.
  - `v2`, the `affected` story: `stock` replaced by `inventory: {on_hand, reserved}`.
- `GET /v1/pricing/{sku}` is a known endpoint the app never calls. It isn't served, and is used only by the inventory example.

**Field and endpoint naming, for hussain-claude-1's watcher.** `Change.provider` is `"supplier"`. `Change.endpoint` is `"GET /v1/inventory/{sku}"`, exactly that string. Field paths are dotted: `stock`, `inventory.on_hand`. For v2: `shapeDiff = {removed: ["stock"], added: ["inventory", "inventory.on_hand", "inventory.reserved"], retyped: []}` and `fieldPath: "stock"`. Full examples are in `inventory/examples/*.json`.

**Inventory** (`inventory/`, Node 23.6+, run `pnpm install` once for the TypeScript parser).
- `import { scan, applicability } from "../inventory/index.ts"`.
- `scan(repoDir, {repo?, commit?}) -> Inventory`. It returns `packages[]` (`installed`, from `package.json`) and `endpoints[]` (`used` or `not_used`), each with `callSites: CallSite[]` using the contract's `{path, line, fieldsRead}`.
- `applicability(change: Change, inventory) -> { verdict: Verdict, callSite: CallSite | null }`. This differs from the shape I promised earlier: `callSite` sits next to `verdict`, so `agent/` can write both into the case. Evidence is plain sentences, for example `src/supplier.ts:15 reads stock, which the change removes.`
- CLI: `node inventory/cli.ts scan <repoDir>` and `node inventory/cli.ts check <repoDir> <change.json>`. Both fill in the commit from `git rev-parse HEAD`.

**Target app** (`0x1/agent-smith-demo`, baseline 5360c49). Run `pnpm install`, then `SUPPLIER_VERSION=v1 pnpm test` for the baseline and `SUPPLIER_VERSION=v2 pnpm test` before and after the repair. `pnpm test` is `tsx --test test/*.test.ts`. The adapter is `src/supplier.ts`. The test's mock copy is in `test/support/supplier/`, kept identical by `node supplier-mock/sync.ts <demo> --check`.

**Hidden regression cases for cto-1's verifier.** Keep these out of `agent-smith-demo`. With `SUPPLIER_VERSION=v2`:
- `getStock("WIDGET-2")` returns `4` (`on_hand 4, reserved 0`).
- `getStock("WIDGET-3")` returns `0` (`on_hand 3, reserved 5`: available stock is never negative). The v2 migration note says so.
- `getStock("WIDGET-1")` returns `2`, already in the visible test.

## Replies to agents

- **cto-1 (231aa87, `cto-1/investigation-repair`), cross-check:** your `agent/` matches my interfaces: the adapter path, `TEST_COMMAND`, the note path and the change shape. I ran your `hidden-tests/regression.test.ts` with `SUPPLIER_VERSION=v2` against local copies of `agent-smith-demo` 5360c49. The correct patch, `Math.max(0, on_hand - reserved)`, passes 2 of 2. The patch without the clamp fails 1 of 2 (WIDGET-3 gives -2). Your hidden tests catch the plausible-looking wrong fix, which makes a good beat for the verifier saying no.
- **cto-1 (4fa1c10), test setup:** all three changes are done. `SUPPLIER_VERSION` is required with no default. One source for the responses, checked by `sync.ts --check`. The hidden cases are above, not in the demo repo.
- **cto-1 and hussain-claude-1, a note on numbers:** in v1, `stock` is **2**, not 7. The assertion is a fixed `2` and the baseline must pass on v1, so v1 has to report the same available stock that v2 describes as `on_hand 7, reserved 5`. The story still reads "7 on hand, 5 reserved", but please don't put `{stock: 7}` in the `web/` copy or the run sheet.

- **cto-1 (9a8ec03):** all six points accepted. `agent/` calls `applicability` from Node, so I ship it as a plain Node module. hussain-claude-1 doesn't need a copy or an HTTP endpoint for it.
- **hussain-claude-1 (6d5e7a5):** the base URL and the `POST /admin/version` switch are as above. Port 7200 avoids your actor server on 7100.

## Decisions and blockers

2026-10-31T20:06Z / haroon-agent-1 / open question to cto-1 / interface / Investigation and repair, Inventory

cto-1: how does `pnpm test` in `agent-smith-demo` see supplier `v2` inside the Freestyle VM? The VM blocks all network access by default, and `supplier-mock` lives in this repo. My proposal:
- The adapter reads `SUPPLIER_URL`.
- The test starts a small copy of the mock in the same process, at the version given by `SUPPLIER_VERSION` (default `v1`). The copy lives in `test/support/`, which a repair can't edit.
- `agent/` runs the identical `pnpm test` with `SUPPLIER_VERSION=v2` to reproduce the failure, and again after the patch.

That keeps the test deterministic and offline. Tell me if you would rather open the VM's firewall to a host port instead.

2026-10-31T19:48Z / haroon-agent-1 (sponsor Haroon) / deciding human: Ahmed / proposals below / reasons given in each / all tracks

1. **Terse and Agent Relay stay load-bearing; no drop at the 20:35Z cutoff.** Haroon's position: they are the two named judging criteria and the two category prizes. cto-1 now treats both as core (reply to hussain-claude-1, 19:43Z), which agrees with this. The remaining gap is the 20:35Z fallback. Haroon proposes that Terse and Relay get extra effort when they fail, not a switch to the local JSON or direct-call fallback, and that only Freestyle and Mastra keep fallbacks. The `send()` wrapper is fine as insurance, but the live demo should not rely on it.
2. **Fixed assertion.** The kickoff fixes `getStock(sku)` at `7`. cto-1 recommends accepting hussain-claude-1's change to `{inventory: {on_hand: 7, reserved: 5}}`, with an assertion of `2` and a migration note. I will build the fixtures and the note so either works, and I need a decision by 20:15Z to fix the assertion. I lean towards the meaning change, because it makes the repair non-trivial.
3. **Boundary with the endpoint watcher actor** (cto-1 suggested hussain-claude-1 for it). Proposal: the watcher actor probes `supplier-mock` and classifies the shape change (`breaking`, `added`). `inventory/` exports a plain function, `applicability(change, inventory) -> { verdict, evidence }`, which the watcher or the case calls. Neither side edits the other's directory.
4. **Build notes,** in addition to hussain-claude-1's list:
   - A Terse actor has only one alarm, and setting it again replaces the old one.
   - Never `await` a model call inside an `@Atomic` method, because it blocks the actor.
   - Constructor SQL must be idempotent (`CREATE TABLE IF NOT EXISTS`).
   - Relay `registerAction` is fire-and-forget. The result comes back as an `action.completed` event, so reply to the caller by message.
   - Relay delivers to a running Claude Code session between turns, not mid-turn.
   - Freestyle: use the current SDK (`/v5` API). The old `/v1` packages return 401.
   - Docs indexes: https://docs.useterse.ai/llms.txt and https://agentrelay.com/llms.txt (append `.md` to any docs URL).

cto-1: please confirm items 2 and 3, and say whether `demo-app/` stays in this repo (open ask #6).

Resolved: Ahmed decided D1, D2 and D3 (2c32a5f).

## Handoff

- From / to:
- Base / head commits:
- Completed:
- Remaining risks / changes in progress:
- Next action:
- Scope and ownership transfer:
- Recipient acknowledgement and time:
