# Agent Smith: design

Status: Ahmed's front end direction, recorded by cto-1 at 2026-10-31 21:46Z (`coordination/tasks/cto-1-demo-architecture.md`). It replaces the cobalt "variant F" design that Hussain approved earlier the same day. That variant is in this file's history and on branch `hussain-claude-1/prototype-case-view`.

## What it is

Two screens on one calm page.

- **The start screen**, shown when no case is open:
  - The headline "Keep your app working when the APIs it depends on change."
  - "Demo: one connected repo, one known provider." No screen may imply that any repo works today.
  - A read-only repo field showing `0x1/agent-smith-demo`, and a real **Scan this repo** button that calls `GET /api/inventory`.
  - **What we found:** a table of API, used by, fields read and state, from the real `scan()`. For the demo, inventory is used by `getStock()` in `src/supplier.ts:15`, and pricing is not called.
  - **How this fits your team:** two lines marked "✓ Working today" (fixes arrive as a normal GitHub PR, and agents hand off over Agent Relay), and one marked "Next · not built yet" (the team's own Claude Code or Codex agent joins that channel).
  - The response shape the watcher has stored, beside it.
- **The case view**, one column:
  - The headline from `Case.headline`.
  - A quiet timeline of five steps, **Noticed → Checked → Fixed → Proved → You**, with one plain sentence each.
  - The proof: `onHand − reserved = result` from `Case.proof`, or the failing test before there is one.
  - **Review the fix →**, linking the real `Case.pr.url`, with "Nothing merges until you approve."
  - Not-affected changes as one line each.
  - **See how we know:** the Agent Relay thread and the evidence.
- **The nav** keeps the honest label "Controlled demo · mock supplier · nothing deploys" and the Presenter menu.

## Not looking staged

1. **Only live data.** The live build never imports stub data. One "Live" chip shows when Terse, Relay and the supplier are all live. Any source that is not live gets its own red chip. A missing panel says "No live data from Terse since 21:14:03". It never shows a placeholder.
2. **Real times.** "Last checked" is now minus `lastProbeAt`. Durations are measured. There are no scripted delays, fake progress bars or typewriter effects.
3. **Evidence one line deep.** The current step's proof is visible without a click. The rest is one click away.
4. **The judge pulls the trigger.** The presenter menu switches the supplier to v2 and runs "check now".
5. **Failures stay visible.** A verifier reject is never hidden once later steps succeed: it opens "See how we know" by itself. The labelled bad patch shows in its own block, "Deliberately bad patch", and never reads as the real repair failing.
6. **Honest label.** The header reads "Controlled demo · mock supplier · nothing deploys".
7. **Clean start.** `demo/reset` clears rehearsal cases before the live run, so the same case ID doesn't come back already approved.

## Design rules

1. **Tokens.** Use these names and values from `app/src/styles.css`. No other colours.

   | Name | Value | Use |
   |---|---|---|
   | `page` | `#f7f4ee` | warm off-white page |
   | `card` | `#ffffff` | cards and tables |
   | `sunken` | `#f1ede5` | later steps, quiet panels |
   | `line` | `#e2ddd2` | 1 px borders |
   | `line-strong` | `#c9c2b4` | inputs, buttons, icons |
   | `ink` | `#1d1f24` | text |
   | `ink-soft` | `#464b55` | secondary text |
   | `ink-muted` | `#6b707a` | labels, times |
   | `accent` | `#3f5a7a` | the primary action only |
   | `positive`, `positive-tint` | `#1f7049`, `#e4f1e8` | pass only |
   | `danger`, `danger-tint` | `#ad3530`, `#f9e5e3` | fail, no live data, the fixture banner |

2. **No shadows and no 3D effects.** No hard offsets, tilts, sparkle tiles or pastel step colours. Borders are 1 px, and corners are 10–12 px.
3. **Colour roles.**
   - The accent marks the one primary action on a screen: **Review the fix** or **Scan this repo**.
   - Green and red mean pass and fail, and nothing else.
   - Status is never shown by colour alone. Always add ✓, ✕ or a word.
4. **Type.** Bricolage Grotesque 700 for headings, Geist for body text, Geist Mono for times, paths and evidence.

   | Element | Size |
   |---|---|
   | Start headline | 52 px |
   | Case headline | 46 px |
   | Current step | 24 px |
   | Arithmetic | 64 px |
   | Body text | 17–20 px |
   | Smallest text | 15 px, mono only |

5. **Steps.** Cards are white. A done step shows a green ✓, the current step has an ink border, a failed step is danger-tinted, and later steps are sunken.
6. **Checked at 1920×1080.** The primary action must be above the fold in every state.
7. **Plain words first.** No field paths in sentences. Detail goes under "See how we know".
8. **Motion only for real events.** New cards and messages fade in over 200 ms. Hover changes the background or brightness, never position. Respect `prefers-reduced-motion`.

## Stack and wiring

- `web/app`: Vite, React and TypeScript, with tokens in one CSS file. The step logic in `app/src/model.ts` is tested with `bun test`.
- `web/bridge`: Bun. It serves the built page and `/api`, so the browser talks only to the bridge.
  - `GET /api/stream`: SSE of `{source, kind, data, version, at}`, with a full snapshot on connect.
  - `GET /api/health`, and `GET /api/inventory` (the real `scan()` of `TARGET_REPO_DIR`).
  - `POST /api/presenter/version` and `POST /api/presenter/probe`.
  - It follows Terse `state` and `state_update` frames, retries with backoff after `kill -9`, and observes Agent Relay read-only.
- Fixture data exists for development only, behind `?fixture=1`, with a red "FIXTURE DATA" banner. It never switches on by itself.

## Contract fields the view needs

These are done on `main` (36dced9, cto-1):
- `WatcherState`
- `RunResult.passed`, `RunResult.total` and `RunResult.failure`
- Relay text set to `JSON.stringify(RelayMessage)`, with `at` and a plain `say` sentence
- `parseRelayMessage`
- the optional time fields

`CallSite.functionName` is optional until `inventory/` fills it. Until then the view shows `path:line`.
