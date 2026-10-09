# Round 1 decisions: what changes before round 2

Decided 2026-10-06 by the Design Director from `insights.md`, `scores.md`, the eight design roles'
proposals and the red team's challenge, with every code claim checked against the source.

## The "failed" sessions in the study list

A session listed as "failed" at 40m00s (for example "r1-s03 T15A Nadia ... failed 40m00s") is a
session agent that reached its 40-minute limit. The limit counted the time spent waiting for one
of the 4 shared browser slots, and graders recorded waits of 17 to 50 minutes before the first
step. The app did not cause any of them.

- **Do not restart the first runs that have a "b" re-run.** r1-s03 was run again as r1-s03b,
  which finished and was graded success with difficulty. The same holds for every first run with
  a "b" re-run.
- **Grade 14 first runs; do not re-run them.** r1-s01, s02, s05, s13, s14, s18, s20, s23, s24,
  s25, s32, s39, s42 and s45 finished on the round 1 build and have transcripts and screenshots,
  but no grade.
- **The 7 "b" re-runs that timed out move into round 2.** r1-s08b, s16b, s26b, s27b, s34b, s46b
  and s48b do not run again as round 1 "c" sessions. Round 1's build is gone from the served
  folder once round 2's fixes land, and rebuilding it only to fill 7 cells costs more than it
  tells. Their persona and task cells are added to round 2's roster, which runs on the fixed
  runner (change 1). Sam's names session (r1-s16b) runs first: it is the only keyboard evidence on
  that task, and it should run after the focus fixes (changes 9 and 10).
- **Morgan's 7 screen-reader sessions (r1-s50 to s56) are blocked, not owed.** They wait for the
  study tool's screen-reader mode (change 2). Do not restart them before that.

## Changes for round 2, most severe first

Severity uses the study scale (4 = blocks the task or the measurement, 1 = cosmetic).

| #   | Sev | Package                 | Change                                                           |
| --- | --- | ----------------------- | ---------------------------------------------------------------- |
| 1   | 4   | study tool              | Fix the session runner and the ease question                     |
| 2   | 3   | study tool              | Screen-reader mode in the study tool                             |
| 3   | 3   | graphty app             | The Neighborhood command opens the neighbor list                 |
| 4   | 3   | graphty app             | The several-node Summary drops "Babet (1)" and "Edges 0"         |
| 5   | 3   | graphty app             | The Selection row and the Data > Sources tables stop dead-ending |
| 6   | 3   | compact-mantine         | A combo field with nothing to list draws no "Open list" arrow    |
| 7   | 3   | graphty-element and app | "No crossings" says why it did nothing                           |
| 8   | 3   | graphty-element         | The mouse wheel zooms the 3D view                                |
| 9   | 3   | compact-mantine         | A visible focus ring on every focusable control                  |
| 10  | 3   | graphty app             | Focus lands on the new line after a Style "+" pick               |
| 11  | 2   | graphty app             | A run is named by its method everywhere                          |
| 12  | 2   | tasks and answers       | Answer key: the Neighborhood route and the method names          |

### 1. Fix the session runner and the ease question (study tool, severity 4)

- **What.** Start at most 4 session agents at once. Start each agent's 40-minute clock only once
  it holds a browser slot. Always end the session (`real.mjs --end`), including when the agent is
  stopped, so no abandoned session keeps a slot. Ask the ease question as 7 = very easy.
- **Why.** Every void in round 1 came from the runner: 7 re-runs timed out in the queue, and two
  abandoned sessions kept slots after their agents stopped, which lengthened the queue. Every
  transcript asked ease the wrong way round (7 = very hard), so scores had to be inverted by hand.
- **Files.** `design/ui/studio/tool/real.mjs`, `tool/with-browser.sh`, the round's session
  prompt and the workflow script that starts session agents.
- **Proof.** A dry run of 8 queued sessions: no more than 4 agents alive at once, every slot
  released after a planted agent stop.

### 2. Screen-reader mode in the study tool (study tool, severity 3)

- **What.** A mode in `real.mjs` that prints, after each step, the focused element's role and
  accessible name and the text of any live region that changed, instead of a screenshot-led view.
- **Why.** Bar 7 needs Morgan's 7 sessions, and none can run without it. Running them before the
  mode exists wastes the sessions.
- **Files.** `design/ui/studio/tool/real.mjs`, `tool/README.md`.
- **Proof.** One scripted walk of the neighbors task's keyboard path prints a name for every stop.

### 3. The Neighborhood command opens the neighbor list (app, severity 3)

- **What.** With exactly one node selected, the "Neighborhood" command (selection bar, node menu,
  key G) does what clicking the Degree row does: select the neighbors and open the list of their
  names. With several nodes selected it behaves as today. Move `openNeighborhood` out of
  `NodeValues.tsx` so the command can call it.
- **Why.** Finding one node's neighbors by name is round 1's worst task (ease 2.75, 4.3 times the
  success path). All 4 participants reached for Neighborhood. The command
  (`selection.neighborhood` in `toolbar/commands.ts`) only applies the selection and never sets
  the inspector to the neighbor list, so it lands on the several-node Summary. The route people
  actually took was broken; the Degree row was not the only way in.
- **Files.** `graphty/src/workspace/toolbar/commands.ts`, `graphty/src/workspace/inspector/NodeValues.tsx`.
- **Proof.** A test that runs the command on one selected node and expects the inspector to show
  the neighbor list; the r1-s17b steps re-run on the rebuilt app.

### 4. The several-node Summary drops "Babet (1)" and "Edges 0" (app, severity 3)

- **What.** `attributeSummary()` returns nothing when a column's commonest value occurs once. The
  "Edges" row is left out when its count is 0; "Edges among them" stays.
- **Why.** "Babet (1)" for 18 nodes is true and useless, and it was the screen every participant
  hit on the neighbors task. "18 nodes, 0 edges" beside "Edges among them 61" reads as a
  contradiction. Both fixes delete words and add none. The app is choosing words from the
  element's `selection.statistics()`; it computes nothing.
- **Files.** `graphty/src/workspace/inspector/NodeValues.tsx` (`attributeSummary`, `SeveralValues`).

### 5. The Selection row and the Data > Sources tables stop dead-ending (app, severity 3)

- **What.** Clicking the inspector's Selection row shows the selection's Summary instead of an
  empty inspector. Clicking a table under Data > Sources opens that table in the table view if the
  app already has one; if it does not, the row stops sending the reader to the "Add to <graph>"
  import page and does nothing a reader would mistake for an action. No new view is built.
- **Why.** Both are reproduced detours on the neighbors task (r1-s17b, s19b, s21b, s22b, s33b).
  A control that looks usable must do something useful.
- **Files.** `graphty/src/workspace/inspector/Inspector.tsx` (and `inspected.ts` if the Selection
  row's target is resolved there), `graphty/src/workspace/data-place/DataPlace.tsx`,
  `graphty/src/workspace/data-page/request.ts`. Trace both before editing.

### 6. A combo field with nothing to list draws no "Open list" arrow (compact-mantine, severity 3)

- **What.** `ComboInput` hides its chevron when `options` is empty.
- **Why.** The Size field passes `options={[]}` (`style/SetLine.tsx`; `BindingPopover.tsx` does
  the same), so its "Open list" arrow opens an empty list. Reproduced in r1-s27b, s28b and s29b.
  Fixing the shared field fixes every caller. Size does not move and its list is not filled with
  bindable results: that would be a second way to bind beside the bind icon.
- **Files.** `compact-mantine/src/components/inputs/ComboInput.tsx`.
- **Cost.** Some compact-mantine and graphty stories change; the owner reviews the images.

### 7. "No crossings" says why it did nothing (graphty-element and app, severity 3)

- **What.** First an element test: set the planar layout on a graph that is not planar (Les
  Miserables: 254 edges against the planar limit of 3n - 6 = 225) and expect `layout.set` to
  reject. If the element swallows the error, make only the reader-initiated set reject, with the
  error shape it already uses; the rebuild after new data keeps swallowing. In the app, the
  refusal shows as one line under Method, naming the method the reader picked, until the method
  changes. It does not go to the notice slot.
- **Why.** Picking "No crossings" on Les Miserables puts the method back and leaves the drawing
  unchanged with nothing on screen to say why (r1-s43b `06.png`). The app's catch in
  `LayoutGroup.tsx` posts "The layout could not be changed" to the notice slot, and whether that
  fires today is disputed; either way it does not reach the reader. The app knows which method it
  asked for, so it can write the sentence without a new refusal code. **No public API change.**
- **Files.** `graphty-element/src/managers/LayoutManager.ts`, `graphty-element/src/layout/PlanarLayoutEngine.ts`,
  `graphty/src/workspace/layout/LayoutGroup.tsx`, `graphty/src/workspace/layout/methods.ts`.

### 8. The mouse wheel zooms the 3D view (graphty-element, severity 3)

- **What.** Add a wheel handler to the orbit camera, following `TwoDInputController.ts`, at the
  keyboard zoom's existing speed. No new option.
- **Why.** `OrbitInputController.ts` has pinch and keyboard zoom but no wheel; screenshots before
  and after a wheel turn are identical in 5 sessions. Zooming in is a newcomer's way to see names
  hidden to avoid overlap, so it comes before any "show hidden names" control.
- **Files.** `graphty-element/src/cameras/OrbitInputController.ts`.
- **Cost.** A wheel over the canvas no longer scrolls the page, for every consumer. That is normal
  for a graph viewer and matches 2D mode.

### 9. A visible focus ring on every focusable control (compact-mantine, severity 3)

- **What.** A default `:focus-visible` ring (1px, `--cm-border-selected`) for controls that carry
  Mantine's `mantine-focus-never` class, in the foundation CSS.
- **Why.** compact-mantine sets `focusRing: "never"` (`theme/index.ts`) and draws a ring only on
  controls with its own `cm-focus-*` classes. The start page's sample entries are plain buttons
  without one, so focus moves with nothing to show it (reproduced, r1-s16b). Fails WCAG 2.4.7.
- **Files.** `compact-mantine/src/theme/css/00-foundation.css.ts`.
- **Cost.** A control that already draws its own ring could get two; the compact-mantine visual
  review shows it.

### 10. Focus lands on the new line after a Style "+" pick (app, severity 3)

- **What.** After a pick from a Style panel "+" menu adds a line, focus moves to that line's first
  control. The same for the "Size by attribute" pick and the label attribute pick.
- **Why.** The pick removes the menu's own button (one channel left turns the menu into a single
  "+", none left removes it), so focus falls to the page body and the next Tab starts from the top
  (reproduced, r1-s09b). Fails WCAG 2.4.3. "Return focus to the trigger" cannot work because the
  trigger is gone.
- **Files.** `graphty/src/workspace/style/StyleTab.tsx`, `style/SetLine.tsx`, `style/BindingPopover.tsx`.

### 11. A run is named by its method everywhere (app, severity 2)

- **What.** After a run, the inspector row, the legend, the layer list and the table header name it
  by the same word the Analyze list uses ("PageRank", "Betweenness"), from the app's own
  `analyze/words.ts`, with the parameter suffix the app already writes.
- **Why.** 12 participants paused when "PageRank" became "Influence" and "Betweenness" became
  "Bridges". It never caused a failure, but three rules point the same way: one word per meaning,
  the owner's standard terms ("leave betweenness", 2026-09-26), and the owner's rule that
  graphty-element returns no English (2026-10-03). The app prints the element's English
  `run.label` today, which is the root of the second name. The element's label itself is recorded
  as an element defect to trace; it is not removed in round 2, because that is a public API change.
- **Files.** `graphty/src/workspace/inspector/Inspector.tsx`, `graphty/src/workspace/inspector/NodeValues.tsx`,
  `graphty/src/workspace/canvas/legendWords.ts`, the layer list, the table header,
  `graphty/src/workspace/table/TableDock.stories.tsx`.
- **Proof.** Measured on two datasets in round 2 (T7 on the running club, T9 on Florentine
  families); graders already accept either word, so no bar changes.

### 12. Answer key: the Neighborhood route and the method names (tasks and answers, severity 2)

- **What.** T12's success paths add the Neighborhood command (menu item or G) as a route to the
  list, with its step count. The reference table's run names show the method word first
  ("PageRank", with "Influence" kept as an accepted answer). T11 records the refusal line's words
  as what a participant may report. No bar, floor or success definition changes.
- **Files.** `design/ui/studio/answers.md`.

## Rejected or deferred, with reasons

| Proposal                                                                                     | Decision                               | Reason                                                                                                                                                                                                                                                                                                           |
| -------------------------------------------------------------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A visible cue on the Degree row (chevron in `DataRow`, "17 connections", a verb)             | Rejected for round 2                   | Shipping it with change 3 changes two things at once, so round 2 could not tell which helped; the chevron also changes every clickable-row story. Revisit only if the routed build still fails the neighbors task. The keyboard and screen-reader route (G, the menu item) reaches the same list after change 3. |
| The Summary lists member names when every value differs                                      | Rejected                               | A second list of neighbors, against the 2026-10-03 decision to keep one surface for them.                                                                                                                                                                                                                        |
| "18 different names" in place of "Babet (1)"                                                 | Rejected                               | Adds words, and it assumes the element's `distribution` lists every value, which nobody has checked.                                                                                                                                                                                                             |
| Move the commonest-value computation into graphty-element                                    | Rejected                               | The app reads a fact the element already returns; it computes nothing.                                                                                                                                                                                                                                           |
| A new public refusal code for layouts                                                        | Rejected                               | The app knows which method it asked for, so a rejection is enough; no one-way door for the owner.                                                                                                                                                                                                                |
| Moving the notice slot, or pausing a notice while it holds focus                             | Rejected                               | New notice machinery for one case; change 7 moves this refusal next to its control.                                                                                                                                                                                                                              |
| Fill the Size list with what can be bound                                                    | Rejected                               | A second way to bind beside the bind icon. Change 6 removes the empty arrow.                                                                                                                                                                                                                                     |
| Move Size, add a Size heading, or redesign the bind icon                                     | Rejected                               | Severity 2 in 7 of 9 grades; three participants were led there by the tooltip. Fix the empty list only, so round 2 can tell what helped.                                                                                                                                                                         |
| "Show all labels" beside the hidden count                                                    | Deferred                               | A new control; wheel zoom (change 8) comes first. Build it only if round 2 still shows people stuck.                                                                                                                                                                                                             |
| A pointer from the graph's Style tab to node styling                                         | Rejected                               | The 8 sessions are one model's shared first guess, and every one recovered in about one step. Figma's empty-selection panel is the same.                                                                                                                                                                         |
| Words on the bottom toolbar; a shorter tooltip delay                                         | Rejected                               | Severity 1; the one expert who hovered found Layout. The owner ruled icons only.                                                                                                                                                                                                                                 |
| The legend covering a node on Florentine families                                            | Deferred, trace first                  | Reproduced (severity 3) but it decides no task, and the two possible fixes (a fit inset, a placement option) are new element API. Trace who fits the view and whether the element already takes fit padding; if it does, the app passes it in round 3. Check at 1280 x 800 too.                                  |
| Hovering a dot shows no name (`tooltip: null`)                                               | Deferred, trace                        | Severity 2 and under-measured, since simulated participants rarely hover. Trace the cause before round 3.                                                                                                                                                                                                        |
| "Undirected, from the file: directed 0" and a cut-off "Edges per n..." on the graph's Values | Deferred to the words-at-rest baseline | Severity 1; bar 9's count decides what at-rest text goes.                                                                                                                                                                                                                                                        |
| Layout method descriptions; the Spectral clump                                               | Deferred                               | One participant's anecdote; the untangle task passed 2 of 2.                                                                                                                                                                                                                                                     |
| "Start here" on PageRank; raw decimals in the key                                            | Rejected                               | Opinion level; PageRank is an accepted answer and no session failed because of the tag.                                                                                                                                                                                                                          |
| Names drawn on dots by default                                                               | Rejected                               | Off is the intended default and the premise of the names task.                                                                                                                                                                                                                                                   |
| Duplicate accessible names ("Export", "Graph", "Neighborhood")                               | Deferred to bar 8's script             | They came from the study tool's "ambiguous" prints. The script decides; recheck "Graph" by role.                                                                                                                                                                                                                 |

## Order of work

1. Fix the runner (change 1) and build screen-reader mode (change 2).
2. Grade the 14 owed round 1 sessions and reconcile `scores.md` with `insights.md` (they still
   disagree on bars 3 and 5 and on the neighbor problem's severity). Grading reads saved
   screenshots and transcripts, so it can run beside the fixes.
3. Reproduce the stale legend (r1-s49b) on the current build; it decides bar 5.
4. Run bar 8's accessibility check and bar 9's words-at-rest count on the round 1 build, as the
   baseline, so round 2's fixes cannot quietly add words.
5. Land changes 3 to 12 with a failing test first for each code change, rebuild, and re-record
   every reference value the element changes touch.
6. Pilot the touched tasks on the rebuilt app (T12 on both datasets, T11, T9, T10, T15 on Les
   Miserables) before round 2 starts.
