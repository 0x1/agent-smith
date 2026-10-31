# Agent Smith case view: design

> **Superseded in part, 2026-10-31 21:46Z (Ahmed's front end direction, `coordination/tasks/cto-1-demo-architecture.md`).**
> Colour, shadows and type scale below are replaced by the calm palette. Layout changes (one column, start screen) follow in later PRs.
>
> | Token | Value | Use |
> |---|---|---|
> | `page` | `#f7f4ee` | warm off-white page |
> | `card` | `#ffffff` | cards |
> | `sunken` | `#f1ede5` | later steps, quiet panels |
> | `line` / `line-strong` | `#e2ddd2` / `#c9c2b4` | 1 px borders |
> | `ink` / `ink-soft` / `ink-muted` | `#1d1f24` / `#464b55` / `#6b707a` | text |
> | `accent` | `#3f5a7a` | the primary action only (Review the fix) |
> | `positive` / `positive-tint` | `#1f7049` / `#e4f1e8` | pass only |
> | `danger` / `danger-tint` | `#ad3530` / `#f9e5e3` | fail, no live data, fixture banner |
>
> - **No shadows and no 3D effects.** No hard offsets, tilts or sparkle tile. Borders are 1 px.
> - **Smaller display type.** Headline 46 px, current step 24 px, arithmetic 64 px, "All quiet." 72 px.
> - Step cards are white. A done step shows a green ✓, the current step has an ink border, and a failed step is danger-tinted. Status is still never colour alone.
> - Hover is a background or brightness change, never movement.


Status: approved by Hussain, 2026-10-31. The prototype is on branch `hussain-claude-1/prototype-case-view` and opens on `?variant=F`.

## What it is

The screen tells a single case as a story: **Noticed → Checked → Fixed → Proved → You**. It is approved by Hussain as variant F. To see it, open `web/prototype/case-view.prototype.html?variant=F` on branch `hussain-claude-1/prototype-case-view`.

- **A cobalt page** with an ink-bordered lime mark and the wordmark "Agent Smith". The nav carries the honest label "Controlled demo · mock supplier · nothing deploys" and a Presenter button.
- **The watcher chip** sits under the nav: "Watcher · Terse durable actor · checked 2 s ago · 234 checks". On `kill -9` the chip turns lime and reads "Restarted … · new process · state intact · 234 checks".
- **The headline** is cream, set in Bricolage Grotesque 800 with tight tracking. Example: "Your supplier changed how it reports stock. Here is a tested fix."
- **The step stack** is a column of five ink-bordered cards, each in its own colour:

  | Step | Colour |
  |---|---|
  | Noticed | sky |
  | Checked | lilac |
  | Fixed | mint |
  | Proved | butter |
  | You | lime |

  - Finished steps show the step name and one sentence.
  - The current step is a paper card with a 10 px hard shadow.
  - A rejected step turns pink.
  - Later steps are muted.
- **The lilac window** (3 px ink border, 10 px hard shadow, lime sparkle tile on the corner) holds the proof and the conversation:
  - **The proof.** The arithmetic is set huge, from `Case.proof`: **onHand − reserved = result**, for example 7 − 5 = 2. Its label is "on hand − reserved, never below 0 · ✓ your test · ✓ {regression.passed} of {regression.total} hidden checks". All counts come from the case, and none are hard-coded (it is 2 hidden checks today).
    - **The normal path is first-try acceptance.** cto-1 measured 5 of 5 first attempts accepted.
    - **The rejected styling** (**3 − 5 = −2**, struck through, with a red **0**) appears **only** when a real `verification.result` rejects, or when `proof.result !== proof.expected`. It is never staged.
    - The block is hidden while `proof` is null.
  - **Agent Relay.** Watcher, Fixer and Verifier talk in turn. The verifier's verdicts carry a pink "✕ Sent back" tag or a mint "✓ Accepted" tag. The rejected attempt stays visible.
- **The one action.** A lime "Review the fix →" button with an ink border and a 6 px hard shadow. It opens the real PR. Beside it: "Nothing merges until you approve."
- **Footnote cards** for `not_affected` changes and repeat sightings.
- **The quiet state.** "All quiet." at 132 px. The lilac window shows the response shape the watcher has stored, with "Same shape for 234 checks".

The council (a judge, a designer and an engineer) reviewed six layouts in four rounds. Variants A to E stay in the prototype for the record.

## Not looking staged

1. **Only live data.** The live build never imports stub data. Each source (Terse, Relay, supplier) shows its own state: live, connecting, or down. A missing panel says "No live data from Terse since 21:14:03". It never shows a placeholder.
2. **Real times.** "Last checked" is now minus `lastProbeAt`. Durations are measured. There are no scripted delays, fake progress bars or typewriter effects.
3. **Evidence one line deep.** The current step's proof is visible without a click. The rest is one click away.
4. **The judge pulls the trigger.** The presenter menu switches the supplier to v2 and runs "check now".
5. **Failures stay visible.** The verifier's "Not yet" is never hidden once later steps succeed.
6. **Honest label.** The header reads "Controlled demo · mock supplier · nothing deploys".
7. **Clean start.** `demo/reset` clears rehearsal cases before the live run, so the same case ID doesn't come back already approved.

## Design rules

1. **Tokens.** Use these values, and these names, everywhere:

   | Name | Value |
   |---|---|
   | `cobalt` | `#3b35e8` |
   | `cobalt-deep` | `#2a24b8` |
   | `paper` | `#fff8ec` |
   | `paper-deep` | `#f0e6d2` |
   | `paper-sunken` | `#f3ecdd` |
   | `ink` | `#121319` |
   | `ink-soft` | `#3d4350` |
   | `ink-muted` | `#5b6270` |
   | `on-cobalt-soft` | `#d6d3ff` |
   | `lime` | `#d7f75b` |
   | `lilac` | `#c7b8ff` |
   | `butter` | `#ffd65a` |
   | `mint` | `#8fe3bf` |
   | `pink` | `#ffa6d9` |
   | `sky` | `#8dd0fa` |
   | `danger` | `#ad3530` |
   | `positive` | `#1f7049` |

   Each colour from lime to sky also has a `-deep` value, used for card edges. No other colours are allowed.
2. **Ink borders and hard shadows, never soft ones.**
   - Borders are 2 px, or 3 px on the window.
   - Shadows are hard offsets in ink: 4 px on controls, 6 px on the action, 10 px on the current card and the window.
   - Rounded corners: 14–16 px on cards and controls, 28 px on the window.
3. **Colour roles.**
   - Each step has its own card colour.
   - Lime is the action and the restart.
   - Pink and red mean rejected or wrong, and nothing else.
   - Cream text on cobalt.
   - Status is never shown by colour alone. Always add ✓, ✕ or a word.
4. **Type.**
   - Bricolage Grotesque 800, tight tracking, for the headline, the current step, headings and the arithmetic.
   - Geist for body text.
   - Geist Mono for times and evidence.
5. **Sized for the room, checked at 1920×1080.**

   | Element | Size |
   |---|---|
   | Headline | 68 px |
   | Current step | 30 px |
   | Arithmetic | 92 px |
   | Body text | 19–21 px |
   | Smallest text | 15 px, mono only |

   The action must be above the fold in every state.
6. **Plain words first.** No field paths in sentences. Detail goes under "Show the evidence".
7. **One prominent action.** While a case waits on a person, the lime button is the only lime element on the page. The exception is the restart chip, which only appears just after a restart.
8. **Motion only for real events.**
   - New cards and messages fade in over 200 ms.
   - Buttons press into their shadow on hover.
   - Respect `prefers-reduced-motion`.

## Stack and wiring

The stack is Vite, React and TypeScript, using the tokens above in one CSS file. This is hussain-claude-1's default; Hussain did not choose between the stack options.


- `web/` is a Vite app using React and TypeScript. The design tokens and base styles live in one CSS file. Components are small and local: `Nav`, `WatcherChip`, `Headline`, `StepStack`, `StepCard`, `Window`, `Arithmetic`, `RelayThread`, `RelayMessage`, `ReviewButton`, `Footnotes`, `Evidence`.
- A small Bun bridge, `web/bridge`, serves the page and `/api`.
  - It subscribes to the Terse watcher and case actors on the server side, and streams their state to the page over SSE.
  - It runs the Agent Relay observer, which holds the keys.
  - It forwards the presenter actions to `supplier-mock` and `probeNow()`.
  - The browser talks only to the bridge, so CORS and key handling never come up.
- **Reconnecting after `kill -9`:** retry `find-websocket` with backoff. Drop any frame with a lower `version` than one already seen. On the first frame after reconnecting, show the restart banner.

## Contract fields the view needs

These are done on `main` (36dced9, cto-1):
- `WatcherState`
- `RunResult.passed`, `RunResult.total` and `RunResult.failure`
- Relay text set to `JSON.stringify(RelayMessage)`, with `at` and a plain `say` sentence
- `parseRelayMessage`
- the optional time fields

`CallSite.functionName` is optional until `inventory/` fills it. Until then the view shows `path:line`.

## Build order and cut lines

1. The bridge: Terse with reconnect, Relay, SSE, `/api/health`.
2. The tokens, the nav, the watcher chip and the step stack, driven by `status`.
3. The Relay thread, including the rejection.
4. The arithmetic, the review button with the real PR link, and the footnotes.
5. A full run, including `kill -9`.

If we're behind at 21:00, cut in this order:
1. The on-screen presenter menu (use curl).
2. Dark mode and motion polish.
3. The footnotes.

Never cut:
- the "no live data" states
- the Relay thread
- the watcher chip
- the arithmetic
- the real PR link
