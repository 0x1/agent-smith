# cto-1-demo-architecture: Confirm demo and architecture

- Status: review
- Agent handle: cto-1
- Human sponsor: Ahmed (0x1)
- Branch: main (coordination files only)
- Base commit: fb95bcd
- Head commit: see latest commit touching this file
- Claimed at (UTC): 2026-10-31T19:30:12Z
- Checkpoint due (UTC): 2026-10-31T19:50:00Z
- File scope (include shared files/lockfiles): this task file; the "Confirm demo and architecture" row of `coordination/BOARD.md`. No application code, lockfiles or shared configuration.
- Dependencies / overlapping claims checked: no other task files, branches or PRs on `origin` at 19:30 UTC.

## Outcome and acceptance criteria

One written recommendation the team can accept or change, covering the "Decisions still needed" list in `PROJECT.md`.

- One break/fix story with its language, repo layout and test command.
- One source of truth for case state and a minimum handoff schema.
- A stated autonomy level and approval boundary.
- Sandbox, network and secret boundaries, and what the demo simulates.
- A checked, per-tool view of the sponsor tools, separating what was verified from what was not.
- Suggested task split for the other three board items. Suggestions stay unclaimed until someone accepts them.

Everything here is a proposal until a human records acceptance. Done means the recommendation is published and accepted or amended by the team.

## Checkpoints

2026-10-31T19:30Z / cto-1 / claimed; reading sources for tool checks / fb95bcd / 19:50Z
2026-10-31T19:32Z / cto-1 / proposal published; awaiting team acceptance / d8b2ad5 / 19:50Z
2026-10-31T19:33Z / cto-1 / revised: owner asked for 1 hour of polish, so freeze moves to 22:00 UTC; applicability made core; PR is the approval gate; separate target repo proposed / this update / 19:50Z

## Evidence

- Changes / exact paths: `coordination/tasks/cto-1-demo-architecture.md`, `coordination/BOARD.md`
- Checks passed (command, commit, result): documentation review only. Local tools at 19:31 UTC: Node 26.13.0, npm 11.20.0, Python 3.15.2, Docker 20.10.20.
- Checks failed: web searches for Terse found no matching product; searches for Agent Relay found several unrelated projects.
- Checks not run and why: no Mastra, Freestyle, Terse, Agent Relay or Supabase code was run, because no code or keys exist yet. Freestyle pricing and rate limits were not checked.
- Relevant sources / screenshots / logs (no secrets or private customer data):
  - https://www.freestyle.sh/docs/guides/give-your-mastra-agent-a-sandbox.md
  - https://mastra.ai/docs/workflows/suspend-and-resume
- Publication/review/release status (do not conflate): proposal published on `main`; not reviewed or accepted.

## Decisions and blockers

2026-10-31T19:32Z / cto-1 / no human decision yet / proposal below / keeps the demo honest and finishable by 23:00 UTC / all board tasks

Open asks for the team:

1. Accept or change this proposal.
2. Send a link to Terse and to the specific Agent Relay product. Web searches found no Terse product, and several unrelated projects are called Agent Relay.
3. No Freestyle account exists yet. Ahmed creates any services the team needs (Ahmed, 19:34 UTC), so agents should not sign up for anything. Needed: Freestyle, a model key, and a token limited to the target repo. Keys stay out of the repo.
4. Name who reviews repairs and accepts the demo. The third participant is Hussain (`hussainarslan`, write access confirmed at 19:32 UTC).
5. Share the judging criteria and any sponsor-tool requirements.
6. Approve or decline a separate target repo.

## Proposal

### Demo promise

"When a supplier API changes, Agent Smith finds the code that breaks, proves it, and opens a verified fix for a person to approve."

### Break/fix story

Use the brief's demo unchanged: `{stock: 7}` becomes `{available_quantity: 7}`.

- Language: TypeScript on Node 20+. Mastra is TypeScript, and Freestyle's Mastra guide requires Node 20+.
- Test command: `npm test`, identical before and after.
- Fixed assertion: the application's `getStock(sku)` returns `7`. The repair may change the adapter, never this assertion.
- Fixtures: `v1` and `v2` supplier responses checked into the repo. The change signal is a realistic changelog entry stored as a fixture.
- Applicability is core, not stretch: a second change to an endpoint the app does not call must end as `not_affected`, with the evidence shown. This is what separates the product from a dependency bot.
- Target app: a small separate repo, so the agent's PR is a real PR and the agent's token can be limited to that repo. If a new repo is not approved, use `demo-app/` here.
- Repo layout, for the implementers to confirm: `agent/` for inventory, investigation and repair, `web/` for the case view.

### Case state

- One authoritative case record, behind a small `CaseStore` interface. Start with a local file or SQLite so nothing waits on a sponsor tool.
- Mastra holds execution only. Its snapshots are not the case record.
- Terse replaces the `CaseStore` backend only if it is verified working by 20:15 UTC. Otherwise it is dropped, unless judging rewards it and the team chooses to keep trying.
- Supabase, if used, is a read-only view.

Minimum handoff record:

```json
{
  "caseId": "",
  "status": "open | investigating | repaired | awaiting_approval | approved | rejected | not_affected",
  "change": { "provider": "", "summary": "", "sourceRef": "" },
  "callSite": { "path": "", "line": 0 },
  "attempt": 0,
  "baseCommit": "",
  "headCommit": "",
  "testCommand": "",
  "before": { "exitCode": 0, "logRef": "" },
  "after": { "exitCode": 0, "logRef": "" },
  "approval": { "state": "pending | approved | rejected", "by": "", "at": "" }
}
```

### Inventory evidence

For the demo, only two states matter. `installed` means found in a manifest. `used` means a call site was found, with file and line. An advisory or change applies only to `used`. `planned` and `removed` stay out of scope.

### Autonomy

Generate a patch, verify it, open a PR, and stop. The PR review is the approval gate, so no custom approval flow is needed. Nothing merges or deploys without a person. The demo does not claim a production auto-deploy.

### Sandbox, network and secrets

- Repairs run in a Freestyle VM if it is working by 20:15 UTC. Otherwise they run in a local temporary worktree, and the demo says so.
- The token that opens the PR is limited to the target repo. No personal `gh` token goes to the agent.
- Freestyle's guide says the default firewall rule allows public destinations, so set the firewall explicitly and allow only what the install step needs.
- Keep model and provider keys in the orchestrator, outside the VM. The guide describes no secret isolation controls, so assume anything in the VM can be read by the agent.
- Simulated in the demo: the supplier, the change event, and the absence of production.

### Sponsor tools

| Tool | Finding | Proposal |
|---|---|---|
| Mastra | Docs confirm workflows with suspend and resume, and snapshots in a configured storage provider | Use for investigation and repair. Not yet run here. |
| Freestyle | Docs confirm Linux VMs, `vm.exec()`, snapshots and a Mastra sandbox guide | Use if keyed. Not yet run here. `executeCommand` caps at 300,000 ms, and background processes need extra work. |
| Terse | Not found | Blocked on a link |
| Agent Relay | Name is ambiguous | Blocked on a link. A plain typed function call is enough for the demo. |
| Supabase | Not checked; optional in the brief | Skip unless the case view needs it |

### Suggested split (unclaimed until accepted)

| Board item | Scope | Depends on |
|---|---|---|
| Inventory and change signal | Target app, fixtures, deterministic manifest and call-site scan, `not_affected` path | Nothing |
| Investigation and repair | `agent/`, `CaseStore`, Mastra workflow, sandbox, PR creation | Handoff record |
| Case view and demonstration | `web/`, script, recording, submission | Handoff record; can start on a fixture case |

### Timeline

- 20:00 UTC (13:00 PDT): proposal accepted, tasks claimed, handoff record and fixtures on `main`.
- 20:15 UTC (13:15 PDT): tool cutoff. Anything unverified is dropped or moved to its fallback.
- 21:15 UTC (14:15 PDT): the main story runs end to end, including with local fallbacks.
- 22:00 UTC (15:00 PDT): feature freeze. Bug fixes only, and one known-good run recorded as a backup.
- 22:00 to 22:45 UTC (15:00 to 15:45 PDT): polish, script, recording.
- 22:45 UTC (15:45 PDT): submit. The remaining 15 minutes are buffer.
- 23:00 UTC (16:00 PDT): deadline.

## Handoff

- From / to:
- Base / head commits:
- Completed:
- Remaining risks / changes in progress:
- Next action:
- Scope and ownership transfer:
- Recipient acknowledgement and time:
