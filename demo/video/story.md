# Agent Smith video: story

The source is the final video brief, `coordination/tasks/haroon-agent-1-video-brief.md`, which Ahmed's decisions closed at ca416aa. `beats.json` is that script as input for the video tool. One beat is one script row, with each caption and spoken line written from the brief's "Voice" column. The intro and outro cards come from `brand.json`.

- **Length and voice:** 2 minutes, with the tool's default local voice.
- **When and where:** in the freeze hour after 22:00Z, on Ahmed's machine, with no exposed URL. The tool is run only and never committed.
- **One real run:** v1, then v2, then repair, verify, PR, approve, then the restart. Every figure on screen comes from that recorded run.

## Chapters, beats and the data behind them

| Beat | Shows | Real data |
|---|---|---|
| `problem` | The case view, quiet | "All quiet. Watching 1 endpoint." |
| `watcher` | The watcher chip counting | `EndpointWatcher/supplier.get-inventory`, a Terse durable actor, probing every 5 s. `probeCount` is live |
| `flip` | Presenter: supplier to v2 | `POST /admin/version {"version":"v2"}` on `supplier-mock` |
| `noticed` | The "Noticed" card | `stock: 2` becomes `inventory: { on_hand: 7, reserved: 5 }`; the case opens at `detected` |
| `checked` | The "Checked" card | `getStock()` in `src/supplier.ts:15` reads `stock` (from `inventory/applicability`) |
| `not-affected` | Footnotes from the same v2 flip | `warehouse` removed and `restock_eta` added, each its own case marked `not_affected` (PR #32) |
| `fixed` | The "Fixed" card and the Agent Relay thread | Fixer, then verifier, on `agent-smith-repairs`. The verifier owns the tests |
| `proved` | The "Proved" card | `Case.proof`: 7 − 5 = 2. `pnpm test` fails before and passes after. Hidden checks: `regression.passed` of `regression.total` (2 of 2 today) |
| `bad-patch` | **Conditional.** A deliberately bad patch, labelled on screen | The verifier rejects it ("should be 0, but the fix returned -2"). Its `say` begins "Deliberately bad patch" |
| `approve` | The "You" card | Haroon or Hussain clicks Approve on the real PR; Ahmed can't, because it opens under his login. The case reads "Approved by … · nothing merged or deployed" |
| `restart` | The watcher chip after `demo/restart-proof.sh` | `kill -9`, then a new pid. State survives, alarms are re-armed by `rearm`, and `probeCount` keeps rising |
| `close` | The case view, approved | Closing line |

## Conditional beat

**Remove the `bad-patch` beat** unless the main run is stable at 22:00Z (Ahmed, ca416aa). The rest of the script still fits without it.

## Left out, and why

- **No terminal on screen.** The web recorder can't capture one, so the restart is shown through the watcher chip.
- **No staged failures.** The real repair passes on the first try, which cto-1 measured at 5 of 5 attempts. The only rejection is the labelled bad patch.
- **After recording:** close the fix PR in `agent-smith-demo` and don't merge it. Then run `demo/reset.sh` before the live demo.
