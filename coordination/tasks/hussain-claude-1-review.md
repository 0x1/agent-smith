# hussain-claude-1-review: Review cto-1's proposal against hands-on sponsor checks

- Status: review
- Agent handle: hussain-claude-1
- Human sponsor: Hussain (hussainarslan)
- Branch: hussain-claude-1/review-proposal
- Base commit: 4e0cf64
- Head commit: see latest commit on this branch
- Claimed at (UTC): 2026-10-31T19:42:00Z
- Checkpoint due (UTC): 2026-10-31T20:00:00Z
- File scope (include shared files/lockfiles): this task file; one new row in `coordination/BOARD.md`. No application code, lockfiles or shared configuration. cto-1's task file is not edited.
- Dependencies / overlapping claims checked: only `cto-1-demo-architecture` exists, and it is coordination-only. No other branches or PRs on `origin` at 19:41 UTC.

## Outcome and acceptance criteria

A short list of concerns about cto-1's proposal, backed by sponsor tools we ran today, for the team to accept or reject. Nothing here is a decision.

## Checkpoints

2026-10-31T19:42Z / hussain-claude-1 / claimed; concerns published for review / this commit / 20:00Z

## Evidence

- Checks passed: small local test programs, run today 18:50 to 19:25 UTC on Hussain's machine:
  - Terse durable-actors 0.14.6: recurring alarms, outbound `fetch`, one actor calling another, calls handled one at a time, state surviving `kill -9`, HTTP calls from Node, live websocket state.
  - Agent Relay 15.0.1, local server: channel post and threaded reply (8 to 28 ms), JSON metadata, a read-only observer stream, idempotency keys, Node and Bun.
  - Mastra 1.80.0: Agent with structured output and tools, on Node and Bun, against a mock model.
- Checks not run and why: Freestyle VM and real OpenAI calls, because no keys exist yet. Freestyle findings below come from the SDK 0.2.21 type definitions and docs only.
- Sources: https://github.com/TerseAI/durable-actors, https://github.com/AgentWorkforce/relay (the code behind agentrelay.com), https://www.freestyle.sh/docs/llms-full.txt
- Publication/review/release status: proposal on a branch, PR open; not reviewed or accepted.

## Concerns about cto-1's proposal (proposals only)

1. **Open ask #2 is resolved.** Terse is https://github.com/TerseAI/durable-actors and Agent Relay is https://agentrelay.com/. Both ran locally without an account. Terse and Agent Relay host the event and judge two tracks, with bonus points for using both, so treating them as optional may cost those tracks.
2. **Hussain's direction for the core:** watch what the supplier API actually returns, rather than reading a changelog fixture. A scheduled probe records the response's structure, compares it with the last one, and classifies the change: breaking, added field, `Sunset`/`Deprecation` header, or outage. Changelog reading already exists elsewhere (apidrift, Patch). Error monitoring and security advisories become bonus inputs to the same case. Terse fits naturally: one actor per watched endpoint, with its own timer and saved structure.
3. **The rename is too easy to prove much.** Suggest `{stock: 7}` becomes `{inventory: {on_hand: 7, reserved: 5}}`, with the expected available quantity fixed at `2`. Add regression tests the repair agent never sees, and reject any patch that touches `test/`.
4. **Deduplication needs a key.** Derive `caseId` from project, provider, endpoint and field, for example `projectA.supplier.get-inventory.stock`. Terse IDs reject `:`. One actor per case already stops two signals from creating two cases. Add `seen_events` for exact repeats.
5. **Restart behaviour:** in our test, Terse kept saved state after `kill -9` but lost pending alarms. Anything on a timer needs re-arming at startup.
6. **Runtimes:** Terse's TypeScript side needs Bun 1.4.2 or newer. The Relay SDK needs Node 22 or newer. Suggest pnpm instead of npm.
7. **Freestyle `vm.exec`** defaults to a 30 s timeout (pass `timeoutMs` up to 300,000), has no working-directory option, and requires a firewall setting on create. Snapshot after `pnpm install` so test runs start warm.
8. **The case never learns about approval when the PR is the gate.** Something has to read the PR's review state, or the dashboard's approve button performs the merge.

## Decisions and blockers

2026-10-31T19:42Z / hussain-claude-1 / no human decision yet / concerns above / brings tested sponsor facts into the 20:00 UTC acceptance / all board tasks

## Handoff

- From / to:
- Base / head commits:
- Completed:
- Remaining risks / changes in progress:
- Next action:
- Scope and ownership transfer:
- Recipient acknowledgement and time:
