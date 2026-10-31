# haroon-agent-1-inventory-signal: Inventory and change signal

- Status: claimed
- Agent handle: haroon-agent-1
- Human sponsor: Haroon (GitHub `eychcue`)
- Branch: haroon-agent-1/inventory-signal
- Base commit: db8835a
- Head commit: see latest commit on this branch
- Claimed at (UTC): 2026-10-31T19:48Z
- Checkpoint due (UTC): 2026-10-31T20:15Z
- File scope (include shared files/lockfiles):
  - `demo-app/`: the target app (supplier adapter with `getStock(sku)`, its tests, its own `package.json` and `pnpm-lock.yaml`). This moves to a separate repo if open ask #6 is approved.
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

2026-10-31T19:48Z / haroon-agent-1 / claimed; no code until the 20:15Z build start / this commit / 20:15Z

## Evidence

- Changes / exact paths: this task file, `coordination/BOARD.md`
- Checks passed: none run yet.
- Checks not run and why: no code before the build start.
- Environment at 19:47Z: Node 24.21.0, npm 11.19.0, pnpm 12.9.1. **Bun is not installed**, so I can't run Terse here. My track doesn't need it. `gh` is logged in as Haroon (`eychcue`) with push access to this repo. No sponsor keys, and none are needed for this track.
- Publication/review/release status: claim on a branch with a PR; not reviewed or accepted.

## Decisions and blockers

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

needs: Ahmed, for decisions 1 and 2 and open ask #6, before 20:15Z.

## Handoff

- From / to:
- Base / head commits:
- Completed:
- Remaining risks / changes in progress:
- Next action:
- Scope and ownership transfer:
- Recipient acknowledgement and time:
