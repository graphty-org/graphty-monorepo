# Tier 5 dry run, pass 4: triage of the re-walks on the third fix build

Build: c3100058ab (`criteria.md` line 1), which carries pass 3's fixes: Cancel on a new filter card
leaves no undo step (9610767e29, with graphty-element's additive `history.restoreTo(step, { redo:
"drop" })`), and Done, Cancel and Escape on 50,000 nodes keep "Drawing" on screen until the result
is painted (c3100058ab). Pilot walks and screenshots are under the main checkout's
`tmp/design-studio/tier5/r1d3/pilot/<task>/<route>/`; a screenshot below is written
`<route> NN.png` under its task's folder. Rows are named `<task>.p4.<n>`; `pass 3 T..` points at a
row of `dry-run-r1-3.md`.

Both pass 3 units hold: Undo after Cancel on a new card no longer brings the card back (every pilot
that tried it), and every 50,000-node wait shows "Drawing" from the click to the painted result
(T79 A and B).

## How each defect was classed

Pass 1's, 2's and 3's rules stand (`dry-run-r1-1.md` to `dry-run-r1-3.md`, "How each defect was
classed"; `decided.md`, "Dry run pass 1" to "Dry run pass 3"): fix now only for a crash, a block or
a spoiled grade on a task's success path or a walked detour; what a keyboard or screen-reader user
alone meets is backlog (no round session runs in screen-reader mode; Sam's keyboard sessions are T70
A and T71 A, `roster.md` line 211); T76 has no round sessions, so its rows are backlog unless they
share a fix-now mechanism; a row that repeats an earlier backlog row keeps its class unless the
re-walk brought new evidence. A row that spoils no grade on its own task but shares a mechanism
with a fix-now row is backlog (or decided) by itself and fixed with that unit.

Origin, fix now only: new; repeat (an earlier pass sent the same problem to be fixed and it is back);
regression (caused by pass 3's fixes).

## Fix now: the units

| Unit                | What                                                                                                                 | Rows                 | Class  | Origin                                                                                                         |
| ------------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------- | ------ | -------------------------------------------------------------------------------------------------------------- |
| table-after-history | After a history move (a new card's take-back, Undo), the node table keeps the rows of the filter as it was before it | T77B.p4.1            | spoils | regression (9610767e29 takes a new card back by a history restore, which the table's rows do not follow)       |
| setup-history       | A study start keeps the setup's steps as undo history, so Undo after a cancelled card undoes the colleague's work    | T77A.p4.3, T77B.p4.2 | spoils | new (the setup's steps were always undoable; pass 3's fix made Undo right after Cancel reach the last of them) |

Totals over the fix-now rows: 3 (0 crashes, 0 blocks, 3 spoils); 1 regression, 0 repeats, 2 new.

Fixed with these units though classed backlog or decided by themselves: T76B.p4.1 (the table still
listing the cancelled Except's rows after Undo; T76 has no sessions) by table-after-history, which
re-checks T75A.p4.5 (a spoken count after an undo naming the count before it) on its walk; and
T72B.p4.2, T79A.p4.7 and T79B.p4.3 (Undo after Cancel undoing a setup step on tasks whose grade it
does not move) by setup-history.

### table-after-history

- **What the pilots saw**: T77 B touched-2: a new filter card for the deep gauges, tick (1 match,
  G09), Cancel. The top bar and the canvas show 7 of 11; the node table reads "Shown 1 of 11 nodes"
  with one row, G09, and "With issues 1" (`pilot/T77B/touched-2 03.png`, still so 3 s later in
  `04.png`). touched-1 (a card with no match): "0 of 11 nodes, No rows" (`touched-1 03.png`).
  Shown / All and back does not refresh it; only the next Done on a card does (`touched-2 10.png`).
  On 47c95a09fc the same route listed the 7 rows. T76 B touched-6 (Undo after Cancel on an
  existing card): the picture and Overview read 0 of 11, the table still lists the 7 "telemetry
  yes" rows and "7 of 11 nodes" (`pilot/T76B/touched-6 08.png`).
- **Mechanism (likely; the engineer confirms it with a failing test first)**: graphty-element's
  record pages cache each ordered row list under the session's input tick (`RevisionCache` in
  `graphty-element/src/session/data.ts`, `orderOf`). 47c95a09fc took a new card away with
  `removeCondition`, a command that moves the tick; 9610767e29 takes it back with
  `history.restoreTo`, and an Undo of a filter step is the same kind of history move. When such a
  move changes the filter without moving the tick before the next page read, `page()` reads the
  revision first and serves the cached "visible" order of the filter as it was (`neighbors()` in
  the same file resolves the visible scope before reading the revision for this reason). The
  summary the top bar reads is not cached that way, so it is right.
- **Fix** (graphty-element): every record page read after a history move (undo, redo, restore,
  `restoreTo` with or without `redo: "drop"`) that changed the filter lists the records the filter
  leaves now, with its `total`; one fix in the element, so every page reader (the table dock, the
  matches strip, the inspector's neighbor lists) gets it. No app workaround.
- **Files**: `graphty-element/src/session/data.ts` (and wherever a history move restores the
  visibility state without moving the input tick), a test under `graphty-element/test/session/`
  (filter, read `nodePage({ scope: "visible" })`, change the filter, undo / `restoreTo`, read again:
  it fails on c3100058ab); and a real-input test in
  `graphty/src/workspace/data-place/__tests__/FilterCardKinds.real-element.test.tsx` (gauges with a
  filter card on, the table open, Add filter, tick one value, Cancel: the table lists the rows the
  top bar counts).
- **Acceptance**: on the route of `pilot/T77B/touched-2 03.png` (gauges-telemetry, the node table
  open, a new card ticking only G09's value, Cancel) the table reads "Shown 7 of 11 nodes" and lists
  the 7 rows the top bar counts, within the frame the top bar changes; the same on `touched-1
03.png` (a card with no match); on `pilot/T76B/touched-6 08.png`'s route (Cancel on the existing
  card, Ctrl+Z) the table agrees with the picture (0 of 11, no rows), and Ctrl+Shift+Z brings both
  back to 7. Not regressed: T77 B's success path ends with the table and the top bar on 9 of 11
  (`pilot/T77B/success 13.png`); Undo after Cancel on a new card still brings no card back
  (`pilot/T79A/touched-1`); Cancel on an existing card restores its rule
  (`pilot/T79B/touched-6`). Re-check, not gating: the screen reader's count after an undo
  (`pilot/T75A/touched-5 59.png`).
- **Decided**: `decided.md` pass 4, "A history move reaches every reading of the filter", narrowing
  pass 1's "The data table never takes an editor's selection" ("after Done or Cancel the data table
  is as it was before the workspace opened").

### setup-history

- **What the pilots saw**: T77 A touched-1 and touched-3 (pointer): a new card, Cancel, then Undo
  "to be safe". Undo correctly undoes what came before the card, which here is the setup's last
  step, "changing node color on Staff": Staff goes from E4572E to 6366F1 and the orange count
  drops to 0 (`pilot/T77A/touched-1 09.png`, toast "Undid changing node color on Staff.";
  `touched-3 06.png`). T77 B touched-1 and touched-2: Ctrl+Z after Cancel takes the colleague's
  orange off Oldest; the fill becomes 6366F1 and the canvas key disappears (`pilot/T77B/touched-1
04.png`, `touched-2 06.png`). T77 grades the layer as it ends (`answers.md` T77, and its build
  notes for c3100058ab), so a participant who did the task right and pressed Undo once is graded
  wrong. The same Undo removes station's label role (T72 B), and reverts the Random layout on the
  50,000-node starts, leaving the camera close up (T79 A and B); no graded count moves there.
- **Mechanism**: the study tool builds each start by running its setup file's steps in the same
  page (`design/ui/studio/tool/README.md`, `--start <folder> setup:<file>`), so the setup's steps
  are the session's undo history. Every start is meant to be a saved project the person reopens
  (`roster.md` line 200), and a newly opened project has no history: Undo is off with "Nothing to
  undo" (the tool's own check, `real.mjs` line 3403). The tool already makes the end of a setup
  look like a reopen for focus and the pointer (README line 48); it does not for history.
- **Fix** (the study tool, not the product): when a setup ends, the session's undo history is
  emptied through graphty-element's public `session.history.clear()`, so the participant starts
  with Undo off, as on a reopened saved project. Before building it, confirm with `--reopen` that a
  reopened saved project of the same setup starts with Undo off; if a reopen keeps any history, the
  setup ends the way a reopen does instead. The frozen build is not touched.
- **Files**: `design/ui/studio/tool/real.mjs` (the setup's end, and a `--prove` case: after a setup
  start, a hover on Undo prints "Nothing to undo"), `design/ui/studio/tool/README.md` (the setup
  paragraph), `design/ui/studio/tier5/answers.md` (the c3100058ab build note "What Undo takes after
  that Cancel" is replaced by the new behavior once the re-walk confirms it).
- **Acceptance**: on the route of `pilot/T77A/touched-1 09.png` (volunteers-thanks, a new card,
  Cancel, Undo) Undo is off with the tooltip "Nothing to undo", Ctrl+Z changes nothing, Staff stays
  E4572E and its count reads as before; on `pilot/T77B/touched-1 04.png` and `touched-2 06.png`
  (gauges-telemetry) Oldest keeps E4572E and the canvas key stays; on `pilot/T72B/touched-3 04.png`
  station keeps its Label tag; on `pilot/T79B/touched-2 04.png` the drawing and the camera do not
  change. Not changed: a participant's own steps after the start undo as before (T77 A success path:
  Undo after the hours edit undoes that edit); every setup still starts (`--prove`).
- **Decided**: `decided.md` pass 4, "A study start has no undo history".

### Not fix now, and why

- **Undo right after Cancel on an existing card brings back the cancelled edit** (T71A.p4.1,
  T76B.p4.1): the placement entry "Cancel restores the selection as it was at open, as one undo
  step" (`decided.md` line 586) makes the Cancel a step, and Undo undoes it. Whether readers expect
  that is for the sessions; the toast's words naming the rule it leaves go to the backlog with
  T72A.p4.3. Recorded in `decided.md` pass 4.
- **A new card left by Done with only an untested step** (T77A.p4.2, screen-reader route): it is
  written with its first step and removes nothing (`decided.md` lines 332-334), so every count is
  unchanged; graders count it as nothing (`answers.md` T77, added in this pass).
- **Redo after Undo on an open new card brings back an inert card** (T76B.p4.2): breaks pass 3's
  "Redo never brings the card back" but filters nothing; T76 has no sessions. Decided, not built;
  backlog, first in line.
- **A wrong spoken count after Cancel** (T77A.p4.1: "4 of 24 nodes", the Staff layer's count, while
  the picture shows 14 of 24): screen reader only and no round session runs in that mode; first for
  the accessibility walk.
- **The long waits on 50,000 nodes** (T79A.p4.2, T79B.p4.1): busy with "Drawing" throughout, severity 2
  by `criteria.md` "Large graphs" unless a participant gives up.

## Every defect

Columns: row, defect, route, class (backlog rows carry their kind), origin (fix now only), reason with
its citation. Counts: 37 product defects (3 fix now, 7 decided, 0 design questions, 27 backlog) and 4
lines that are not product defects.

### T71A

| Row       | Defect                                                                                                                                                                 | Route                    | Class             | Origin | Reason                                                                                                                                                                                                                                                                                                                                              |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | ----------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T71A.p4.1 | Ctrl+Z right after Cancel on an existing card (hours 30 to 40, Cancel) brings back min 40, 7 of 24, toast naming the rule it leaves; a second Ctrl+Z returns to min 30 | touched-6 13, 14, 15.png | n                 |        | decided.md line 586, "Cancel restores the selection as it was at open, as one undo step": the Cancel is a step and Undo undoes it; pass 4 "Undo right after Cancel on an existing card undoes the Cancel". The toast's words are backlog with T72A.p4.3. A participant pressing Undo after Cancel sees the count change on the card and the top bar |
| T71A.p4.2 | ArrowDown does not move between the value checklist's checkboxes; Tab does                                                                                             | screen-reader walk       | c [accessibility] |        | keyboard only, and Tab works; Sam's T71 A session gets past it                                                                                                                                                                                                                                                                                      |

### T72A

| Row       | Defect                                                                                                                                                                    | Route                | Class             | Origin | Reason                                                                                                                                                                |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ----------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T72A.p4.1 | 'Condition...' resolves to two controls while one is on screen (Data > Add filter, kind, tick company and agency)                                                         | touched-3 05.png     | c [accessibility] |        | screen reader only; pass 3 T72A.p3.1; one control after Done and Edit and on the toolbar route                                                                        |
| T72A.p4.2 | On a ticked new card the 1st Escape focuses the outline treeitem, the 2nd is Done, focus stays on the closed workspace's treeitem; a 3rd Escape reaches the card's button | touched-5 06, 07.png | c [accessibility] |        | keyboard only; decided, not built (workspace polish, "Done or Escape returns focus to the card's own disclosure"); unchanged from 47c95a09fc                          |
| T72A.p4.3 | Ctrl+Z while a new card is open closes it with 'Undid adding the filter "kind pick values".'; Redo reads 'Redo adding a filter condition': one step, two names            | touched-2 07, 08.png | c [wording]       |        | the count is right; 'pick values' reads as a placeholder; with it, the toast after undoing an existing card's Cancel names the rule it leaves (T71A touched-6 14.png) |

### T72B

| Row       | Defect                                                                                                                                | Route            | Class | Origin | Reason                                                                                                                                                                                                         |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ----- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T72B.p4.1 | With the node table open, one orange node sits half under the canvas toolbar, so counting the picture finds 4 of 5                    | success 10.png   | n     |        | decided: the canvas is the frame; the toolbar and key are overlays and framing never avoids them (owner-decisions.md line 3846; decided.md line 580); graded counts are read from the panels; pass 3 T72B.p3.3 |
| T72B.p4.2 | Ctrl+Z right after Cancel on a new card undoes the setup's change making station the label column ('Undid changing a column's role.') | touched-3 04.png | n     |        | decided.md pass 3, "Cancel on a new filter card leaves no undo step" (Undo undoes what came before the card); the count is unaffected; the setup's step is no longer undoable after unit setup-history         |

### T74A

| Row       | Defect                                                                                                     | Route          | Class             | Origin | Reason                                                                |
| --------- | ---------------------------------------------------------------------------------------------------------- | -------------- | ----------------- | ------ | --------------------------------------------------------------------- |
| T74A.p4.1 | The mode select is named 'PageRank test', not by the 'By value' it shows, so a click on those words misses | success 06.png | c [accessibility] |        | names only, the box itself takes the click; pass 3 T74A.p3.1          |
| T74A.p4.2 | The key card titled 'Color: Layer 1' also holds PageRank's gradient                                        | success 14.png | c [cosmetic]      |        | two entries drawn as one card; the counts are right; pass 3 T74A.p3.2 |

### T75A

| Row       | Defect                                                                                                                                   | Route                                              | Class             | Origin | Reason                                                                                                                     |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ----------------- | ------ | -------------------------------------------------------------------------------------------------------------------------- |
| T75A.p4.1 | Enter on 'Largest component' in a new card's picker moves focus out of the open workspace to the side panel's Add filter                 | touched-5 20-34.png; touched-7 05.png              | c [accessibility] |        | keyboard only; a pointer user is not affected and the keyboard user reaches Cancel and Done by Tab; unchanged since pass 1 |
| T75A.p4.2 | After Done a card shows Edit in place of its count until another card is clicked; a click on a single-step card's row only swaps in Edit | success 09.png; touched-3 09.png; touched-6 06.png | c [friction]      |        | pass 3 T75A.p3.2; Edit opens the card (one more step)                                                                      |
| T75A.p4.3 | One number box is named 'Piece size from' before So far and 'Connected components from' after it                                         | keyboard (steps after 24.png)                      | c [accessibility] |        | screen reader only                                                                                                         |
| T75A.p4.4 | Ctrl+Z with nothing to undo says nothing to a screen reader                                                                              | touched-4 22.png                                   | c [accessibility] |        | screen reader only; the Undo button's tooltip says it                                                                      |
| T75A.p4.5 | After Cancel on a new card and Ctrl+Z, the announcement reads 'Filter on: 549 of 549 nodes' though the undo removed the condition        | touched-5 59.png                                   | c [accessibility] |        | screen reader only; re-checked on unit table-after-history's walk (a reading after a history move)                         |
| T75A.p4.6 | The canvas key reads 'Draw order: graphty.style.json.node.el.drawOrder' from the start                                                   | success 01.png                                     | c [wording]       |        | pass 3 T75A.p3.3                                                                                                           |

### T75B

| Row       | Defect                                                                                                | Route           | Class             | Origin | Reason                                               |
| --------- | ----------------------------------------------------------------------------------------------------- | --------------- | ----------------- | ------ | ---------------------------------------------------- |
| T75B.p4.1 | After Enter picks Largest component in a new card's picker, focus leaves the workspace for Add filter | keyboard 25.png | c [accessibility] |        | keyboard only; the same as T75A.p4.1; does not block |

### T76B

| Row       | Defect                                                                                                                                                            | Route                                | Class             | Origin | Reason                                                                                                                                                  |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ----------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T76B.p4.1 | Cancel on an existing card, then Ctrl+Z: the cancelled 'Except telemetry no, yes' comes back (0 of 11) but the data table still lists the 7 rows, '7 of 11 nodes' | touched-6 08.png                     | c [friction]      |        | the Undo is decided (decided.md line 586); the stale table is a wrong result, but T76 has no round sessions; fixed with unit table-after-history        |
| T76B.p4.2 | Ctrl+Z with a new card open on 'telemetry' closes it ('Undid adding the filter "telemetry pick values"'); Ctrl+Shift+Z adds a closed card 'telemetry, 11 of 11'   | touched-3-undo-while-open 03, 05.png | c [friction]      |        | decided, not built (decided.md pass 3: "Redo never brings the card back", for every way a new card goes); the card filters nothing; T76 has no sessions |
| T76B.p4.3 | Tab from the last value checkbox moves focus out of the workspace to 'Local only', skipping Cancel and Done                                                       | touched-5 06.png                     | c [accessibility] |        | keyboard only; pass 1 backlog (Tab from the workspace's last field goes to the status bar)                                                              |

### T77A

| Row       | Defect                                                                                                                                                                                                 | Route                              | Class             | Origin | Reason                                                                                                                                                                                                                                                                  |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------- | ----------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T77A.p4.1 | The live region speaks unlabeled counts that are not the picture's: '3 of 24' then '0 of 24' after the tick (top bar 1 of 24); 'Filter not added' then '4 of 24 nodes' after Cancel (picture 14 of 24) | touched-5 27, 40.png               | c [accessibility] |        | screen reader only, and no round session runs in that mode (roster.md line 211); first for the accessibility walk                                                                                                                                                       |
| T77A.p4.2 | The toolbar's Filters, type trained, Enter, no value, Done: a second card 'trained pick yes or no' stays, on, 24 of 24; 'Done, 24 of 24'                                                               | touched-7 84.png                   | c [friction]      |        | decided.md lines 332-334: a new card is written with its first step, and an untested step removes nothing, so no count moves; pass 4 "A new card left with only an untested step stays inert"; answers.md T77 now says an inert leftover card does not change the grade |
| T77A.p4.3 | A new card, Cancel, then Undo 'to be safe' undoes the setup's last step: Staff goes E4572E to 6366F1 and the orange count drops to 0                                                                   | touched-1 09.png; touched-3 06.png | a                 | new    | spoils: T77 grades the Staff layer's orange as it ends, and the step undone is the colleague's, which a reopened saved project (roster.md line 200) would not hold as history. decided.md pass 4, "A study start has no undo history". Unit setup-history               |

### T77B

| Row       | Defect                                                                                                                                                                                             | Route                                              | Class | Origin     | Reason                                                                                                                                                                                                                                                                                                                                               |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ----- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T77B.p4.1 | After Cancel on a new card that had a result, the node table keeps that card's rows: 'Shown 1 of 11 nodes', one row (G09), 'With issues 1' (or '0 of 11, No rows') while the top bar shows 7 of 11 | touched-2 03, 04, 10.png; touched-1 03, 05, 06.png | a     | regression | spoils: a participant counting gauges from the table after the counted wrong turn (a new card for the deep gauges, then Cancel) reads 1 or 0 instead of 7; breaks decided.md pass 1 "The data table never takes an editor's selection"; 47c95a09fc listed the 7 rows, 9610767e29's take-back by a history restore does not. Unit table-after-history |
| T77B.p4.2 | Ctrl+Z right after Cancel on a new card undoes the colleague's orange on Oldest: the fill becomes 6366F1 and the canvas key disappears                                                             | touched-1 04.png; touched-2 06.png                 | a     | new        | spoils: T77 B grades the Oldest layer as it ends (answers.md T77, build notes for c3100058ab), and the step is the setup's, not the participant's. Unit setup-history                                                                                                                                                                                |
| T77B.p4.3 | With the node table open, the lower part of the drawing sits under the table and the canvas toolbar, so counting orange on the picture finds fewer than 5                                          | success 13.png                                     | n     |            | decided: the canvas is the frame (owner-decisions.md line 3846; decided.md line 580); the inspector and the key hold the right count                                                                                                                                                                                                                 |

### T79A

| Row       | Defect                                                                                                                                     | Route                                                              | Class             | Origin | Reason                                                                                                                                                                         |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ | ----------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| T79A.p4.2 | Opening Which nodes, the tick and Done each take 15 to 23 s on 50,000 nodes, with 'Drawing' on screen throughout and no progress           | success, touched-9, -10, -13 route.jsonl; touched-13 07-glance.png | c [friction]      |        | busy with a sign: severity 2 by criteria.md "Large graphs" unless a participant gives up; pass 3 T79B.p3.2                                                                     |
| T79A.p4.3 | After Done, Which nodes' title row and a focused filter card show 'Edit' in place of the count while focused                               | success 07, 11.png; touched-6 05.png                               | c [friction]      |        | pass 3 T79B.p3.3                                                                                                                                                               |
| T79A.p4.4 | After Enter in the find box zooms to node n4, a new card's preview shows only the lower-left part of the drawing                           | touched-8 27.png                                                   | n                 |        | decided.md line 580: the preview is an overlay, the main drawing is never re-framed, Fit frames on request; interaction-patterns.md line 322 (a Find hit is brought into view) |
| T79A.p4.5 | Shift+Tab out of a new card's empty picker keeps the card as 'New filter / All nodes' until Cancel                                         | touched-7c 08.png                                                  | c [accessibility] |        | keyboard only; pass 3 T79B.p3.6; the workspace stays open and every way out takes the card away                                                                                |
| T79A.p4.6 | A click on Condition... right after a tick missed once ('Element is not attached to the DOM': the pane re-rendered under the pointer)      | touched-3 06, 07.png                                               | c [friction]      |        | the same click worked on retry; a person may need a second click                                                                                                               |
| T79A.p4.7 | Ctrl+Z after a cancelled card undoes a setup step: the Random layout (camera left zoomed in, then 'Nothing to undo'); station's label role | touched-1 07.png; touched-3 04.png                                 | n                 |        | decided.md pass 3 (Undo undoes what came before the card); no graded count moves; the setup's steps are no longer undoable after unit setup-history                            |

### T79B

| Row       | Defect                                                                                                                                         | Route                                                                | Class             | Origin | Reason                                                                                                                      |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ----------------- | ------ | --------------------------------------------------------------------------------------------------------------------------- |
| T79B.p4.1 | The waits on 50,000 nodes: opening Which nodes 20 s, the tick 21 s, Done 21 s, a new filter card 24 s, Cancel 18 to 20 s, 'Drawing' throughout | touched-10, -11, -6, -12 route.jsonl; touched-10 09-glance-15000.png | c [friction]      |        | busy with a sign, severity 2 by criteria.md "Large graphs"; pass 3 T79B.p3.2                                                |
| T79B.p4.2 | After Escape closes the workspace, the Which nodes row is named 'basin Otter Creek, 1,050 of 50,000 nodes so far' for a single step            | keyboard 32.png                                                      | c [accessibility] |        | screen reader only; 'so far' implies several steps                                                                          |
| T79B.p4.3 | Undo right after Cancel undoes the setup's 'changing the layout': nodes on a sphere seen close up, camera not refit                            | touched-2 04.png; touched-3 05.png                                   | n                 |        | decided.md pass 3; no count changes and Redo restores it; the setup's steps are no longer undoable after unit setup-history |
| T79B.p4.4 | After Done, Which nodes' title row shows 'Edit' in place of '1,050 of 50k' while it has focus                                                  | success 09.png                                                       | c [friction]      |        | pass 3 T79B.p3.3                                                                                                            |
| T79B.p4.5 | Spoken names drop the thousands separators the screen shows ('1050 of 50000 nodes', 'Otter Creek, 1050 nodes')                                 | touched-4 16.png and its route.jsonl                                 | c [accessibility] |        | screen reader only; pass 3 T79A.p3.5                                                                                        |
| T79B.p4.6 | Before a color is committed, the new color box is named 'Node color, not set, drawn #6366F1 indigo'                                            | keyboard 41.png                                                      | c [accessibility] |        | screen reader only; pass 3 T79B.p3.5                                                                                        |

### Not product defects

| Task | Line                                                                                                                                       | Class                                                                                                             |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| T72A | The report file could not be written (the harness refuses a subagent's report file); its content is in the pilot's output                  | none (process; the orchestrator writes the report from the pilot's output)                                        |
| T75A | The keyboard walk was started with `--sr` but without `--keys`, so its `session.json` does not record keyboard-only mode                   | none (process; a keyboard walk the gate counts is started with `--keys`, as `roster.md` line 150 says for Sam)    |
| T79A | The report file could not be written; its content is in the pilot's output                                                                 | none (process; the orchestrator writes the report from the pilot's output)                                        |
| T79B | On a step that presses Cancel by Enter, the step's output reports focus on Cancel, read before the 12 s close; the settled screen is right | none (the tool reads focus when the step returns; the screenshot and Tab / Shift+Tab confirm focus on Add filter) |
