# Tier 5 dry run, pass 5: triage of the re-walks on build f0a9a014cb

Build: f0a9a014cb (`criteria.md` line 1). Its code is c3100058ab's: `git diff --stat c3100058ab
f0a9a014cb` touches only `design/`. So it carries pass 3's fixes and neither of pass 4's units
(table-after-history and setup-history, `dry-run-r1-4.md`). The walks between pass 4 and this build
re-checked pass 1's units on the current code and changed nothing (engineer notes 59846eed2c to
f0a9a014cb). Pilot walks and screenshots are under the main checkout's
`tmp/design-studio/tier5/r1d1/pilot/<task>/<route>/` (the walks of 797a4f6b47 that shared those
folders were moved aside as `*-old-797a4f6b47` and `prev-797a4f6b47`); a screenshot below is
written `<route> NN.png` under its task's folder. Rows are named `<task>.p5.<n>`; `pass 4 T..`
points at a row of `dry-run-r1-4.md`.

This file is pass 5. `dry-run-r1-2.md` already holds pass 2's triage (797a4f6b47), so this pass
takes the next free name instead of overwriting it.

## How each defect was classed

Pass 1's to 4's rules stand (`dry-run-r1-1.md` to `dry-run-r1-4.md`, "How each defect was classed";
`decided.md`, "Dry run pass 1" to "Dry run pass 4"): fix now only for a crash, a block or a spoiled
grade on a task's success path or a walked detour; what a keyboard or screen-reader user alone meets
is backlog (no round session runs in screen-reader mode; Sam's keyboard sessions are T70 A and T71 A,
`roster.md` line 211); T76 has no round sessions, so its rows are backlog; a row that repeats an
earlier backlog row keeps its class unless the re-walk brought new evidence; a row that spoils no
grade on its own task but shares a mechanism with a fix-now row is backlog by itself and fixed with
that unit.

One rule is added in this pass (`decided.md`, "Dry run pass 5"): a fix-now row an earlier triage
sent to fix stays open until a build carries its fix. Where the build's code is the code that row
was walked on, its walk stands without a re-walk (`notes/director.md`, 2026-10-30: an earlier walk
stands when the source diff is code its route never reaches). Such rows are listed below as carried
and counted with this pass's fix-now rows, origin repeat.

## Fix now: the units

| Unit                | What                                                                                                                 | Rows                           | Class  | Origin                                                                    |
| ------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ------ | ------------------------------------------------------------------------- |
| setup-history       | A study start keeps the setup's steps as undo history, so Undo after a cancelled card undoes the colleague's work    | T77A.p4.3, T77B.p4.2 (carried) | spoils | repeat (sent by pass 4, not built; T71 A and T71 B show it on f0a9a014cb) |
| table-after-history | After a history move (a new card's take-back, Undo), the node table keeps the rows of the filter as it was before it | T77B.p4.1 (carried)            | spoils | repeat (sent by pass 4, not built; the code is unchanged)                 |

Totals over the fix-now rows: 3 (0 crashes, 0 blocks, 3 spoils); 0 regressions, 3 repeats, 0 new.
None of the 44 product defects this pass's pilots reported is fix now by itself.

Fixed with these units though classed backlog by themselves: T71A.p5.1 and T71B.p5.1 (the start's
undo history on tasks whose grade it does not move) by setup-history; pass 4's T76B.p4.1 and
T75A.p4.5 by table-after-history, as pass 4 set out.

### setup-history

- **What the pilots saw on f0a9a014cb**: T71 A touched-31: a new filter card, Cancel, Ctrl+Z: the
  toast reads "Undid running PageRank." and the colleague's PageRank colors go; Redo brings them back
  (`pilot/T71A/touched-31 04.png`; the keyboard walk's start already offers "Undo running PageRank",
  `keyboard 04.png`). T71 B keyboard: at the start Undo reads "Undo changing a column's role" and is
  on (`pilot/T71B/keyboard 04.png`). On c3100058ab, the same code: Undo after Cancel took the
  colleague's orange off Staff (T77 A) and Oldest (T77 B), which T77 grades (`dry-run-r1-4.md`,
  setup-history).
- **Mechanism**: the study tool builds each start by running its setup file's steps in the page
  (`design/ui/studio/tool/real.mjs`, `opStart`, the `if (setup.length)` block), so those steps are the
  session's undo history. Every start is meant to be a saved project the person reopens (`roster.md`
  line 200), and a reopened project has no history. The block already clears focus and the pointer
  so the start looks like a reopen; it does not clear history.
- **Fix** (the study tool, not the product; the frozen build is not touched): at the end of a
  setup, empty the session's undo history through graphty-element's public `session.history.clear()`
  (`SessionHistory.clear`, `graphty-element/api/session.api.md` line 5529), so the participant starts
  with Undo off ("Nothing to undo"). First confirm with `--reopen` that a reopened saved project of
  the same setup starts with Undo off; if a reopen keeps any history, end the setup the way a reopen
  does instead.
- **Files**: `design/ui/studio/tool/real.mjs` (the setup's end, and a `--prove` case: after a setup
  start, the Undo button is disabled and its tooltip reads "Nothing to undo"),
  `design/ui/studio/tool/README.md` (the setup paragraph), `design/ui/studio/tier5/answers.md` (the
  c3100058ab build note "What Undo takes after that Cancel" says the new behavior once the re-walk
  confirms it).
- **Acceptance**: on every setup start Undo is off. T71 A touched-31 (`r1d1/pilot/T71A/touched-31
04.png`'s route: a new card, Cancel, Ctrl+Z): nothing is undone and the PageRank colors stay; T71 B
  keyboard (`r1d1/pilot/T71B/keyboard 04.png`): Undo is off at the start; T77 A touched-1
  (`r1d3/pilot/T77A/touched-1 09.png`'s route): Staff keeps E4572E and its count; T77 B touched-1 and
  touched-2 (`r1d3/pilot/T77B/touched-1 04.png`, `touched-2 06.png`): Oldest keeps E4572E and the
  canvas key stays; T72 B touched-3 (`r1d3/pilot/T72B/touched-3 04.png`): station keeps its Label
  tag; T79 B touched-2 (`r1d3/pilot/T79B/touched-2 04.png`): the drawing and the camera do not change.
  Not changed: a participant's own steps undo as before (T77 A success path: Undo after the hours
  edit undoes that edit); every setup still starts (`--prove`).
- **Decided**: `decided.md` pass 4, "A study start has no undo history".

### table-after-history

As set out in `dry-run-r1-4.md` ("table-after-history"); restated here so the unit stands alone.

- **What the pilots saw on c3100058ab** (the same code): T77 B touched-2: a new filter card ticking
  only G09's value, Cancel: the top bar and the canvas show 7 of 11 while the node table reads "Shown
  1 of 11 nodes" with the one row G09 (`r1d3/pilot/T77B/touched-2 03.png`); a card with no match left
  "0 of 11 nodes, No rows" (`touched-1 03.png`). T76 B touched-6: after Cancel on the existing card
  and Ctrl+Z the picture reads 0 of 11 while the table still lists 7 rows (`r1d3/pilot/T76B/touched-6
08.png`).
- **Mechanism (likely; confirm with a failing test first)**: graphty-element's record pages cache
  each ordered row list under the session's input tick (`RevisionCache` in
  `graphty-element/src/session/data.ts`, `orders`, `orderOf`). A new card is taken back with
  `history.restoreTo`, and an Undo of a filter step is the same kind of history move; when it changes
  the filter without moving the revision the page reads, `page()` serves the cached order of the
  filter as it was. The summary the top bar reads is not cached that way, so it is right.
- **Fix** (graphty-element): every record page read after a history move (undo, redo, restore,
  `restoreTo` with or without `redo: "drop"`) that changed the filter lists the records the filter
  leaves now, with its `total`. One fix in the element, so every page reader (the table dock, the
  matches strip, the inspector's neighbor lists) gets it; no app workaround.
- **Files**: `graphty-element/src/session/data.ts` (and `revision.ts`, or wherever a history move
  restores the visibility state without moving the revision), a test under
  `graphty-element/test/session/` (filter, read `nodePage({ scope: "visible" })`, change the filter,
  undo or `restoreTo`, read again: it fails on f0a9a014cb), and a real-input test in
  `graphty/src/workspace/data-place/__tests__/FilterCardKinds.real-element.test.tsx` (gauges with a
  filter card on, the table open, Add filter, tick one value, Cancel: the table lists the rows the
  top bar counts).
- **Acceptance**: on the route of `r1d3/pilot/T77B/touched-2 03.png` the table reads "Shown 7 of 11
  nodes" and lists the 7 rows the top bar counts, from the frame the top bar changes; the same on
  `touched-1 03.png`; on `r1d3/pilot/T76B/touched-6 08.png`'s route (Cancel on the existing card,
  Ctrl+Z) the table agrees with the picture (0 of 11, no rows), and Ctrl+Shift+Z brings both back to 7. Not regressed: T77 B's success path ends with the table and the top bar on 9 of 11
  (`r1d3/pilot/T77B/success 13.png`); Undo after Cancel on a new card brings no card back (T79 A
  touched-1); Cancel on an existing card restores its rule (T79 B touched-6). Re-check, not gating:
  the spoken count after an undo (`r1d3/pilot/T75A/touched-5 59.png`).
- **Decided**: `decided.md` pass 4, "A history move reaches every reading of the filter".

### Not fix now, and why

- **The live status's count base** (T70B.p5.1: "7 of 11 nodes" spoken while the screen reads 7 of
  7): a wrong spoken count, but screen reader only and no round session runs in that mode. Settled
  in `decided.md` pass 5 (the spoken count reads over the same base as the screen); first for the
  accessibility walk.
- **A hidden layer's edges left drawn** (T71A.p5.2, T71B.p5.3): a not-success route; `answers.md`
  grades a count read from it as the count it is (pass 2 T71A.p2.1).
- **Nodes under the canvas toolbar** (T72B.p5.1, T73B.p5.3, T74B.p5.3, T77B.p5.1): decided, the
  canvas is the frame; graded counts are read from the panels.
- **The 50,000-node Done turning every node blue while "Drawing" shows** (T79B.p5.1): busy with a
  sign, and the painted result is right; cosmetic.
- **A layer's Which edges not narrowing its node Degree step** (T78B.p5.2): a design question for
  the sessions, as in passes 1 and 2.

## Carried from pass 4

| Row       | Defect                                                                                                                                                      | Route                                               | Class | Origin | Reason                                                                                                                  |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ----- | ------ | ----------------------------------------------------------------------------------------------------------------------- |
| T77B.p4.1 | After Cancel on a new card that matched one gauge, the node table keeps 'Shown 1 of 11 nodes' and the row G09 while the top bar and the canvas show 7 of 11 | r1d3 pilot/T77B/ touched-2 03.png; touched-1 03.png | a     | repeat | spoils (T77 B): a reader counting from the table reports 1 for 7; unit table-after-history (dry-run-r1-4.md), not built |
| T77A.p4.3 | Undo after Cancel on a new card undoes the setup's last step: Staff loses its orange, orange count 0                                                        | r1d3 pilot/T77A/ touched-1 09.png; touched-3 06.png | a     | repeat | spoils (T77 A grades the Staff layer as it ends); unit setup-history (dry-run-r1-4.md), not built                       |
| T77B.p4.2 | Ctrl+Z after Cancel takes the colleague's orange off Oldest; the canvas key goes                                                                            | r1d3 pilot/T77B/ touched-1 04.png; touched-2 06.png | a     | repeat | spoils (T77 B grades the Oldest layer as it ends); unit setup-history (dry-run-r1-4.md), not built                      |

## Every defect

Columns: row, defect, route, class (backlog rows carry their kind), origin (fix now only), reason with
its citation. Counts: 47 lines from the pilots: 44 product defects (0 fix now, 5 decided, 1 design
question, 38 backlog) and 3 lines that are not product defects; plus 3 carried fix-now rows.

### T70B

| Row       | Defect                                                                                                                                                               | Route               | Class             | Origin | Reason                                                                                                                                                                                                                                           |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ----------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| T70B.p5.1 | With a filter card on, the live status speaks the Which nodes count over the whole graph ('7 of 11 nodes', '2 of 11 nodes') while the screen reads 7 of 7 and 2 of 7 | keyboard 65, 66.png | c [accessibility] |        | screen reader only and no round session runs in that mode (roster.md); breaks pass 1's 'Every count in the style host reads over the style selector's base', extended to the spoken count by decided.md pass 5; first for the accessibility walk |
| T70B.p5.2 | Escape in the node color box does nothing (focus and value stay)                                                                                                     | keyboard 77.png     | c [accessibility] |        | keyboard only; Enter already applied the color                                                                                                                                                                                                   |
| T70B.p5.3 | A layer added from Quick actions is 21 Tabs from Which nodes (layer name, Graph settings, the canvas, the toolbar and the whole table come first)                    | keyboard 44.png     | c [accessibility] |        | keyboard only; the step is reachable                                                                                                                                                                                                             |

### T71A

| Row       | Defect                                                                                                                                                                                                | Route                              | Class             | Origin | Reason                                                                                                                                                                                             |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ----------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T71A.p5.1 | The study start has undo history: Cancel on a new filter card, then Ctrl+Z, undoes the setup's PageRank run ('Undid running PageRank.') and the colleague's PageRank colors go; Redo brings them back | touched-31 04.png; keyboard 04.png | c [friction]      |        | decided, not built (decided.md pass 4, 'A study start has no undo history'); T71 A's grade does not read the colors; fixed with unit setup-history, which pass 4 sent and the build does not carry |
| T71A.p5.2 | A Visibility Hidden layer leaves its hidden nodes' 14 edges drawn and the key reads 'Show: Layer 1'; the top bar reads 10 of 24                                                                       | touched-4 10, 15.png               | c [friction]      |        | not-success route; answers.md grades a count read from it as the count it is; pass 2 T71A.p2.1 and T71A.p2.2                                                                                       |
| T71A.p5.3 | Enter on Or... adds group B and says nothing; focus moves to the picker's search                                                                                                                      | keyboard 42.png                    | c [accessibility] |        | screen reader only; pass 2 T71A.p2.11                                                                                                                                                              |

### T71B

| Row       | Defect                                                                                                                | Route           | Class        | Origin | Reason                                                                                                                                  |
| --------- | --------------------------------------------------------------------------------------------------------------------- | --------------- | ------------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| T71B.p5.1 | The study start has undo history: Undo reads 'Undo changing a column's role' and would undo the setup's station label | keyboard 04.png | c [friction] |        | decided, not built (decided.md pass 4, 'A study start has no undo history'); no T71 B route pressed Undo; fixed with unit setup-history |
| T71B.p5.2 | Delete on a selected filter card does nothing; the card is removed only through its workspace's ... > Delete          | detour-1 11.png | c [friction] |        | another route removes it; look only                                                                                                     |
| T71B.p5.3 | A layer hiding six nodes leaves their edges drawn as loose lines                                                      | detour-3 09.png | c [friction] |        | not-success route; the same as T71A.p5.2; pass 2 T71B.p2.3                                                                              |

### T72B

| Row       | Defect                                                                                                                                                 | Route                             | Class        | Origin | Reason                                                                                                                                                                           |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------- | ------------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T72B.p5.1 | With the node table open, one orange node sits half under the canvas toolbar (4 and a half counted on the picture; key and inspector 5)                | success 10.png; touched-24 12.png | n            |        | decided: the canvas is the frame; the toolbar and key are overlays (decided.md line 580, 'it is an overlay'; line 716); graded counts are read from the panels; pass 4 T72B.p4.1 |
| T72B.p5.2 | Under a filter card the key line 'Color: Layer 1' has no count while the inspector says 5 of 5                                                         | touched-5 05.png                  | c [wording]  |        | the count is on the inspector and the layer row                                                                                                                                  |
| T72B.p5.3 | Enter on a new Fill with no color typed commits the default 6366F1, so the canvas does not change and a second layer looks as if it took the color off | touched-23 11.png                 | c [friction] |        | a decoy route; pass 2 T72B.p2.1                                                                                                                                                  |

### T73A

| Row       | Defect                                                                                                                            | Route                 | Class             | Origin | Reason                                                                                                                                                                                                                |
| --------- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ----------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T73A.p5.1 | Tab in the reference picker's search sends focus to Main menu with the picker still open; a click on an option leaves focus there | touched-27 04, 05.png | c [accessibility] |        | keyboard only; the click picks the reference; unchanged since 797a4f6b47                                                                                                                                              |
| T73A.p5.2 | A table draws under the canvas preview inside the Which nodes workspace                                                           | success 11.png        | n                 |        | decided: the matches strip is the only table under the preview (decided.md pass 1, 'The data table never takes an editor's selection'); pass 2's re-walk showed this is the strip (decided.md pass 2, the band entry) |

### T73B

| Row       | Defect                                                                                                                              | Route             | Class             | Origin | Reason                                                                                                                                                |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ----------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| T73B.p5.1 | Tab in the reference picker's search moves focus to Main menu and leaves the picker open                                            | touched-29 03.png | c [accessibility] |        | keyboard only; the same as T73A.p5.1                                                                                                                  |
| T73B.p5.2 | Before a reference is picked the header reads '11 of 11', which could be read as the answer                                         | touched-29 03.png | c [wording]       |        | the step is inert until a reference is chosen (decided.md 'Step states are applied, inert or pending'); the count moves on the pick; pass 2 T73B.p2.3 |
| T73B.p5.3 | With the table open, one orange gauge sits half under the canvas toolbar (6 counted on the picture; key, layer row and inspector 7) | success 09.png    | n                 |        | decided: the canvas is the frame (decided.md line 580; line 716); pass 3 T73B.p3.1                                                                    |
| T73B.p5.4 | A blank band of about 200 px between the workspace preview and the matches table                                                    | success 06.png    | c [cosmetic]      |        | decided.md pass 2: the hidden data table's kept place, cosmetic, first for bar 9's calm-first check                                                   |

### T74A

| Row       | Defect                                                                                                                   | Route          | Class             | Origin | Reason                                                                |
| --------- | ------------------------------------------------------------------------------------------------------------------------ | -------------- | ----------------- | ------ | --------------------------------------------------------------------- |
| T74A.p5.1 | The mode select is named 'PageRank test', not by the 'By value' it shows, so a click on the words misses                 | success 06.png | c [accessibility] |        | the box itself takes the click; pass 4 T74A.p4.1                      |
| T74A.p5.2 | The key card titled 'Color: Layer 1' shows PageRank's gradient (0.02796 to 0.05862) instead of the layer's single orange | success 14.png | c [cosmetic]      |        | two entries drawn as one card; the counts are right; pass 4 T74A.p4.2 |

### T74B

| Row       | Defect                                                                                              | Route           | Class             | Origin | Reason                                                                                                             |
| --------- | --------------------------------------------------------------------------------------------------- | --------------- | ----------------- | ------ | ------------------------------------------------------------------------------------------------------------------ |
| T74B.p5.1 | Enter in 'Betweenness: how many' announces '3 of 11 nodes' twice                                    | keyboard 50.png | c [accessibility] |        | screen reader only; pass 3 T74B.p3.1                                                                               |
| T74B.p5.2 | Cancel on a new layer's Which nodes leaves the empty Layer 1 ('All nodes', 11) in the layer list    | detour-2 09.png | c [friction]      |        | Cancel restores the selection as it was at open (decided.md line 586); the layer paints nothing, so no grade moves |
| T74B.p5.3 | With the node table open, the third orange gauge sits partly under the canvas toolbar (key 3 of 11) | success 12.png  | n                 |        | decided: the canvas is the frame (decided.md line 580; line 716)                                                   |

### T75A

| Row       | Defect                                                                                                         | Route            | Class        | Origin | Reason                                                                                                 |
| --------- | -------------------------------------------------------------------------------------------------------------- | ---------------- | ------------ | ------ | ------------------------------------------------------------------------------------------------------ |
| T75A.p5.1 | Largest component has no Advanced or So far and nothing says why it keeps all 112                              | touched-8 08.png | c [friction] |        | a known wrong turn graded P (answers.md T75); spec 4.2; the Piece size So far route reaches the answer |
| T75A.p5.2 | After Done a card the pointer is not on shows Edit in place of its count                                       | touched-8 04.png | c [friction] |        | pass 4 T75A.p4.2                                                                                       |
| T75A.p5.3 | The picker lists 'Connected components: Piece' and '... Piece size' and lights the first, so Enter takes Piece | touched-8 09.png | c [friction] |        | pass 2 T75A.p2.5                                                                                       |
| T75A.p5.4 | The canvas key reads 'Draw order: graphty.style.json.node.el.drawOrder'                                        | success 09.png   | c [wording]  |        | pass 4 T75A.p4.6                                                                                       |

### T76B

| Row       | Defect                                                                                                                  | Route             | Class        | Origin | Reason                    |
| --------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------- | ------------ | ------ | ------------------------- |
| T76B.p5.1 | In the inspector's Which nodes outline a step's pass count is cut off ('Passes nor') and the inspector scrolls sideways | touched-11 14.png | c [cosmetic] |        | T76 has no round sessions |
| T76B.p5.2 | Tab out of Halo opacity lands on its link button, whose tooltip stays up over the line below the field                  | success 14.png    | c [cosmetic] |        | T76 has no round sessions |

### T77B

| Row       | Defect                                                                                                                   | Route             | Class        | Origin | Reason                                                                             |
| --------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------- | ------------ | ------ | ---------------------------------------------------------------------------------- |
| T77B.p5.1 | With the node table open, one orange node sits half under the canvas toolbar (4 and a half counted; key and inspector 5) | success 13.png    | n            |        | decided: the canvas is the frame (decided.md line 580; line 716); pass 4 T77B.p4.3 |
| T77B.p5.2 | After Done, while focus stays on it, the Which nodes title row shows Edit in place of '5 of 9'                           | touched-33 08.png | c [friction] |        | pass 4 T79A.p4.3                                                                   |

### T78B

| Row       | Defect                                                                                                                                            | Route                            | Class             | Origin | Reason                                                                                                                                                                     |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ----------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T78B.p5.1 | Tab from the workspace's last field (km to) goes to 'Local only'; Done is 24 Tabs away, after the inspector                                       | keyboard 49.png onward           | c [accessibility] |        | keyboard only; pass 1 backlog (Tab from the workspace's last field goes to the status bar)                                                                                 |
| T78B.p5.2 | A layer's Which edges (km max 2.9) does not narrow the same layer's node Degree step, nothing says so, and the orange stretches make 9 look right | detour-3 09.png                  | b                 |        | whether a layer's node rule reads its own edge rule is for the sessions (pass 1 T78B.6, pass 2 T78B.p2.1); the decided route is Edges in Advanced (placement editor fix 1) |
| T78B.p5.3 | Each count change is announced twice ('9 of 11 nodes', '7 of 11 nodes')                                                                           | keyboard after 39.png and 49.png | c [accessibility] |        | screen reader only; pass 1 backlog (the count announced twice)                                                                                                             |

### T79A

| Row       | Defect                                                                                                               | Route                        | Class        | Origin | Reason                                                     |
| --------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ------------ | ------ | ---------------------------------------------------------- |
| T79A.p5.1 | The reference list for 'Person 0' shows 8 of 10,000 matches out of name order (n6818 first; Person 00000 not listed) | touched-30-f0a9a014cb 05.png | c [friction] |        | does not touch T79 A's route; typing more narrows the list |
| T79A.p5.2 | After Done, while focus is on the Which nodes row, the row shows Edit instead of the count                           | success-f0a9a014cb 07.png    | c [friction] |        | pass 4 T79A.p4.3                                           |
| T79A.p5.3 | The graph's Values tab lists 'Time: name' (the name column offered as a time)                                        | touched-32-f0a9a014cb 05.png | c [wording]  |        | no grade reads it                                          |

### T79B

| Row       | Defect                                                                                                                                         | Route                                              | Class             | Origin | Reason                                                                                                                                                           |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ----------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T79B.p5.1 | While Done works on 50,000 nodes the preview first keeps the 1,050 green picks, then turns every node plain blue for the rest of the 15 s wait | touched-40 09-glance-9000.png, 09-glance-15000.png | c [cosmetic]      |        | 'Drawing' stays on screen and Otter Creek stays ticked (decided.md pass 3, 'Done, Cancel and Escape on a large graph keep Drawing'); the painted result is right |
| T79B.p5.2 | The tick is announced twice in two formats ('1050 of 50000 nodes', then '1,050 of 50,000 nodes')                                               | keyboard 30.png                                    | c [accessibility] |        | screen reader only; pass 3 T79B.p3.4                                                                                                                             |
| T79B.p5.3 | Before a color is committed the new color box is named 'Node color, not set, drawn #6366F1 indigo'                                             | keyboard 40.png                                    | c [accessibility] |        | screen reader only; pass 4 T79B.p4.6                                                                                                                             |
| T79B.p5.4 | The Which nodes tree row is named 'Which nodes, 50000 of 50000 nodes', without the separators the screen shows                                 | keyboard 22.png                                    | c [accessibility] |        | screen reader only; pass 4 T79B.p4.5                                                                                                                             |
| T79B.p5.5 | After Done the focused Which nodes row (and a focused filter card) shows Edit in place of its count                                            | success 09.png; keyboard 32.png; detour-3 06.png   | c [friction]      |        | pass 4 T79B.p4.4                                                                                                                                                 |
| T79B.p5.6 | '32 more' under the checklist is plain text and the wheel reveals no more rows; Otter Creek is reached by the search                           | detour-1 05.png                                    | c [friction]      |        | the search finds it (the list is bounded and searchable, criteria.md 'Large graphs'); pass 2 T79A.p2.6                                                           |
| T79B.p5.7 | The reference list for 'Sensor 0001' is in neither name nor id order (n10, n11, n13, n12, ...)                                                 | touched-30 07.png                                  | c [friction]      |        | looks only; the same as T79A.p5.1                                                                                                                                |

### Not product defects

| Task | Line                                                                                                                                          | Class                                                                      |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| T72B | None that crash, block or spoil the grade                                                                                                     | none (a summary line)                                                      |
| T73B | Nothing crashes, blocks the task or spoils its grade; the rows below were also seen on 797a4f6b47                                             | none (a summary line)                                                      |
| T75A | The report was not written: the harness refused the subagent's Write, so `rounds/r1d1/pilot/T75A/report.md` still holds the 797a4f6b47 report | none (process; the orchestrator writes the report from the pilot's output) |
