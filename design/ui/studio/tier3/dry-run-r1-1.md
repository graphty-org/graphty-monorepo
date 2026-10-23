# Tier 3 dry run before the round 1 sessions, first pass on build 7d87760756

Every tier 3 task (T37 to T51, both halves) was piloted on the frozen build 7d87760756, the build
that holds the golden merge (f9d8b44b9): the success path by pointer, the commonest detours, and
the task by keyboard with a screen reader's reading. This page sorts every problem those pilots
reported (495 lines) and gives the reason. Screenshots are under
`rounds/r1/pilot/<task>/<session folder>/`. (The first-pass triage of the earlier freeze, build
58556989e8, is in this file's git history at 7c241de4b; the later passes on other builds are
`dry-run-r1-2.md` to `dry-run-r1-5.md`.)

This pass has a narrower job than the earlier ones. It makes the build ready for sessions: no
crash, no blocked task and no wrong result that would spoil grading, on any task's success path or
on a detour its pilot walked. It does not make the build polished. Friction, wording, cosmetic and
keyboard-only problems go to `backlog.md` and are fixed between rounds.

Classes:

- **(a) fix now.** Only three kinds, on a success path or a walked detour: CRASH (an error screen,
  a blank or frozen app, a lost project or lost work), BLOCKS (no reasonable route finishes the
  task), SPOILS GRADING (the final screen or a saved file shows a wrong result, so a grader would
  mark a correct participant wrong or a wrong one right). Each names its origin: **new**,
  **regression** (caused by what changed since the previous pass: its fixes or the golden merge),
  or **repeat** (an earlier triage already sent it to fix).
- **(n) no change.** Asks for something other than a settled behavior in `decided.md` (the entry
  is named), a fact the answer key already grades around, a property of the data, or a note about
  the pilot or the study tool.
- **(c) backlog.** Everything else: friction, wording, cosmetic, and what only a keyboard or
  screen-reader user meets. Each section below is one entry in `backlog.md`, with its kind.
- **(b) leave for the sessions.** A design question the study exists to answer.

## Totals

- 495 lines: 10 (a), 380 (c), 54 (b), 51 (n). The 380 (c) rows are 84 entries in `backlog.md`.
- Of the 10 (a): 4 crashes, 4 blocks, 2 spoil grading; 8 regressions (all from the golden merge),
  2 new, 0 repeats.
- No settled behavior is reversed. Four behaviors are added to `decided.md` (2026-10-20, "Dry run
  on build 7d87760756"): an older project opens with its look; a file reloaded over itself keeps
  its hand-picked layers; a community column names its groups as the key does; Control+O on a
  project file opens it in place of the work.
- Many (c) rows break a settled behavior (the drawing moved without being asked on 17 walks,
  "Which nodes" opened without its list on 14, F6 missed the top bar on 24). Each is friction a
  participant gets past: Frame, a second click, Tab. They are the backlog's first entries, and the
  re-walk after this pass's fixes does not need them.

## Fix now

### 1. A colleague's project opens with no look at all (T50, both halves)

- T50A 1: BLOCKER, all routes. lesmis-poster.graphty.json opens with its data (77 nodes, 254
  edges) but with no style layers, nothing drawn and no key; "1 part did not come back" (v2-pointer/04.png,
  05.png; v2-detours/03.png, 06.png; v2-detours-b/07.png; v2-keyboard/36.png). **CRASH** (the
  project's look is lost). Regression.
- T50A 3: with no layers the graph is blank, even the default node look gone, with no explanation
  (v2-pointer/05.png). **BLOCKS** (nothing to read). Regression; the same cause.
- T50A 11: with the project's look lost, the only orange on screen is the start page demo's, which
  invites a wrong answer (v2-pointer/01.png). **SPOILS GRADING**. Regression; the same cause.
- T50A 13: PASS INCOMPLETE: every route that needs the Poster layer had nothing to act on.
  **BLOCKS** for T50A. Regression; the same cause. Re-walk after the fix.
- T50B 1: BLOCKER, all routes. volunteers-thanks.graphty.json drops its style part; no layers, not
  even Everything; the green layer is lost (f1-pointer/02.png, 03.png; f2-detours/04.png, 12.png;
  f3-keyboard/19.png). **CRASH**. Regression.
- T50B 2: the loss cannot be recovered and is unexplained (f1-pointer/02.png). **CRASH** (the
  "cannot be recovered" half; the notice's wording is the backlog's "A partial open says what did
  not come back"). Regression; the same cause.
- T50B 5: an empty gray canvas with no message that 24 nodes exist; Frame shows nothing
  (f1-pointer/03.png, 06.png). **BLOCKS**. Regression; the same cause.
- T50B 12: PASS INCOMPLETE: nothing after the open could be walked. **BLOCKS** for T50B.
  Regression; the same cause. Re-walk after the fix.

Mechanism, reproduced in Node against the built element (`tmp/director-r1-1/open-poster.mjs` and
`channels.mjs` in the studio worktree): `session.project.open` reports one problem,
`E_UNKNOWN_CHANNEL` in the styles slice, and adds no layer. Both files were written by build
e3c5bca8e6, whose starting Selected layer writes `node.haloSize`. The golden merge (f9d8b44b9,
carried by 5de1340bb) renamed that channel `node.haloScale`, with nothing that reads the old name
in a saved document, and one unknown channel in one layer makes `applyTemplate` refuse the whole
style member. Removing every channel but one from the file, one at a time, opens cleanly for all
thirteen others; only `node.haloSize` fails. Any project saved before the merge loses its look the
same way, not only the study's files.

Settled: `decided.md` 2026-10-20, "A project opens with its look, whatever build saved it".

### 2. The table's community column numbers its groups apart from the key (T46A)

- T46A 1: on the table's Nodes tab the "Louvain" column shows the run's raw group values (Napoleon
  0, Mlle Baptistine 1; Javert's row reads 2), while the layer tree, the key and the table's own
  Louvain tab call the same groups "Group 1" to "Group 6", ranked by size (7d8c-detours/51-52.png).
  **SPOILS GRADING**: a participant who reads Javert's group from the table and paints "Group 2"
  read the screen correctly and is graded F (the answer key grades the group painted, from the
  tree). New.

Mechanism: `graphty/src/workspace/table/columns.ts` marks a partition result column `grouping:
true` and names groups by the element's size rank (`groupName`, "Group N"); the Nodes table cells
in `RecordTable.tsx` print the element's raw value instead.

Settled: `decided.md` 2026-10-20, "A community run's groups have one name everywhere".

### 3. Reopening the same file over itself empties the hand-picked edge layers (T45A)

- T45A 1: after the family ties are made red and thick by a hand-picked layer, Control+O >
  "Replace neighbors.csv" > Replace empties the layer with no notice: "8 edges" keeps its old edge
  ids (0, 5, 6, 12, 16, 21, 25, 28), matches 0, and the red thick ties vanish
  (f-detour-find/17.png, 19.png, 20.png; `f-detour-find/styles.json`). **CRASH** (lost work; the
  final screen no longer shows what the participant did). New. The detour is listed for every task
  (`tasks.md`: "Control+O pressed with a graph already open ... with Replace first").

Mechanism: a CSV edge has no file id, so the element names it by its session counter
(`graphty-element/src/data/edgeIdentity.ts`), which by design never rewinds across a replacing
import; the hand-picked layer's `ids` selector holds those session ids. The element already has a
stable identity for stored sets (the file's id, or the edge's ordinal among the edges of its pair
in the load) and a project open remaps a member's ids through it; a replacing load does not remap
the style layers' ids.

Settled: `decided.md` 2026-10-20, "Opening a file over itself keeps the hand-picked layers".

## Backlog

Each heading is one entry in `backlog.md`, with its kind. A row against a settled behavior names
the entry.

### Sample thumbnails are broken images (cosmetic)

The start page fetches every card picture from `https://graphty.app/data/graph-samples/v1/*.webp`,
which answers 404 with an HTML page (T44B's pilot checked with curl), so Chromium blocks it
(ERR_BLOCKED_BY_ORB) and the tool prints each as a failed request. The cards still open by title.

- T37A 1 (c): g-pointer/04.png, g-detours/05.png.
- T37B 5 (c): p4-success/03.png.
- T38A 14 (c): v-success step 2; the tool's exit code 1 on the step is the same failed requests.
- T38B 8 (c): g-detour-open-find/06.png, after Cancel on the read-the-file page.
- T39A 6 (c): r-pointer/03.png.
- T39B 4 (c): 7d8c-pointer/03.png, 7d8c-detours2/05.png.
- T40A 4 (c): h-pointer/05.png.
- T40B 5 (c): 7d8-pointer step 2.
- T41B 12 (c): i-pointer/02.png, i-detours/06.png.
- T42B 1 (c): w4-detour-card/03.png.
- T43A 8 (c): f-detours/07.png.
- T44A 2 (c): g-pointer/03.png.
- T44B 7 (c): h-detours, the step to 06.png.
- T45B 1 (c): g-pointer/04.png, g-detour-find/05.png.
- T46A 5 (c): 7d8c-pointer/02-04.png.
- T46B 6 (c): x4-detours/05.png.
- T47A 5 (c): 7d8-pointer/04.png, 7d8-detours2/02.png.
- T47B 6 (c): p4-pointer/03.png.
- T48B 9 (c): r4-detours/09.png.
- T49A 6 (c): h-pointer/05.png.
- T49B 1 (c): k-pointer/03.png, k-detours-c/08.png.
- T50A 8 (c): v2-detours-b/02.png.
- T51A 15 (c): 7d8c-1-pointer/02.png (and the tool's start line, a (n) note below).
- T51B 4 (c): v3-success/02.png.

### The drawing moves without the reader asking (friction)

Against `decided.md` "The drawing moves only when the reader asks" (2026-10-19). Not (a): Frame
brings it back and nothing on the graph is wrong. Pass 5's fix e1befa6ac keeps the drawing still
when a key arrives with nothing selected (the success paths no longer jump); every jump here has a
selection held (a layer made from it, a run with it, Undo and Redo of a run), about 130 px right,
the same offset as the off-center glide below. Repeat of the 2026-10-19 group "The drawing stays
put".

- T37A 2 (c): a Degree run moves Valjean from 748,433 to 880,433 (g-pointer/09-10.png).
- T37B 12 (c): the drawing moves right when the Degree key arrives; with the table open it sits
  small at the upper right (p4-success/24.png, 25.png).
- T38A 2 (c): after Fill + and blue on the find box's selection, about 140 px right
  (v-detour-newdata/17-19.png).
- T38B 1 (c): "Made a layer for the 10 selected nodes", about 135 px right
  (g-detour-open-find/13-16.png; g-detour-data-rclick/21-22.png).
- T39A 1 (c): Select all > Fill and one node > Fill, about 130 px; stays after Undo
  (r-detours2/14.png vs 16.png; 27.png vs 28.png).
- T39B 1 (c): 7d8c-detours/08-12.png, 35-37.png.
- T40A 1 (c): about 150 px, seen twice (h-detour-find/13-15.png; h-detour-useselected/27-29.png).
- T40B 2 (c): about 110 px, and the drawing turns (7d8-detour-find/10.png vs 11.png).
- T41A 2 (c): about 150 px (r1-detour-start/18-19.png).
- T41B 5 (c): about 140 px; Undo slides it back (i-detours/23-25.png).
- T42A 3 (c): about 140 px (7d8c-detour-start/33-34.png).
- T42B 2 (c): about 120 px (w4-detour-find/06.png vs 09.png).
- T43B 2 (c): about 130 px on binding size (r1-detour-node/10-12.png; r1-detour-find/09-10.png).
- T47A 4 (c): Undo and Redo of the Louvain run move it about 130 px left and back
  (7d8-detours/51-53.png).
- T48B 2 (c): Run with a selection on, about 135 px; stays through the filter step
  (r4-detours/23.png, 24.png, 29.png).
- T51A 1 (c): about 150 px (7d8c-2-detours/12-13.png).
- T51B 5 (c): about 125 px (v3-detours/17-18.png).

### Opening the table re-frames the drawing (friction)

Against `decided.md` "The drawing moves only when the reader asks" ("a panel or the table
opening").

- T37A 3 (c): g-pointer/11.png, g-detours/22.png.
- T38A 3 (c): v-detour-data/14.png.
- T38B 13 (c): g-detour-data-rclick/17.png.
- T41B 6 (c): i-keys/91.png.
- T46A 18 (c): the key is also cut to three rows (7d8c-detours/51.png).

### A pick glides to a point right of the canvas center, or zooms (friction)

`decided.md` (2026-10-20, the owner) settles that a pick glides the camera to center the node.
These rows are about where it lands: about 880,433, right of the visible canvas's middle, so the
right of the drawing goes under the inspector; one also zooms.

- T38A 4 (c): find-box Enter on v02 glides and zooms; the top half leaves the screen (v-keyboard/97.png).
- T38B 3 (c): Escape clears the selection but half the graph stays off the left edge
  (g-detour-data-rclick/06-07.png; g-detour-open-find/10.png).
- T41A 16 (c): clicking red dots one by one leaves the rest under the inspector and the toolbar
  (r1-pointer/19-21.png).
- T41B 4 (c): after three clicks an answer node is off screen (i-pointer/18-22.png, 27.png).
- T41B 7 (c): "f" with or without a selection changes nothing visible; only right-click > Fit
  brings the drawing back (i-pointer/23-26.png).
- T43B 10 (c): after the find box selects all 24, s15 is past the right edge
  (r1-detour-find/05.png).
- T46B 15 (c): picking Nebraska cuts the drawing at the top and right (x4-pointer/10.png); the key
  part is under "The key covers nodes".
- T48A 3 (c): the right-hand circle cut off for the rest of the session; with the filter on, 14 of
  15 dots visible (7d8c-detour-start/16.png, 22.png, 32.png).
- T51B 6 (c): only 2 of the 4 agencies visible (v3-detours/15.png, 30-31.png).

### The right-click menu stays where the node was (friction)

`decided.md`: "Right-click selects what is under the pointer" and the pick glides; the menu then
points at empty canvas.

- T37A 4 (c): g-detours/19.png.
- T37B 13 (c): p4-detours/24.png.
- T38A 13 (c): about 250 px away (v-detour-data/04.png).
- T38B 2 (c): about 400 px away, over the inspector's values (g-detour-data-rclick/04.png).
- T41A 5 (c): r1-detour-start/25.png.
- T41B 16 (c): over the undo notice's text (i-detours/44.png).
- T43B 7 (c): over the inspector's name and kind rows (r1-detour-data/06.png).
- T47A 12 (c): 7d8-detours/49.png.

### "Which nodes" with no condition opens without its attribute list (friction)

Against `decided.md` 2026-10-19 ("opening Which nodes opens the attribute list with focus in its
search"). One extra click or Enter on every styling route; "Add a condition" then works. The fix
f7abdac93 was reverted with its batch on 2026-10-19 (`rejected-fixes.md`).

- T38A 5 (c): v-success/08.png, v-keyboard/54.png.
- T38B 4 (c): g-pointer/07.png; g-keys.
- T40A 3 (c): h-pointer/09.png; h-keyboard.
- T40B 1 (c): 7d8-pointer/08.png, 7d8-keyboard/63.png.
- T41A 3 (c): r1-pointer/07.png, r1-keys 50.
- T41B 2 (c): i-pointer/08.png, i-keys/53.png, i-detours/31.png.
- T42A 2 (c): 7d8c-success-pointer/07.png; 7d8c-keyboard.
- T42B 3 (c): w4-pointer/07.png; w4-keys.
- T45A 21 (c): f-pointer/07.png.
- T45B 7 (c): g-pointer/10.png, g-detour-nodetab/06.png.
- T48A 7 (c): 7d8c-detour-cards/35.png.
- T48B 4 (c): r4-detours/46.png.
- T50A 7 (c): v2-detours-b/11.png.
- T51B 9 (c): v3-detours/23.png.

### F6 misses the top bar and stops on resize handles (accessibility)

Against `decided.md` "F6 cycles five regions ... A resize handle is never a region". Tab still
reaches every control, so no keyboard walk was blocked (Sam's four halves finished). The fix
ab5c74c0b was reverted with its batch (`rejected-fixes.md`).

- T37A 13 (c): g-keyboard/58-67.png.
- T37B 11 (c): order changes with where it starts.
- T38A 7 (c): four stops; re-enters at "Resize left panel".
- T38B 6 (c): the left panel entered at different controls.
- T39A 3 (c): r-keys steps 85-90.
- T39B 3 (c): 7d8c-keys/65-72.png.
- T40A 2 (c): h-keyboard after 122.png.
- T41A 1 (c): r1-keys 76-85.
- T41B 8 (c): i-keys/83.png.
- T42A 1 (c): 7d8c-keyboard.
- T43A 4 (c): f-keys/18-23.png.
- T43A 5 (c): F6 into Everything's inspector lands on the unselected Values tab (f-keys/36.png).
- T43B 6 (c): r1-keys/33-36.png, 78-84.png, 123-131.png.
- T44A 12 (c): g-keyboard.
- T44B 3 (c): h-keys after 20.png.
- T46A 2 (c): 7d8c-keyboard/77-82.png, 113.png.
- T46B 1 (c): x4-keyboard 43-51; Shift+F6 enters the left panel at Find.
- T47A 2 (c): 7d8-keyboard/72-76.png, 84-85.png, 93.png.
- T48A 8 (c): 7d8c-keys/61-68.png.
- T48B 3 (c): r4-keyboard/48-56.png.
- T49A 3 (c): h-keyboard.
- T50A 6 (c): v2-keyboard.
- T50B 8 (c): f3-keyboard 26-30.
- T50B 9 (c): f3-keyboard 38-44.

### A focused heading draws no ring (accessibility)

Against `decided.md` "After a graph opens, focus goes to the inspector's heading ... and the
heading draws a visible focus ring". The fix 65c1c08e7 was reverted with its batch.

- T37B 10 (c): p4-keyboard/39.png, 130.png, 99.png (also the inspector row "Degree 17").
- T38A 6 (c): v-keyboard/21.png.
- T39B 2 (c): 7d8c-keys/48.png, 73.png.
- T40B 3 (c): 7d8-keyboard/25.png.
- T41B 9 (c): i-keys/20.png.
- T46B 5 (c): the heading "Group 4" after Memberships (x4-keyboard/81.png).
- T49B 5 (c): k-keys/38.png.
- T50B 7 (c): f3-keyboard/19.png.
- T51B 12 (c): v3-keyboard/21.png.

### The start page's demo comes before "Open a file" in Tab order (accessibility)

"Open a file" is the 14th to 16th Tab stop, after the top bar, the demo canvas and its five
buttons drawn to its right (WCAG 2.4.3).

- T37A 11 (c): 13 stops before Open a file, 11 between the search and the first card.
- T38A 9 (c): v-keyboard start.
- T38B 7 (c): g-keys, first 15 screenshots.
- T40B 4 (c): 7d8-keyboard/08-14.png.
- T41A 19 (c): r1-keys 02-16.
- T41B 10 (c): i-keys.
- T42A 15 (c): 7d8c-keyboard.
- T42B 10 (c): w4-keys.
- T43A 12 (c): f-keys/02-15.png (the tool's start line is the (n) note below).
- T43B 11 (c): r1-keys/02-16.png.
- T44A 10 (c): g-keyboard/09-14.png.
- T44B 12 (c): h-keys, Tabs 1-16.
- T45A 3 (c): f-keyboard.
- T45B 3 (c): g-keyboard.
- T47B 9 (c): Tabs 8-13.
- T48B 12 (c): r4-keyboard/02-17.png.
- T49A 10 (c): h-keyboard Tabs 1-14.
- T49B 2 (c): k-keys/09-17.png.
- T50B 6 (c): f3-keyboard/15.png.
- T51A 11 (c): 7d8c-3-keys.
- T51B 13 (c): v3-keyboard/02-17.png.

### Enter on the start page's Samples leaves focus behind (accessibility)

It scrolls to the library and leaves focus on the button, now out of view; the next Tabs pass New
project and the footer links.

- T37B 7 (c): p4-keyboard/110.png.
- T39A 4 (c): r-keys/18.png.
- T39B 5 (c): 7d8c-keys/22-26.png.
- T40A 5 (c): h-keyboard/43.png.
- T44A 11 (c): g-keyboard/21-24.png.
- T45B 2 (c): g-keyboard/24.png.
- T46A 4 (c): 7d8c-keyboard/20-24.png.
- T46B 2 (c): x4-keyboard/24.png.
- T47A 1 (c): 7d8-keyboard/22.png, 25.png.
- T47B 4 (c): p4-keyboard/22.png.
- T49A 1 (c): h-keyboard-samples/02-05.png; Enter on New project then makes an empty project.
- T49B 4 (c): k-keys/20.png.

### The library search: Enter, a spoken count, the chips (friction, accessibility)

- T37A 8 (c): Enter with one card left does not open it (g-detours/06.png, g-keyboard/23.png).
- T37A 9 (c): no live count as it filters (g-keyboard/22.png).
- T37B 22 (c): p4-detours/05.png.
- T39A 13 (c): r-detours2/05.png.
- T39B 10 (c): no count, Enter does nothing, nine chips are nine Tab stops (7d8c-keys/33-46.png).
- T40A 6 (c): h-keyboard.
- T47A 16 (c): 7d8-detours2/04.png.
- T49B 13 (c): k-detours-c/08.png.

### A sample card's name leaves out its visible title (accessibility)

"Open the Les Miserables sample" against "Who holds the novel together" (WCAG 2.5.3).

- T37A 10 (c): g-keyboard/35.png.
- T39A 7 (c): r-keys.
- T46A 12 (c): 7d8c-keyboard/39-41.png.
- T47B 5 (c): p4-pointer/03.png.
- T49A 7 (c): h-keyboard Tab 32.

### Two controls share a name (accessibility)

Against the design criterion "no two reachable controls share an accessible name".

- T37B 6 (c): "Samples" button and link (p4-success/02.png).
- T39A 8 (c): two "Background color" on the Graph Style tab (r-detours1/06.png).
- T39B 9 (c): Samples (7d8c-pointer/02.png).
- T40A 7 (c): Samples; "Graph" beside "Graph Les Miserables" (h-pointer/03.png,
  h-detour-filter/11.png).
- T42A 16 (c): Samples.
- T46A 20 (c): Samples (7d8c-pointer/03.png).
- T47A 7 (c): Samples (7d8-pointer/03.png).
- T48A 9 (c): two "Done" with Select layers mode and the picker open (7d8c-detour-cards/53.png).

### The start page's live region arrives already filled (accessibility)

- T37A 12 (c): g-keyboard/01.png.
- T38B 12 (c): g-keys start.
- T42A 17 (c): 7d8c-keyboard/01.png.
- T50B 11 (c): f3-keyboard/01.png.
- T51A 16 (c): 7d8c-3-keys start.

### The private-window notice on every open (friction)

"This looks like a private window: your work is gone when it closes" while the top bar reads
"Autosave: saved". It may come from the study browser's storage; check the tool's browser profile
before changing the app.

- T37B 21 (c): p4-success/04.png.
- T38A 11 (c): v-success/04.png, v-detour-newdata/10.png.
- T38B 10 (c): g-pointer/03.png, g-detour-open-find/09.png.
- T41B 19 (c): i-pointer/04.png, i-keys/20.png.
- T42A 18 (c): 7d8c-success-pointer/03.png.
- T45A 20 (c): f-pointer/03.png.
- T49B 14 (c): k-pointer/04.png, k-keys/38.png.

### "Open network data" is a dead end for a local file (friction)

Its NDEx, Neo4j and Web API cards highlight and say "on the way"; a file name in its address box
gets the browser's "Please enter a URL."; nothing points to "Open a file". The answer key lists it
as a detour that leads back.

- T38A 1 (c): v-detour-newdata/02-04.png.
- T38B 9 (c): the dialog also grows and moves up 13 px (g-detour-open-find/02-03.png).
- T39B 12 (c): 7d8c-detours2/03.png.
- T40B 10 (c): 7d8-detour-other/02-03.png.
- T41A 14 (c): r1-detour-start/02-03.png.
- T41B 11 (c): i-detours/02-03.png.
- T42A 12 (c): 7d8c-detour-start/02-03.png.
- T42B 9 (c): w4-detour-card/04.png.
- T43A 7 (c): f-detours/02-03.png.
- T44B 6 (c): h-detours/02-03.png.
- T45A 2 (c): f-detour-start/02-03.png.
- T45B 5 (c): it offers no samples either (g-detour-find/02.png).
- T47A 14 (c): 7d8-detours/58-59.png.
- T48A 12 (c): 7d8c-detour-start/02-03.png.
- T48B 8 (c): r4-detours/03.png, 05.png.
- T49B 11 (c): k-detours-c/02-03.png.
- T49B 12 (c): the browser's own "Please enter a URL." bubble (k-detours-c/04.png).
- T51A 8 (c): 7d8c-2-detours/03.png.
- T51B 10 (c): v3-detours/03-04.png.

### A node is named by its id, not its label (wording)

Against `decided.md` "A node is called by one name everywhere the app names it". Which column is
the label when a file has a name column and no label column stays a session question (same
entry), so on volunteers and sources the id is what the element gives; on Les Miserables and
College football the label exists and is not used. The fix fa2316520 was reverted with its batch,
not for a fault of its own (`rejected-fixes.md`).

- T38A 8 (c): find rows "v01, v13, v23", inspector "v23", "v02 selected" (v-detour-newdata/11.png,
  v-detour-data/04.png, v-keyboard/97.png).
- T38B 11 (c): s01, s04 (g-detour-open-find/09.png).
- T40A 10 (c): "MmeMagloire" in find, "Mme Magloire" in the card (h-detour-find/05.png).
- T41A 20 (c): a table row announced "v23 selected" (r1-keys 116).
- T44A 6 (c): "MmeThenardier" in find, "Mme Thenardier" on the drawing (g-detours/08.png, 34.png).
- T44B 1 (c): after every node is labeled, still "v16" in find, Frame and the heading
  (h-keys/85.png; h-detours/16.png).
- T44B 8 (c): the one-node layer's notice "Made layer v16 for 1 node" (h-detours/15.png); that
  this one-node layer is an easy false finish is the task's to measure.
- T46B 3 (c): Nebraska picked from Find, heading "74" (x4-keyboard/70.png; x4-pointer/09-10.png).
- T46B 4 (c): "Made layer 74 for 1 node", "Undid adding the layer 74." (x4-detours/30-31.png).
- T47B 11 (c): heading and one-node layer "25" for NorthCarolinaState (p4-detours/15.png, 22.png).
- T51A 7 (c): v01, v13, v23 (7d8c-2-detours/09.png).
- T51B 7 (c): s01, s04, s18 (v3-detours/14.png, 31.png).

### Escape on the inspector and in dialogs (friction)

Against `decided.md` "Escape in the inspector" (2026-10-19) and "Escape in a dialog closes it". The
fix d3fdf4668 was reverted with its batch.

- T37A 14 (c): Escape on the "Resize table" separator clears the selection (g-keyboard/83.png).
- T37B 1 (c): Escape on a node's inspector does not clear the selection (p4-detours/28.png;
  p4-keyboard/99.png).
- T37B 2 (c): Escape in "Discard unsaved changes?" closes it and also clears the selection behind
  it (p4-detours/48.png).
- T43A 2 (c): Escape on the size link icon of a layer's inspector clears the 24-node selection
  (f-detours/18.png).

### Escape in a condition card closes the picker (friction)

Against `decided.md` "Escape in a card's text or number box keeps what was typed and keeps the
picker open". Edits are kept, so nothing is lost.

- T38A 12 (c): on a value checkbox (v-keyboard/67.png).
- T38B 5 (c): g-keys/58.png.
- T48B 7 (c): right after picking on_record, on the value select (r4-detours/39-40.png).

### Escape on a just-added line or card says nothing, or takes back typed text (friction)

Against `decided.md` "Escape on a just-added line or card that holds nothing takes it back, says
so, and puts focus on the + or Add a condition that added it" and "Escape in a style field
reverts what was typed".

- T41A 4 (c): a just-added Color line holding typed text is removed whole, silently
  (r1-pointer/17.png).
- T41B 3 (c): an empty text card is dropped and the whole picker closes, focus on Which nodes
  (i-detours/35.png).
- T43B 14 (c): the empty Size line is taken back with no notice (r1-detour-node/13.png).
- T49B 8 (c): the unset Color line is taken back with no notice (k-detours-b/09.png).

### Escape in a popover's or the picker's box reverts silently (accessibility)

Against `decided.md` "Escape in a style field ... says 'Edit discarded; this stays X' ... inside a
popover, the color picker's hex box included".

- T39A 2 (c): the color picker's hex box (r-keys/83.png).
- T43A 3 (c): the size dialog's "Values from" (f-keys/65.png).
- T49A 4 (c): h-detours-a/19.png vs 21.png.
- T49B 6 (c): k-detours-a/22.png.

### A refused value survives Escape with no way out said (friction)

- T42A 8 (c): "30" in Highest, ">=20" in the from box; its message does not say how to get "20 or
  more" (7d8c-detour-card/13-15.png, 23-24.png).
- T42B 5 (c): "$10,000" and the Highest count 10000 (w4-detour-card/12.png, 20.png).
- T42B 12 (c): by keyboard, Escape gives no feedback (w4-keys/75.png).

### Escape on a page or form does the wrong thing (friction)

- T41A 13 (c): Escape on the read-the-file page "Add to volunteers" does nothing
  (r1-detour-picker/26.png).
- T45A 9 (c): the same on "Add to neighbors" (f-detour-find/18.png).
- T46A 22 (c): Escape in the Louvain form's Resolution box leaves the form instead of reverting the
  field (7d8c-keyboard/74.png).
- T51A 14 (c): Escape in the group view's name box closes the group view (7d8c-3-keys/92-93.png).

### Tab in a list with letters typed takes nothing (friction)

Against `decided.md` "Tab in a list with letters typed and an option highlighted takes that
option".

- T43A 1 (c): "ho" with hours highlighted in the size popover (f-detours/20-22.png).
- T43B 3 (c): "don" in "Find an attribute" (r1-keys/188.png).

### A tooltip and the control's name differ (accessibility)

Against `decided.md` "A control's tooltip and its accessible name say the same words".

- T37B 14 (c): Main menu (p4-detours/37.png).
- T40B 7 (c): the filter button (7d8-detour-filter/16.png).
- T43B 8 (c): the size link (r1-tooltip/05.png).
- T43B 9 (c): Main menu (r1-detour-node/07.png).
- T44A 3 (c): "Label settings" vs "Node label settings" (g-pointer/21-22.png).
- T44B 9 (c): the same (h-pointer/16.png).
- T46A 7 (c): the folder's chain icon (7d8c-detours/42-43.png).
- T46B 9 (c): the same (x4-detours/35-36.png).
- T49A 5 (c): "Hide Everything" vs "Turn this layer off" (h-detours-a/23.png).
- T51B 1 (c): the color link icon (v3-success/10.png).

### An icon or truncated control has no tooltip (accessibility)

- T44A 4 (c): the reset minus beside Size (g-pointer/26.png).
- T44A 7 (c): the label source button "Fixed t..." (g-detours/21-22.png).
- T44B 5 (c): the same (h-detours/23-24.png).
- T46A 13 (c): the demo's "Pause the turning" (7d8c-detours/06.png).
- T47B 10 (c): the Louvain card's "Advanced" gear (p4-pointer/07.png).
- T50A 9 (c): "About Direction" and "About Degree" (v2-detours/19-20.png).
- T50B 3 (c): "Restore starting layers"; that it restores the defaults, not a lost project look,
  is what it is for (f1-pointer/05.png, 07.png).

### A tooltip covers the next control (cosmetic)

Extends the existing backlog entry on tooltip placement.

- T44B 11 (c): "Node label size by attribute" over the label count (h-detours/38.png).
- T45B 12 (c): "Edge width by attribute" over Arrowheads "+" (g-pointer/20.png).
- T47A 8 (c): "Node shape by attribute" over "Shape: 6 changed / Undo" (7d8-pointer/19.png).
- T51A 3 (c): the "board" square's tooltip over its neighbors (7d8c-1-pointer/11.png).
- T51B 3 (c): the same (v3-success/09.png).

### "Edit discarded" squeezes its row (cosmetic)

- T43B 12 (c): under "Size to", pushing "Size from" down (r1-pointer/12.png).
- T44A 5 (c): a narrow column beside Size (g-pointer/24.png).
- T44B 4 (c): four lines between Size and its icons (h-pointer/19.png).

### Selected and styled things are hard to read (friction)

The selection ring or band draws over the new look (graded by the tree's color, `answers.md`).

- T40B 9 (c): one selected node is a tiny yellow dot; styled nodes keep yellow rings
  (7d8-detour-find/05.png, 11.png).
- T41A 6 (c): after the layer is corrected, 17 rings, "phone" in find and "17 nodes selected" stay
  (r1-detour-start/23.png).
- T42A 14 (c): gold rings close to the asked orange (7d8c-detour-start/31.png).
- T45A 15 (c): the blue band over a styled tie hides its red at width 24 (f-detour-find/11.png,
  f-detour-tie/14.png).
- T45A 19 (c): width 24 draws only a little thicker than 8 at the default framing
  (f-pointer/14.png, 19.png).
- T45B 6 (c): the same, and selected ties draw far thicker, so the result shrinks when the
  selection clears (g-detour-find/19-20.png; g-pointer/18.png, 25.png).

### "Style nodes" or "Style edges" drawn dimmed with no reason (friction)

The fix adb1c1705 was reverted with its batch.

- T41A 7 (c): r1-detour-start/18-23.png.
- T41B 18 (c): i-detours/17.png.
- T45A 13 (c): the reason shows only on hover (f-detour-nodetab/24.png).
- T46B 19 (c): x4-pointer/13.png.

### A layer made from a selection is named and shown as its count (wording)

- T39A 9 (c): "77 nodes, 254 ed...", key "Color: 77 nodes, 254 edges" for a node color
  (r-detours2/16.png).
- T39B 6 (c): "115 nodes, 613 edges" (7d8c-detours/10-11.png, 37.png).
- T39B 7 (c): the Selection inspector and the new layer open on the Edge tab carried over
  (7d8c-detours/33-34.png).
- T45A 14 (c): "8 edges", "Picked by hand: 8 edges" (f-detour-find/11.png, 13.png).
- T45B 14 (c): a node color on an edge-condition layer flips it to "Node layer"; the key line has
  no count (g-detour-nodetab/11.png).

### The shape list's highlight (friction)

- T47A 3 (c): the row under the pointer stays highlighted while Enter takes another
  (7d8-pointer/14.png; 7d8-detours/21.png, 24-25.png; 7d8-detours2/38.png, 40-41.png).
- T47B 2 (c): "box" shows Dodecahedron highlighted, Enter takes Box (p4-pointer/12.png;
  p4-detours/19.png, 42-43.png).
- T40A 11 (c): after "Mme", a suggestion highlighted under the resting pointer reads as if Enter
  takes it (h-pointer/12.png, h-detour-filter/09.png).

### The key covers nodes, scrolls, or shows a range its nodes do not hold (friction)

`decided.md`: "The key floats over the canvas; Frame keeps clear of it". At open it can cover a
node. No answer is read by counting dots: the answer key accepts the layer's and the key's counts.

- T43B 13 (c): a one-node layer holding 0 shows 0 to 250,000, against "A key lists only the values
  its layer's nodes hold" (r1-detour-node/11.png).
- T46A 19 (c): 7d8c-pointer/10.png.
- T46B 13 (c): "3 more below" hides Groups 8-10 (x4-detours/30.png).
- T47B 15 (c): p4-pointer/08.png, 13.png.
- T48A 6 (c): 7d8c-pointer/08.png; 7d8c-detour-cards/43.png.
- T48B 1 (c): one Group 3 node under the key (r4-pointer/09.png, 14.png, 18.png).
- T51A 2 (c): 7d8c-1-pointer/05.png vs 08.png.
- T51B 2 (c): v3-success/08.png.

### The folder and run look (friction, wording, cosmetic)

- T46A 11 (c): the Memberships "Louvain Group 3" button looks like plain text (7d8c-detours/26.png);
  already in the backlog.
- T46A 15 (c): the folder's swatch strip names a group on hover, does nothing on click
  (7d8c-detours/36.png).
- T46B 14 (c): Memberships looks like text; no focus ring on the Color box after it
  (x4-detours/44-45.png).
- T46B 18 (c): "Nineteen contrasting c..." (x4-detours/38.png).
- T47A 9 (c): the folder color's spoken name calls two groups "orange" and two "blue"
  (7d8-keyboard/99.png).
- T47A 11 (c): the "Everything / Size, Shape" link focuses Size, not Shape (7d8-detours/27.png).
- T47A 15 (c): the inline Undo says "Undid changing shape", elsewhere "... on 6 layers."
  (7d8-keyboard/131.png).
- T47B 12 (c): a group layer's unset Shape line shows no "Not set yet" hint (p4-detours/38.png).
- T47B 14 (c): the palette name cut off (p4-detours/34.png).
- T48A 1 (c): ticking Group 2 on Group 1's card paints Group 2's trained members orange while the
  key keeps Group 2 blue and loses its count (7d8c-detour-cards/29.png); graded F if left.
- T48A 2 (c): three undo steps share one label; the first lands on "Has no value, 0 nodes"
  (7d8c-detour-cards/21.png, 23.png, 25.png).
- T48B 6 (c): on one cluster the card reads "12 nodes" while the layer paints 4
  (r4-detours/39.png); the answer key grades around it.

### Select layers mode (accessibility)

- T48A 10 (c): its checkboxes have no accessible name (7d8c-detour-cards/49.png).
- T48B 5 (c): the same; the folder's box checks none of its layers; three checked shows the folder
  partly checked (r4-detours/65.png, 67-68.png).

### Filters and the selection (friction, wording)

- T41B 15 (c): a filter step hiding all 15 selected leaves "15 nodes selected" (i-detours/42.png).
- T48A 4 (c): the same with 9 (7d8c-detour-start/32.png).
- T42A 9 (c): Enter in a new step's from box adds it at once; "24 to 24 nodes" before
  (7d8c-detour-start/14-15.png).
- T42A 10 (c): the heading reads "24 nodes" while the filter shows 11 (7d8c-detour-start/16.png).
- T48B 10 (c): the filter's Attribute list says "Node id" and lists Louvain where the Data panel
  says "id" (r4-detours/27.png).

### The number card (friction, wording)

- T42A 7 (c): 20 typed into the "to" box gives 2 to 20 with nothing saying it is the wrong side
  (7d8c-detour-card/18.png).
- T42B 4 (c): the count and slider do not follow typing until Enter or Tab, against `decided.md`
  "the count on screen follows each keystroke" (w4-pointer/10.png).
- T42B 8 (c): "From is above to: 300000 is more than 10000." (w4-detour-card/22.png).
- T43B 1 (c): Enter on an unset Size line does nothing, against `decided.md` "An unset line takes
  the value it shows ... on Enter" (r1-detour-node/14.png, r1-detour-find/08.png).
- T43B 5 (c): "Size from" 8 above "Size to" 4 is accepted and the chip reads "From 4 to 8"
  (r1-keys/176.png).

### "Has no value" and number hints in find (wording)

- T41A 8 (c): "missing phone" and "no phone" get a number-rule hint (r1-detour-start/11.png,
  14-15.png).
- T41B 13 (c): "donations >= 130000" for "missing email" (i-detours/09.png, 12.png).
- T45B 9 (c): "chapters" gives a node-only example, no hint of shared_chapters
  (g-detour-find/07.png, 10.png).

### New project names the work "Untitled" (wording)

- T41A 15 (c): r1-detour-start/10.png.
- T42A 11 (c): 7d8c-detour-start/10.png.
- T45A 18 (c): with Undo enabled (f-detour-start/08.png vs f-pointer/03.png).
- T48B 11 (c): r4-detours/13.png.
- T51A 9 (c): 7d8c-2-detours/08.png.

### Leaving and discarding (wording, friction)

- T37B 3 (c): "Discard unsaved changes?" when nothing changed, beside "Autosave: saved"
  (p4-detours/47.png).
- T37B 8 (c): after Back to start or Discard, focus on New project; one Enter makes an empty
  project.
- T46B 7 (c): x4-detours/09.png.
- T49A 9 (c): h-detours-b/16.png, 19.png.
- T49B 9 (c): k-detours-b/15.png, 18.png.
- T49B 10 (c): Back to start lands scrolled to the library (k-detours-b/20.png).

### A partial open says what did not come back (wording)

- T50A 2 (c): "1 part did not come back." names no part and offers nothing (v2-pointer/04.png).
- T50A 4 (c): by keyboard, Restore says nothing and focus moves to Graph settings.
- T50A 5 (c): "Restore starting layers" against "Undid restoring the starting rows."
  (v2-pointer/17-18.png).
- T50B 4 (c): the same "rows" (f1-pointer/08.png).

### Analysis popover cosmetics (cosmetic)

- T39A 14 (c): a tall empty panel under "No analysis matches" (r-keys/93.png).
- T45B 13 (c): "Edge width by attribute" popover about 340 px for one row
  (g-detour-everything/06.png).
- T46A 21 (c): 7d8c-detours/12-14.png.
- T46B 17 (c): about 460 px for one row (x4-pointer/05.png).
- T51A 10 (c): "color" shows one small line in a tall popover (7d8c-2-detours/36.png).

### Control+A off the canvas (friction)

`decided.md` settles Control+A on the canvas only.

- T39B 8 (c): on an inspector tab (7d8c-detours/07.png).
- T42A 13 (c): on a layer row, moving the camera (7d8c-detour-card/19-20.png).
- T43B 15 (c): on an inspector button.

### Zoom steps about 1 percent (friction)

- T44A 1 (c): 15 wheel notches grow the drawing about 15% (g-pointer/10-20.png).
- T44B 2 (c): 10 wheel turns and three "=" barely change it (h-pointer/09-15.png, h-keys/91.png).

### Add label line (friction)

- T44A 9 (c): no description; with a label it silently jumps to the label source
  (g-detours/29-31.png).
- T44B 13 (c): adds nothing and says nothing when a label exists (h-detours/32.png).

### The start page demo (friction, cosmetic)

- T46A 14 (c): a click hits an edge and paints it blue (7d8c-detours/05.png).
- T46B 16 (c): the wheel over it zooms instead of scrolling the page (x4-detours/03-04.png).
- T47A 10 (c): it keeps turning, so clicks miss; Communities has no tooltip (7d8-detours/02.png,
  05-06.png).
- T47B 8 (c): a node click lands on a link, which stays blue (p4-detour-landing/03.png).

### Reset Palette (accessibility, wording)

- T51A 13 (c): a Tab stop not marked disabled while drawn dimmed (7d8c-3-keys step 9).
- T51B 16 (c): the same; "Palette" capitalized (v3-success/11.png).

### Color by grid cell names (accessibility)

- T51A 12 (c): "Hide role board role board actions"; "board , 3 nodes" (7d8c-3-keys 84-90).
- T51B 15 (c): "company , 6 nodes", "Hide kind company kind company actions".

### Other keyboard and screen-reader problems (accessibility)

- T37A 15 (c): "Degree 36" opens the neighborhood; its name does not say so (g-keyboard/71.png).
- T37B 4 (c): "34 selected" for one node with id 34, beside "34 nodes selected" (p4-success/29.png).
- T37B 20 (c): "Degree finished" names no node; "Degree 17, #1 of 34" is not a Tab stop.
- T39A 10 (c): "Edit discarded; this stays 006400." reads the hex, the box says "dark green".
- T41B 20 (c): the same with FF0000 (i-keys/76.png).
- T42B 6 (c): "Filter to..." leaves focus on the tree row (w4-detour-find/14-15.png).
- T43A 10 (c): the size dialog reads 20 histogram rows with counts twice before its first control
  (f-keys/58.png).
- T43B 4 (c): Tab commits "Size from" but stays in it (r1-keys/176.png, 180.png).
- T44A 13 (c): the Label settings close button is "Close panel".
- T44B 10 (c): committing the label Size announces nothing (h-keys before 81.png).
- T45A 10 (c): "Color by kind" names two of three groups (f-detour-nodetab/19.png).
- T45B 15 (c): the focus ring on "Pick edge color" is hard to tell from the box
  (g-keyboard/94.png).
- T48A 11 (c): the value box is named "trained: how to match" while it holds Yes
  (7d8c-keys/87.png).
- T49A 2 (c): Tab cycles inside the color picker; Escape and "Close panel" leave it.
- T49B 3 (c): the focus ring on the green start buttons is thin and the same green (k-keys/16-17.png).
- T49B 7 (c): after "Remove node color" focus goes to Effects "+", against `decided.md` "After a
  line is removed, focus goes to its own section's +" (k-detours-b/07.png).
- T50B 10 (c): Enter on "Graph volunteers.graphml" does nothing visible (f3-keyboard/55-56.png).
- T51B 14 (c): the attribute list's "Data" and "Structure" headings are not exposed.
- T51B 17 (c): Tab inside the Text "+" menu stays on Label.
- T51B 18 (c): Shift+Tab from the bound Color line skips "Pick node color".

### Other friction and cosmetic problems

- T39A 12 (c): after "Remove edge color" the Width line slides under the pointer
  (r-detours1/18.png).
- T41A 10 (c): Enter in a text card keeps "phone contains missing, 0 nodes" with no warning
  (r1-detour-picker/13.png).
- T41A 11 (c): a click on the drawing that drops an unfinished card also moves the inspector to
  the Graph (r1-detour-picker/16.png).
- T41B 1 (c): on a layer made by "New layer from selection", Has no value is refused ("That rule
  could not be used for this layer"); the count stays 15 and says so (i-detours/20.png, 22.png,
  24.png). The refusal is on screen; a new layer finishes the task.
- T41B 17 (c): a red dot behind a blue node gives the click to the blue one (i-pointer/21.png).
- T43A 6 (c): a click on the link icon while the "Edit discarded" hint shows opens nothing
  (f-detours/16-17.png, 19.png).
- T43A 11 (c): the Control+O page is titled "Add to volunteers" with "Replace volunteers.graphml"
  first (f-detours/32.png).
- T44B 14 (c): labels cut by the side panel while the count says "0 hidden" (h-detours/26.png,
  38.png).
- T45A 11 (c): the swatch strip's order differs from the key's (f-detour-nodetab/21.png).
- T45A 12 (c): "Clear color: back to the layer's" cut mid-phrase (f-detour-nodetab/22.png).
- T45A 16 (c): a tie's From/To values drawn light gray (f-detour-find/05.png, 07.png, 14.png).
- T45A 17 (c): Which edges collapsed by pointer, open by keyboard (f-pointer/06.png,
  f-keyboard/43.png).
- T45A 22 (c): Replace leads to a second page that asks again, against `decided.md` "with no
  confirmation" (f-detour-find/19.png).
- T47A 13 (c): the restore card calls the work "An untitled project (77 nodes)"
  (7d8-detours/56.png).
- T48A 5 (c): a file dropped on a new, empty project's canvas is not taken (in a real browser the
  page would open the file in place of the app) (7d8c-detour-start/09.png).
- T39B 11 (c): the layers "+" is named "Add a layer or a folder" but holds "Select layers..." and
  "Analyze..." (7d8c-detours/41.png).

## Leave for the sessions

- T37A 5 (b), T37B 15 (b), T45B 10 (b), T46A 16 (b): hovering a node or tie shows no name. What a
  hover should show is a design question.
- T37A 6 (b), T37A 7 (b), T37A 16 (b), T37B 16 (b), T37B 18 (b), T37B 19 (b): where "most
  connected" is answered before a run, and Degree against "connections". T37 is not run in round
  1; kept for its round.
- T37B 17 (b), T43A 9 (b): in 3D a near node looks biggest. Whether size must read in 3D.
- T38A 15 (b), T40A 9 (b), T45A 5 (b): what Enter and a plain click do on find rows (one row
  against every match).
- T39A 11 (b): the Graph Style tab as a false finish for node color; where a newcomer looks.
- T40A 8 (b): no route from "+" > Layer to the held selection.
- T40A 13 (b), T40B 8 (b), T42A 4 (b): styling Everything while a filter step hides most nodes.
- T41A 12 (b): a filter step's Keep hides the others, against "everyone else stays as they are".
- T41A 9 (b), T41B 14 (b): "missing" finds nothing; the app says "no value" (`tasks.md` keeps
  "missing" to measure this).
- T41A 17 (b): nothing marks which people a layer paints in the table or the inspector.
- T42A 5 (b), T42A 6 (b), T42B 7 (b), T45B 8 (b): no "at least" match; "Highest" as a count of
  people; "5 to 31" where the find box writes ">= 5".
- T43B 16 (b), T45A 8 (b), T45B 11 (b), T46A 17 (b), T46B 12 (b), T47A 18 (b), T51A 4 (b),
  T51B 11 (b): the Data place, the right-click menu and the column menu offer no styling by value
  and do not list a run's groups. Where styling by value lives.
- T47A 19 (b): the graph inspector's Style tab gives no pointer to node looks.
- T44A 8 (b), T49B 16 (b): "label", "names", "reset" find nothing in find or Quick actions.
- T45A 4 (b): the condition list's search matches attribute names only, not values.
- T45A 6 (b): a hand-picked layer takes no condition.
- T45A 7 (b): Everything's "Edge color by attribute" recolors every tie.
- T45B 4 (b): the Les Miserables card leads with "Who holds the novel together".
- T46A 6 (b), T46B 10 (b), T47B 1 (b): "community", "circles" and "cluster" in the analysis
  filter ("cluster" highlights Clustering coefficient first). `tasks.md` records what each B
  participant types.
- T46A 8 (b): a node's own Fill "+" makes a one-node layer instead of painting the circle.
- T46A 10 (b), T46B 11 (b), T47A 17 (b): the color key is inert.
- T49A 8 (b), T49B 15 (b): the picker marks "the color before this edit", not the color the
  drawing opened with (already in the answer key).
- T51A 5 (b), T51B 8 (b): hand-made layers' key lines name a count, never the value, so the key
  cannot say which color is the board or the companies (T51 measures this).

## No change

- T40A 12 (n): the open suggestion list covers "Add step": `decided.md` "An open list, menu or
  popover covers what is under it while open".
- T47B 3 (n): the open shape list covers the inspector: the same entry.
- T41A 18 (n), T42B 11 (n): 15 Tabs from the heading to the layer "+": `decided.md` "F6 answers
  the long Tab walks".
- T51A 6 (n): a one-node layer's key lists one value: `decided.md` "A key lists only the values its
  layer's nodes hold".
- T46A 9 (n), T46B 8 (n): the purple "Layer" token on the folder: the combined Style panel design
  (`tier3/design.md`, 2026-10-16); `answers.md` grades `Token:`.
- T50A 10 (n): Control+O with the same project open replaces it at once: new `decided.md` entry
  2026-10-20, "A project file opens in place of the work".
- T38A 10 (n), T39A 5 (n), T40B 6 (n), T47A 6 (n), T50A 12 (n): the usage-data notice sits at the
  page's foot, below the fold: `decided.md` "The usage-data notice is last in the start screen's
  Tab order"; `answers.md`: no path needs it, and the notice is part of the start page the owner
  chose.
- T46A 3 (n), T37B 9 (n), T47B 7 (n): the start page demo draws Les Miserables in community colors,
  says "Valjean is the biggest", and its Communities button toggles: `answers.md` "The start page"
  (the demo cannot be styled and leads nowhere; T37 is not run in round 1).
- T38A 16 (n), T40A 14 (n): blue 0000FF and purple 800080 beside the default indigo: the task's
  color and the default; graded by `colorWord` on the tree.
- T47B 13 (n): College football's conference column is named "value" in the file.
- T37A 17 (n), T41A 21 (n), T46B 20 (n), T49B 17 (n): the tool's "the app never drew its window":
  `answers.md` "The start page's turning sample is a graph to the tool" (not a VOID).
- T40A 15 (n), T47A 20 (n), T47B 16 (n): `styles-start.json` records the demo: the same
  `answers.md` rule (grade from the layers, never from `changes`).
- PASS INCOMPLETE lines whose only gap is `report.md` (the harness refuses a subagent's report
  file; the content is in the returned text, and `answers.md` names the session folders) or a
  route that does not apply or is walked elsewhere on this build:
  T37A 18 (n), T37B 23 (n; Quick actions "degree", T37 not run), T38A 17 (n; no sample on a file
  task; the keyboard walk takes the success path), T38B 14 (n; Control+O with a graph open is
  walked on T41A, T43A, T45A), T39A 15 (n; the file chooser is not on T39's route), T39B 13 (n; the
  demo click is walked on T46A, T47A, T47B), T40A 16 (n), T41A 22 (n), T41B 21 (n; neither is a
  listed detour), T42A 19 (n), T42B 13 (n), T43A 13 (n), T44A 14 (n; file detours are B's;
  Control+O as above), T44B 15 (n), T45A 23 (n), T45B 16 (n), T46A 23 (n; no Les Miserables file
  among the study files), T46B 21 (n; the folder table's picker is on T46A's walk), T47A 21 (n),
  T47B 17 (n), T48A 13 (n), T48B 13 (n; removing the folder card is on T48A's walk), T49B 18 (n;
  the keys are the same in both modes), T51A 17 (n; F6 is covered by 24 walks), T51B 19 (n; a third
  layer repeats the second).

## What the re-walk covers

After the three fixes, walk on the new build: T50 A and B by pointer, detours and keyboard (the
whole success path, which no one has walked on a build with the golden merge); T46A's table route;
T45A's Control+O > Replace detour and its success path. The routes these fixes cross: every
project open (a project saved before and after the fix), any table with a run's column (T46 B,
T47, T48), and any reload of a file with hand-picked layers (T38, T41, T51 by find box, then
Control+O > Replace).
