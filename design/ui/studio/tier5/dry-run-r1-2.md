# Tier 5 dry run, pass 2: triage of the re-walks on the first fix build

Build: 797a4f6b47 (`criteria.md` line 1), which carries pass 1's fixes: the "covered" claim, the data
table under the workspace, a test's mode, the reference names, one count base, and "Drawing" before a
large-graph edit blocks. Pass 1's fix for Cancel on a new filter card (0ec56d2f3b) was reverted
(b6b06fd50f) for sending keyboard focus to Main menu (`rejected-fixes.md`). Pilot walks and screenshots
are under the main checkout's `tmp/design-studio/tier5/r1d1/pilot/<task>/<route>/`; a screenshot below
is written `<route> NN.png` under its task's folder. Rows are named `<task>.p2.<n>`; `pass 1 T..`
points at a row of `dry-run-r1-1.md`.

## How each defect was classed

Pass 1's rules stand (`dry-run-r1-1.md`, "How each defect was classed"; `decided.md`, "Dry run pass
1"): fix now only for a crash, a block or a spoiled grade on a task's success path or a walked detour,
plus any severity 3 candidate `criteria.md` item 8 names; everything a keyboard or screen-reader user
alone meets is backlog; T76 runs in no session, so nothing on a T76 route spoils a grade. A row that
repeats a pass 1 backlog row keeps its class unless the re-walk brought new evidence.

Origin, fix now only: new; repeat (pass 1 sent the same problem to be fixed and it is back, including a
fix that was reverted); regression (caused by pass 1's fixes).

## Fix now: the units

| Unit            | What                                                                                                                                 | Rows                 | Class  | Origin                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------- | ------ | ----------------------------------------------------------------------------------------------- |
| cancel-new-card | Cancel on a new filter card leaves an empty card switched on and saved (refix of the reverted 0ec56d2f3b, with a sound focus return) | T70B.p2.1, T79A.p2.1 | spoils | repeat (pass 1 unit cancel-new-card; its fix was reverted)                                      |
| open-busy-sign  | Opening Which nodes on 50,000 nodes blocks 1.3 s before its first frame, with no "Drawing"                                           | T79B.p2.1            | crash  | repeat (pass 1 unit busy-sign named opening the workspace; the engineer's re-walk left it open) |

Totals over the fix-now rows: 3 (1 crash, 0 blocks, 2 spoils); 3 repeats, 0 regressions, 0 new.

Fixed with these units though classed backlog by themselves (keyboard-only, or no spoil shown):
T75B.p2.2 and T77B.p2.1 (Escape on a new card from the toolbar's Filters returns focus to the
sidebar's "+") by cancel-new-card, which records one opener for Cancel and Escape; T79B.p2.2 (the
"Drawing" frame draws a ticked box empty, a side effect of pass 1's busy-sign fix, which invites a
retry that would untick it) by open-busy-sign.

### cancel-new-card

- **Mechanism** (`rejected-fixes.md`; engineer notes 2026-11-02): a new card is written by its first
  tick, so Cancel restores the rule it opened with (All, no step) and leaves an empty card on. The
  reverted fix removed the card correctly but recorded `document.activeElement` as the opener when the
  card was made; from Quick actions that is the body or a control the palette hands focus back to, so
  focus fell to Main menu.
- **Fix** (graphty): restore 0ec56d2f3b's removal; record the opener only when it is a control that
  opens filters and is still on screen (the toolbar's Filters, Add filter, an attribute's Filter
  to...), else return focus to Add filter. Cancel and Escape on a new card use the same record.
- **Files**: `graphty/src/workspace/data-place/Filters.tsx`,
  `graphty/src/workspace/selection/SelectionEditor.tsx`,
  `graphty/src/workspace/data-place/__tests__/FilterCardKinds.real-element.test.tsx`.
- **Acceptance**: the state of `pilot/T70B/touched-35 05.png` and `pilot/T79A/touched-32 04.png` /
  `detour-3 29.png` ends with no card and no filter mark in the top bar, and the project saves no
  card; Cancel on an existing card restores its rule and keeps it (pass 1's T77B detour-2); focus after
  a new card goes is on Add filter when it was opened from Quick actions (Cancel and Escape; the
  rejected fix's `keyboard-sr/16.png` route) and on the toolbar's Filters when opened from it
  (`pilot/T77B/touched-34 04.png`, `pilot/T75B/detour-4 07.png`). A real-input test per opener
  (Add filter, toolbar Filters, Quick actions) fails on the reverted fix and on 797a4f6b47.
- **Decided**: `decided.md` "Cancel on a new filter card takes the card away" (pass 1) and "Focus
  after a new filter card goes" (pass 2).

### open-busy-sign

- **Mechanism** (engineer notes 2026-11-02, busy-sign re-walk with `REAL_PROFILE=1`): opening Which
  nodes right after adding a layer paints its first frame 1.3 to 2.3 s after the press. The block is
  not the editor's: a default-priority render of the style row (`RowStyle` in `StylePanel.tsx`) reads
  `session.styles.agreement` through `row.ts` (`paintedOverOf`, `beneathOf`; about 0.9 s at 50,000
  nodes, uncached) and the style tree's counts (about 0.26 s), started by the press that closes the
  new layer's name field. `StylesApi.agreement`'s own documentation says it answers "from what the
  session already holds and cost[s] nothing", which is not true at this size: a graphty-element defect.
- **Fix**: graphty-element keeps `styles.agreement`'s answer per style stack and input revision, so a
  render that changes nothing it reads costs nothing (no API change); the app's style row reads it
  only when the row's inputs change. In the same unit, the editor's waiting edit (the frame pass 1's
  fix draws "Drawing" in) drives the checklist, so a ticked box shows ticked in that frame.
- **Files**: `graphty-element/src/session/styles/StylesApi.ts` (with a test under
  `graphty-element/test/session/styles/`), `graphty/src/workspace/style/row.ts`,
  `graphty/src/workspace/style/StylePanel.tsx`, `graphty/src/workspace/selection/SelectionEditor.tsx`,
  `graphty/src/workspace/style/WhichPicker.tsx`,
  `graphty/src/workspace/selection/__tests__/LargeGraph.real-element.test.tsx`.
- **Acceptance**: on the T79B setup, the route of `pilot/T79B/touched-40 05-glance.png` (add a layer,
  then Which nodes) shows the workspace or "Drawing" in a frame under 1 s after the click (the study
  tool's `ms.firstFrame`); `touched-40 08-glance.png`'s frame shows the Otter Creek box ticked beside
  "Drawing"; the settled counts are unchanged (1,050 of 50,000). A test of the element's agreement
  answering a second read with no repaint, and the app's large-graph test opening Which nodes after a
  new layer.
- **Decided**: `decided.md` "An edit that blocks input shows that it is working first" (pass 1) and
  "Opening the workspace on a large graph" (pass 2).

### Not fix now, and why

- **A blank band of about 200 px under the preview on every workspace screen** (T70A, T71B, T72B,
  T73A, T73B, T74B). It is the data table's place, kept so the canvas is not resized while the table is
  hidden and inert (pass 1's main-table fix); the one table drawn there is the matches strip, so item
  8's "two tables" is closed (the T73A pilot read the strip as the data table). Cosmetic, but it counts
  against bar 9's calm-first check on every editor screen, so it is first in the backlog's line.
- **Cancel's spoiled grade is the only spoil left on a session task.** The T76 A hand-built hover
  edge layer draws no color while its key says it does (a real wrong drawing), but T76 runs in no
  session; backlog, first in line.
- **Pickers flipping, a click on a resting card, focus leaving the workspace, counts said twice**:
  as pass 1, backlog ("decided, not built" first).
- **Overlays covering a node** (the canvas toolbar, the key): decided, the canvas is the frame.

## Every defect

Columns: row, defect, route, class (backlog rows carry their kind), origin (fix now only), reason with its citation.

### T70A

| Row       | Defect                                                                             | Route                | Class        | Origin | Reason                                                                                                                                                                                                   |
| --------- | ---------------------------------------------------------------------------------- | -------------------- | ------------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T70A.p2.1 | Column header Filter to... opens the card without its value picker open            | touched-1 05.png     | c [friction] |        | decided, not built (workspace polish 3, "A new or cleared rule opens on its value picker"); one extra click                                                                                              |
| T70A.p2.2 | A blank band about 200 px between the preview and the matches strip                | touched-1 05, 06.png | c [cosmetic] |        | the table drawn is the matches strip; the band is the hidden data table's kept place (1c02b8a883, decided.md "Dry run pass 1": "not drawn and inert"), so not two tables; calm-first risk, first in line |
| T70A.p2.3 | E4572E sits inside PageRank's orange ramp; the 4 staff are hard to pick out by eye | success 16.png       | c [cosmetic] |        | pass 1 T70A.18; the counts (Which nodes 4 of 15, key 4 of 15) answer the question                                                                                                                        |

### T70B

| Row       | Defect                                                                                                                              | Route                     | Class             | Origin | Reason                                                                                                                                                                                                  |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ----------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T70B.p2.1 | Cancel on a new filter card leaves an empty card on ('a selection, All nodes', top bar '11 of 11 nodes'), kept beside the real card | touched-35 05, 06.png     | a                 | repeat | spoils: T71, T77 and T79 grade the number of filter cards; decided.md "Cancel on a new filter card takes the card away"; pass 1's fix 0ec56d2f3b was reverted (rejected-fixes.md). Unit cancel-new-card |
| T70B.p2.2 | Tab from the date box goes to 'Local only'; the page scrolls 1 px; Escape there does nothing                                        | touched-35 09, 10, 11.png | c [accessibility] |        | keyboard only; pass 1 backlog (Tab from the workspace's last field goes to the status bar); pass 1 T70B.10                                                                                              |

### T71A

| Row        | Defect                                                                                                                 | Route                          | Class             | Origin | Reason                                                                                                                                                                                                |
| ---------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ----------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T71A.p2.1  | A Visibility Hidden layer leaves its hidden nodes' edges drawn (14 edges, no nodes, top bar 10 of 24)                  | detour-3 10, 15.png            | c [friction]      |        | not-success route (answers.md grades a count read from it as the count it is); pass 1 T70A.14                                                                                                         |
| T71A.p2.2  | The key reads 'Show: Layer 1' for a Hidden layer                                                                       | detour-3 10, 15.png            | c [wording]       |        | not-success route; pass 1 T75B.8                                                                                                                                                                      |
| T71A.p2.3  | Done expands the Which nodes outline and pushes Visibility down 128 px; a click aimed at Visibility reopens the editor | detour-3 07.png                | c [friction]      |        | the editor reopens and Escape closes it                                                                                                                                                               |
| T71A.p2.4  | A condition row is cut to 'ho... m...' beside 'Passes none'                                                            | detour-2 03, 04.png            | c [cosmetic]      |        | the full rule is in the tooltip                                                                                                                                                                       |
| T71A.p2.5  | A click in the middle of a collapsed card's row only focuses it and shows Edit                                         | detour-1 09, 13.png            | c [friction]      |        | decided, not built (placement, "Edit, a click or Enter on any row opens the workspace"); pass 1 backlog                                                                                               |
| T71A.p2.6  | Hover draws no Edit on a card while another card holds focus                                                           | detour-1 12.png                | c [friction]      |        | decided, not built (workspace polish 1, "Sidebar Edit is drawn on hover or focus")                                                                                                                    |
| T71A.p2.7  | A filter card has no remove control at rest; removing takes Edit, '...', Delete                                        | detour-1 12, 14.png            | n                 |        | decided.md placement, "The sidebar shows a read-only outline at rest ... no control but the title row's Edit (and a filter card's on box)"                                                            |
| T71A.p2.8  | The page scrolls up 1 px once focus walks the workspace                                                                | keyboard 77.png against 10.png | c [cosmetic]      |        | pass 1 T77A.15                                                                                                                                                                                        |
| T71A.p2.9  | One range gives three Tab stops (the slider, then each thumb)                                                          | keyboard walk                  | c [accessibility] |        | keyboard only; pass 1 backlog                                                                                                                                                                         |
| T71A.p2.10 | Tab from the properties column's last control leaves the workspace for 'Local only'                                    | keyboard steps 28, 46          | c [accessibility] |        | keyboard only; pass 1 backlog (Tab from the workspace's last field goes to the status bar)                                                                                                            |
| T71A.p2.11 | Enter on Or... adds group B and says nothing                                                                           | keyboard step 40               | c [accessibility] |        | screen reader only                                                                                                                                                                                    |
| T71A.p2.12 | A new B step reads '0 so far' before a bound is typed                                                                  | success 08.png                 | n                 |        | decided.md "Step states are applied, inert or pending" (an untouched test is inert, a group never ready contributes nothing) and "Start with ... '+ Or' groups start None"; the answer key records it |

### T71B

| Row       | Defect                                                                                                               | Route                                | Class             | Origin | Reason                                                                                                                                                                                                   |
| --------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ----------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T71B.p2.1 | report.md not written                                                                                                | --                                   | c [friction]      |        | study process, not the app: the harness refused the subagent's report file                                                                                                                               |
| T71B.p2.2 | Tab from the date box goes to 'Local only'; the 1 px shift stays after the workspace closes                          | detour-2 05, 09.png; keyboard 45.png | c [accessibility] |        | keyboard only; pass 1 backlog (Tab from the workspace's last field goes to the status bar)                                                                                                               |
| T71B.p2.3 | The key reads 'Show: Layer 1, 6 of 11 nodes' while those 6 are hidden                                                | detour-3 09.png                      | c [wording]       |        | not-success route; pass 1 T75B.8                                                                                                                                                                         |
| T71B.p2.4 | A second card cannot be removed from the sidebar (right-click opens nothing, Delete on a selected card does nothing) | detour-1 10, 11.png                  | c [friction]      |        | Edit, '...', Delete removes it                                                                                                                                                                           |
| T71B.p2.5 | A blank band about 210 px between the preview and the matches strip                                                  | success 03, 09.png                   | c [cosmetic]      |        | the table drawn is the matches strip; the band is the hidden data table's kept place (1c02b8a883, decided.md "Dry run pass 1": "not drawn and inert"), so not two tables; calm-first risk, first in line |
| T71B.p2.6 | The data table opens scrolled right (id and lat out of view)                                                         | detour-3 01.png                      | c [friction]      |        | the gauges-clean setup's saved scroll                                                                                                                                                                    |

### T72B

| Row       | Defect                                                                                                   | Route                                                     | Class             | Origin | Reason                                                                                                                                                                                                                                        |
| --------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ----------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T72B.p2.1 | A new Fill shows 6366F1 and a blue chip that the canvas does not draw until Enter                        | touched-23 10, 11.png                                     | c [friction]      |        | pass 1 T77A.9 and T70A.11                                                                                                                                                                                                                     |
| T72B.p2.2 | A Between step with only 'from 1990' reads 'installed after 1989' on its row                             | touched-23 07.png                                         | c [wording]       |        | true for whole years, not the reader's words (engineer notes, test-mode re-walk)                                                                                                                                                              |
| T72B.p2.3 | Nine buttons and twelve rows with no accessible name exist while a workspace is open                     | success 04-08.png; touched-24 02-10.png; touched-5 02.png | c [accessibility] |        | screen reader only; the hidden data table is inert and invisible (1c02b8a883), so likely the matches strip's own controls; the a11y walk names them                                                                                           |
| T72B.p2.4 | With the table open, one orange node sits half under the canvas toolbar (4 counted on the canvas, key 5) | success 10.png; touched-23 16.png; touched-5 05.png       | n                 |        | decided: the canvas is the frame; the toolbar and key are overlays and framing never avoids them (owner-decisions.md 2026-11-01, "the canvas is the frame"; decided.md placement, "it is an overlay"); graded counts are read from the panels |
| T72B.p2.5 | Under a filter the key shows 'Color: Layer 1' with no 'N of M nodes' line                                | touched-5 05.png against success 10.png                   | c [wording]       |        | the count is in Which nodes; the key drops the line when the layer covers every drawn node                                                                                                                                                    |
| T72B.p2.6 | A filter card is named after its first step only ('telemetry yes')                                       | touched-5 03, 04.png                                      | n                 |        | decided.md repolish 1, "Filter cards are named by their first step as its row says it"                                                                                                                                                        |
| T72B.p2.7 | A blank band about 200 px between the preview and the matches strip                                      | success 04.png; touched-24 05.png                         | c [cosmetic]      |        | the table drawn is the matches strip; the band is the hidden data table's kept place (1c02b8a883, decided.md "Dry run pass 1": "not drawn and inert"), so not two tables; calm-first risk, first in line                                      |
| T72B.p2.8 | 'With issues' counts every row (11) from the station column's warning                                    | success 03.png                                            | c [wording]       |        | pass 1 T78B.12                                                                                                                                                                                                                                |
| T72B.p2.9 | With Except on, the switch and the outline row are both named 'Except'                                   | touched-24 08.png                                         | c [accessibility] |        | names only; pointer use is unaffected                                                                                                                                                                                                         |

### T73A

| Row       | Defect                                                                             | Route                 | Class             | Origin | Reason                                                                                                                                                                                                                                                                                                                 |
| --------- | ---------------------------------------------------------------------------------- | --------------------- | ----------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T73A.p2.1 | Tab in the reference picker's search sends focus to Main menu with the picker open | touched-27 04, 05.png | c [accessibility] |        | keyboard only                                                                                                                                                                                                                                                                                                          |
| T73A.p2.2 | 'The data table still draws inside the workspace' under the preview                | success 11.png        | c [cosmetic]      |        | the table drawn is the matches strip; the band is the hidden data table's kept place (1c02b8a883, decided.md "Dry run pass 1": "not drawn and inert"), so not two tables; calm-first risk, first in line; the one table there has no Group column and takes no F6 or Tab stop from the data table (797a4f6b47 re-walk) |

### T73B

| Row       | Defect                                                                             | Route                 | Class             | Origin | Reason                                                                                                                                                                                                   |
| --------- | ---------------------------------------------------------------------------------- | --------------------- | ----------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T73B.p2.1 | Tab in the reference picker's search sends focus to Main menu with the picker open | touched-29 03, 04.png | c [accessibility] |        | keyboard only                                                                                                                                                                                            |
| T73B.p2.2 | The preview fills only the top half; a blank band above the matches strip          | success 02-06.png     | c [cosmetic]      |        | the table drawn is the matches strip; the band is the hidden data table's kept place (1c02b8a883, decided.md "Dry run pass 1": "not drawn and inert"), so not two tables; calm-first risk, first in line |
| T73B.p2.3 | Within 2 hops with no reference yet reads '11 of 11'                               | success 04.png        | c [wording]       |        | the step is inert until a reference is chosen (decided.md "Step states are applied, inert or pending"); the count changes to 7 on the pick                                                               |

### T74A

| Row       | Defect                                                                                              | Route                      | Class             | Origin | Reason                                                                                                                                                                                                                                        |
| --------- | --------------------------------------------------------------------------------------------------- | -------------------------- | ----------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T74A.p2.1 | The new color box is named 'not set, drawn #6366F1 indigo' while the canvas draws PageRank's orange | touched-21; success 12.png | c [accessibility] |        | screen reader only; pass 1 T70A.11                                                                                                                                                                                                            |
| T74A.p2.2 | Enter in 'PageRank: how many' announces '5 of 24 nodes' twice                                       | touched-21 08.png          | c [accessibility] |        | screen reader only; pass 1 backlog (the count announced twice)                                                                                                                                                                                |
| T74A.p2.3 | Tab from Advanced leaves the workspace for 'Local only'; the page ends 1 px higher                  | touched-21 14.png          | c [accessibility] |        | keyboard only; pass 1 backlog (Tab from the workspace's last field goes to the status bar)                                                                                                                                                    |
| T74A.p2.4 | Once 'page' narrows it, the value picker flips up over the header and covers Done                   | success 04.png             | c [friction]      |        | decided, not built (workspace polish 2, "Pickers under fields never flip"); pass 1 backlog, first in line                                                                                                                                     |
| T74A.p2.5 | With two key entries the key covers part of a node at the top left                                  | success 13.png             | n                 |        | decided: the canvas is the frame; the toolbar and key are overlays and framing never avoids them (owner-decisions.md 2026-11-01, "the canvas is the frame"; decided.md placement, "it is an overlay"); graded counts are read from the panels |

### T74B

| Row       | Defect                                                                                            | Route                          | Class             | Origin | Reason                                                                                                                                                                                                                                                                            |
| --------- | ------------------------------------------------------------------------------------------------- | ------------------------------ | ----------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T74B.p2.1 | The mode select is named 'Betweenness test', not by the mode it shows                             | success 06.png                 | c [accessibility] |        | names only; pass 1 backlog                                                                                                                                                                                                                                                        |
| T74B.p2.2 | Enter in 'Betweenness: how many' announces '3 of 11 nodes' twice                                  | keyboard 50.png                | c [accessibility] |        | screen reader only; pass 1 backlog (the count announced twice)                                                                                                                                                                                                                    |
| T74B.p2.3 | Cancel on a new layer turns 'Node and edge layer' into 'Node layer, Edge not styled'              | detour-2 02.png against 09.png | c [wording]       |        | nothing painted; the kind follows the built parts (decided.md workspace polish 1, "Edge 'not styled' after a node condition")                                                                                                                                                     |
| T74B.p2.4 | After Done the lowest orange gauge (Fox Creek) sits half under the canvas toolbar                 | success 12.png                 | n                 |        | decided: the canvas is the frame; the toolbar and key are overlays and framing never avoids them (owner-decisions.md 2026-11-01, "the canvas is the frame"; decided.md placement, "it is an overlay"); graded counts are read from the panels; the names are in the matches strip |
| T74B.p2.5 | An empty band from y 427 to y 640 between the preview and the matches strip                       | success 09.png                 | c [cosmetic]      |        | the table drawn is the matches strip; the band is the hidden data table's kept place (1c02b8a883, decided.md "Dry run pass 1": "not drawn and inert"), so not two tables; calm-first risk, first in line                                                                          |
| T74B.p2.6 | The data table's first Tab stop is the 'installed' header, mid row, because the table is scrolled | keyboard 25.png                | c [accessibility] |        | keyboard only; engineer notes (797a4f6b47 re-walk, item d)                                                                                                                                                                                                                        |
| T74B.p2.7 | 'Stop varying node color by data' shows cursor: default                                           | detour-1 11.png                | c [cosmetic]      |        |                                                                                                                                                                                                                                                                                   |
| T74B.p2.8 | A step from Analyze's layer has no Advanced toggle; a step made in the editor does                | detour-1 08.png                | c [friction]      |        | inconsistency, nothing lost                                                                                                                                                                                                                                                       |

### T75A

| Row       | Defect                                                                                   | Route                            | Class        | Origin | Reason                                                                                                                             |
| --------- | ---------------------------------------------------------------------------------------- | -------------------------------- | ------------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| T75A.p2.1 | Largest component has no So far; a participant who stops there reports 112 (graded P)    | touched-8 03, 04, 08.png         | c [friction] |        | pass 1 T75A.12: not a block, the Piece size route reaches S ("105 of 549"); spec 4.2                                               |
| T75A.p2.2 | The value picker flips up over the header and covers Done while a search narrows it      | success 04.png; touched-8 06.png | c [friction] |        | decided, not built (workspace polish 2, "Pickers under fields never flip"); pass 1 backlog, first in line                          |
| T75A.p2.3 | After Done the Largest component card shows Edit, not its count, while focus stays on it | touched-8 04.png                 | c [friction] |        | focus returns to the card (decided) and Edit replaces the count while drawn (workspace polish 2); the count shows once focus moves |
| T75A.p2.4 | A click on a collapsed card opens nothing and swaps its count for Edit                   | touched-8 05.png                 | c [friction] |        | decided, not built (placement, "a click ... on any row opens the workspace")                                                       |
| T75A.p2.5 | The picker lists 'Piece' and 'Piece size'; the first is lit, so Enter takes it           | touched-8 09.png; success 04.png | c [friction] |        |                                                                                                                                    |
| T75A.p2.6 | The key reads 'Draw order: graphty.style.json.node.el.drawOrder' from the start          | success 01.png                   | c [wording]  |        | pass 1 T75A.10                                                                                                                     |
| T75A.p2.7 | The open card repeats its name as its first step ('Degree min 10' over 'Degree min 10')  | success 04-08.png                | n            |        | decided.md repolish 1, "Filter cards are named by their first step as its row says it"                                             |

### T75B

| Row       | Defect                                                                                                          | Route           | Class             | Origin | Reason                                                                                                                                             |
| --------- | --------------------------------------------------------------------------------------------------------------- | --------------- | ----------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| T75B.p2.1 | Enter on Largest component in a new card's picker sends focus to the sidebar 'Add filter'                       | keyboard 25.png | c [accessibility] |        | decided, not built; pass 1 T75B.2                                                                                                                  |
| T75B.p2.2 | Escape on a new card opened from the toolbar's Filters returns focus to the sidebar '+', not the toolbar button | detour-4 07.png | c [accessibility] |        | decided, not built (placement accessibility, "focus returned to what opened it"); fixed with unit cancel-new-card (one opener record)              |
| T75B.p2.3 | The selection's '...' offers no Filter to                                                                       | detour-4 10.png | c [friction]      |        | decided, not built (owner feedback 2026-11-01, "Filter to and Filter out stay commands on a selection"); pass 1 T75B.12; the Data place path works |

### T76A

| Row       | Defect                                                                                                               | Route                                                             | Class        | Origin | Reason                                                                                                                                                                                            |
| --------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T76A.p2.1 | A hand-built 'Its edges' layer matches 6 of 59 edges and keys a black swatch, but the canvas draws them default gray | detour-2 36, 38.png; crops d2-36, d2-38.png; detour-2 styles.json | c [friction] |        | a wrong drawing (the key and the drawing disagree), but T76 runs in no session (criteria.md), so no grade is spoiled; first in line, likely graphty-element's edge repaint under a hover selector |
| T76A.p2.2 | The edge Line Width field opens at 8, so typing 3 makes the ties thinner                                             | detour-2 35.png                                                   | c [friction] |        | T76 only                                                                                                                                                                                          |
| T76A.p2.3 | Which nodes chips read 'The rule: <<Layer>>, 1 of 2 layers', a raw placeholder                                       | success 04, 08.png                                                | c [wording]  |        | T76 only; unchanged from the round 1 build                                                                                                                                                        |

### T76B

| Row       | Defect                                                                       | Route                 | Class        | Origin | Reason                                                                                                        |
| --------- | ---------------------------------------------------------------------------- | --------------------- | ------------ | ------ | ------------------------------------------------------------------------------------------------------------- |
| T76B.p2.1 | A long step's pass count is cut at the panel edge ('Passes non')             | touched-11 06, 18.png | c [cosmetic] |        | T76 only                                                                                                      |
| T76B.p2.2 | The Except step reads 'Passes none' while the layer matches 11 of 11 at rest | touched-11 06, 11.png | c [wording]  |        | T76 only; "Passes none" at rest is decided (owner feedback 2026-11-01); the words can read as "nothing faded" |

### T77A

| Row       | Defect                                                                                                             | Route            | Class             | Origin | Reason                                                                                                                                                                                                                              |
| --------- | ------------------------------------------------------------------------------------------------------------------ | ---------------- | ----------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T77A.p2.1 | Search 'hours >= 30' selects 7 with the filter on, one of them a person the filter leaves out; the picture holds 6 | detour-3 07.png  | c [friction]      |        | pass 1 T77A.4; a search hit outside the filtered graph is selected out of scope, marked and said not drawn (interaction-patterns.md line 342), so check that the inspector says so; the graded orange count is Which nodes' 6 of 10 |
| T77A.p2.2 | Enter in the Or group's 'hours from' announces '6 of 10 nodes' then '6 of 24 nodes'                                | keyboard 135.png | c [accessibility] |        | screen reader only; decided, not built (dry run pass 1, "Every count in the style host reads over the style selector's base"); pass 1 T77A.13                                                                                       |
| T77A.p2.3 | Delete on a group row does nothing and says nothing                                                                | keyboard 148.png | c [accessibility] |        | keyboard only; pass 1 T77A.12                                                                                                                                                                                                       |

### T77B

| Row       | Defect                                                                                        | Route                 | Class             | Origin | Reason                                                                                                            |
| --------- | --------------------------------------------------------------------------------------------- | --------------------- | ----------------- | ------ | ----------------------------------------------------------------------------------------------------------------- |
| T77B.p2.1 | Escape on a new card opened from the toolbar's Filters returns focus to the sidebar '+'       | touched-34 04, 06.png | c [accessibility] |        | decided, not built (placement accessibility, "focus returned to what opened it"); fixed with unit cancel-new-card |
| T77B.p2.2 | Tab from the layer's date box leaves the workspace for 'Local only'; Escape then does nothing | success 14, 15.png    | c [accessibility] |        | keyboard only; pass 1 backlog (Tab from the workspace's last field goes to the status bar); pass 1 T77B.5         |
| T77B.p2.3 | Right-click on a filter card opens nothing                                                    | detour-1 05.png       | c [friction]      |        | Delete is in the card's '...' after Edit                                                                          |
| T77B.p2.4 | With the layer on every drawn node (1 of 1) the key reads 'Color: Oldest' with no count line  | detour-1 04.png       | c [wording]       |        | the count is in Which nodes                                                                                       |
| T77B.p2.5 | report.md not written                                                                         | --                    | c [friction]      |        | study process, not the app: the harness refused the subagent's report file                                        |

### T78A

| Row       | Defect                                                                                      | Route           | Class             | Origin | Reason                                                                                                     |
| --------- | ------------------------------------------------------------------------------------------- | --------------- | ----------------- | ------ | ---------------------------------------------------------------------------------------------------------- |
| T78A.p2.1 | Tab from Advanced's 'All edges' leaves the workspace; 'Edges where ...' only by ArrowRight  | keyboard/       | c [accessibility] |        | keyboard only; pass 1 backlog (Tab from the workspace's last field goes to the status bar); pass 1 T78A.10 |
| T78A.p2.2 | The page scrolls up 1 px after the Tab out of the workspace                                 | keyboard 64.png | c [cosmetic]      |        |                                                                                                            |
| T78A.p2.3 | Right after Done, Which nodes' row shows Edit where '11 of 24' goes while focus stays on it | success 13.png  | c [friction]      |        | as T75A above                                                                                              |

### T78B

| Row       | Defect                                                                                   | Route               | Class             | Origin | Reason                                                                                                                                                             |
| --------- | ---------------------------------------------------------------------------------------- | ------------------- | ----------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| T78B.p2.1 | A node step's Degree ignores the same layer's Which edges (km max 2.9) with nothing said | detour-3 07, 09.png | b                 |        | pass 1 T78B.6: whether a layer's node rule reads its own edge rule is a question for the sessions; the decided route is Edges in Advanced (placement editor fix 1) |
| T78B.p2.2 | Once 'degree' is typed the value picker opens up over the header and covers Done         | success 06.png      | c [friction]      |        | decided, not built (workspace polish 2, "Pickers under fields never flip"); pass 1 backlog, first in line                                                          |
| T78B.p2.3 | Tab from 'km to' leaves the workspace; the page shifts 1 px                              | success 11.png      | c [accessibility] |        | keyboard only; pass 1 backlog (Tab from the workspace's last field goes to the status bar); pass 1 T78B.1                                                          |

### T79A

| Row       | Defect                                                                                                                                 | Route                              | Class             | Origin | Reason                                                                                                                                                       |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ----------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| T79A.p2.1 | Cancel on a new filter card leaves an empty card on ('a selection / All nodes', top bar '50,000 of 50,000 nodes')                      | touched-32 04.png; detour-3 29.png | a                 | repeat | spoils: T79 grades the number of filter cards; decided.md "Cancel on a new filter card takes the card away"; pass 1's fix was reverted. Unit cancel-new-card |
| T79A.p2.2 | A layer made from a canvas pick keeps the name 'Picked by hand: 1 node' after its rule becomes dept Grants; 'Style nodes' drawn dimmed | detour-2 17.png                    | c [wording]       |        | the count (1,076 of 50,000) is right; the older editor path is pass 1's decided-not-built row                                                                |
| T79A.p2.3 | Tab from the ticked Grants box leaves the workspace; the page scrolls 1 px                                                             | keyboard 39.png                    | c [accessibility] |        | keyboard only; pass 1 backlog (Tab from the workspace's last field goes to the status bar)                                                                   |
| T79A.p2.4 | The tick is announced twice ('1076 of 50000', then '1,076 of 50,000')                                                                  | keyboard 38.png                    | c [accessibility] |        | screen reader only; pass 1 backlog (the count announced twice); pass 1 T79A.7                                                                                |
| T79A.p2.5 | Enter in the checklist search ticks nothing                                                                                            | detour-1 07.png                    | c [friction]      |        | 'Check 1' or Tab to the box works                                                                                                                            |
| T79A.p2.6 | '32 more' looks clickable but is plain text                                                                                            | detour-1 03.png                    | c [cosmetic]      |        |                                                                                                                                                              |
| T79A.p2.7 | Once the step search narrows, the picker opens up over the header and covers Done                                                      | touched-30 02.png                  | c [friction]      |        | decided, not built (workspace polish 2, "Pickers under fields never flip"); pass 1 backlog, first in line                                                    |
| T79A.p2.8 | Find 'Grants' and Enter moves the camera to one node and leaves the drawing off center                                                 | detour-3 03.png                    | n                 |        | interaction-patterns.md line 322: committing a Find hit brings the target into view                                                                          |
| T79A.p2.9 | Right after Done, Which nodes shows Edit where the count goes while focus stays on it                                                  | success 07.png                     | c [friction]      |        | as T75A above                                                                                                                                                |

### T79B

| Row       | Defect                                                                                                            | Route                    | Class             | Origin | Reason                                                                                                                                                                                                                                                                                                                                            |
| --------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------ | ----------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T79B.p2.1 | Opening Which nodes from a new layer shows nothing for 1.3 s (first frame 1,273 ms after the click, no 'Drawing') | touched-40 05-glance.png | a                 | repeat | crash: input blocked over 1 s with nothing on screen is a hang (criteria.md "Large graphs", item 8); decided.md "An edit that blocks input shows that it is working first" names opening the workspace; pass 1's busy-sign fix (f6ab091f47) left it open (engineer notes: RowStyle's uncached styles.agreement, about 0.9 s). Unit open-busy-sign |
| T79B.p2.2 | During the tick's 20 s the 'Drawing' frame draws the Otter Creek box empty while the button says 'Uncheck 1'      | touched-40 08-glance.png | c [friction]      |        | settles ticked; caused by pass 1's busy-sign fix (the edit waits one painted frame and the checklist reads the host's rule); a retry would untick it, so fixed with unit open-busy-sign                                                                                                                                                           |
| T79B.p2.3 | The count is announced twice; the step's name has no thousands separators                                         | keyboard 30, 32.png      | c [accessibility] |        | screen reader only; pass 1 backlog (the count announced twice); pass 1 T79B.2                                                                                                                                                                                                                                                                     |
| T79B.p2.4 | The attribute picker flips up over the header once a search narrows it                                            | touched-30 04.png        | c [friction]      |        | decided, not built (workspace polish 2, "Pickers under fields never flip"); pass 1 backlog, first in line                                                                                                                                                                                                                                         |
| T79B.p2.5 | Values offers station as a time                                                                                   | touched-41 06.png        | c [friction]      |        | pass 1 T79B.10 (graphty-element's time detection)                                                                                                                                                                                                                                                                                                 |

## Counts

- Fix now: 3 rows in 2 units (crash 1, blocks 0, spoils 2); 3 repeats, 0 regressions, 0 new.
- Decided (no change): 8. Design questions for the sessions: 1. Reversals of decided entries: 0.
- Backlog: 81 rows appended to `backlog.md` (14 of them "decided, not built"): 30 friction,
  12 wording, 13 cosmetic, 26 accessibility. 93 rows in all.
