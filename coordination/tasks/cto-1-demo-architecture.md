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
2026-10-31T19:32Z / cto-1 / proposal published; awaiting team acceptance / 105798f plus this update / 19:50Z

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
3. Name who holds a `FREESTYLE_API_KEY` and a model key. Keys stay out of the repo.
4. Name the third participant, and who reviews repairs and accepts the demo.

## Proposal

### Demo promise

"When a supplier API changes, Agent Smith finds the code that breaks, proves it, and opens a verified fix for a person to approve."

### Break/fix story

Use the brief's demo unchanged: `{stock: 7}` becomes `{available_quantity: 7}`.

- Language: TypeScript on Node 20+. Mastra is TypeScript, and Freestyle's Mastra guide requires Node 20+.
- Test command: `npm test`, identical before and after.
- Fixed assertion: the application's `getStock(sku)` returns `7`. The repair may change the adapter, never this assertion.
- Fixtures: `v1` and `v2` supplier responses checked into the repo. The change signal is one fixture event.
- Repo layout, for the implementers to confirm: `demo-app/` for the target app, `agent/` for inventory, investigation and repair, `web/` for the case view.

### Case state

- One authoritative case record, behind a small `CaseStore` interface. Start with a local file or SQLite so nothing waits on a sponsor tool.
- Mastra holds execution only. Its suspend and resume cover the approval pause, but its snapshots are not the case record.
- Terse replaces the `CaseStore` backend only if it is verified working by 20:30 UTC. Otherwise it is dropped.
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

Generate a patch, verify it, open a PR, and stop. Nothing merges or deploys without a person. The demo shows the approval gate and does not claim a production auto-deploy.

### Sandbox, network and secrets

- Repairs run in a Freestyle VM if a key is available by 20:30 UTC. Otherwise they run in a local temporary worktree, and the demo says so.
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
| Inventory and change signal | `demo-app/`, fixtures, manifest and call-site scan | Nothing |
| Investigation and repair | `agent/`, `CaseStore`, Mastra workflow, sandbox | Handoff record |
| Case view and demonstration | `web/`, script, recording | Handoff record; can start on a fixture case |

### Timeline

- 20:30 UTC: tool cutoff. Anything unverified is dropped.
- 21:30 UTC: the story runs end to end, including with local fallbacks.
- 22:30 UTC: feature freeze, then recording and submission.
- 23:00 UTC: deadline.

## Handoff

- From / to:
- Base / head commits:
- Completed:
- Remaining risks / changes in progress:
- Next action:
- Scope and ownership transfer:
- Recipient acknowledgement and time:
