# The Assistant: settled decisions

Every review of the Assistant reads this file and cites it. A complaint against a behavior listed
here is classed "no change". Reversing one needs a new dated entry below it, with the reason and the
evidence; the old entry stays. The design they belong to is `design.md` beside this file.
"Research" means `design/ai/assistant-chat-research.md`.

## Identity

- **The label is Assistant, drawn as the rail caption.** (2026-11-04.) Reason: it is the glossary's
  screen word, the owner allowed it, "Agent" promises autonomy and collides with the element's
  helpers, and the sparkle alone is not understood. Evidence: `glossary.md`; research recommendation
  8; measured at 39.41 px in Inter 9 px against the 40 px `.cm-rail-label` box in headless Chromium,
  so it fits with no shared change.
- **The icon is the AI sparkle: lucide `Sparkle`, as `GLYPHS.assistant`, size 20, rail ink, no
  purple.** (2026-11-04.) Reason: the owner asked for the sparkle; the plural `Sparkles` already
  means glow in the approved Style panel; a second hue reads as data. Evidence: `glyphs.ts` line 156;
  `figma-crosswalk.md` ledger, whose rejection of the sparkle narrows to its purple;
  `visual-language.md` A1.
- **The rail order is Graph, Assistant, Data, Notes.** (2026-11-04.) Reason: the framework's order,
  with Data where Results stands there. Flag off, nothing moves. Evidence:
  `interface-specification.md` 1.2.
- **The rail button is never disabled.** (2026-11-04.) Reason: the owner's brief is that clicking
  brings up a chat window. This reverses the state matrix's disabled button. Evidence: `state-matrix.md`
  row 178 against `information-architecture.md`'s provider prompt, which disagreed.

## The flag

- **The flag follows `design/ci/channels-pipeline/features.md`: experiment id `assistant`, a row in
  graphty-element's `FEATURES`, additions tagged `@experimental assistant`, read in the app from
  `enabledFeatures.enabled`, reached by `?features=assistant`.** (2026-11-04.) Reason: this work adds
  to the element, so it is not an app-only experiment, and one build serves every site. Evidence:
  features.md sections 2, 3, 4 and 5.3; `ElementHost.tsx` already passes `features`.
- **Off means no rail button, command, key, Settings section, chunk or privacy chip change.**
  (2026-11-04.) Reason: an experiment only adds. Evidence: features.md rule 1.
- **`canary.json` and `nightly.json` list it when the branch lands; `production.json` stays empty
  until the owner graduates it.** (2026-11-04.) Reason: nightly's site is what the On run tests.
  Evidence: features.md 7.5. Two-way door: one line in a site file.

## Shape

- **The Assistant is a rail place in the left panel, not a window.** (2026-11-04.) Reason: a window
  covers 25% of the canvas at 1440 x 900, past the limit of a fifth; opens over the inspector at
  900 x 700; can hide a linked node, which the canvas-framing rule forbids fixing by reframing; and
  needs a new surface in Figma-locked compact-mantine. Evidence: research recommendation 8;
  `visual-language.md` furniture limit; WCAG 2.4.11; four independent reviews ranked the panel above
  the window.
- **Width: stored apart from `leftWidth`; 280 by default, or the left panel's current width under a
  1200 px window; handle to 480, capped so the canvas keeps 320; below 640 CSS px it fills the area
  right of the rail.** (2026-11-04.) Reason: 280 at 900 x 700 leaves a 323 px canvas, and rail, panel
  and inspector take 577 px, so 400% zoom cannot fit otherwise. Evidence: `interface-specification.md`
  1.3; `frame.css` has no width breakpoint; WCAG 1.4.10.
- **The turn has no bubbles, avatars or right-aligned messages; nothing inside the panel is boxed.**
  (2026-11-04.) Reason: they cost width and box the content. Evidence: `visual-language.md`, "nothing
  inside a panel is boxed".
- **The panel has an x even though other places do not.** (2026-11-04.) Reason: the active rail
  button shows no tooltip, so the x is the visible button that carries the close key. Evidence:
  `NavRail.tsx`; the owner's rule that every shortcut has a visible button.

## Keys

- **Mod+I goes to the composer, opening the panel if needed; pressed in the composer it closes.**
  (2026-11-04.) Reason: a toggle closes the panel on a reader who selected on the canvas and wants
  to keep typing. One rule, not three cases. Evidence: `commands.ts` does not use it; `firesWhileTyping`
  lets it fire in a field. To verify in each browser on the build.
- **Esc in the composer stops a run, only while running.** (2026-11-04.) Reason: the Stop button
  shows the key, and elsewhere Esc keeps typed text. A stray press takes changes back, so it is on the
  test list. Evidence: `tier3/decided.md`, Escape.

## The reply

- **Three marks, no hue: plain text is the model's, a chip is computed, a change line is what
  happened.** (2026-11-04.) Reason: readers must know what to doubt; glyph rows would need a legend
  when a chip already exists. Evidence: research recommendation 2.
- **Only tool results may be chips. A model's prose never becomes one.** (2026-11-04.) Reason: a chip
  means computed, and lighting up what a model named lends its claim authority. This narrows the
  template's "an object it names is a link". Evidence: LinkQ's overtrust finding in research,
  "Two routes to checking"; `interface-templates.md` 5.
- **At most one chip row per turn; a turn that changed the graph shows it in the change line.**
  (2026-11-04.) Reason: chips are tinted by kind and a transcript full of them competes with the
  data. Evidence: `visual-language.md` hue budget.
- **Hover or focus peeks; only a deliberate click selects.** (2026-11-04.) Reason: selection is the
  next message's scope and is not undoable, so a look must not change the question. Evidence:
  `tools/families/select.ts`, "add no undo step".
- **No turn folds. Tool steps do, and are collapsed by default.** (2026-11-04.) Reason: readers use
  earlier prose as memory, and a screen reader must skim every turn's heading. Evidence: research
  recommendation 7 and "Showing reasoning".
- **Starters are questions from the graph's own columns, fill the composer and never send.**
  (2026-11-04.) Reason: readers arrive with questions, and a command teaches chat for what a control
  already does. Evidence: research recommendation 8; VizAbility in research, "Blind readers".

## Changes and approvals

- **Reversible changes apply at once; only the element's built-in limits hold a batch.**
  (2026-11-04.) Reason: approving everything trains reflex approval. Evidence: research
  recommendation 3; the element's defaults, `approvals: "none"` with `gate` on.
- **Approval cards are worded from `gate` and `preview`, with verb buttons. Only `irreversible` says
  Undo cannot reach it.** (2026-11-04.) Reason: a `large` removal is one undo step, so a card saying
  otherwise is false. Evidence: `ToolExecutor.ts` lines 603-622; research "Patterns to avoid", prompts
  showing arguments rather than effect.
- **The waiting section is one hairline section pinned above the composer, capped at 40% of panel
  height, and focus never jumps to it.** (2026-11-04.) Reason: a request cannot scroll away, and
  Shift+Tab reaches it. Evidence: research recommendation 9.
- **While a request waits, its verb is the one primary button and Send is quiet. No red.**
  (2026-11-04.) Reason: one primary action; danger is error ink only. Evidence: `visual-language.md`.
- **Undo is offered on the newest step only, read from `session.history.next` and
  `provenance.message`; no `undoAiMessage`.** (2026-11-04.) Reason: the history is linear, so Undo on
  an old turn would imply skipping the reader's later edits, and the read already exists. Evidence:
  `session/types.ts` history `next`; `AiController.ts` `revertMessage`.
- **One notice per turn, shown only with the panel closed.** (2026-11-04.) Reason: two Undos on screen
  repeat themselves over the canvas. Evidence: the furniture limit in `visual-language.md`.
- **A waiting request while away gets a neutral rail dot and a lasting notice with Open.**
  (2026-11-04.) Reason: a 6-second notice is no lasting route, and a dot alone is easy to miss.
  Evidence: `store.ts` `Notice`, where only an error stays.

## Scope

- **The scope line always states what a message is about. The x is drawn only because the element
  binds scope.** (2026-11-04.) Reason: tools read the selection anyway, so an unbound x proves nothing
  and a capped id list makes "42 nodes" over-promise. Evidence: `voice/pointing.ts`, `FACT_IDS_CAP` of
  20 in `tools/prompt.ts`; research recommendation 5.

## Setup and privacy

- **The key has one home: an AI provider section in Settings. No model dropdown in the composer.**
  (2026-11-04.) Reason: one home per feature. The model label is text that opens the section, and it
  stays visible because the reader pays. Evidence: research, "Model choice"; `output-homes.md`.
- **A key stays for the tab unless the reader turns on Remember, which says it is not encrypted;
  Forget key removes it.** (2026-11-04.) Reason: research lean, and both survive the fresh element per
  project. Evidence: research, "Local key storage"; `ApiKeyManager.ts`.
- **The no-provider screen says what the assistant does first, then offers AI provider... alone. No
  Quick actions door, no form, no composer.** (2026-11-04.) Reason: Quick actions is a door to what is
  already on screen, and a form first is the worst first screen. Evidence: research recommendation 8.
- **The panel branches on the catalog's `requiresKey`, so the in-browser model arrives as a provider
  row and a download row; it is not drawn until it works.** (2026-11-04.) Reason: no unbuilt item is
  drawn, and no-key readers are a named differentiator. Evidence: `catalog/ai.ts`; director's design
  criteria.
- **With the flag on and a provider saved, the privacy chip reads "Sends to {provider}".**
  (2026-11-04.) Reason: "Local only" would be false, and a value never misstates what it describes.
  Evidence: `PrivacyChip.tsx`.

## Voice

- **The transcript lands in the composer and waits for Enter.** (2026-11-04.) Reason: sending voice
  unseen is a pattern to avoid, and a reader who cannot see a mistranscription has no other review.
  Evidence: research "Patterns to avoid".
- **Talk latches on a press and stops on release after a hold over 300 ms; Shift+Mod+Space does the
  same from anywhere. `holdKey` stays unset.** (2026-11-04.) Reason: readers who cannot hold get the
  same path with no setting; a click on a node takes focus off a held button; `bindHoldKey` listens
  on the graph's element while focus sits in the composer. Evidence: `AiManager.ts` `bindHoldKey`; WCAG
  2.1.4.

## Accessibility

- **Status news goes to the one polite region in `Workspace.tsx`; a failure is `role="alert"` on its
  row. No new live region.** (2026-11-04.) Reason: the app's failures already work this way, and two
  regions would speak twice. Evidence: `Workspace.tsx` line 242; `DataPage.tsx`, `WhichPicker.tsx`;
  research recommendation 9.
- **The answer body is never in a live region; focus stays in the composer through streaming.**
  (2026-11-04.) Evidence: research recommendation 9 and WCAG 4.1.3.
- **The model is told never to name a color or a position.** (2026-11-04.) Reason: such answers tell
  a blind reader nothing. Evidence: Kodandaram in research, "Blind readers".

## Left out

- **Out of the first version: in-browser model, web tools, in-page code, helpers and plans, live
  voice, spoken replies, links in prose, guess chips, Regenerate, token use, conversation export.**
  (2026-11-04.) Reason: each is optional in the element and the window works without it; small and
  coherent first, with room left for each. Evidence: `design.md` section 9.
