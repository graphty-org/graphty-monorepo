# Tier 6 round 2 decisions: what changes before round 3

Decided 2026-11-05 by the Design Director from `insights.md`, `scores.md`, the design roles' proposals
and the red team's challenge. Every code claim below was read in source on this branch; nothing here
was run. A mechanism marked "read" still has to hold in its acceptance walk.

## What round 2 showed, in one paragraph

11 of 12 readers finished, none claimed a false "done", Undo restored everything in 2 of 2, and every
computed count held. What is left is smaller and has one shape: the screen says less than the graph
did, or says it in a place the reader is not looking. A question repaints the network and the turn
says only "Computed". The field reads "Ask about this graph" under "Selection 14". A press takes its
own button away and nothing owns focus. A reply's foot sits below the fold with no way to tell.

## The rule for this round

- **One change per problem, so round 3 can credit each.** Nine roles proposed up to four forms of the
  same fix. Each problem gets one path; the others are refused below, once, with the reason.
- **Words at rest do not rise.** No unit adds a row to a turn or a sentence to a panel at rest. The
  painted fact joins an existing line, and the placeholder replaces words.
- **A mechanism that is only read is measured before it is built on.** Unit 3 is the case: its first
  step is one CSS line and a measurement, and the second step exists only if the first falls short.
- **Every fix in its owning package.** Nothing here needs compact-mantine, so the Figma lock is not
  touched, and no API change is breaking.
- **Bars do not move.** Bar 7 stays "fails as worded", and no task changes to help a fix.

## The rulings left open

All are written into `../../decided.md`, none is a one-way door.

- **A painting run says so, on its own line.** Yes to the fact, no to a separate Colored row: one
  effect per channel would stack rows on turns that already hold three lines, and `source` prints a
  result path raw.
- **The kept "selection surviving Undo" does not cover a rollback.** A reader's Undo and a failed
  message are different acts: a rollback means the message did not happen, so it leaves no selection
  and no lit Redo behind (unit `rollback-leaves-nothing`). The reader's own Undo keeps today's
  behavior, since a selection is not undoable.
- **Closing the panel does not end the x.** Design 5.2 says the x lasts one message or until the
  selection changes, and closing is neither. The build is wrong, not the entry
  (unit `scope-x-survives-closing`).

## Changes for round 3, most severe first

| # | Sev | Package | Unit | Change | Tasks |
| --- | --- | --- | --- | --- | --- |
| 1 | 3 | graphty | `settings-at-400` | Settings can be used at 400% zoom | T90 |
| 2 | 2, fails bar 8 | graphty | `focus-after-a-press` | A press that removes its own button hands focus to the composer | all |
| 3 | 2 | graphty | `reply-end-in-view` | A finished reply reaches its end, with one scrollbar | all |
| 4 | 2 | graphty | `failure-with-no-status` | A failure with no status names the key and offers the provider | T90 |
| 5 | 2 | graphty | `one-name-per-measure` | The Assistant's lines use the name the key uses | T90, T92, T94, T95 |
| 6 | 2 | graphty-element, graphty | `run-says-it-painted` | A painting run says it painted, to the reader and the model | T90, T92, T94 |
| 7 | 2 | graphty | `composer-says-its-scope` | The field's placeholder follows the scope | T92 |
| 8 | 2 | graphty | `autosave-tooltip-is-true` | The Autosave tooltip promises only what happens | T94 |
| 9 | 2 | graphty-element | `top-with-select-has-its-line` | A ranking that selects draws "Selected N nodes" | T92, T95 |
| 10 | 2 | graphty | `question-at-body-size` | A waiting question reads first on its card | T93, T95 |
| 11 | 2 | graphty | `enter-saves-the-key` | Enter in the API key box runs Save | T90 |
| 12 | 2 on large files | graphty | `show-in-table-lists-its-rows` | Show in table opens on the rows it names | T91, T92, T95 |
| 13 | 1 | graphty | `undo-notice` | No doubled period, and no notice over an open panel | T93, T94 |
| 14 | - | tasks-or-answers | `answer-key-matches-the-build` | The key's quoted lines follow the new words | T90, T92, T95 |
| 15 | - | study tool | `study-prompts` | First-meeting prompts stop priming; browser noise leaves participants | all |

### 1. `settings-at-400`: Settings can be used at 400% zoom (graphty, severity 3)

- **What.** `calc(100dvh - 184px)` leaves 72 px at 256 tall, and below 720 wide the section list takes
  its rows first, so `.ws-dialog-page` falls to about 0. A click on API key times out at 320 x 256 and
  640 x 256. A pointer reader has no other way to a key.
- **First.** Copy the accessibility walks `p320`, `p640` and `p320t` from the main checkout's
  `tmp/design-studio/tier6/a11y-r2-400/` into `repro/settings-400/` with a `run.sh`. Bar 9 needs the
  reproduction under `repro/`, and it costs no model call.
- **Fix.** In `frame/frame.css`, `@media (max-height: 480px)` with `.ws-dialog-columns { height: auto }`
  and `.ws-dialog-page { overflow: visible }`, so the modal body is the only scroller. Not a floor on
  the `height` line: a floor cannot help the one-column case, where the list still takes the rows first.
- **Acceptance.** By pointer, API key is clicked, typed and saved at 320 x 256, 640 x 256, 320 x 400 and
  1280 x 256. Done covers no section. Keyboard shortcuts and Export open and scroll at 320 x 256, and
  keep the fixed height at 900 x 700.

### 2. `focus-after-a-press`: focus goes to the composer (graphty, severity 2, fails bar 8)

- **What.** The pressed button goes and nothing owns focus, so the next key lands on whatever is near:
  the top bar's disabled Undo (a typed `p` opens Path between...), Jump to newest with no box, an earlier
  turn's Undo (a second Enter takes that turn back), or the scope x (a second Enter widens the scope).
- **Fix, one rule.** Every press in the panel that removes its own button calls `goToComposer`: all three
  approval buttons (move the raise into `answer()` and delete the one in Change this), Answer, the
  turn's Undo, the scope x, Use selection, Send again.
- **Stays.** Settings returns to its opener (WCAG 2.4.3). Focus never jumps to a waiting card, a failure
  row or a reply (`decided.md`).
- **Acceptance.** A keyboard walk: after each press listed, a typed letter lands in the composer. A
  second Enter after Answer, Undo, the x and Send again changes nothing.
- **Files.** `assistant/Waiting.tsx`, `assistant/Checks.tsx`, `assistant/Composer.tsx`,
  `assistant/Conversation.tsx`.

### 3. `reply-end-in-view`: a reply reaches its end, with one scrollbar (graphty, severity 2)

- **What.** `sessions/r2-s01/18.png` shows the reply cut mid-line with two scrollbars and no Jump to
  newest, on a log that thinks it is following. The hidden chips and Undo are the cost. This is a build
  fault: the readers who did not scroll did nothing wrong. It may also hold bar 11's one unseen line.
- **Mechanism, read.** EntityChip's `.cm-visually-hidden` span is absolutely positioned and
  `.ws-assistant-log` has no `position`, so the log's overflow does not clip the span and it overflows
  `.ws-panel-body`. The outer bar then takes 15 px after the log reached its foot, the text rewraps
  taller, and `following` stays true. Separately, `ChipRow` draws after an async count, and no
  dependency of the follow effect fires for that.
- **Fix, in order.** (a) `position: relative` on `.ws-assistant-log`, alone. Measure `.ws-panel-body`'s
  `scrollHeight` against `clientHeight` with a chip low in a long log, and walk the reply. (b) Only if
  the log still stops short: a wrapper around the turns with a `ResizeObserver` that calls `toFoot` while
  `following`. Adding `conversation` to the dependencies is not enough, since `ChipRow` escapes it. The
  reader's own Steps toggle must not pull the log.
- **Acceptance.** `repro/r2-s01`'s long reply ends in view with its chips and Undo, with no scroll and
  one scrollbar. Opening steps at the foot leaves them in view. A reader scrolled up stays put and gets
  Jump to newest. Re-walk three deferred routes and report each: the transcript that stopped short of
  the newest reply (T93 B), the jump to the top after Undo (T95 A) and the transcript not following
  after Send again (T90 B). Say whether the page's 1 px shift went with it.
- **Files.** `assistant/assistant.css`, `assistant/Conversation.tsx` only if (b) is needed.

### 4. `failure-with-no-status`: the key is named and the provider offered (graphty, severity 2)

- **What.** A browser hides a 401 with no CORS header, so a refused key reads "the connection failed".
  Both T90 readers resent once and neither learned the cause.
- **Fix.** For a provider whose catalog entry has `requiresKey`, `causeWords` with no status reads "the
  connection failed or the key was refused": "or" is true in both cases, and it reuses the 401 row's
  words. `EndWords.action` gains a value that draws Send again and AI provider... together. A provider
  with no key keeps today's words and Send again alone. A real 401, and `AI_KEY_REJECTED`, do not change.
- **Why a second button.** A named cause with no door is a notice, and a reader with one bad key has no
  spare to retry with. Send again stays: it is right for a dropped network.
- **Acceptance.** `words.test.ts` covers both provider kinds. A scripted walk with one bad `sk-` key and
  no spare, costing no model call: the row shows both buttons, and AI provider... opens the section.
- **Files.** `assistant/words.ts`, `assistant/Conversation.tsx` (`EndRow`), `design.md` 4.9.

### 5. `one-name-per-measure`: the Assistant uses the key's name (graphty, severity 2)

- **What.** "Computed Reach" over "Color: Closeness", "Computed Bridges" over "Betweenness", "Computed
  Communities" over "Color: Louvain". Each reader had to ask or assume.
- **Fix.** `wordsFor(descriptor).name` at all three `plainName` sites in `assistant/words.ts`: `stepName`,
  the `slow` approval title and `AI_EFFECT_RUN`. No `plainName` fallback: the key falls back to
  `technicalName`, so a fallback would give an extension two names. The catalog stays untouched, which
  `CLAUDE.md` allows ("replace it by id"), and glossary section 2, rule 1 sets the direction.
- **Limit.** `toolset.ts` gives the model `plainName`, so a reply can still say "Reach". That is the
  model's prose. Do not call finding 6 closed on the app's lines alone.
- **Acceptance.** `words.test.ts`; the line, the step and the key read one name on T90 and T94 B's routes.

### 6. `run-says-it-painted`: the turn and the model both know (graphty-element, graphty, severity 2)

- **What.** `RunsApi` paints by default (`style ?? true`), and the turn says only "Computed". The model's
  result carries no painted fact either, though `prompt.ts` tells it to report only what the counts
  show, so "without altering the graph's styles" is partly ours. For a reader who cannot see the
  drawing, the repaint does not exist.
- **Fix.** `session.runs.painting(id)` is public and holds the outcomes. Read it once:
  - `runEffects` puts `painted` on `AI_EFFECT_RUN`: how many suggestions were added, omitted at 0.
  - `summarizeRun` carries the same fact, so the model has something to report.
  - `apply_suggestion` returns the run's effects, so it stops reading "Changed the graph".
  - `effectLine` words it: "Computed Closeness for 24 nodes, colored by it".
- **Confirm first.** `settleRun` reads this after `awaitRun`, and the painting is fire and forget. If
  `painting()` can still read `pending` there, wait for the decision; never guess. Every suggestion
  `derive.ts` makes carries a color channel today; if one ever does not, the line must not say colored.
- **Stays.** The default stays: changing it is a changed default, and one reader liked the repaint.
- **Acceptance.** Element tests: a default run reports `painted`; `style: false` and a hand layer that
  suppresses the suggestion do not. On r2-s02's route the line shows, Undo takes the color away and the
  turn reads Undone. Line count per turn does not rise. On T93 B detour-1 and T94 A detour-1, name the tool
  behind any "Changed the graph" that is left: the records do not say which write drew it.
- **Files.** `graphty-element/src/ai/tools/families/algorithms.ts`, `families/style.ts`,
  `tools/shape.ts`, `graphty/src/workspace/assistant/words.ts`.

### 7. `composer-says-its-scope`: the placeholder follows the scope (graphty, severity 2)

- **What.** "Ask about this graph" sits directly under "Selection 14" (`sessions/r2-s05/05.png`), so the
  app contradicts itself where the reader types. No grade named it, and five roles found it in the
  screens. Focus always lands here, so a reader by ear never meets the scope line at all.
- **Fix.** With `scope.kind` of `selection`, the placeholder reads "Ask about this selection". The
  answer-waiting placeholder still wins. Key it on `scope.kind`: a selection with the x pressed reads
  Whole graph, and the placeholder must too. Amend design 6.1.
- **Acceptance.** The placeholder follows Selection, the x, Use selection and a question. Check the
  field's description with `--expect described=`; if the placeholder is not exposed, add
  `aria-description` from the same word. T92 A's plant is unchanged, and this is the only scope change
  round 3 credits on it. If the plant still lands, the next step is the scope on the You turn.
- **Files.** `assistant/Composer.tsx`, `assistant/words.ts`, `design.md` 6.1.

### 8. `autosave-tooltip-is-true`: one string (graphty, severity 2)

- **What.** "Your work is kept in this browser and comes back when you reopen graphty." is false for a
  project with no changes: `findKept` offers only entries with changes.
- **Fix.** "Changes not yet in a file are kept in this browser and come back when you reopen graphty."
  This is true on every door, and it covers a change that was since saved, which "your changes" does not.
- **Limit.** No reader saw the tooltip, so this does not answer r2-s09, and no session can credit it. It
  removes a false sentence. The label's half of finding 1 stays open at 2, and is reported as open.
- **Acceptance.** Read the string; `autosave` tests updated. **Files.** `autosave/words.ts`.

### 9. `top-with-select-has-its-line`: a selection by ranking draws its line (graphty-element, severity 2)

- **What.** The `results` `top` action with `select: true` selects and returns only a found effect, so the
  scope moves with no line. Round 1's finding is still open in source, and bar 11 reads it.
- **Fix.** Add the same `AI_EFFECT_SELECTION` that `select` returns. No app change.
- **Acceptance.** An element test, and "Selected 5 nodes" on a walk that asks for the top five selected.
- **Files.** `graphty-element/src/ai/tools/families/algorithms.ts`.

### 10. `question-at-body-size`: the question reads first (graphty, severity 2)

- **What.** `Radio.Group` and `Checkbox.Group` draw their label at 9 px secondary, so the deciding
  sentence is the smallest text on its card, and on T95 it can hold the only caveat.
- **Fix.** Pass `<Text span size="sm" fw={600}>` as the label on both, with the text ink set, as the
  approval title has it. Never app CSS over a locked class, and never `size` on the group, which would
  grow the radios.
- **Acceptance.** `r2-s07`'s card reads like an approval title, and the group keeps its accessible name.
  A long question scrolls inside the card's 40% cap. **Files.** `assistant/Waiting.tsx`.

### 11. `enter-saves-the-key`: Enter runs Save (graphty, severity 2)

- **Fix.** `onKeyDown` for Enter on the `PasswordInput` calls `save()`. Not a form: a form may submit from
  the closed Selects.
- **Acceptance.** Enter with a good key saves and lands in the composer. With a bad key its line shows
  and focus stays in the field. **Files.** `assistant/AiProviderSection.tsx`.

### 12. `show-in-table-lists-its-rows`: the table opens on what it names (graphty, severity 2 on large files)

- **What.** 7 selected of 331, in load order, with no shaded row in view (`repro/r2-s06/walk/04.png`).
  Six sessions used this door, more than any other check.
- **Fix.** Open the dock narrowed to the target's nodes with a removable chip, reusing the members chip
  that group tables already have. Pass the ids (`{ nodes }`), not `"selection"`, or clicking a row makes
  the others vanish. `Members` is tied to a run today, so it needs a run-less form, and `dockScope`'s
  check that the run still exists must allow it. Selecting the rows stays: amend design 5.3.
- **Why this form.** Only it reaches all the rows. `scrollToRow` reveals 1 of 7 and nothing gives a row's
  place in a paged sort. Selected-first needs an element option and imposes a sort nobody asked for.
- **Acceptance.** The strip shows 7 of 331 and the chip names the narrowing. Removing the chip shows every
  row with the selection intact. Clicking a row keeps the other six listed. An edges-only result opens
  the Edges tab as today. Runs last: its cost is the largest here, and on a 24-node file it saves one
  scroll.
- **Files.** `assistant/Checks.tsx`, `table/TableDock.tsx`, `state/store.ts`, `design.md` 5.3.

### 13. `undo-notice`: no doubled period, no notice over the open panel (graphty, severity 1)

- **Fix.** Delete the appended period in `undoOrRedo` (`frame/historyWords.ts`): notices take no final
  period, and this fixes "?." with no stripping. With the Assistant panel open, Undo of a message's step
  shows no notice, since the turn already reads Undone and `decided.md` keeps a turn's notice for a
  closed panel. The status line still speaks it.
- **Acceptance.** `history` tests; a request ending in a period reads once; no notice crosses the canvas
  with the panel open. **Files.** `frame/historyWords.ts`, and where the notice is set.

### 14. `answer-key-matches-the-build`: the key quotes the new words (tasks-or-answers)

- **Fix.** Bring `answers.md` to the fixed build: its quoted failure line, its "Computed ..." lines, its
  `Build decided` notes on rows these units close, and the "kept for this round" notes. Change no bar and
  no prompt. T90's prompt keeps its second key: bar 3 reads a real answer, so a task with no good key
  would break the bar. The one-bad-key case is unit 4's scripted walk.
- **Acceptance.** Every line the key quotes appears on the new build's walks.

### 15. `study-prompts`: fix the instrument before the next sessions (study tool)

- **Fix.** The participant prompt (`.claude/workflows/design-studio.js`, the `USERS === "returning"`
  line) says only "the person the briefing describes", so nine first-meeting readers stop being told
  they are returning. `real.mjs` keeps CORS console lines in the session's log and out of what a
  participant reads. Check `leaksIn` still reads quoted text as an opened file, and fix it if so.
- **Hover counts.** The tool stays as it is: `scores.md` carries the limit in one line.
- **Acceptance.** A planted run of `--leaks`; a `--read` after a refused key shows no CORS line.

## Backlog units for round 3

Grouped by the part that owns them. `../../backlog.md` marks each row taken. The accessibility findings
cited are in `../round-1/expert/a11y.md`, which counts for this round; no walk was written under this
round's `expert/`.

| # | Sev | Package | Unit | Owner part | Tasks |
| --- | --- | --- | --- | --- | --- |
| 16 | 3 friction | graphty | `key-page-keeps-what-was-typed` | `AiProviderSection`, `SettingsDialog` | T90 |
| 17 | 3 friction | graphty-element, graphty | `open-run-and-layer-tell-the-truth` | `ChangeRows`, `results` tool | T92, T94, T95 |
| 18 | 2 | graphty-element | `rollback-leaves-nothing` | `AiController` | T92, T93 |
| 19 | 2 | graphty | `a-dialog-holds-the-keys` | `useCommandKeys`, `selection.clear` | all |
| 20 | 2 | graphty-element, graphty | `failed-step-says-why` | `ToolExecutor`, `endWords` | T91 |
| 21 | 2 | graphty | `no-raw-text-on-app-rows` | `style/cards.ts`, `styleLine` | T91, T95 |
| 22 | 2 | graphty-element, graphty | `typed-answer-goes-through` | `answerQuestion`, `Composer` | T95 |
| 23 | 2 | graphty-element | `model-stops-at-a-no` | `prompt.ts` | T91, T92, T93 |
| 24 | 2 | graphty | `scope-x-survives-closing` | `useScope` | T92 |
| 25 | 2 | graphty | `spoken-once` | `EndRow`, `CanvasOverlays` | all |
| 26 | 2 | graphty | `panel-names-say-what` | Assistant panel | all |
| 27 | 2 | graphty | `change-lines-read-once` | `ChangeRows` | T90, T91, T95 |
| 28 | 1 | graphty-element, graphty | `end-rows-tell-the-truth` | `endWords`, `endingOf` | T90, T93 |
| 29 | 1 | graphty | `disabled-looks-disabled` | `Composer`, `Waiting` | all |
| 30 | 1 | graphty | `assistant-door` | `assistant-door/` | T90, T94 |

- **16 `key-page-keeps-what-was-typed`.** Done with a typed key drops it with no word, and the panel still
  asks for a key. Done commits what the page holds, as Save does; a key of the wrong shape keeps the dialog
  open on its line. Esc stays a cancel. Forget key shows only with a saved key, so it can no longer clear a
  typed one. Save with a bad key moves focus to the field so its line is read (a11y 9). The eye joins the
  tab order through the field's own `visibilityToggleButtonProps`; compact-mantine's default stays.
  Acceptance: type, Done, and the panel is ready; a bad key stays and is spoken; Tab reaches the eye.
- **17 `open-run-and-layer-tell-the-truth`.** `results` `remove` returns no effect, so it draws "Changed the
  graph" and leaves Open run dead. Add an additive effect, `AI_EFFECT_RUN_REMOVED` with `algorithm` and
  `removedLayers`, worded "Removed {name}". Open run and Open layer draw only while their run or layer
  stands (`ran`, `layer` in `ChangeRows`). A run with nothing on its Style tab opens on Values, as a path's
  run already does in the inspector's tab rule; a run that painted keeps Style. Opening either speaks one
  status line (a11y 12). Acceptance: T95 A's route, a removed run shows no dead button; a run with no
  layer lands on Values; a painted one on Style.
- **18 `rollback-leaves-nothing`.** `revertMessage` uses `session.undo()`, which leaves Redo lit and may
  reselect. "Redo would remove with no card" was never run: run it first, because it decides the severity.
  A message taken back drops its steps from the redo side and restores the selection it found. A reader's
  own Undo does not change. Acceptance: an element test on a failed removal, with Undo dim, Redo dim and
  the selection as it was.
- **19 `a-dialog-holds-the-keys`.** One Esc that closes Settings also clears the selection, which has no
  undo and is the next message's scope (a11y 7, `k1/161.png`, `k2/12`). Trace which listener runs first:
  `useCommandKeys` blocks Esc when `overlayShown()` is true, so the close may be landing before the check.
  Mod+I fires behind an open dialog and moves focus under it (a11y 11), because a modifier key passes
  `firesWhileTyping`. Inside the Assistant panel outside the composer, Esc on a chip does not clear the
  selection either. Acceptance: a walk of each, and Esc on the canvas still clears.
- **20 `failed-step-says-why`.** "Style failed. Nothing changed." has no reason anywhere, though
  `runConversation` passes a `cause` and `ToolExecutor` line 750 does not. Carry `cause` on both paths
  (additive), and word the causes the study has met in `endWords`; an unknown cause keeps today's line.
  Acceptance: T91 A's detour-2 route reads the reason, as words and no code.
- **21 `no-raw-text-on-app-rows`.** Bar 10 counts `Rule: data.gal4RGexp < -1`, `No matches for
  data.trained == false.` and `Sized 331 nodes by results.degree.value`. `styleLine` names a source
  through the same reader the key uses, not `attributeName`, which knows no run field. Rules read through
  `ruleWords` in `data-place/filterWords.ts`; if a selector string has no route to a `RuleTree`, add one
  in the element, and never parse a rule in the app. "Picked by hand" on a layer the Assistant made reads
  "Picked". Acceptance: those three rows on their routes hold no `data.` or `results.`.
- **22 `typed-answer-goes-through`.** "Or type an answer" refuses "lowest hours", against design 4.8's
  "typing always works". Add an additive option to the element's answer call, `typed: true`: an answer
  outside the choices goes to the model as written. The default keeps `AI_ANSWER_INVALID`, and the composer
  passes the option. Acceptance: T95 A's detour-4 answer continues the message; an element test on both.
- **23 `model-stops-at-a-no`.** The model hid seven after Keep them, and selected on plain questions, which
  moved the next message's scope. Two lines in `prompt.ts`: a declined request ends that request, so do no
  other change toward it unless asked; select only when the reader asks to. No tool is refused. Acceptance:
  three walks each of T93 A detour-1 and a plain T92 question, counted. The reply stays the model's.
- **24 `scope-x-survives-closing`.** `useScope` forgets the x on unmount because nothing else watches the
  selection, and in `k1` a removal then ran on 1 of 16 (a11y 8). Move the watch to something that outlives
  the panel. Acceptance: x, Mod+I twice, and the line still reads Whole graph; a new selection ends it.
- **25 `spoken-once`.** A failure's `role="alert"` row remounts and is read again on the next send, on
  closing the list, on Save and on reopening (a11y 5). Give the role only to a failure as it first
  arrives, not to a saved one read back, and put a space between its parts. While a message runs, the
  canvas's run news stays out of the status line (`CanvasOverlays.tsx`), so "Degree finished: v02 ranks
  first, 8" stops sounding like the answer, and a run the turn takes back is never announced. Acceptance:
  the status log on those four routes and one Assistant run, stated as "written to the region".
- **26 `panel-names-say-what`.** Each control names its object, with the visible word first (WCAG 2.5.3).
  The model label names its purpose; the turn's Undo names its first change line; approval buttons take
  `aria-describedby` to the card's title; a chip's name carries its step when two share a count; the
  title and New conversation differ; Close says what closes; the top-bar Undo's name is capped. Acceptance:
  no two reachable controls in the panel share a name on T93 B's walk.
- **27 `change-lines-read-once`.** "and N more" opens the rest in place, not the steps above it. Identical
  lines fold, and a turn keeps only its last selection line ("Selected 2, 0, 2 nodes"). Acceptance: T90 A
  and T95 A's routes.
- **28 `end-rows-tell-the-truth`.** "Stopped. Changes taken back." shows when nothing changed. `rolledBack`
  drops the params, so add `steps` to `AI_CANCELLED` (additive) and read "Stopped." with none. "Declined.
  Nothing changed." leaves its turn after the next message: `endingOf` reads a saved `AI_APPROVAL_STALE`
  call and not a denied one. Acceptance: a stop with no change; a decline, then a message.
- **29 `disabled-looks-disabled`.** Send and Answer are `aria-disabled` and drawn as the filled primary. Set
  `data-disabled` beside it: compact-mantine's buttons already style that state, so the look stays the
  shared one and the button keeps focus and its tooltip. No bespoke style. Acceptance: an empty composer's
  Send, and Answer with nothing picked, wear the shared disabled look.
- **30 `assistant-door`.** Quick actions finds Assistant for "AI" and "ask" (`keywords` on `place.assistant`),
  above matches inside other words. Mod+I closing the panel returns to the rail button, and Esc on the
  conversations list returns to its title. A click on Assistant just after a project opens is thrown back
  to Graph, one start in six: `assistantOn` reads a new element's empty feature list as off, so check
  whether opening a second project with the panel open does the same. Name the mechanism before fixing it,
  in the element if the features arrive late. Acceptance: 8 starts with no throw-back, and "AI" lists
  Assistant first.

## Generality

Each unit was checked against: no concept the product lacks, no one domain or persona, no justification
that rests on a re-test reusing its own words. Four needed a general form:

- The failure words key on the catalog's `requiresKey`, so no provider's name is special.
- The placeholder keys on `scope.kind`, not on a selection being present.
- The painted fact comes from the element's own decision, so it also says nothing when a hand layer won.
- Show in table reuses the members chip; a new "result set" object was refused.

## Refused, with the reason

- **"Only selected", "Only selection", and scope words of any other form.** One planted reader. Changing
  the line with the placeholder means round 3 could credit neither. Retest the plant first.
- **"About 14 selected nodes" under You, and "Ask about these 14 nodes only".** A second count to keep true
  and one more row per turn, for the same one reader. This is the next step if the plant still lands.
- **`size="sm"` on the scope words.** The same reason: a rider on a line round 3 is measuring.
- **A separate Colored row.** See the rulings.
- **"Autosave: no changes".** The label flips on every Save and Undo and reads like lost work right after
  a Save. Ruth moved on her briefing. It also adds a word for a two-reader question the study primed.
- **`showOpenFilePicker` on Open.** A real gap, since no way of opening a file reaches Recent projects, but
  a new door: a permission prompt on reopen, a type list wider than a project, and an unknown effect on
  the study tool's file chooser. It stays in the backlog.
- **`scrollToRow`, selected-first sort, "331 nodes, 7 selected".** See unit 12.
- **A warning glyph on the failure row.** No reader paid for the look.
- **The `\n\n` gap between replies.** Severity 1, the repro did not return it, and `proseOf` compares
  `startsWith`, so it risks repeating text.
- **Changing the run's default, or the catalog's `plainName`.** Both are breaking, and neither is needed.
- **Plain words for opened steps (finding 9).** A wording design for every tool; bar 10 forbids the
  arguments. It stays open until someone writes that design.
- **Group 1 to N.** The file has no group names, so a fix needs a concept the product lacks.
- **Start page wheel.** Severity 1 on an approved surface; the canvas keeps the wheel on purpose.
- **A task for a reader with one bad key.** It would break bar 3. See unit 14.
- **Rewording bar 7.** Bars are frozen, and "fails as worded" already says what happened.
- **`beforeunload` on leaving.** It would nag on clean projects.
- **Chips: pointer cursor and tooltip.** Every control's cursor is the arrow by the theme's `cursorType`, so
  this is the system, not a defect.
- **Confirming Forget key, and Enter during a run.** No confirmation for what retyping recovers. Enter during
  a run keeps the text, and a queue is a concept the composer lacks.
- **Sets and filters the model made leaving nothing to find.** First in line and real, but `VisibilityApi`
  rules and Data place filter cards are separate models, so this needs a design, not a unit.
- **The selection glide on Select and right-click.** Many rows, all with Fit as the way back, and not the
  Assistant's. It needs tracing against the camera rules first.
- **Ids in Values and Top 10.** `answers.md` takes ids, and the file's name column is not always the one a
  reader means.

## Before the build freezes

- **Owed by the study, not a unit:** the audit of the 193 session screens for bars 10 and 11, and the test
  of whether the conversation returns with a key after a reopen.
- **Requests:** 3,669 of 5,000 are spent, so 1,331 remain. Reserve 480 for the 12 sessions before any dry
  run, which leaves about 850 for walks.
- **Credit:** re-run T92 A and T90 after units 3 and 7, so any change on bar 5 can be attributed.
- **Walk the neighbors:** units 2, 3, 12 and 25 touch shared rows. Re-walk their routes before the freeze, and
  never freeze on an empty source diff.
