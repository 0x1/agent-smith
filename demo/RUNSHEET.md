# Live demo run sheet

The stack runs on **Ahmed's machine**, where cto-1 runs and the keys live. `agent/` must start there. Every command below runs from the repo root on that machine unless it says otherwise.

On cto-1's machine, flipping the supplier to v2 took **29 seconds** to reach `repaired` with the verifier's accept.

## Rules

- **Never merge fix PRs in `0x1/agent-smith-demo` before the final demo.** Close rehearsal PRs instead. (haroon-agent-1's rule.)
- Every run starts with `agent-smith-demo` at tag **`demo-baseline`** (`e7afeb1`).
- Run `demo/reset.sh` before **every** run, rehearsal or live. Case IDs are deterministic, so without it a rehearsal case comes back already approved, and `agent/` (which only acts on `detected`) never repairs.
- Never run `reset.sh` while a repair is in flight.
- The bad-patch rejection beat is Ahmed's call and is not in this sheet.

## T-10 min: bring the stack up

Start the services in this order. Each one depends on the one before it.

| # | Service | Command | Healthy when |
|---|---|---|---|
| 1 | `agent-smith-demo` at baseline | `git -C ../agent-smith-demo fetch --tags && git -C ../agent-smith-demo checkout demo-baseline` | `git -C ../agent-smith-demo rev-parse --short HEAD` prints `e7afeb1` |
| 2 | supplier-mock :7200, actors :7100, watcher | `demo/reset.sh` (it calls `demo/up.sh`) | four green lines; the last is `reset done  baseline is v1 (has stock), cases=[]` |
| 3 | Relay :8787 | `HOME=$PWD/.relay-home agent-relay init --tools none`, in a separate `HOME` | workspace key written to `agent/.relay-workspace.json` |
| 4 | `agent/` | `cd agent && TARGET_REPO_DIR=$PWD/../../agent-smith-demo pnpm serve` | prints `agent polling EndpointWatcher/supplier.get-inventory` |
| 5 | web bridge and page :7300 | `cd web && pnpm start` | http://127.0.0.1:7300 shows the quiet view, with no `?fixture=1` banner |

What `demo/reset.sh` does, in this order:

1. Sets the supplier to v1.
2. Resets every case through the watcher.
3. Stops the actor server and deletes `actors/.durable-actors/`.
4. Starts the supplier if it is down and confirms v1.
5. Starts the actors.
6. Rearms: `watch("http://127.0.0.1:7200", "WIDGET-1", 5000)` on `EndpointWatcher/supplier.get-inventory`, the ID `agent/` polls.
7. Checks that the baseline has `stock`.

The supplier goes to v1 first so the baseline is v1. If the first probe saw v2, the "API just changed" moment would be lost.

`demo/up.sh` on its own is safe to rerun at any time. It keeps whatever is already running and never changes the supplier version.

Have two terminals ready. **T1** stays in the repo root, for supplier flips and scripts. **T2** shows the `agent/` log.

## The run (about 3 minutes)

| Time | Do | Say |
|---|---|---|
| 0:00 | Page on screen, quiet view. | "This app reads stock levels from a supplier's API. Agent Smith watches that API every five seconds, so we don't find out when customers do." |
| 0:15 | *Optional, the not-affected beat.* T1: `curl -s -XPOST localhost:7200/admin/version -d '{"version":"v1.1"}'`. Within 5 s, cases open; `agent/` marks them `not_affected`. | "The supplier just shipped an update: they dropped a warehouse field and added a restock date. Smith checked the code. Nothing reads either one, so there's nothing to fix and nobody gets paged." |
| 0:45 | **Detect.** T1: `curl -s -XPOST localhost:7200/admin/version -d '{"version":"v2"}'` | "Now a breaking release. They replaced the stock number with on-hand and reserved." |
| 0:50 | **Case.** The case card appears (`detected`), with the headline in plain language. | "Smith noticed on its next check and opened a case. It's a durable record, which matters in a minute." |
| 1:00 | **Investigate.** The status moves to `investigating`, showing the call site that reads the old field. | "It found the one place in the app that reads the old field." |
| 1:10 | **Repair.** The Relay conversation shows the request and the proposed fix. The failing test is shown before the fix. | "Here's the app's own test failing against the new API. The repair agent proposes a fix." |
| 1:25 | **Verify.** After the fix, the tests pass and the hidden regression test passes. The verifier accepts. Status `repaired`, about 29 s after the flip. | "A separate verifier checks the fix against tests the repair agent never saw. The app's numbers mean available stock: on-hand minus reserved, never below zero." |
| 1:40 | **PR.** Status `awaiting_approval`, and **Review the fix →** appears. Click it to open the PR in `0x1/agent-smith-demo`. | "It opened a normal pull request. Nothing merges until a person approves it." |
| 1:55 | **Approve.** Approve the review on GitHub. **Do not merge.** Then T1: `bun actors/scripts/invoke.ts Case agent-smith-demo.supplier.GET-v1-inventory-sku.stock patch '{"status":"approved","approval":{"state":"approved","by":"hussainarslan","at":"'$(date -u +%FT%TZ)'"}}'` | "Approved. Smith's job ends at a reviewed PR. The merge stays with the team." |
| 2:10 | **Restart proof.** T1: `demo/restart-proof.sh`. It takes about 40 s, because the old process's lease must expire. | "Last thing: I'm going to kill -9 the server that holds all of this." |
| 2:15 | While it waits, the page shows the actor source as down. | "That's a hard crash, with no graceful shutdown." |
| 2:50 | The script prints `probeCount N -> M, new pid A -> B, cases kept`, and the page shows the restart with the case intact. | "New process, same state. The case and its history survived, and the watcher picked up checking where it left off." |
| 3:00 | End. | |

### After the run

- Close the rehearsal PR in `0x1/agent-smith-demo`. Don't merge it.
- `git -C ../agent-smith-demo checkout demo-baseline`
- `demo/reset.sh`

## If something goes wrong

| Symptom | Fix |
|---|---|
| A case appears already `approved` or `repaired` right after the flip. | `reset.sh` was skipped. Flip to v1, run `demo/reset.sh`, flip to v2 again. |
| No case appears 10 s after the flip. | `bun actors/scripts/invoke.ts EndpointWatcher supplier.get-inventory getState` should show a rising `probeCount`. If it isn't rising, run `bun actors/scripts/rearm.ts`. Check that `lastError` is null. |
| Watcher calls return HTTP 503 `previous owner lease is still active`. | Normal for about 30 s after a `kill -9`. Wait; `invoke.ts` and `rearm.ts` retry on their own. |
| `reset.sh` says a port is held by another checkout. | Another copy of the stack is running from a different directory. Stop it there, or run the demo from that checkout. |
| Case stuck at `repaired`, no PR. | The token can't open the PR (seen at 20:58Z). Show the diff and the passing tests from the case view instead. |
| Logs | `demo/logs/actors.log`, `supplier.log`, `rearm.log`, `reset.json` |

## Known gaps (as of 21:05Z)

- **Approval write-back.** Nothing writes `approved` back to the case after the GitHub review. The `patch` command at 1:55 does it by hand.
- **The v1.1 beat** opens separate `warehouse` and `restock_eta` cases only once the per-field watcher PR is merged. Before that, v1.1 opens one `warehouse` case, which is still `not_affected`.
- **`agent/` uses the v2 note for every case.** It passes `notes/v2.md` as the migration note, including for the v1.1 cases. I raised this on PR #19.
