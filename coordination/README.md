# Agent coordination — small, explicit, recoverable

Git is our shared record, not a live chat bus. This protocol installs no services, scripts, hooks, dependencies or scheduled jobs. Agents must refresh manually at startup, before claiming/editing, before publishing, and at each checkpoint/handoff. Runtime Agent Relay integration is a separate product task.

## 1. Identify yourself

Choose a unique handle such as `owner-codex-1`, `haroon-agent-1`, or `cto-1`, and record it with your human sponsor in your task claim. Use your actual role, not someone else's identity. The examples do not register or activate those agents. Each human can have several uniquely named agents.

## 2. Claim before editing

Read the latest remote branch, `AGENTS.md`, `PROJECT.md`, the board and active task files. Copy `tasks/TEMPLATE.md` into a new task file with a unique task ID. Specify acceptance criteria, exact file/directory scope, branch, base commit, agent handle, human sponsor and a UTC checkpoint due within about 20 minutes. Keep all suggested work unclaimed until someone accepts it.

Publish the claim before changing shared code. Claims use optimistic concurrency: update against the exact version you read, refresh if the branch changed, and reconcile rather than force-pushing. Git accepting two different task files does not prove their scopes do not overlap: re-read active claims after publication. If two claims overlap, pause edits to that scope and agree a split or handoff first.

One active writer per scope. Cross-cutting changes, shared configuration, lockfiles and interfaces need explicit coordination. Prefer a small branch per task. Do not edit another agent's task except an explicitly accepted handoff. Board changes are short summaries; the per-task file is the authoritative detail.

## 3. Checkpoint, do not disappear

At or before your checkpoint, update progress, exact head commit, modified paths, blockers and next checkpoint. A short lease is a visibility promise, not an automatic lock or eviction. An overdue task is **stale**, not automatically free: inspect its branch and latest updates, request/record a handoff, and get the human coordinator's decision if ownership remains unclear. Never erase unfinished work to take over.

Use states: `proposed`, `claimed`, `working`, `blocked`, `review`, `done`, `canceled`. `done` means the task's stated criteria have evidence, not merely that code exists. Distinguish checks passed, failed and not run, and distinguish local, committed, published, reviewed and released.

## 4. Handoff and decisions

Append decisions and handoffs to the task file. Include recipient, summary, base/head commits, changed paths, checks and outcomes, unresolved risks, exact next action and any approval still needed. Recipient records acknowledgement before assuming ownership. If a handoff changes scope, update the claim and re-check conflicts.

Record decisions as `UTC time / proposer / deciding human or authorized role / decision or proposal / reason / affected tasks`. Technical recommendations do not authorize deployments, spending, permissions or credentials.

## 5. Finish safely

Before publishing, refresh the base and inspect your diff for unrelated edits and secret/private data. Preserve concurrent work. Never force-push shared branches. Use review/draft PRs where the repo requires them; do not merge or deploy merely because a task says so. Keep test evidence linked to the exact commit tested. Update the board after the task record, and leave a clean handoff if the hackathon ends mid-task.

This coordination layer is only for this hackathon. It does not change any other project's watches, agent roles or operating rules.
