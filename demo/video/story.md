# Agent Smith video: story

The source is the final video brief, `coordination/tasks/haroon-agent-1-video-brief.md`, which Ahmed's decisions closed at ca416aa, including cto-1's accuracy fixes at edb62e1. `beats.json` is that script as input for the video tool. One beat is one script row, with each caption and spoken line written from the brief's "Voice" column. The intro and outro cards come from `brand.json`, which uses the calm palette from Ahmed's front-end direction (4ec6924, step 1): warm off-white, dark ink, one muted slate accent, and no shadows.

- **Length and voice:** 2 minutes, with the tool's default local voice.
- **When and where:** in the freeze hour after 22:00Z, on Ahmed's machine, with no exposed URL. The tool is run only and never committed.
- **One real run:** v1, then v2, then repair, verify, PR, approve, then the restart. Every figure on screen comes from that recorded run.

## Chapters, beats and the data behind them

| Beat | Shows | Real data |
|---|---|---|
| `problem` | **The start screen**: "Keep your app working when the APIs it depends on change.", with the repo field `0x1/agent-smith-demo` and "Demo: one connected repo, one known provider." | Step 4 of Ahmed's direction (#50) |
| `watcher` | Click **Scan this repo**. **What we found**: inventory is used by `getStock()` in `src/supplier.ts:15`, and pricing is not called. Then the case view, with the watcher line (single Live dot) counting checks | `EndpointWatcher/supplier.get-inventory`, a Terse durable actor, probing every 5 s. `probeCount` is live |
| `flip` | Presenter: supplier to v2 | `POST /admin/version {"version":"v2"}` on `supplier-mock` |
| `noticed` | The "Noticed" card | `stock: 2` becomes `inventory: { on_hand: 7, reserved: 5 }`; the case opens at `detected` |
| `checked` | The "Checked" card | `getStock()` in `src/supplier.ts:15` reads `stock` (from `inventory/applicability`) |
| `not-affected` | Footnotes from the same v2 flip | `warehouse` removed and `restock_eta` added, each its own case marked `not_affected` (PR #32) |
| `fixed` | The "Fixed" step, then **open "See how we know"** to show the Agent Relay thread | Fixer, then verifier, on `agent-smith-repairs`. The verifier owns the tests |
| `proved` | The "Proved" card | `Case.proof`: 7 − 5 = 2. `pnpm test` fails before and passes after. Hidden checks: `regression.passed` of `regression.total` (2 of 2 today) |
| `bad-patch` | **Conditional.** A deliberately bad patch, labelled on screen, in the **Agent Relay conversation** under "See how we know" | The verifier's message carries the numbers: "should be 0, but the fix returned -2". Its `say` begins "Deliberately bad patch". **The case's proof block doesn't change**, because the bad patch never touches the case |
| `approve` | The "You" card | Haroon or Hussain clicks Approve on the real PR; Ahmed can't, because it opens under his login. The case reads "Approved by … · nothing merged or deployed". **Verify before recording:** this needs PR #36 merged and a test approval on `agent-smith-demo` #2. If it isn't verified, show only the PR's Approve click |
| `restart` | The restart chip ("Restarted the watcher at … · pid … → …", shown for a while after a real restart) after `demo/restart-proof.sh` | `kill -9`, then a new pid. State survives, alarms are re-armed by `rearm`, and `probeCount` keeps rising |
| `close` | The case view, approved | Closing line |

## Conditional beat

**Remove the `bad-patch` beat** unless the main run is stable at 22:00Z (Ahmed, ca416aa). The rest of the script still fits without it.

## Left out, and why

- **No terminal on screen.** The web recorder can't capture one, so the restart is shown through the watcher chip.
- **No staged failures.** The real repair passes on the first try, which cto-1 measured at 5 of 5 attempts. The only rejection is the labelled bad patch.
- **After recording:** close the fix PR in `agent-smith-demo` and don't merge it. Then run `demo/reset.sh` before the live demo.

## Screen changes from Ahmed's front-end direction (4ec6924)

- **Step 2 (one-column view, #47) is checked.**
  - The steps read as a quiet timeline.
  - The Agent Relay thread and the evidence sit under **"See how we know"**. The recorder opens it for the `fixed` and `bad-patch` beats.
  - One Live dot replaces the three chips.
  - The restart chip still appears after a real restart.
- **Step 4 landed (#50, 21:55Z).** The video opens on the start screen. `problem` is the headline, and `watcher` is the real scan (`GET /api/inventory`) and its What we found table, followed by the case view. The voice lines don't change.
- **Step 5 landed (#51).** "How this fits your team" isn't in the 2-minute script. Show it only if a beat runs short. Never imply that the "Next" part works.

## Ahmed's latest wording (cto-1 on PR #55, 22:49Z)

- The landing step is **Find dependencies**: Agent Smith finds every dependency an app relies on. "Demo: one connected repo, one known provider" stays visible, and is the subtitle on the first chapter card.
- The active steps read **Noticing, Checking, Fixing, Proving, Your turn**. The chapter titles now follow them: Find dependencies · Noticing and checking · Fixing and proving · Your turn · Durable.
- "**Mock supplier**" is said once, in the `flip` beat.
- Only `problem` changed its voice line, to match the new landing step. Every other line is the team's final script.
