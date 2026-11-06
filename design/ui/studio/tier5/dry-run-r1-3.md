# Tier 5 dry run, pass 3: triage of the re-walks on the second fix build

Build: 47c95a09fc (`criteria.md` line 1), which carries pass 2's fixes: Cancel on a new filter card
takes the card away, with focus returned to a control that opens filters, else Add filter
(47c95a09fc); and graphty-element keeps its style agreement reading while nothing it reads changes, so
opening Which nodes on 50,000 nodes draws its first frame at once (e13e34f007). Pilot walks and
screenshots are under the main checkout's `tmp/design-studio/tier5/r1d2/pilot/<task>/<route>/`; a
screenshot below is written `<route> NN.png` under its task's folder. Rows are named `<task>.p3.<n>`;
`pass 2 T..` points at a row of `dry-run-r1-2.md`.

## How each defect was classed

Pass 1's and pass 2's rules stand (`dry-run-r1-1.md` and `dry-run-r1-2.md`, "How each defect was
classed"; `decided.md`, "Dry run pass 1" and "Dry run pass 2"): fix now only for a crash, a block or a
spoiled grade on a task's success path or a walked detour, plus any severity 3 candidate `criteria.md`
item 8 names; what a keyboard or screen-reader user alone meets is backlog; a row that repeats an
earlier backlog row keeps its class unless the re-walk brought new evidence. A defect that spoils no
grade on its own task but shares a mechanism with a fix-now row is backlog by itself and fixed with
that unit.

Origin, fix now only: new; repeat (an earlier pass sent the same problem to be fixed and it is back);
regression (caused by pass 2's fixes).

## Fix now: the units

| Unit           | What                                                                                                                    | Rows      | Class          | Origin                                                                                 |
| -------------- | ----------------------------------------------------------------------------------------------------------------------- | --------- | -------------- | -------------------------------------------------------------------------------------- |
| cancel-no-undo | Undo after Cancel on a new filter card names a deletion nobody made and brings the cancelled card back switched on      | T79A.p3.1 | spoils         | regression (47c95a09fc writes the card's removal as a new undo step)                   |
| done-busy-sign | Done on 50,000 nodes closes the workspace at once and leaves the preview look on the canvas for 13 to 15 s with no sign | T79B.p3.1 | crash (item 8) | repeat (pass 1 unit busy-sign named Done; its fix showed "Drawing" for one frame only) |

Totals over the fix-now rows: 2 (1 crash, 0 blocks, 1 spoils); 1 regression, 1 repeat, 0 new.

Fixed with these units though classed backlog by themselves: T70B.p3.1 and T72B.p3.1 (the same Undo
after Cancel, on tasks whose grade it does not move) and T70B.p3.2 and T72B.p3.2 ("Filter off" said
after "Filter not added" for a card that never existed, the same removal) by cancel-no-undo.

### cancel-no-undo

- **Mechanism**: a new card is written by its first tick (`decided.md` line 332), and its edits are
  undo steps like any other. 47c95a09fc's Cancel on a new card then calls
  `session.visibility.removeCondition(id)` through `writeCondition` (`Filters.tsx`, the card's
  `onEmptyCancel`), which records a third step, a deletion. The top of the history is that deletion, so
  the undo button reads "Undo deleting a filter condition" and Undo restores the card as it was
  removed, ticked and on. The same removal makes the filter chip's status line say "Filter off".
- **Fix** (graphty; graphty-element only if needed): taking a new card away leaves the history as it
  was before the card was asked for -- no step for its tick, edits or removal, nothing to redo -- and
  says only "Filter not added". graphty-element's transactions write no history entry when they roll
  back (`graphty-element/src/session/journal.ts`, file header); if the workspace's live edits on a new
  card cannot be taken back that way, graphty-element gets an additive way to take back a run of steps
  with no redo, named by the team and recorded in `owner-decisions.md` under "decided by the team".
  Cancel on an existing card is unchanged (restores its rule as one undo step).
- **Files**: `graphty/src/workspace/data-place/Filters.tsx`,
  `graphty/src/workspace/selection/SelectionEditor.tsx`,
  `graphty/src/workspace/data-place/__tests__/FilterCardKinds.real-element.test.tsx`; if the element
  changes, `graphty-element/src/session/project/Dispatcher.ts` with a test under
  `graphty-element/test/session/`.
- **Acceptance**: on the route of `pilot/T79A/touched-32 05.png` and `07.png` (staff-50k: a new card,
  tick Grants, Cancel, then Undo), after Cancel the undo button names the step before the card (or is
  off when there was none), Undo never brings a card back, Redo never brings it back, and the top bar
  shows no filter mark; the same on `pilot/T70B/touched-2 06, 07.png` and `pilot/T72B/touched-1 03,
04.png` (Ctrl+Z); the screen reader hears "Filter not added" and no "Filter off"
  (`pilot/T70B/keyboard 36.png`, `pilot/T72B/touched-7 21.png`). Not regressed: Cancel on an existing
  card restores its rule as one undo step (`pilot/T79B/touched-6 05.png`); focus after a new card goes
  stays as decided in pass 2 (`pilot/T79B/touched-3 05.png`, `touched-4 03.png`, `touched-7 04, 13.png`).
  A real-input test (Add filter, tick, Cancel, Ctrl+Z) that fails on 47c95a09fc.
- **Decided**: `decided.md` "Cancel on a new filter card leaves no undo step" (pass 3), narrowing pass
  1's "Cancel on a new filter card takes the card away".

### done-busy-sign

- **Mechanism**: pass 1's fix (f6ab091f47) makes Done, Cancel and Escape draw "Drawing" in their own
  frame and close the workspace one painted frame later; the blocking work (ending the preview,
  writing the rule, repainting 50,000 nodes) runs after the close, when the header that carried
  "Drawing" is gone. The study tool's numbers on `pilot/T79B/touched-13`: Done's first frame 29 ms,
  settle 13.0 s; the 1 s glance shows the closed workspace over the preview look.
- **Fix** (graphty): on Done, Cancel and Escape the workspace stays open with its header's "Drawing"
  through the blocking work and closes once `waitForPainted()` resolves on the result; where the work
  does not block, it closes as today.
- **Files**: `graphty/src/workspace/selection/SelectionEditor.tsx`,
  `graphty/src/workspace/selection/__tests__/LargeGraph.real-element.test.tsx`.
- **Acceptance**: on the T79B setup, the route of `pilot/T79B/touched-13 09-glance.png` (Done after the
  Otter Creek tick) shows "Drawing" in every glance from the click until the result is painted, and
  never the preview look without it; the end state is unchanged (Layer 1 reads 1,050, the key "1,050
  of 50,000 nodes"). The same for the filter card's Done on `pilot/T79B/detour-3` and for Cancel on
  `pilot/T79B/touched-16 10.png`. Small graphs unchanged: the T70A success path's Done closes in its
  next frame. A large-graph test that fails on 47c95a09fc.
- **Decided**: `decided.md` "Done, Cancel and Escape on a large graph keep 'Drawing' on screen until
  the result is painted" (pass 3), narrowing pass 1's "An edit that blocks input shows that it is
  working first".

### Not fix now, and why

- **The long waits on 50,000 nodes** (T79B.p3.2: opening 16 to 20 s, the tick 15 to 18 s). Opening and
  the tick now say "Drawing" within 1 s, so they are busy with a sign: severity 2 in `criteria.md`
  "Large graphs", severity 3 only if a participant gives up. The sessions answer that.
- **The selection's "..." with no Filter to** (T75B.p3.1) blocks one detour; the Data place path
  finishes the task. Decided, not built; backlog, first in line.
- **Overlays covering a node** (T70B, T72B, T73B): decided, the canvas is the frame.
- **Shift+Tab out of a new card's picker keeps an 'All nodes' card** (T79B.p3.6): the workspace stays
  open, and Done with no step and Cancel both take the card away, so no way out leaves it.
- **Two momentary 'Condition...' controls** (T72A.p3.1): screen reader only and for a moment; new since
  797a4f6b47, so the accessibility walk checks it first.

## Every defect

Columns: row, defect, route, class (backlog rows carry their kind), origin (fix now only), reason with
its citation. Counts: 34 product defects (2 fix now, 5 decided, 0 design questions, 27 backlog) and 4
lines that are not product defects.

### T70A

| Row       | Defect                                                                                           | Route                | Class       | Origin | Reason                                                                                                |
| --------- | ------------------------------------------------------------------------------------------------ | -------------------- | ----------- | ------ | ----------------------------------------------------------------------------------------------------- |
| T70A.p3.1 | The Quick actions result that adds a new filter card is named 'Filters', the name of the section | touched-8 03, 04.png | c [wording] |        | a reader typing 'filter' may expect to go to the section; nothing is lost (a new card goes on Cancel) |

### T70B

| Row       | Defect                                                                                                                                       | Route                | Class             | Origin | Reason                                                                                                                                                                                                           |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ----------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T70B.p3.1 | After Cancel on a new filter card, Undo reads 'Undo deleting a filter condition' and Ctrl+Z brings the card back on (telemetry yes, 7 of 11) | touched-2 06, 07.png | c [friction]      |        | T70 B ends with one card either way (the pilot's grade check); fixed with unit cancel-no-undo                                                                                                                    |
| T70B.p3.2 | Cancel on a new card from Quick actions announces 'Filter not added', then 'Filter off'                                                      | keyboard 36.png      | c [accessibility] |        | screen reader only; focus lands on Add filter as decided; fixed with unit cancel-no-undo                                                                                                                         |
| T70B.p3.3 | Shift+Tab from the step's properties goes to the 'id' header of the matches strip before Fit and the outline                                 | keyboard steps 07-18 | c [accessibility] |        | keyboard only; pass 2 T72B.p2.3 (unnamed strip controls)                                                                                                                                                         |
| T70B.p3.4 | Tab from the date box goes to 'Local only'; the page scrolls 1 px; Escape there does nothing                                                 | touched-1 09, 11.png | c [accessibility] |        | keyboard only; pass 1 backlog (Tab from the workspace's last field goes to the status bar); pass 2 T70B.p2.2                                                                                                     |
| T70B.p3.5 | One orange node sits half under the canvas toolbar (the panels read 2 of 7)                                                                  | success 15.png       | n                 |        | decided: the canvas is the frame; the toolbar and key are overlays and framing never avoids them (owner-decisions.md line 3846; decided.md line 580, "it is an overlay"); graded counts are read from the panels |

### T72A

| Row       | Defect                                                                                      | Route                             | Class             | Origin | Reason                                                                                                       |
| --------- | ------------------------------------------------------------------------------------------- | --------------------------------- | ----------------- | ------ | ------------------------------------------------------------------------------------------------------------ |
| T72A.p3.1 | Just after the agency tick, two controls named 'Condition...' exist for a moment, one drawn | detour-2 03.png; touched-6 03.png | c [accessibility] |        | screen reader only, for a moment; no count changes; not seen on 797a4f6b47, so the a11y walk checks it first |

### T72B

| Row       | Defect                                                                                                                        | Route                | Class             | Origin | Reason                                                                                                                                                                                                                             |
| --------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------- | ----------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T72B.p3.1 | Ctrl+Z right after Cancel on a new card brings it back on ('telemetry yes 7 of 11') with 'Undid deleting a filter condition.' | touched-1 03, 04.png | c [friction]      |        | T72 B already grades any filter card as not success, so the grade does not move; fixed with unit cancel-no-undo                                                                                                                    |
| T72B.p3.2 | Cancel on a new card announces 'Filter not added', then 'Filter off'                                                          | touched-7 21.png     | c [accessibility] |        | screen reader only; fixed with unit cancel-no-undo                                                                                                                                                                                 |
| T72B.p3.3 | With the node table open, one orange node sits half under the canvas toolbar (4 counted on the canvas, key 5)                 | success 10.png       | n                 |        | decided: the canvas is the frame; the toolbar and key are overlays and framing never avoids them (owner-decisions.md line 3846; decided.md line 580, "it is an overlay"); graded counts are read from the panels; pass 2 T72B.p2.4 |
| T72B.p3.4 | 'With issues 11' counts every row                                                                                             | success 10.png       | c [wording]       |        | pass 1 T78B.12; pass 2 T72B.p2.8                                                                                                                                                                                                   |
| T72B.p3.5 | A filter card holding an Except step is named by its first step only ('telemetry yes')                                        | touched-1 05.png     | n                 |        | decided.md line 464, "Filter cards are named by their first step as its row says it"; pass 2 T72B.p2.6                                                                                                                             |

### T73B

| Row       | Defect                                                                                                           | Route          | Class | Origin | Reason                                                                                                                                                                                                           |
| --------- | ---------------------------------------------------------------------------------------------------------------- | -------------- | ----- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T73B.p3.1 | The canvas toolbar covers part of the lowest orange gauge (6 and a sliver on the canvas; key and Layer 1 read 7) | success 09.png | n     |        | decided: the canvas is the frame; the toolbar and key are overlays and framing never avoids them (owner-decisions.md line 3846; decided.md line 580, "it is an overlay"); graded counts are read from the panels |

### T74A

| Row       | Defect                                                                                                     | Route          | Class             | Origin | Reason                                                        |
| --------- | ---------------------------------------------------------------------------------------------------------- | -------------- | ----------------- | ------ | ------------------------------------------------------------- |
| T74A.p3.1 | The mode select is named 'PageRank test', not by the 'By value' it shows, so a click on those words misses | success 06.png | c [accessibility] |        | names only, the box itself takes the click; pass 1 T74A.14    |
| T74A.p3.2 | The key card titled 'Color: Layer 1' also holds PageRank's gradient                                        | success 14.png | c [cosmetic]      |        | two entries drawn as one card; the counts (5 of 24) are right |

### T74B

| Row       | Defect                                                                                                        | Route           | Class             | Origin | Reason                                                                           |
| --------- | ------------------------------------------------------------------------------------------------------------- | --------------- | ----------------- | ------ | -------------------------------------------------------------------------------- |
| T74B.p3.1 | Enter in 'Betweenness: how many' announces '3 of 11 nodes' twice                                              | keyboard 50.png | c [accessibility] |        | screen reader only; pass 1 backlog (the count announced twice); pass 2 T74B.p2.2 |
| T74B.p3.2 | The mode select is named 'Betweenness test', not by the 'By value' it shows, so a click on those words misses | success 06.png  | c [accessibility] |        | names only; pass 2 T74B.p2.1; the answer key notes it                            |

### T75A

| Row       | Defect                                                                                         | Route                            | Class        | Origin | Reason                                                                                                                                           |
| --------- | ---------------------------------------------------------------------------------------------- | -------------------------------- | ------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| T75A.p3.1 | While a search narrows it, the value picker flips up over the workspace header and covers Done | success 04.png                   | c [friction] |        | decided, not built (workspace polish 2, "Pickers under fields never flip", decided.md line 734); pass 1 backlog, first in line; pass 2 T75A.p2.2 |
| T75A.p3.2 | After Done the filter card shows 'Edit' in place of its count                                  | success 09.png                   | c [friction] |        | focus returns to the card (decided) and Edit replaces the count while focus is on it; pass 2 T75A.p2.3                                           |
| T75A.p3.3 | The canvas key reads 'Draw order: graphty.style.json.node.el.drawOrder' from the start         | success 09.png; touched-8 19.png | c [wording]  |        | pass 1 T75A.10; pass 2 T75A.p2.6                                                                                                                 |

### T75B

| Row       | Defect                                                                                         | Route            | Class        | Origin | Reason                                                                                                                                                                       |
| --------- | ---------------------------------------------------------------------------------------------- | ---------------- | ------------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T75B.p3.1 | The selection's '...' menu (Largest component selected in the Graph panel) offers no Filter to | touched-5 10.png | c [friction] |        | decided, not built (owner feedback 2026-11-01, "Filter to and Filter out stay commands on a selection"); blocks one detour only, the Data place path works; pass 2 T75B.p2.3 |

### T77B

| Row       | Defect                                                                                                | Route              | Class             | Origin | Reason                                                                                                       |
| --------- | ----------------------------------------------------------------------------------------------------- | ------------------ | ----------------- | ------ | ------------------------------------------------------------------------------------------------------------ |
| T77B.p3.1 | Tab from the Oldest layer's date box goes to 'Local only'; the page scrolls 1 px; Escape does nothing | success 14, 15.png | c [accessibility] |        | keyboard only; pass 1 backlog (Tab from the workspace's last field goes to the status bar); pass 2 T77B.p2.2 |

### T79A

| Row       | Defect                                                                                                                                                                                       | Route                         | Class             | Origin     | Reason                                                                                                                                                                                                                                                                     |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ----------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T79A.p3.1 | Undo after Cancel on a new filter card reads 'Undo deleting a filter condition' and restores the 'dept Grants' card switched on: 1,076 of 50,000 drawn, 'Undid deleting a filter condition.' | touched-32 05, 07.png         | a                 | regression | spoils: T79 grades a filter card as not success, and the card is one the participant cancelled; caused by 47c95a09fc, whose Cancel writes the card's removal as a new undo step. decided.md pass 3, "Cancel on a new filter card leaves no undo step". Unit cancel-no-undo |
| T79A.p3.2 | Tab from the Grants checkbox leaves the workspace for 'Local only', then Main menu                                                                                                           | keyboard 39.png               | c [accessibility] |            | keyboard only; pass 1 backlog (Tab from the workspace's last field goes to the status bar); pass 2 T79A.p2.3                                                                                                                                                               |
| T79A.p3.3 | The tick is announced twice ('1076 of 50000 nodes', then '1,076 of 50,000 nodes')                                                                                                            | keyboard 38.png               | c [accessibility] |            | screen reader only; pass 1 backlog (the count announced twice); pass 2 T79A.p2.4                                                                                                                                                                                           |
| T79A.p3.4 | A new Fill's color box is named 'Node color, not set, drawn #6366F1 indigo' before anything is painted                                                                                       | keyboard 77.png               | c [accessibility] |            | screen reader only; pass 2 T74A.p2.1                                                                                                                                                                                                                                       |
| T79A.p3.5 | Tree rows read counts without thousands separators ('Which nodes, 50000 of 50000 nodes')                                                                                                     | keyboard 95.png; touched-8-sr | c [accessibility] |            | screen reader only; pass 1 T79A.9                                                                                                                                                                                                                                          |
| T79A.p3.6 | Enter in the Find box moves the camera to the found node and leaves the drawing off center                                                                                                   | detour-3 03-31.png            | n                 |            | interaction-patterns.md line 322: committing a Find hit brings the target into view; the key still reads 1,076; pass 2 T79A.p2.8                                                                                                                                           |

### T79B

| Row       | Defect                                                                                                                                                                            | Route                                                             | Class             | Origin | Reason                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ----------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T79B.p3.1 | After Done on 50,000 nodes the workspace closes in its first frame and for 13 to 15 s the canvas keeps the preview look (picks green, the rest dimmed) with no 'Drawing' anywhere | touched-13 09-glance.png (settle 13.0 s); success 09.png (15.4 s) | a                 | repeat | crash: input blocked over 1 s with nothing saying so is a hang (criteria.md "Large graphs", item 8), and the dimmed canvas reads as a result; decided.md pass 1 "An edit that blocks input shows that it is working first" names Done, and pass 1's busy-sign fix (f6ab091f47) drew 'Drawing' for one frame and closed the workspace before the work. decided.md pass 3, "Done, Cancel and Escape on a large graph keep 'Drawing' on screen". Unit done-busy-sign |
| T79B.p3.2 | The waits on 50,000 nodes: opening Which nodes 16 to 20 s, the tick 15 to 18 s, Done 13 to 15 s                                                                                   | success, touched-13 route.jsonl settleDom                         | c [friction]      |        | opening and the tick show 'Drawing' within 1 s (firstFrame 376 and 34 ms), so this is busy with a sign, severity 2 by criteria.md "Large graphs" unless a participant gives up; the sessions say whether one does                                                                                                                                                                                                                                                 |
| T79B.p3.3 | After Done, Which nodes' title row shows 'Edit' in place of its count while it has focus; a focused existing filter card shows 'Edit' in place of '1,050 of 50k'                  | success 09.png; touched-6 02.png                                  | c [friction]      |        | focus returns to the card (decided) and Edit replaces the count while focus is on it; pass 2 T75A.p2.3                                                                                                                                                                                                                                                                                                                                                            |
| T79B.p3.4 | The tick is announced twice ('1050 of 50000 nodes', then '1,050 of 50,000 nodes')                                                                                                 | keyboard 30.png                                                   | c [accessibility] |        | screen reader only; pass 1 backlog (the count announced twice); pass 2 T79B.p2.3                                                                                                                                                                                                                                                                                                                                                                                  |
| T79B.p3.5 | The new color box is named 'Node color, not set, drawn #6366F1 indigo'; the Which nodes row is named '1050 of 50000 nodes'                                                        | keyboard 40, 32.png                                               | c [accessibility] |        | screen reader only; pass 2 T74A.p2.1 and T79B.p2.3                                                                                                                                                                                                                                                                                                                                                                                                                |
| T79B.p3.6 | Shift+Tab out of a new card's picker closes the picker and keeps the card as 'All nodes' (focus on 'Condition...'); only Cancel takes it away                                     | touched-7 07.png                                                  | c [accessibility] |        | keyboard only; the workspace stays open, and Done with no step takes the card away too (decided.md pass 2), so no card is left by any way out of the workspace                                                                                                                                                                                                                                                                                                    |

### Not product defects

| Task | Line                                                                                                                              | Class                                                                      |
| ---- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| T70A | The report file could not be written (the harness refuses a subagent's report file); its content is in the pilot's output         | none (process; the orchestrator writes the report from the pilot's output) |
| T75A | No new defect on either walk                                                                                                      | none (a status line, not a defect)                                         |
| T75A | The report file could not be written; build 47c95a09fc, setup researchers.txt, walks success/ and touched-8/, both sessions ended | none (process; the orchestrator writes the report from the pilot's output) |
| T75B | The report file could not be written; its content is in the pilot's output                                                        | none (process; the orchestrator writes the report from the pilot's output) |
