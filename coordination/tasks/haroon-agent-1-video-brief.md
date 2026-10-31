# haroon-agent-1-video-brief: What the demo video says and shows

- Status: done (script final; changes now only by agreement)
- Agent handle: haroon-agent-1
- Human sponsor: Haroon (GitHub `eychcue`)
- Branch: haroon-agent-1/inventory-signal
- Base commit: be1ac43
- Head commit: see latest commit touching this file
- Claimed at (UTC): 2026-10-31T21:04Z
- Checkpoint due (UTC): 2026-10-31T21:25Z
- File scope (include shared files/lockfiles): this file only. No code, and no files in `demo/` or `web/`.
- Dependencies / overlapping claims checked: `hussain-claude-1/video-ask` (PR #28) proposes using Hussain's video tool. This brief is the **input** to that tool, not a second video. No overlap with `demo/RUNSHEET.md`, which hussain-claude-1 owns and which covers running the live stack.

## Outcome and acceptance criteria

One shared brief the team agrees on before anyone records: the message, the must-show moments, a draft script with voice-over, and the recording plan. Hussain's video tool then takes this as its input.

Done means Ahmed, Hussain and Haroon have each said "yes" or given changes under "Team input", and the script is marked final.

**How to add input:** each agent appends to its own heading under "Team input", or comments on this file's PR. haroon-agent-1 folds agreed changes into the script. This is the one exception to "edit only your own file", for that section only. Haroon proposed it, and it is open to all three humans' agents.

## Decisions from Ahmed (recorded by cto-1 at ca416aa, 21:17Z)

1. **Length: 2 minutes.** The submission form's exact fields are still for Ahmed to check.
2. **Voice: the tool's default local voice.**
3. **When and where. Decided by Ahmed (via cto-1, PR #28):** during the freeze hour, after 22:00Z (15:00 PDT), on Ahmed's machine, with no exposed URL. Run only, never committed. Rehearsing the live demo comes first.
4. **The PR step works.** The token is fixed, and the first automatic fix PR is `agent-smith-demo` #2. Close the PR from the recording run; never merge it.
5. **Labelled bad patch: yes, if the main run is stable by 22:00Z.** It's said out loud and labelled on screen as deliberate, and it runs through the real verifier as its own Relay exchange. If it isn't stable, skip the 1:22 beat and the script still fits.
6. **Approval on stage:** Haroon or Hussain clicks Approve, because Ahmed can't approve PRs opened under his login. Ahmed hasn't yet said which of them.

## The message

**One line:** "When an API you depend on changes, a team of agents finds the code it breaks, proves the break, and hands you a tested fix to approve."

**For these judges:** the hosts are Terse (Durable Actors) and Agent Relay. Both must be visibly load-bearing, not mentioned in passing.

## Must show, in order (all from real runs)

1. **The problem, in one sentence.** Apps hard-code third-party APIs, and those APIs change underneath them.
2. **Terse, durable watching.** The `EndpointWatcher` is a Terse durable actor probing the supplier: "checked 2 s ago, N checks".
3. **The change.** The presenter flips the supplier to v2. Nobody starts the agents.
4. **Noticed.** The response changed from `stock: 2` to `inventory: {on_hand: 7, reserved: 5}`.
5. **Checked: is this app affected?** "`getStock()` in `src/supplier.ts:15` reads `stock`, which the change removes."
   - And the opposite case, from the same flip (once PR #32 is merged): the watcher opens one case per field, so `warehouse` (removed) and `restock_eta` (added) end as `not_affected`, with the reason. This is what separates us from a dependency bot.
6. **Fixed, over Agent Relay.** The fixer and the verifier talk in the case's Relay conversation. The verifier owns the tests, and the fixer can't edit them.
7. **Proved.** The same command, `SUPPLIER_VERSION=v2 pnpm test`, fails before and passes after. 7 − 5 = 2 is shown from the real run, and the verifier's hidden checks pass (2 of 2).
8. **You decide.** A PR for a human. Nothing merges or deploys by itself.
9. **Terse durability.** `kill -9` the actor server. The case and the watcher's state survive. Pending alarms don't, so `rearm` in `demo/restart-proof.sh` restarts the checks, and we say so.
10. **Speed.** About 29 seconds from the change to a verified fix, with nobody starting it (cto-1's run, 20:58Z). Use the time measured in the recorded run, not this number.

## Honesty rules

- Only real runs. No staged rejection, no hard-coded numbers, no fake progress.
- Keep the header label visible: "Controlled demo · mock supplier · nothing deploys".
- Don't claim production auto-deploy, or support for any API beyond what we show.
- Say "a mock supplier" once, plainly. Judges respect it.
- If a step fails during recording, re-record, or show what really happened. Don't edit it to look like it passed.

## Draft script (about 2 minutes)

Timings are targets. "Screen" is what's visible, and "Voice" is the voice-over.

| Time | Screen | Voice |
|---|---|---|
| 0:00 | Title card: "Agent Smith". Subtitle: the one-line message. | "Every app depends on APIs it doesn't control. When one changes, things break quietly, and someone spends a day finding out why." |
| 0:10 | Case view, quiet state: "All quiet. Watching 1 endpoint." Watcher chip counting checks. | "Agent Smith watches the APIs your app actually calls. This watcher is a Terse durable actor. It checks our supplier every few seconds and remembers exactly what its responses look like." |
| 0:22 | Presenter menu: switch supplier to v2. | "Now the supplier ships a new version. Stock isn't one number any more. It's on-hand and reserved." |
| 0:30 | "Noticed" card. The response before and after. | "The watcher notices within seconds and opens a case. Nobody pressed a button." |
| 0:38 | "Checked" card: `getStock()` in `src/supplier.ts:15` reads `stock`. | "First question: does this actually affect us? Agent Smith reads the app's code and finds the one function that reads the removed field." |
| 0:48 | Footnote cards from the same v2 flip: `warehouse` removed and `restock_eta` added, each "not affected", with the reason. | "The same update also removed a warehouse code and added a restock date. The app reads neither, so Agent Smith checks them, shows why, and sets them aside. No noise." |
| 0:56 | "Fixed" card and the Relay conversation: fixer, then verifier. | "A repair agent writes a fix in a sandbox. A separate verifier, over Agent Relay, owns the tests. The fixer can't touch them." |
| 1:10 | "Proved" card: 7 − 5 = 2. Same command, red then green. Hidden checks 2 of 2. | "Same test command, failing before and passing after. Seven on hand, five reserved: two to sell. And the verifier's hidden checks pass too, including never selling stock we don't have." |
| 1:22 | *Only if stable by 22:00Z.* Labelled on screen as a deliberate bad patch. The verifier sends back a patch without the clamp: 3 − 5 = −2, struck through. | "To show the verifier really checks, here's a deliberately bad patch. It forgets that stock can't go below zero, so the verifier sends it back." |
| 1:30 | "You" card. A teammate (not Ahmed) clicks Approve on the PR, and the case reads "approved by …". Nothing merges. | "Then it stops and hands you a tested PR. A person approves. Nothing merges or deploys by itself." |
| 1:40 | `kill -9` the actor server (`demo/restart-proof.sh`). On the case view, the watcher chip turns to "Restarted · new process · state intact". The web recorder can't show a terminal. | "Every case lives in a Terse durable actor. Kill the server, and nothing is lost: the case and the watcher's memory survive, the watcher is re-armed, and it carries on counting." |
| 1:52 | End card: "Agent Smith". Built on Terse Durable Actors and Agent Relay. Team names. | "Your app stays up to date with the APIs it depends on. Agent Smith." |

## Recording plan

Steps 1 to 4 are on Ahmed's machine. Hussain's agent owns the exact commands in `demo/RUNSHEET.md`; this is only the order.

1. `demo/reset.sh`: clears rehearsal cases and sets the supplier to v1.
2. `demo/up.sh`, then start `agent/`. Open the case view and confirm all three sources say live.
3. Record the screen at 1920×1080, following the script, with one real run from v1 to v2.
4. After recording, close the fix PR in `agent-smith-demo`; don't merge it. Then run `demo/reset.sh` again before the live demo.
5. Voice-over: Hussain's tool, or one of us reading the "Voice" column.
6. Backup: if the tool doesn't work in time, a plain screen recording of the same run with the voice-over read live.
7. Upload and submit: Ahmed, or whoever Ahmed names.

## Team input

### Ahmed (decisions)

### Hussain / hussain-claude-1 (video tool, run sheet)

- 2026-10-31T21:09Z, **Hussain:** yes to the message, the must-show moments and the honesty rules.
- **Accuracy fix at 1:35 (hussain-claude-1).** We tested Terse today. It keeps **state** across `kill -9`, but **pending alarms are lost**, and a supervisor (`rearm`, in `demo/restart-proof.sh`) restarts the checks. Suggested voice line: "Killing the server loses nothing: the case and the watcher's memory survive, and the watcher is re-armed and carries on counting."
- **0:48 is confirmed by PR #32.** The watcher opens one case per changed top-level field. Because v2 builds on v1.1, a single flip from v1 to v2 opens the `stock` case plus separate `warehouse` and `restock_eta` cases. `agent/` then marks the last two `not_affected`, so the footnote comes from the same real run.
- **Recording mechanics.**
  - The web recorder can't capture a terminal. The `kill -9` beat therefore shows the restart chip changing on the case view, or uses the tool's desktop recorder.
  - The presenter actions (switch to v2, check now) can be clicked on screen, or called off camera through the bridge's `/api/presenter`.
- **Tool input.** Once the script is marked final, hussain-claude-1 converts it into the tool's `beats.json`: one beat per row, each with a caption and the voice line, with figures written as spoken words. The commands for the run are in `demo/RUNSHEET.md` (PR #31).

### cto-1 (accuracy of every claim)

### Haroon / haroon-agent-1

- 2026-10-31T21:04Z: first draft. Haroon would like all three of us to agree on the content before the video is made, and then Hussain's tool makes it.

## Checkpoints

2026-10-31T21:18Z / haroon-agent-1 / **script marked final** with Ahmed's decisions (ca416aa): 2 minutes, default voice, the labelled bad patch beat only if stable at 22:00Z, approval by Haroon or Hussain. hussain-claude-1 can build `beats.json` from the script table now / this commit / none

2026-10-31T21:04Z / haroon-agent-1 / first draft published for team input / d29a815 / 21:25Z
2026-10-31T21:08Z / haroon-agent-1 / recorded Ahmed's answer on when and where; questions 1, 2, 4 and 5 remain open / db7db0c / 21:25Z
2026-10-31T21:12Z / haroon-agent-1 / script now takes its not-affected moment from the single v2 flip, matching hussain-claude-2's per-field watcher (PR #32, which I checked) / b98adb7 / 21:30Z
2026-10-31T21:14Z / haroon-agent-1 / folded in hussain-claude-1's input (PR #33): the 1:35 beat is now accurate about alarms and re-arming, and is shown on the case view, not a terminal / this commit / 21:30Z

## Evidence

- Facts in the script come from: cto-1's 20:58Z note (automatic run, 29 seconds, 403 on the PR step); cto-1's 20:44Z note (hidden checks, the reject check); `web/DESIGN.md` (screens, labels); this track's rehearsal (20:46Z); and `inventory` verdicts.
- Checks not run: no part of this script has been recorded yet.

## Handoff

- From / to: haroon-agent-1 to Hussain's video tool, once the script is marked final.
