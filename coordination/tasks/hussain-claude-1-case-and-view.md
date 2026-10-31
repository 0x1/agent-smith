# hussain-claude-1-case-and-view: Endpoint watcher, case actor and case view

- Status: claimed
- Agent handle: hussain-claude-1
- Human sponsor: Hussain (hussainarslan)
- Branch: hussain-claude-1/case-and-view
- Base commit: db8835a
- Head commit: see latest commit on this branch
- Claimed at (UTC): 2026-10-31T19:47:18Z
- Checkpoint due (UTC): 2026-10-31T20:15:00Z
- File scope (include shared files/lockfiles):
  - `actors/`: the Terse project, with its own `package.json` and `pnpm-lock.yaml`.
  - `web/`: the case view, with its own `package.json` and `pnpm-lock.yaml`.
  - `demo/`: the demo run sheet and scripts.
  - This task file.
  - No root `package.json`, workspace file or shared config without agreement first.
- Dependencies / overlapping claims checked: at 19:46 UTC, only cto-1's files and my review (PR #1). No other tracks have been claimed yet.

## Outcome and acceptance criteria

The track cto-1 suggested in the kickoff: Case and view, plus the endpoint watcher actor. I claim it, and nothing is built before 20:15 UTC.

1. **`EndpointWatcher` Terse actor**, one per watched endpoint, for example `supplier.get-inventory`.
   - It saves the endpoint's response structure (field path to type).
   - It probes on its alarm and also on demand through `probeNow()`.
   - It classifies each change as `breaking` or `added`.
   - A breaking change opens the case actor.
   - Its alarm is re-armed at startup, and the next alarm is set before any work is done.
2. **`Case` Terse actor**, one per case.
   - It holds the handoff record from cto-1's proposal.
   - Its ID is built from repo, provider, endpoint and field, using `.` only.
   - A `seen_events` table ignores exact repeat events.
   - The orchestrator writes the PR review state into it. It has no merge path.
3. **`web/` case view.**
   - Shows the endpoint's structure history and the change diff.
   - Shows the case status and evidence: test failing before and passing after, and the diff.
   - Shows the Agent Relay conversation through a read-only observer.
   - Shows the PR link and review state.
   - Updates live through Terse's state push.
4. **`demo/` run sheet.**
   - Includes a restart step: stop the server with `kill -9`, then show the state still there and the probes running again.

Done means each of these is shown working against an exact commit, with checks recorded as passed, failed or not run.

## Checkpoints

2026-10-31T19:47Z / hussain-claude-1 / claimed the Case and view track plus the endpoint watcher; no code before 20:15Z / this commit / 20:15Z

## Evidence

- Changes / exact paths: this task file only.
- Checks passed: none yet. No code.
- Environment, checked at 19:46 UTC:
  - Node 24.18.1, pnpm 12.16.1, Docker 29.3.1.
  - Bun 1.2.21 globally, which is below the 1.4.2 Terse needs. Bun 1.4.4 is installed in a local test folder; see "Decisions and blockers".
  - GitHub push access to this repo (`hussainarslan`, not admin).
  - No Freestyle or model keys. Terse and Agent Relay both run locally without an account.
- Earlier test programs: the Terse, Agent Relay, Mastra and Freestyle checks cited in PR #1 were written today between 11:50 and 12:30 PDT, after hacking began. They stay outside this repo. Code here will be written fresh during the build.
- Publication/review/release status: claim published on a branch with a PR; not merged or accepted.

## Decisions and blockers

2026-10-31T19:47Z / hussain-claude-1 / no human decision yet / items below / scope and interfaces before 20:15Z / all tracks

1. **The kickoff still describes the old story.** It says `{stock: 7}` becomes `{available_quantity: 7}`, the test is `npm test`, and "`getStock(sku)` returns `7`" is a fixed rule. If Ahmed accepts concerns 2 and 7 from PR #1, please update those lines so new agents don't build the old version.
2. **Scope.** The two actors plus the view is a fair load. I suggest moving the written submission to Ahmed or cto-1. I keep the demo run sheet.
3. **Interfaces I need**, all welcome at 20:15Z:
   - **cto-1:** the handoff record as code, and where it lives.
   - **Inventory track:** the mock supplier's base URL and a way to publish v2 on demand. Also the fields each call site reads, so an `added` field can resolve to `not_affected`.
   - **Investigation track:** the Agent Relay channel name and message shape.
4. **How other tracks call the actors.** Plain HTTP, tested from Node: `POST http://127.0.0.1:7100/v1/projects/local/actors/{Class}/{id}/invoke` with body `{requestId, method, args}`. No Bun or generated client is needed by the caller.
5. needs: Hussain. Upgrade the global Bun to 1.4.2 or newer, or use the local Bun 1.4.4. I'll use the local one unless told otherwise.

## Handoff

- From / to:
- Base / head commits:
- Completed:
- Remaining risks / changes in progress:
- Next action:
- Scope and ownership transfer:
- Recipient acknowledgement and time:
