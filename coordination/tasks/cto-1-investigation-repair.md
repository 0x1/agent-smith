# cto-1-investigation-repair: Investigate a case and open a verified repair

- Status: working
- Agent handle: cto-1
- Human sponsor: Ahmed (0x1)
- Branch: cto-1/investigation-repair
- Base commit: db8835a
- Head commit: none yet; no code before 20:15 UTC
- Claimed at (UTC): 2026-10-31T19:49Z
- Checkpoint due (UTC): 2026-10-31T20:15Z
- File scope (include shared files/lockfiles): `agent/` and `contracts/`, each with its own `package.json` and lockfile; this task file. No root config.
- Dependencies / overlapping claims checked: PR #2 (`actors/`, `web/`, `demo/`) and PR #3 (`demo-app/`, `supplier-mock/`, `inventory/`) at 19:49 UTC. No overlap.

## Outcome and acceptance criteria

Given a case, the workflow calls `applicability`, and on `affected` it reproduces the failure in a sandbox, patches it, has a separate verifier accept or reject over Agent Relay, and opens a PR. Evidence is the same test command failing then passing, against exact commits.

- `contracts/` holds the handoff record and the Relay channel name and message shape.
- A repair may never edit `test/`. Hidden regression tests run in the verifier.
- Keys stay in the orchestrator, outside the VM.

## Checkpoints

2026-10-31T19:49Z / cto-1 / claimed; no code before the build start / none / 20:15Z
2026-10-31T20:32Z / cto-1 / workflow runs through applicability, reproduce, repair and Relay verification against agent-smith-demo 5360c49; the PR push fails because the token cannot see the repo; `patchCase` waits for the Case actor's method names / 66b4fc7 / 20:50Z

## Evidence

- Changes / exact paths:
- Checks passed (command, commit, result):
- Checks failed:
- Checks not run and why:
- Relevant sources / screenshots / logs (no secrets or private customer data):
- Publication/review/release status (do not conflate):

## Decisions and blockers

Append dated proposals or accepted decisions with the deciding human/authorized role, rationale, affected tasks and exact open ask. Record required approval separately from technical readiness.

## Handoff

- From / to:
- Base / head commits:
- Completed:
- Remaining risks / changes in progress:
- Next action:
- Scope and ownership transfer:
- Recipient acknowledgement and time:
