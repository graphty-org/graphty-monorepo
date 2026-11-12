# Tier 2 round 3 decisions: what changes before round 4

Decided 2026-10-10 by the Design Director from `insights.md`, `scores.md`, the design roles'
proposals and the red team's challenge. Every code claim below was checked against the studio
worktree's source (branch design/studio-tier1), which holds the round 3 build 26f3bb968 plus notes.

## What round 3 showed, in one paragraph

54 of 56 sessions succeeded. Only one failure is both real and caused by the product: a Shift-click
or Ctrl-click on a node replaces the selection instead of adding to it, and that is graphty-element's
to fix. The two T24 failures came from that defect and from the study itself: the prompt asked
participants to "point out" two people, the answer key credited only a selection, and the key
named a Shift route that does not work on this build. The study's own gate was also skipped: the
prompt pilots never ran, and the leak check read no participant log in any session and still
reported "no leaks". Everything else the round found is severity 2 or lower, cost one or two wrong
turns, and lost nobody any work.

## The rule for this round

- **The study is fixed first.** Round 4 does not start until changes 1 and 2 are done and each
  check is shown failing on a planted fault or on 26f3bb968.
- **One variant per problem.** Eight roles agreed on the same five problems and proposed up to four
  variants for each. Stacking them would leave round 4 unable to say which one worked, so each
  problem gets one path and the rest are held, with the reason named once below.
- **Every fix in its owning package.** Graph facts in graphty-element, shared controls in
  compact-mantine, words and arrangement in the graphty app.
- **Words at rest do not rise.** No change below adds a word to a resting screen.
- **A claim only one specialist made is scripted before it is fixed.** If the script does not
  reproduce it on 26f3bb968, the fix is dropped and the finding is closed as not shown.

## Changes for round 4, most severe first

Severity uses Nielsen 0 to 4. A measurement fault that decides a grade is rated 4.

| #   | Sev | Package                                         | Change                                                                          | Tasks                  |
| --- | --- | ----------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------- |
| 1   | 4   | study tool                                      | A round cannot start without its gate; a check that reads nothing fails         | all                    |
| 2   | 4   | tasks-or-answers                                | T24's prompt and answer key ask for the same outcome; every key route walked     | T24                    |
| 3   | 3   | graphty-element                                 | Shift-click on a node adds it to the selection, as on an edge                    | T24                    |
| 4   | 3   | study tool                                      | `bars.mjs` measures what bars 8 and 9 say                                        | all (bars 8, 9)        |
| 5   | 3   | graphty app (or graphty-element, by the script) | After a re-run or Undo, a run's "Made with" shows the run on screen              | T18                    |
| 6   | 3   | graphty app                                     | Two keyboard focus drops: the Shortest path form, a Color on a selection's layer | T18, T22/T24 (detour)  |
| 7   | 2   | graphty-element, graphty app                    | A number typed in the find box offers "at least" beside "is", and no row is cut  | T22                    |
| 8   | 2   | graphty app                                     | The Analyze list ranks name matches first and shows one "Start here" badge       | T18 (bar 11)           |
| 9   | 2   | graphty app                                     | A Filters icon on the canvas toolbar opens the existing Filters step editor      | T17                    |
| 10  | 2   | graphty app                                     | The Add page's repeated-ties line looks and reads as a warning                    | T21 (Add route)        |
| 11  | 2   | graphty app                                     | A filter step over edges counts edges                                           | T17                    |
| 12  | 2   | compact-mantine (if the check fails)            | A disabled control's reason reaches a screen reader                             | T23                    |

### 1. A round cannot start without its gate; a check that reads nothing fails (study tool, severity 4)

- **What.** Three parts of round 3's measurement did not work, and each one hid that it had not.
  - The leak check read 0 participant logs in 56 sessions and reported "no leaks". A hand re-run
    found 55 clean and one read of the study tool's `with-browser.sh`.
  - `real.mjs --end` deleted the step notes of r3-s03, s10, s13, s44 and s45, and r3-s48's were
    rewritten. r3-s44's route had to be rebuilt from screenshots.
  - The round's gate (prompt pilots, the bars run on the build) was skipped. The pilots are what
    would have shown T24's prompt and key disagreeing.
- **Fix.**
  - The leak check fails when it reads fewer participant logs than there are sessions, and names
    the sessions it could not read.
  - `--end` keeps every note written during the session; it may add, never remove or rewrite.
  - The round runner refuses to start a round unless the round folder holds the gate evidence: a
    prompt pilot result for every task half that runs, and the bars run on the frozen build.
- **Acceptance.**
  - The tool's self-test shows each part failing on a planted fault: a session with no readable
    log, a note written before `--end`, a round folder with no pilot results.
  - The round 4 plan lists the gate evidence by file before the first session.
- **Files:** `design/ui/studio/tool/real.mjs`, the round runner and its leak check,
  `tool/README.md`.

### 2. T24's prompt and answer key ask for the same outcome (tasks-or-answers, severity 4)

- **What.** The prompt says "point out Gus and Ivan, and nobody else, on the drawing". The key
  credits only a selection of exactly those two, and names "Shift held" as a route. r3-s42 and
  r3-s43 marked the two with a one-hop path, nobody else marked, and described the screen
  accurately (`sessions/r3-s43/13.png`). That is a valid answer to the prompt that the key failed.
- **Fix.** Change the prompt, not the key: the key measures what `tasks.md` says T24 measures
  (the two ends of a tie selected, so a next action applies to them).
  - New wording: "Then point out Gus and Ivan, and nobody else, so that whatever you do next
    applies only to those two." It names the outcome and avoids naming the control.
  - The key keeps "Select endpoints" in the tie's "..." menu as a route. It names the Shift route
    only once change 3 is on the frozen build and that route has been walked there.
  - Record the change in the task file's words-changed log.
- **Constraint.** No bar changes. T24's floor and target stay as frozen.
- **Acceptance.** Two prompt pilots per dataset half on the round 4 build, run before the round,
  each graded by the key; every route the key names walked on that build, with its result in the
  round 4 plan.
- **Files:** `design/ui/studio/tier2/tasks.md` (T24 prompts, words-changed log),
  `design/ui/studio/tier2/answers.md` (T24).

### 3. Shift-click on a node adds it to the selection (graphty-element, severity 3)

- **What.** `NodeBehavior.handleClick` always calls `selectionManager.select(this.node)`, which
  replaces the selection. The click on an edge in `Graph.ts` (line 3632) reads `shiftKey` and calls
  `session.selection.applyNow({ edges: [edgeId] }, add ? "add" : "replace", "user")`. All 4 T24
  sessions met the difference (`sessions/r3-s41/05.png`, `06.png`); r3-s42 and r3-s43 gave up on
  selecting both people after it. The study tool holds the key around a real click, so the tool is
  not the cause.
- **Fix.** The node click takes the edge's path: `session.selection.applyNow({ nodes: [id] }, add
  ? "add" : "replace", "user")`, with `add` read from `shiftKey` the same way. `node-click` still
  fires. The XR `select()` call has no pointer event, so it keeps "replace".
- **Not this round.** Ctrl and Meta. On macOS Ctrl-click opens the context menu, and a second key
  convention is a second decision; Shift is the one modifier the element already honors.
- **Why the team decides it.** No export, option, return value or default changes, and no
  graphty-element guide promises that a node click replaces (searched `graphty-element/docs`). It
  makes the node click match the edge click's existing behavior. Recorded in `owner-decisions.md`
  under "decided by the team"; if a consumer is shown relying on replace, it moves to the owner's
  list and the study does not wait.
- **Acceptance.**
  - A graphty-element interaction test drives a real Shift-click through
    `test/helpers/real-input.ts`: click node A, Shift-click node B, and the selection holds both;
    a plain click on C then holds only C; a drag with Shift held still drags.
  - On the round 4 build, the Selection count reads 2 after Gus then Shift-click Ivan.
- **Files:** `graphty-element/src/NodeBehavior.ts`, a test in `graphty-element/test/interactions/`.

### 4. `bars.mjs` measures what bars 8 and 9 say (study tool, severity 3)

- **What.**
  - Bar 9 counted the data names "friends" and "team.csv" as app words, which the bar leaves out.
    Without them the edge inspector passes (30, not 31).
  - Bar 8's focus-drop list walks 14 actions and none of the two routes where a specialist saw
    focus fall to the page, so it reported that focus always held.
  - Axe's `scrollable-region-focusable` hit on the find results list is likely a false positive:
    the list is an ARIA combobox moving with `aria-activedescendant` (`FindBox.tsx`).
- **Fix.**
  - The bar 9 counter leaves out data names (source, file, column and node names read from the
    session). Re-measure rounds 2 and 3 with it and record both figures.
  - Add two focus-drop actions, each failing if focus lands on `body`: type "shortest path" in the
    Analyze list and press Enter; on a rule selection, choose Add to Line, then Color.
  - Add a scripted ArrowDown past the visible find rows that asserts the active option scrolls into
    view. If it holds, record the axe hit as an exception in `bars.mjs` with that script as its
    evidence. Making the list focusable only to satisfy axe would add a useless Tab stop.
- **Acceptance.** Each new check is shown failing on a planted fault, and each focus action is run
  on 26f3bb968 with its result recorded (it decides whether change 6 goes ahead).
- **Files:** `design/ui/studio/tool/bars.mjs`, `rounds/round-3/scores.md` (the corrected bar 9
  figure).

### 5. After a re-run or Undo, a run's "Made with" shows the run on screen (severity 3 if it reproduces)

- **What.** One specialist saw a route of Depot, School, Stadium with "Made with" reading From
  Market, To Station (`expert/figma/path/11.png`). In source, `settingsOf` returns
  `{ ...run.params, ...draft }`, and the draft is keyed by run id, which a re-run keeps
  (`RunValues.tsx` line 86, `{ as: run.id }`). So the reader's draft can outlive the run it was
  made against. A screen that states settings for a run that no longer exists breaks "every claim
  on screen is computed from live state".
- **Fix, script first.**
  - Script it on 26f3bb968: run a path, change From and To, run again, Undo, read "Made with".
  - If the stale values come from the app's draft, clear the draft when its run finishes or is
    undone.
  - If the element's undo does not restore the run's `params`, the fix is graphty-element's, not a
    patch in the app.
  - If the script does not reproduce it, close the finding as not shown.
- **Not this round.** A notice saying a second path replaced the first. Nothing was lost in 7 of
  7 sessions, the seven remarks are one model's template, Undo already brings the first path back,
  and another spoken line lands on a screen that already announces too much. Keeping both paths
  is held for the same reason.
- **Acceptance.** The script passes on the round 4 build: after Undo, "Made with" matches the
  route drawn.
- **Files:** `graphty/src/workspace/inspector/RunValues.tsx`, `reads.ts`, `Inspector.tsx`; or the
  element's run history if the script points there.

### 6. Two keyboard focus drops (graphty app, severity 3, each after change 4's check)

- **What.**
  - Picking Shortest path with Enter leaves focus on the page; Escape then does nothing
    (`expert/a11y/path-sr/19.png`, `152.png` to `154.png`, 3 of 3 attempts). `PathForm.tsx` line
    186 marks its first field with `data-autofocus`, which the popover's focus trap reads only when
    the popover opens. Here it is already open and only its content changes. The Leiden and
    Betweenness forms use `autoFocus` and work.
  - Adding a Color to a selection's new layer leaves focus on the page, so the next Escape clears
    the 12-edge selection (`expert/a11y/path-sr/113.png`, `114.png`). `focusLineNext` in
    `StyleTab.tsx` is already called; the cause is not traced.
- **Fix.**
  - `PathForm.tsx`: add `autoFocus={autoFocus}` beside `data-autofocus`, as `NotesPlace.tsx`
    does. Check that it does not open the From list.
  - The Color drop: trace why `useFocusLine` does not find the new line, and fix it there. No
    second focus mechanism beside `useFocusLine`.
- **Acceptance.** Both of change 4's focus actions fail on 26f3bb968 and pass on the round 4
  build; a real-key test picks Shortest path with Enter, finds focus in From, and Escape closes the
  popover.
- **Files:** `graphty/src/workspace/analyze/PathForm.tsx`, `graphty/src/workspace/style/StyleTab.tsx`,
  `useFocusLine.ts`.

### 7. A number typed in the find box offers "at least" beside "is", and no row is cut (graphty-element and graphty app, severity 2)

- **What.** On Les Miserables 4 of 4 typed "10" first. The box offered the two ties of exactly 10
  and a Values row cut at the panel edge to "Select where shared_chapters is 1..."
  (`sessions/r3-s10/02.png`); r3-s14 read it as possibly "10 or more"; r3-s16 selected the two
  ties and started again. People type the prompt's most prominent data word first, which can be a
  number as well as a column name.
- **Fix, one path in two parts, credited together.**
  - graphty-element: a value row whose value is a number in a number column carries an optional
    `atLeast: { count, target }`, where `target` is the rule "`<column> >= N`" in the form the find
    box's rule option already applies, so a layer made from it is named by its rule. Additive, so
    it is the team's call; recorded in `owner-decisions.md`.
  - graphty app: the row's visible text drops "Select where" (the "Values" heading and the filter
    glyph already say what a pick does; the accessible name keeps "Select where ..."). When
    `atLeast` is present, a second row reads "shared_chapters is 10 or more (N)". The app parses
    no number and counts nothing.
- **Not this round.**
  - Wrapping rows to two lines: the shorter text should fit. If `bars.mjs` still counts a cut row
    on either dataset, that is a build fault to fix before the freeze, not a new design.
  - Rewording "Put numbers in backticks:" again: tied to the bare-number question on the owner's
    list.
  - A rewrite for ">=10" with no column: 2 sessions; the "at least" row answers the bare number.
- **Acceptance.**
  - An element unit test: find "10" on Les Miserables returns a `shared_chapters` value row with
    `atLeast.count` equal to `selection.count` of the rule; a text value has no `atLeast`.
  - A `*.real-element.test.tsx` types "10", picks the "or more" row, and the selection holds every
    tie with 10 or more shared chapters.
  - `bars.mjs` counts no cut find row on either dataset; words at rest unchanged.
- **Files:** `graphty-element/src/session/types.ts` (`FindValueRow`), `graphty-element/src/session/query.ts`,
  `graphty/src/workspace/graph-place/FindBox.tsx` (Values group, around line 637).

### 8. The Analyze list ranks name matches first and shows one "Start here" badge (graphty app, severity 2)

- **What.** In 7 sessions and the visual walk, "path" and "shortest path" listed Betweenness above
  Shortest path, and "linked" made Louvain the Enter choice with two identical badges on screen
  (`expert/visual/path/02.png`). `matches` in `analyze/words.ts` keeps catalog order, and
  Betweenness's description contains "shortest paths".
- **Fix.** While filter text is typed, an entry matching on its name or a search alias, and the
  heading that holds it, come before entries matching only on their description. Nothing is
  hidden: "brokers" still finds Betweenness. While a filter is typed, only the first result wears
  "Start here".
- **Not this round.** Hiding description-only matches: it would stop description words finding
  anything when a name also matches.
- **Acceptance.** `words.test.ts`: "path", "shortest path" and "linked" put Shortest path first;
  "brokers" still lists Betweenness; an empty filter keeps today's order and badges.
- **Files:** `graphty/src/workspace/analyze/words.ts`, `__tests__/words.test.ts`,
  `AnalyzePopover.tsx` (around line 274).

### 9. A Filters icon on the canvas toolbar opens the existing Filters step editor (graphty app, severity 2)

- **What.** 5 of 8 T17 participants looked on the Graph place before finding Filters on the Data
  place: the toolbar's Layout button (r3-s33, s34, s38) and the "Everything" layer's style panel,
  which has no way to narrow the drawing (`sessions/r3-s33/03.png`). It is the one clean case of a
  feature with no visible control where people look first.
- **Fix.** One icon-only toolbar button with the tooltip "Filters". It opens the Data place with
  the step editor open on a new step, through the existing `openStepEditor(store, NEW)` and
  whatever the header chip already uses to move to the Data place. No new route code. Filters'
  home does not move.
- **Not this round.** A Filters row in the Graph place's layer list: it reads as a second Filters
  home and adds words at rest.
- **Acceptance.** Words at rest unchanged; a real-click test from the Graph place lands focus in
  the new step's editor; round 4 records T17's first moves to compare with round 3's 5 of 8.
- **Files:** `graphty/src/workspace/toolbar/commands.ts`, `WorkspaceToolbar.tsx`.

### 10. The Add page's repeated-ties line looks and reads as a warning (graphty app, severity 2)

- **What.** "41 edges in this file are already in friends. Load adds them a second time." is plain
  body text tied to nothing. Focus lands on Load, the status says only "41 of 41 rows", and one
  Enter doubles every tie without the warning being heard (`expert/a11y/replace-sr/04.png`). The
  unmatched-row warning on the same kind of page wears a warning glyph; this one does not
  (`expert/visual/replace/04.png`). No session reached the page, but the harm it allows is the data
  harm the line exists to prevent.
- **Fix.** Give the line an id and add it to Load's `aria-describedby` beside the blocked reason;
  put the existing warning glyph, in the danger color, in front of it. The words stay.
- **Not this round.** Making Replace the primary button: it changes the page's default action on
  no session evidence.
- **Acceptance.** A test reads Load's accessible description and finds the repeated-ties sentence
  when the count is above 0, and only the blocked reason when it is 0.
- **Files:** `graphty/src/workspace/data-page/DataPage.tsx` (lines 392-394 and 1426),
  `data-page.css` (`.dp-repeats`).

### 11. A filter step over edges counts edges (graphty app, severity 2)

- **What.** A step that hides 21 of 41 edges says "20 to 20 nodes" on its row and "20 of 20 nodes"
  on the header chip, so it looks as if it did nothing (`expert/figma/filter/12.png`, `22.png`;
  visual finding 5). Two specialists, no session. A count that misstates what changed breaks
  "every count names its unit and its whole".
- **Fix, script first.** Script the step on 26f3bb968 and read the element's own visible edge
  count. If the screen differs from it, the step's row and the chip name edges ("20 of 41 edges")
  for a step over an edge column, read from the element. The app counts nothing.
- **Acceptance.** The script's count and the screen's agree on the round 4 build; words unchanged
  in number.
- **Files:** `graphty/src/workspace/data-place/Filters.tsx`, `filterSteps.ts`, the header chip.

### 12. A disabled control's reason reaches a screen reader (compact-mantine, if the check fails, severity 2)

- **What.** After "Filter to neighbors" is pressed, it turns gray; focusing it did not open the
  tooltip that holds its reason (`expert/a11y/path-sr/146.png`), and the specialist's walk mode does
  not print descriptions, so it is not known whether a screen reader hears the reason.
- **Fix, check first.** Run `real.mjs --expect` on the button's accessible description. If the
  reason is missing, fix compact-mantine's Tooltip so it describes its target while the target is
  disabled, as `InfoCircle` already does, so every disabled control in the app gains it. No
  app-side `aria-describedby` and no word change.
- **Not this round.** A pressed toggle: round 2 made "Filter to neighbors" a plain command whose
  state lives on the step's checkbox; two controls for one state would reverse that without new
  evidence.
- **Acceptance.** The check passes on the round 4 build; a compact-mantine test reads the
  disabled button's description from its tooltip.
- **Files:** `compact-mantine` Tooltip, or none if the check passes.

## Held, with the reason

- **Distance per name at Hops 2 or 3.** One session (r3-s48) and two specialists; T23 succeeded 4
  of 4. It needs a new element fact (a `hops` on each `Neighbor`), and round 2 held it too. First
  in line if a second session meets it.
- **"4 hops" against "5 nodes, 4 edges" on an unweighted path row.** Severity 1, and T18 already
  carries changes 5, 6 and 8; one more change there would blur what round 4 credits.
- **Committing a step edit when focus leaves Value.** It contradicts the Escape rule (innermost
  first), and no session met it.
- **`nodesInRect(rect, { labels: true })` for the key.** One specialist, and whether `autoFrame`
  was off at that moment has not been ruled out. Script that first.
- **Ctrl and Meta adding to the selection.** See change 3.

## Not changed

- **Drawn names covering each other, and sized nodes drawn inside each other.** graphty-element's
  label placement and spacing, already on the owner's list. No font, seed or offset change in the
  app.
- **Where Replace lives and its out-of-date marks** (8 of 8 found it; 0 of 8 read old values as
  current), **the weight's meaning at load** (8 of 8), **Recent in the Analyze list** (6 of 7
  reused it), **the find box's example rule and Enter running it** (8 of 8 on T22).
- **"Select endpoints" in the tie's "..." menu.** Both who opened the menu found it at once; its
  evidence is confounded with the Shift defect. Re-measure after change 3.
- **Names not drawn by default.** The app's choice as a consumer; no answer was misread.
- **The rule syntax and backticks.** Changing what the element accepts is breaking; it stays on the
  owner's list.
- **"PageRank, full graph" under a filter.** Both sessions that met it read it correctly.

## What round 4 re-runs

- T24 on both halves, after change 2's pilots.
- T22 (change 7), T18 (changes 5, 6, 8) and T17 (changes 9, 11) on both halves.
- T21's Add route is walked by script for change 10; no session re-runs it for this change.
- Every other task carries its round 3 result forward unless a change above touches its route.
