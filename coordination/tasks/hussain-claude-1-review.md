# hussain-claude-1-review: Review cto-1's proposal against hands-on sponsor checks

- Status: review
- Agent handle: hussain-claude-1
- Human sponsor: Hussain (hussainarslan)
- Branch: hussain-claude-1/review-proposal
- Base commit: 4e0cf64
- Head commit: see latest commit on this branch
- Claimed at (UTC): 2026-10-31T19:41:55Z
- Checkpoint due (UTC): 2026-10-31T20:15:00Z
- File scope (include shared files/lockfiles): this task file; one new row in `coordination/BOARD.md`. No application code, lockfiles or shared configuration. cto-1's task file is not edited.
- Dependencies / overlapping claims checked: only `cto-1-demo-architecture` exists, and it is coordination-only. No other branches or PRs on `origin` at 19:41 UTC.

## Outcome and acceptance criteria

A short list of concerns about cto-1's proposal, backed by sponsor tools we ran today, for the team to accept or reject. Nothing here is a decision.

## Checkpoints

2026-10-31T19:42Z / hussain-claude-1 / claimed; concerns published for review / e964f19 / 20:00Z
2026-10-31T19:42Z / hussain-claude-1 / rechecked against 4aa04be and dropped points already covered; objections raised before the 20:15Z build start / 506a5e5 / 20:15Z
2026-10-31T19:45Z / hussain-claude-1 / corrected the previous checkpoint time to the commit's clock time (cto-1's request); timestamps now come from `date -u` / this commit / 20:15Z

## Evidence

- Checks passed: small local test programs, run today 18:50 to 19:25 UTC on Hussain's machine:
  - Terse durable-actors 0.14.6: recurring alarms, outbound `fetch`, one actor calling another, calls handled one at a time, state surviving `kill -9`, HTTP calls from Node, live websocket state.
  - Agent Relay 15.0.1, local server: channel post and threaded reply (8 to 28 ms), JSON metadata, a read-only observer stream, idempotency keys, Node and Bun.
  - Mastra 1.80.0: Agent with structured output and tools, on Node and Bun, against a mock model.
- Checks not run and why: Freestyle VM and real OpenAI calls, because no keys exist yet. Freestyle findings below come from the SDK 0.2.21 type definitions and docs only.
- Sources: https://github.com/TerseAI/durable-actors, https://github.com/AgentWorkforce/relay (the code behind agentrelay.com), https://www.freestyle.sh/docs/llms-full.txt
- Publication/review/release status: proposal on a branch, PR open; not reviewed or accepted.

## Concerns about cto-1's proposal (proposals only)

Reviewed against `4aa04be`. Points that commit already covers (sponsor links, Terse holding the case, the actor ID handling dedup, Node 22 plus Bun) are left out.

1. **Make watching the API the core** (Hussain's direction). A scheduled probe records the structure of what the supplier API actually returns and compares it with the last response. It classifies each change: breaking, added field, `Sunset`/`Deprecation` header, or outage. This replaces the changelog fixture, because reading changelogs already exists elsewhere (apidrift, Patch). Each watched endpoint gets its own Terse actor with a timer and the saved structure. Error monitoring and advisories are bonus inputs to the same case.
2. **Change the meaning, not just the name.** A rename proves little because any model fixes it in one pass. Suggest `{stock: 7}` becomes `{inventory: {on_hand: 7, reserved: 5}}`, with the assertion fixed at `2` available. Add regression tests the repair agent never sees, and reject any patch that touches `test/`.
3. **Make Agent Relay the core handoff path, not a step for after the main story works.** Run observer, repair and verifier as Relay agents, with the verifier's accept or reject sent as a reply. That earns the Relay track. Start it with `relay init --tools none`; plain `init` edits the Claude and Codex configs and turns on message injection. Agents must call `channels.join` or they hear nothing.
4. **Terse alarms do not survive a restart.** In our test, saved state survived `kill -9` but pending alarms were gone. Anything on a timer needs re-arming at startup. Also, if `onAlarm` throws it is not retried, so set the next alarm before doing the work.
5. **Terse details:**
   - The dev command we ran is `bunx durable-actors dev`, not `terse actor dev`.
   - IDs must match `^[A-Za-z0-9._-]+$`, so build case IDs with `.`, not `:`.
   - Add a `seen_events` table for exact repeat events.
6. **Freestyle `vm.exec`** times out after 30 s by default. The SDK types show the timeout can be raised to 300,000 ms with `timeoutMs`, and `exec` has no working-directory option. The pricing docs list 10 snapshots on the free plan, so snapshotting after `pnpm install` may be allowed and would keep test runs warm.
7. **Use pnpm instead of `npm test`.**
8. **With the PR as the gate, the case never learns it was approved.** Something has to read the PR's review state, or the case view's approve button performs the merge.

## Decisions and blockers

2026-10-31T19:42Z / hussain-claude-1 / no human decision yet / concerns above / brings tested sponsor facts in before decisions become final at 20:15 UTC / all board tasks

## Handoff

- From / to:
- Base / head commits:
- Completed:
- Remaining risks / changes in progress:
- Next action:
- Scope and ownership transfer:
- Recipient acknowledgement and time:
