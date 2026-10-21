# Tier 3 dry run before the round 1 sessions, second pass on build 6de5f95d12

Every tier 3 task half was piloted again on the frozen build 6de5f95d12, the build made after the
first pass's three fixes (an older project opens with its look, a file reopened over itself keeps
its hand-picked edge layers, the table names a community run's groups as the key does). The pilots
walked each half's pointer success path and the routes those fixes touch; Sam's halves (T39 A,
T40 A, T47 B, T48 A) and most others also by keyboard. This page sorts every problem they reported
(228 lines) and gives the reason. Screenshots are under `rounds/r1d1/pilot/<task>/<session
folder>/`. (The second-pass triage of an earlier freeze, build ed4351b258, is in this file's git
history at 98b7f9a4df.)

The pass has the narrow job of the first: make the build ready for sessions. No crash, no blocked
task and no wrong result that would spoil grading, on any task's success path or on a detour its
pilot walked. Friction, wording, cosmetic and keyboard-only problems go to `backlog.md` and are
fixed between rounds. T37, T42 and T44 are not run in round 1 (`roster.md`); their lines are
classed like the others, and a defect seen only there is (a) only when it also reaches a round 1
route.

Classes:

- **(a) fix now.** CRASH, BLOCKS or SPOILS GRADING on a success path or a walked detour, with its
  origin: **new**, **regression** (caused by the first pass's fixes) or **repeat** (an earlier
  triage already sent it to fix).
- **(n) no change.** Asks for something other than a settled behavior in `decided.md` (the entry is
  named), a fact the answer key already grades around, a note about the pilot or the study tool, or
  a line reporting no defect.
- **(c) backlog.** Friction, wording, cosmetic, and what only a keyboard or screen-reader user
  meets. Each heading below is one entry in `backlog.md`, with its kind.
- **(b) leave for the sessions.** A design question the study exists to answer.

## Totals

- 228 lines: 2 (a), 166 (c), 17 (b), 43 (n). The 166 (c) rows are 60 entries in `backlog.md`.
- Of the 2 (a): 0 crashes, 0 blocks, 2 spoil grading; 0 regressions, 0 repeats, 2 new. Neither
  comes from the first pass's fixes: the first is the unfinished half of a fix from the earlier
  dry run (18f1cae069, 2026-10-19), seen on 7d87760756 and sent to the backlog then; the second was
  first walked on this pass.
- The first pass's three fixes held on every walk: both T50 projects open with their look on every
  way in, the table names Javert's and Nebraska's groups as the key does, and Control+O > Replace
  with the same file keeps hand-picked and rule layers on the same nodes and edges.
- No settled behavior is reversed. Two behaviors are added to `decided.md` (2026-10-20, "Dry run
  pass 2 on build 6de5f95d12"), one per unit.
- As on the first pass, many (c) rows break a settled behavior (the drawing moved with a selection
  held on 13 walks, F6 missed the top bar on 16, "Which nodes" opened without its list on 7). Each
  has a route past it: Frame, a second click, Tab. They stay in the backlog.
- The 30 PASS INCOMPLETE lines are (n): each names routes that belong to other tasks and were walked
  by those tasks' own pilots on this build, or routes untouched since 7d87760756 whose walk there
  still counts (`criteria.md`, preflight 4), plus the harness refusing a subagent's `report.md`.

## Fix now

### 1. A layer made from a selection refuses its first condition (T41 B; every find-box layer)

- T41B 1: on the find-box route, "email: has a value" made by "New layer from selection" refuses
  the switch to "Has no value" ("That rule could not be used for this layer"); the card then reads
  9 while the layer stays at 15, adding `on_record` Yes changes nothing, Done drops both edits
  without a word, and Fill red paints the 15 who HAVE an email (w3-findlayer-replace/22.png,
  24-26.png). **SPOILS GRADING**: the participant made a stack `answers.md` counts as SD on T41 A
  (switch the card, add the second), the app silently did not apply it, and the grader marks F.
  **New** (seen on 7d87760756 as T41B 1 and sent to the backlog on the reading that the refusal is
  on screen; this walk shows Done then drops the edits silently, so the result is wrong with no
  word).

Mechanism, reproduced in Node against the built element (`tmp/director-r1-2/addrow-absent.mjs` in
the studio worktree): "New layer from selection" (`graphty/src/workspace/style/commands.ts`) calls
`styles.addRow` with target `"node"` and no look. Since 18f1cae069 (team entry "a row of one kind
may start empty", 2026-10-19) `addRow` admits that row empty, but a one-kind row carries no `row`
id, so the next `styles.update` / `updateMany` re-checks it with `checkShape`
(`graphty-element/src/session/styles/Layer.ts`) and refuses it: `E_BAD_LAYER`, "A layer with
neither a set nor an encode writes no channel and would paint nothing." Every selector write is
refused until a look is set, on A and B alike (the same script refuses `phone` on volunteers); the
T41 A key's route works only because its walker set Fill first. A "+" layer is a both-kinds row
(each part carries `row`), so the success paths never meet it.

Settled: `decided.md` 2026-10-20, "A layer made from a selection takes its conditions before it has
a look".

### 2. Undo across a file opened over itself leaves a look the layers no longer hold (T44 B; reproduced on T51 A's data)

- T44B 1: a one-node label layer from a find-box selection, then Control+O > Replace with the same
  file, then Control+Z twice ("Undid changing settings and importing data.", "Undid adding the layer
  v16."): the layer leaves the tree and its "Lucy Grant" label stays drawn; labeling Everything by
  name afterwards draws only that one name ("1 label, 0 hidden") while the tree says `node.label`
  is painted on 24 (walk-detours/24-25.png, 30.png, 34-35.png; walk-isolate-replace/10-13.png and
  `styles.json`). Reproduced twice; the same layer undone with no Replace between is clean.
  **SPOILS GRADING**: a grader reading the tree marks S while the drawing shows one name. **New**.

It reaches round 1. The same steps on volunteers.graphml with a color, the T51 A / T38 A / T41 A
find-box route (`tmp/director-r1-2/undo-replace/` in the studio worktree): find "board" Enter (v01), New layer from
selection, Fill 00AA00, Control+O > Replace > Replace, Control+Z ("Undid changing settings and
importing data."), Control+Z ("Undid changing node color on v01."). The tree's v01 layer now sets
nothing and the key is gone, but v01 stays drawn green (`undo-replace/15.png`, `styles.json`). A
participant who undoes after a reload sees a color the saved look does not hold; a grader reading
the tree and one reading the drawing disagree. The fix's routes cross the first pass's
replace fix (65f41f6b15) but that fix only rewrites edge `ids` layers, which neither walk had, so
this is not its regression.

Mechanism (not yet located): after a replacing load is undone, the element restores the earlier
graph and layers, but a node's drawn look is not recomputed from the layers when a later step
removes or empties the layer that gave it. Two pilots also saw the first find-box pick after a
Replace draw no selection ring while "Selected" counts 1 (T38A w7-find-replace/18.png, T43B
rp-find-replace/15-16.png), which looks like the same stale drawing; those rows stay in the backlog
and the re-walk checks them.

Settled: `decided.md` 2026-10-20, "Undo across a file opened over itself redraws from the layers".

## Backlog

Each heading is one entry in `backlog.md`, with its kind, most-walked first. A row against a settled
behavior names the entry.

### Sample thumbnails are broken images (cosmetic)

- T37A 1 (c): every library thumbnail broken (ERR_BLOCKED_BY_ORB) (6de-r2/pointer/02.png).
- T37B 8 (c): broken thumbnails (g-success/05.png).
- T39A 5 (c): broken thumbnails (i-pointer/03.png, i-keys/21.png).
- T39B 4 (c): graphty.app answers 404 with HTML (v2-pointer/03.png).
- T40A 5 (c): broken thumbnails (rp-pointer/03.png).
- T43A 12 (c): generator-*.webp blocked (r3-pointer/session.log).
- T43B 7 (c): broken thumbnails (rp-pointer/01.png).
- T44A 3 (c): broken thumbnails (r2-pointer/03.png).
- T44B 10 (c): broken thumbnails (walk-pointer/02.png).
- T45B 1 (c): broken thumbnails (w-pointer/03.png).
- T46A 2 (c): broken thumbnails (r2-pointer/05.png).
- T47A 5 (c): broken thumbnails (p3-pointer/02.png).
- T47B 2 (c): broken thumbnails (rp3-pointer/03.png).
- T48A 3 (c): after Cancel on the read-the-file page (6de5c-detour-start/05.png).
- T48B 2 (c): 44 failed thumbnail requests after Cancel (x-detours/03.png).
- T49A 3 (c): 404 from graphty.app (p3-pointer/03.png, p3-keyboard/22.png).
- T49B 6 (c): 404 text/html (n-pointer/03.png, n-detour-menus/15.png).
- T51B 4 (c): broken thumbnails (rp-pointer/02.png).

### F6 misses the top bar and stops on resize handles (accessibility)

- T37A 5 (c): with the table open F6 never reaches the top bar (6de-r2/keyboard, after 70.png).
- T37B 12 (c): focus on the inspector heading after a file opens; three F6 and three Tabs to the layer tree (g-t50a-keys).
- T38A 4 (c): four regions, no top bar (w7-keyboard, after 17.png).
- T41B 5 (c): stops on 'Resize left panel' (w3-keys, after 78.png).
- T42A 3 (c): four regions (6de2-keyboard/21-26.png).
- T42B 1 (c): four regions (rp-keys/27-38.png).
- T43A 1 (c): order and missing top bar (r3-keyboard/20-33.png).
- T44A 1 (c): F6 lands on 'Resize inspector'; Text + only by Shift+Tab (r2-keyboard/63-77.png).
- T46A 4 (c): four regions (r2-keyboard, the F6 cycles).
- T46B 2 (c): four regions (b-keyboard/42-46.png, 77-82.png).
- T47A 2 (c): resize handles as regions (p3-keyboard/73-78.png, 84-85.png).
- T48A 2 (c): lands once on 'Resize left panel' (6de5c-keys/69-72.png, 103-108.png).
- T49B 4 (c): no top bar; Undo 26 Shift+Tabs away or Control+Z (n-keys/100-113.png).
- T50A 2 (c): lands on 'Resize left panel' (w4-keyboard/88-94.png).
- T50B 2 (c): no top bar (g3-keyboard/20.png, 23-28.png).
- T51B 1 (c): F6 lands on 'Resize inspector'; about 18 extra Tabs to the Color line (rp-keyboard/38-39.png).

### The drawing moves without the reader asking (friction)

- T38A 6 (c): about 150 px right as the hand-picked layer's first color lands (w7-find-replace/08-09.png).
- T38B 2 (c): about 143 px right when the hand-picked layer's first color lands (r3-find-replace/09-10.png).
- T39A 1 (c): 130-140 px right whenever a selection is held; Undo moves it back (i-detours/12-14.png, 36-38.png, 43-44.png).
- T39B 1 (c): 130-150 px right as a key arrives with a selection held; back on Undo (v2-detours/16-18.png, 27-29.png).
- T40A 1 (c): about 155 px right with six nodes selected (rp-detour-find/08-10.png, rp-detour-useselected/16-18.png).
- T41A 2 (c): Fill with a selection on screen slides the drawing right (r1d1-detour-start/13-15.png, r1d1-find-rule-replace/07-08.png).
- T41B 2 (c): about 135 px right with four selected (w3-findlayer-replace/07-09.png).
- T42A 2 (c): about 140 px right; still off center after Replace (6de2-detour-start/22-23.png, 28.png).
- T42B 3 (c): about 135 px right (rp-detour-find/06.png, 08.png).
- T43A 3 (c): about 130 px on binding size on the one-node v09 layer (r3-detours/14-15.png).
- T43B 3 (c): about 135 px right on binding size to donations (rp-find-replace/11.png).
- T47A 4 (c): Undo and Redo of the run move it about 130 px (p3-detours/47-49.png).
- T51A 2 (c): about 140 px right as the hand-picked layer's key arrives (q3-findbox-replace/05.png, 07.png).

### Enter on the start page's Samples leaves focus behind (accessibility)

- T39A 6 (c): 16 more Tabs to the card (i-keys/21.png, 37.png).
- T39B 3 (c): the next Tab scrolls back up (v2-keys/20.png, 22.png).
- T40A 2 (c): three extra Tabs before the library's search (rp-keyboard/18-19.png).
- T44A 2 (c): page scrolls back up (r2-keyboard/24-25.png).
- T46A 3 (c): three Tabs scroll the page back up (r2-keyboard/22.png, 25.png).
- T46B 1 (c): 17 Tabs to the card (b-keyboard/22.png, 25.png).
- T47A 6 (c): focus stays on Samples (p3-keyboard/18-19.png).
- T49A 5 (c): 17 more Tabs to the first card (p3-keyboard/22.png).

### A focused heading draws no ring (accessibility)

- T38A 3 (c): no ring on 'Graph, volunteers: 24 nodes, 63 edges' (w7-keyboard/17.png).
- T40B 2 (c): no ring on 'Graph, yeast-galactose' (6de3-keyboard/17.png).
- T41B 7 (c): no ring on 'Graph, sources' (w3-keys/19.png).
- T46A 6 (c): heading 'Group 3' (r2-keyboard/122.png).
- T49A 1 (c): no ring after Enter on the card (p3-keyboard/43.png).
- T49B 5 (c): no ring on the karate club heading (n-keys/41.png).
- T51A 1 (c): no ring after Load (q4-keys/20.png).

### "Which nodes" with no condition opens without its attribute list (friction)

- T38B 1 (c): one extra click or key on every walk (r3-pointer/07.png, r3-keys).
- T40B 1 (c): one extra click or Enter; the key's count includes it (6de3-pointer/07.png, 6de3-keyboard).
- T41B 4 (c): extra click or Enter (w3-pointer/06.png, w3-keys).
- T42A 1 (c): one extra click or Enter (6de2-success-pointer/07.png, 6de2-keyboard/41.png).
- T42B 2 (c): the key's steps include it (rp-pointer/06.png).
- T45B 2 (c): 'Which edges' first click only expands (w-pointer/08.png, w-detour-nodetab/05.png).
- T48A 1 (c): one extra click on every cover route (6de5c-detour-start/45.png, 6de5c-detour-cards/22.png).

### A node is named by its id, not its label (wording)

- T38B 6 (c): find rows titled s01, s04 with no name (which column becomes the label stays a session question, decided.md 2026-10-19) (r3-find-replace/04.png, 07.png).
- T39B 2 (c): '93' in the title, layer and notice; AirForce on the drawing (v2-detours/14.png, 17.png, 25.png).
- T43A 8 (c): one-node layer named 'v09'; that it is a false finish is the task's to measure (r3-detours/12.png, 15.png).
- T44A 7 (c): edge rows name ends by id (r2-detours/07.png).
- T44B 2 (c): 'v16' in find, heading and announcements once names are labels (walk-keys/83.png).
- T46B 3 (c): '74' for Nebraska; also the thumbnails and the private-window notice, already in their entries (b-pointer/10.png, b-detours/18.png, b-pointer/02-03.png).
- T50A 6 (c): members by id (MlleBaptistine) (w1-pointer/04.png, w4-keyboard/72.png).

### The private-window notice on every open (accessibility, friction)

- T37A 2 (c): the notice is announced as the sample opens (6de-r2/keyboard, after Enter on the card).
- T37B 9 (c): the notice on every opening (g-success/06.png).
- T39B 6 (c): shown and announced before anything is done (v2-pointer/04.png).
- T40B 5 (c): spoken on Load with nothing on screen (6de3-keyboard, after 17.png).
- T41B 11 (c): covers the bottom of the drawing until the first click (w3-pointer/03.png).

### After Replace the drawing is framed right of center (friction)

- T38B 4 (c): center about x=915 in a canvas centered near x=750 (r3-find-replace/13.png).
- T40B 4 (c): stays right of center after Replace; data and layer correct (6de3-detour-find/15.png).
- T41A 3 (c): right edge against the inspector (r1d1-detour-start/23.png, r1d1-find-rule-replace/11.png).
- T41B 8 (c): right-click > Fit frames low and right; Replace frames right of center (w3-pointer/19.png, w3-findlayer-replace/14.png).
- T51B 2 (c): left third of the canvas empty (rp-find-replace/13.png).

### Escape on a member opened from a layer's list closes the layer (friction)

- T37B 1 (c): Escape on MlleBaptistine opened from Members closes the layer, focus on the Graph heading; against decided.md 'Escape in the inspector' (2026-10-19) (g-t50a-keys/59.png).
- T43B 4 (c): Poster member, Escape, focus on the Graph heading (rp-t50a-keys/52.png).
- T50A 1 (c): the whole graph's inspector with focus on its heading (w4-keyboard/74.png, 76.png).
- T50B 1 (c): the layer closes and its row is unselected; the answer key describes today's behavior (g3-keyboard/77-78.png).

### Reopening an exported GraphML adds the file's own style groups (friction, cosmetic)

- T37B 2 (c): Replace with a GraphML the app exported adds three 'A group from the file on ...' layers, one with internal names. No round 1 route opens a file the app wrote: the study files hold no graphty styles (g-findlayer/28-29.png, g-handpicked/21.png).
- T37B 3 (c): the import notice repeats one sentence and runs off both edges of the canvas (g-findlayer/28.png, g-handpicked/21.png).
- T37B 4 (c): the GraphML export writes style internals as data columns, offered as Attributes on import (g-findlayer/26.png).
- T37B 5 (c): Load counts 68 nodes: the file's text ids 1-34 do not match the sample's number ids (g-findlayer/26.png).

### A pick glides to a point right of the canvas center, or zooms (friction)

- T38A 2 (c): a find pick glides close in, node about 130 px right of center, two clusters cut off (w7-find-replace/17.png, w7-find-replace-2/08.png).
- T41B 3 (c): a pick lands about (880,433), zooms on the first (w3-pointer/16.png, 17.png, 21.png).
- T43A 6 (c): after selecting all 24, dots at the right edge under the inspector (r3-detours/17-25.png).
- T48B 3 (c): with the table open each pick pushes groups off the canvas; key and chip still say 12 (x-table/10.png, 19.png).

### Escape in a popover's or the picker's box reverts silently (accessibility)

- T39A 2 (c): Escape in 'Color value' reverts 123456 to 006400 with no 'Edit discarded' (i-keys/82.png).
- T49A 2 (c): 00FF00 reverts to FF0000 silently (p3-detours-a/12.png).
- T49B 1 (c): FFFF00 reverts silently (n-detour-color/07-08.png).

### Selected and styled things are hard to read (friction)

- T41A 7 (c): 17 rings stay around a layer that paints four others (r1d1-detour-start/20.png).
- T43A 9 (c): selection rings grow with each dot (r3-detours/25.png).
- T45B 4 (c): width 24 looks far thicker while selected (w-detour-find/12-13.png, w-pointer/16.png).

### Two controls share a name (accessibility)

- T37B 7 (c): 'Samples' names the top-bar link and the start card's button (g-success/03.png).
- T47A 7 (c): two 'Samples' (p3-keyboard/03.png, 17.png).

### Opening the table re-frames the drawing (friction)

- T37B 11 (c): after closing the table the drawing is cut off at the right edge (g-handpicked/17.png).
- T41B 6 (c): table shrinks the drawing; a table pick cuts its top (w3-keys/89.png, 153.png).

### A find-box pick after Replace draws no selection ring (friction)

- T38A 1 (c): after Replace with a hand-picked layer the first pick is not ringed; the inspector and 'Selected 1' show it. Likely the same stale drawing as unit 2; re-check after it (w7-find-replace/18.png, w7-find-replace-2/08.png).
- T43B 1 (c): a clicked node is selected (Selected 1) with no ring, even 3 s later (rp-find-replace/15-16.png).

### Undo's words for a load or a setting (wording)

- T38A 7 (c): Undo of a second Load says 'Undid changing settings and importing data.' with no setting changed (w7-detour-newdata/14.png).
- T47A 15 (c): 'Undid changing shape' against 'Undid changing node shape on 6 layers.' (p3-keyboard/122.png).

### Replace takes two pages and two clicks (friction)

- T38B 3 (c): the second page ('Was 24 nodes, 59 edges; now 24, 59') works as a confirmation; against decided.md 'with no confirmation' (2026-10-19) (r3-find-replace/11-12.png).
- T43A 4 (c): 'Add to volunteers' then 'Replace: volunteers.graphml'; the first page's title says Add while its button says Replace (r3-detours/28-29.png).

### Removing a line slides the next one under the pointer (friction)

- T39A 3 (c): removing edge Color slides Width under the pointer; a second click removes it (i-detours/22.png).
- T39B 5 (c): Remove edge color, then Width under the pointer (v2-detours/13.png).

### A sample card's name leaves out its visible title (accessibility)

- T40A 4 (c): 'Who holds the novel together' named 'Open the Les Miserables sample' (rp-keyboard, Tab to the first card).
- T49A 4 (c): WCAG 2.5.3 (p3-keyboard/22.png, 43.png).

### A tooltip and the control's name differ (accessibility)

- T40B 3 (c): 'Filter: 8 of 331 nodes' against a longer tooltip (6de3-detour-filter/16.png).
- T44A 5 (c): 'Label settings' against 'Node label settings' (r2-pointer/11.png).

### "Has no value" and number hints in find (wording)

- T41A 4 (c): no query reaches 'has no value'; the hint teaches 'hours >= 27' (r1d1-detour-start/07.png, 09.png, 10.png).
- T45B 5 (c): 'chapters' gives a node rule example, not shared_chapters (w-detour-find/04.png).

### "Style nodes" or "Style edges" drawn dimmed with no reason (friction)

- T41A 6 (c): on a layer made from a selection (r1d1-detour-start/13.png, r1d1-find-rule-replace/07.png).
- T41B 10 (c): on a layer made from a selection (w3-findlayer-replace/07.png).

### The start page's demo comes before "Open a file" in Tab order (accessibility)

- T41A 10 (c): Open a file is 14 Tabs in (r1d1-keys, first 14 Tabs).
- T50A 7 (c): 14th Tab stop (w4-keyboard/02-15.png).

### Escape on the inspector and in dialogs (friction)

- T43A 5 (c): two Escapes from the find box cleared 24 selected with a layer's inspector open (r3-detours/26.png).
- T46A 5 (c): a second Escape on a layer's inspector cleared the node selection (r2-keyboard/111.png).

### "Open network data" is a dead end for a local file (friction)

- T43A 11 (c): remote sources only (r3-file-in/03.png).
- T47A 14 (c): cards say 'on the way' (p3-detours/55.png).

### An icon or truncated control has no tooltip (accessibility)

- T44A 6 (c): 'Fixed t...' with no tooltip (r2-detours/20.png).
- T50A 5 (c): 'Poster Color' row has no tooltip (w1-pointer/07.png).

### The right-click menu stays where the node was (friction)

- T44B 3 (c): the menu stays where the node was (walk-detours/27.png).
- T47A 12 (c): menu over the group (p3-detours/45.png).

### A tooltip covers the next control (cosmetic)

- T45B 8 (c): width and color tooltips cover Arrowheads '+' (w-pointer/18.png, w-keyboard/78.png).
- T47A 8 (c): 'Node shape by attribute' over 'Shape: 6 changed / Undo' (p3-pointer/17.png, p3-detours2/33.png).

### The analysis filter: Tab lands on a disabled button, Escape on Back does nothing (accessibility)

- T37A 3 (c): Tab with 'deg' opens Degree with focus on the disabled 'Update Degree layer'; the first Escape on 'Back to analyses' does nothing (6de-r2/keyboard/64-66.png).

### Two analyses named Degree after a run (wording)

- T37A 4 (c): Recent and Rank nodes and edges both list 'Degree' (6de-r2/detours/33.png).

### A layer made from a selection is named and shown as its count (wording)

- T37B 6 (c): 'Rule: graphty.degree > 16' where the find box said 'Degree > 16' (g-findlayer/10.png).

### Degree colors too close to tell apart (cosmetic)

- T37B 10 (c): nodes 17, 16 and 12 in nearly the same dark brown (g-success/11.png).

### Enter on a condition's checkbox closes the picker without ticking (accessibility)

- T38A 5 (c): Enter on 'volunteer, 16 nodes' closes the picker; Space ticks (w7-keyboard/48.png).

### A click on the layers '+' while the find list is open is lost (friction)

- T40A 3 (c): the click closes the list, the panel collapses, the '+' moves from y 799 to y 122 (rp-detour-useselected/05-06.png).

### Dropping an unfinished card leaves the layer (friction)

- T41A 8 (c): no Undo is decided ('An unfinished card is dropped ... no Undo', 2026-10-19); the inspector moving to the Graph overview is the backlog part (r1d1-detour-picker/13.png).

### Escape on a page or form does the wrong thing (friction)

- T41B 9 (c): Escape on 'Add to sources' does nothing (w3-findlayer-replace/11-12.png).

### Tab in a list with letters typed takes nothing (friction)

- T43A 2 (c): 'ho' typed, 'hours' highlighted, Tab takes nothing; against decided.md (2026-10-18) (r3-keyboard (size popover)).

### The table names a column differently from the file (wording)

- T43A 13 (c): 'Id' in the table, 'id' in the file and the inspector (r3-pointer/11.png).

### An unset line does not take its value on Enter (friction)

- T43B 2 (c): Enter on the unset Size line (1, 'Not set yet') does nothing; against decided.md 'An unset line takes the value it shows' (2026-10-18) (rp-find-replace/09.png).

### Escape in a condition card closes the picker (friction)

- T43B 5 (c): Escape on the trained card's value select closes the picker (rp-t50b-keys/40.png).

### With the table open, a find pick does not scroll the table (friction)

- T43B 6 (c): the 115-row table keeps its place (rp-t46b-table/07-08.png).

### Tab in a box that writes keeps focus in the box (friction)

- T44A 4 (c): the first Tab in 'Node label text' commits and keeps focus; against decided.md 'Tab out of a box that writes moves to the next control' (2026-10-19) (r2-detours/25.png).

### The read-the-file page's column-role boxes look like menus and do nothing (friction)

- T44B 4 (c): 'Role of name' opens nothing (walk-detours/07-08.png).

### New project names the work "Untitled" (wording)

- T44B 5 (c): 'Untitled' and 'Add to Untitled' (walk-detours/09.png, 20.png).

### "Edit discarded" squeezes its row (cosmetic)

- T44B 8 (c): one word wide beside the Size box (walk-pointer/15.png).

### After Undo an unset line stays drawn (cosmetic)

- T45B 9 (c): an unset Color line at 6366F1 after Control+Z (w-detour-nodetab/15.png).

### Analysis popover cosmetics (cosmetic)

- T45B 10 (c): 'Edge width by attribute' about 340 px tall for one row (w-detour-everything/07.png).

### A list closed with unmatched letters reopens stale (friction)

- T47A 1 (c): 'cube', Escape, Enter: stale footer, Cylinder spoken but not drawn, a second Enter gives 'Shape could not be changed', shape unchanged (p3-keyboard/111.png, 117-118.png).

### The shape list's highlight (friction)

- T47A 3 (c): the row under the pointer is highlighted, not what Enter takes (p3-pointer/11.png, p3-table/13.png, p3-detours/20.png, 24.png).

### The folder and run look (accessibility)

- T47A 9 (c): the folder Color's name calls two groups orange and two blue (p3-keyboard/92.png).

### The start page demo (friction)

- T47A 10 (c): the demo turns under a click; 'Communities' has no tooltip (p3-detours/05-07.png).

### Open layer from Why this look focuses another line (friction)

- T47A 11 (c): 'Open layer Everything' focuses Size, not Shape (p3-detours/26.png).

### The restore card names the work differently (wording)

- T47A 13 (c): 'Les Miserables', 'An untitled project (77 nodes)', 'Recovered work' (p3-detours/52.png, 57.png).

### The library search: Enter, a spoken count, the chips (friction)

- T47A 16 (c): Enter with one card left does nothing (p3-detours2/03.png).

### The key covers nodes, scrolls, or shows a range its nodes do not hold (friction)

- T48A 4 (c): covers a node at the top left (6de5c-pointer/06.png, 6de5c-detour-cards/25.png).

### Escape on a just-added line or card says nothing, or takes back typed text (friction)

- T49B 2 (c): the unset Color line goes with nothing said (n-detour-remove/08-09.png).

### Tab never leaves the color picker (accessibility)

- T49B 3 (c): against decided.md 'Tab closes a pop-out' (2026-10-17); Escape and Close panel leave it (n-keys/116-131.png).

### Leaving and discarding (wording)

- T50A 3 (c): 'has changes that are not saved' while the top bar reads 'Autosave: saved' (w2-detours/10.png).

## Leave for the sessions

- T39A 4 (b): darkgreen in Background color paints the canvas (i-detours/07-08.png). Where a newcomer looks for node color: the Graph Style tab as a false finish (r1-1 T39A 11); its Undo's vague words are the backlog's 'Undo's words'.
- T41A 5 (b): 'Nothing found' never points at the match menu (r1d1-detour-picker/05.png, 08.png). Where 'Has no value' lives and what 'missing' finds (r1-1 T41A 9; tasks.md keeps 'missing' to measure it).
- T41A 9 (b): Has no value in Filters hides the other 17 (r1d1-detour-picker/25-26.png). A filter step's Keep hides the others (r1-1 T41A 12).
- T43A 7 (b): nothing for node size, no pointer to Everything (r3-detours/05.png). Where a newcomer looks for node size: the Graph Style tab (r1-1 T39A 11, T47A 19).
- T43A 10 (b): 'Highest 52' with no name and no size action; Show in table unsorted (r3-detours/34-36.png). Where styling by value lives: the Data place (r1-1 T43B 16 and others).
- T44B 6 (b): only overlap switches (walk-detours/10-12.png). Where a newcomer looks for names on the drawing: the Graph inspector's Labels section (like r1-1 T39A 11).
- T45B 3 (b): number card stores min 5 max 31 (w-pointer/13.png, w-detour-nodetab/10.png). No 'at least' match; '5 to 31' where the find box writes '>= 5' (r1-1 T42A 5, T45B 8).
- T45B 6 (b): no tooltip on a tie (w-detour-nodetab/16.png). What a hover shows (r1-1 T37A 5 and others).
- T45B 7 (b): edge attribute offers only Filter to and Show in table (w-detour-nodetab/22.png). Where styling by value lives: the Data place (r1-1 T43B 16 and others).
- T46A 7 (b): known, unchanged (r2-detours/06-54.png). Known detour questions (r1-1): analysis filter words, the inert key, a node's own Fill, the Data place and Quick actions.
- T47A 17 (b): Group 1 row does nothing (p3-detours2/22.png). The color key is inert (r1-1 T46A 10).
- T47A 18 (b): Attributes unchanged after Louvain (p3-detours2/22.png). The Data place does not list a run's groups (r1-1 T43B 16 and others).
- T47A 19 (b): says nothing about node looks (p3-detours2/20.png). Where node looks are set: the Graph Style tab (r1-1 T47A 19).
- T48A 7 (b): false finish in the key (6de5c-detour-start/30.png). A filter step's Keep hides the others (r1-1 T41A 12).
- T50A 4 (b): a click on 'Color: Poster' does nothing (w1-pointer/16.png). The color key is inert (r1-1 T46A 10).
- T50B 3 (b): a click on the key does nothing (g2-detours/07-08.png). The color key is inert (r1-1 T46A 10).
- T51B 3 (b): no color named for 'company' (rp-find-replace/19.png). A hand-made layer's key line names a count, never the value (r1-1 T51A 5; T51 measures it).

## No change

- T37A 6 (n): PASS INCOMPLETE. The routes it lists were walked by their own pilots on this build (T50 A and B, T46 A and B tables, T47 and T48 tables, T45A, the find-box layer then Replace on T38A, T41 A and B, T51 A and B); the T50 files were written before the golden merge; a missing report.md is the harness's refusal, its content is in the returned text.
- T37B 13 (n): PASS INCOMPLETE. The routes it lists were walked by their own pilots on this build (T50 A and B, T46 A and B tables, T47 and T48 tables, T45A, the find-box layer then Replace on T38A, T41 A and B, T51 A and B); the T50 files were written before the golden merge; a missing report.md is the harness's refusal, its content is in the returned text; T37 is not run in round 1.
- T38A 8 (n): PASS INCOMPLETE. The routes it lists were walked by their own pilots on this build (T50 A and B, T46 A and B tables, T47 and T48 tables, T45A, the find-box layer then Replace on T38A, T41 A and B, T51 A and B); the T50 files were written before the golden merge; a missing report.md is the harness's refusal, its content is in the returned text.
- T38B 5 (n): grading records list the demo's items as gone (work-start.json, styles-start.json). answers.md: the start record holds the start page's demo; grade from the layers, never from `changes`.
- T38B 7 (n): PASS INCOMPLETE. The routes it lists were walked by their own pilots on this build (T50 A and B, T46 A and B tables, T47 and T48 tables, T45A, the find-box layer then Replace on T38A, T41 A and B, T51 A and B); the T50 files were written before the golden merge; a missing report.md is the harness's refusal, its content is in the returned text.
- T39A 7 (n): PASS INCOMPLETE. Every T39A route was walked; the listed routes belong to other tasks and were walked by their pilots.
- T39B 7 (n): PASS INCOMPLETE. The routes it lists were walked by their own pilots on this build (T50 A and B, T46 A and B tables, T47 and T48 tables, T45A, the find-box layer then Replace on T38A, T41 A and B, T51 A and B); the T50 files were written before the golden merge; a missing report.md is the harness's refusal, its content is in the returned text.
- T40A 6 (n): PASS INCOMPLETE. The routes it lists were walked by their own pilots on this build (T50 A and B, T46 A and B tables, T47 and T48 tables, T45A, the find-box layer then Replace on T38A, T41 A and B, T51 A and B); the T50 files were written before the golden merge; a missing report.md is the harness's refusal, its content is in the returned text.
- T40B 6 (n): PASS INCOMPLETE. The routes it lists were walked by their own pilots on this build (T50 A and B, T46 A and B tables, T47 and T48 tables, T45A, the find-box layer then Replace on T38A, T41 A and B, T51 A and B); the T50 files were written before the golden merge; a missing report.md is the harness's refusal, its content is in the returned text.
- T41A 1 (n): no crash, block or spoil. No defect: the pilot's summary that nothing crashed, blocked or changed the data, and Replace kept the hand-made layer on the same four.
- T41A 11 (n): PASS INCOMPLETE. The routes it lists were walked by their own pilots on this build (T50 A and B, T46 A and B tables, T47 and T48 tables, T45A, the find-box layer then Replace on T38A, T41 A and B, T51 A and B); the T50 files were written before the golden merge; a missing report.md is the harness's refusal, its content is in the returned text.
- T41B 12 (n): PASS INCOMPLETE. Older walks on untouched routes count (criteria, preflight 4): the r1 detour set ran on 7d87760756, whose only differences are the three fixes; other tasks' routes were walked by their pilots.
- T42A 4 (n): PASS INCOMPLETE. The routes it lists were walked by their own pilots on this build (T50 A and B, T46 A and B tables, T47 and T48 tables, T45A, the find-box layer then Replace on T38A, T41 A and B, T51 A and B); the T50 files were written before the golden merge; a missing report.md is the harness's refusal, its content is in the returned text; T42 is not run in round 1.
- T42B 4 (n): PASS INCOMPLETE. The routes it lists were walked by their own pilots on this build (T50 A and B, T46 A and B tables, T47 and T48 tables, T45A, the find-box layer then Replace on T38A, T41 A and B, T51 A and B); the T50 files were written before the golden merge; a missing report.md is the harness's refusal, its content is in the returned text; T42 is not run in round 1.
- T43A 14 (n): PASS INCOMPLETE. The routes it lists were walked by their own pilots on this build (T50 A and B, T46 A and B tables, T47 and T48 tables, T45A, the find-box layer then Replace on T38A, T41 A and B, T51 A and B); the T50 files were written before the golden merge; a missing report.md is the harness's refusal, its content is in the returned text.
- T43B 8 (n): PASS INCOMPLETE. T43B's own keyboard walk and detours ran on this build earlier today (6de5f95d12/keyboard, detours, detour-drop, detour-picked-replace); the Recent-projects scroll is not on a task route.
- T44A 8 (n): PASS INCOMPLETE. The routes it lists were walked by their own pilots on this build (T50 A and B, T46 A and B tables, T47 and T48 tables, T45A, the find-box layer then Replace on T38A, T41 A and B, T51 A and B); the T50 files were written before the golden merge; a missing report.md is the harness's refusal, its content is in the returned text; T44 is not run in round 1.
- T44B 7 (n): Tab in the label picker's search closes it (walk-pointer/21.png). decided.md 'Tab in a list ... with nothing typed, Tab closes the list and takes nothing' (2026-10-18) and 'Tab closes a pop-out' (2026-10-17).
- T44B 9 (n): Verdana listed, serif drawn (walk-pointer/12.png, 17.png). Open owner item in owner-decisions.md (the default label font fallback).
- T44B 11 (n): PASS INCOMPLETE. The routes it lists were walked by their own pilots on this build (T50 A and B, T46 A and B tables, T47 and T48 tables, T45A, the find-box layer then Replace on T38A, T41 A and B, T51 A and B); the T50 files were written before the golden merge; a missing report.md is the harness's refusal, its content is in the returned text; T44 is not run in round 1.
- T45A 1 (n): PASS INCOMPLETE. T45A's pointer success path and its Control+O > Replace routes ran clean on this build (fin-pointer, fin-ctrlo-replace, re-ctrlo, re-keyboard); other tasks' routes were walked by their pilots.
- T45B 11 (n): keyboard walk clean. No defect: every control had a name and no key failed to act.
- T45B 12 (n): PASS INCOMPLETE. The routes it lists were walked by their own pilots on this build (T50 A and B, T46 A and B tables, T47 and T48 tables, T45A, the find-box layer then Replace on T38A, T41 A and B, T51 A and B); the T50 files were written before the golden merge; a missing report.md is the harness's refusal, its content is in the returned text.
- T46A 1 (n): nothing crashed or gave a wrong group. No defect: the table names Javert's group as the key does (r2-table).
- T46A 8 (n): PASS INCOMPLETE. The routes it lists were walked by their own pilots on this build (T50 A and B, T46 A and B tables, T47 and T48 tables, T45A, the find-box layer then Replace on T38A, T41 A and B, T51 A and B); the T50 files were written before the golden merge; a missing report.md is the harness's refusal, its content is in the returned text.
- T46B 4 (n): PASS INCOMPLETE. The routes it lists were walked by their own pilots on this build (T50 A and B, T46 A and B tables, T47 and T48 tables, T45A, the find-box layer then Replace on T38A, T41 A and B, T51 A and B); the T50 files were written before the golden merge; a missing report.md is the harness's refusal, its content is in the returned text.
- T47A 20 (n): the tool records the landing demo (p3-pointer/work.json). answers.md: the start record holds the start page's demo; grade from the layers.
- T47A 21 (n): 'a file chooser is open' (p3-detours/53.png, 57.png). A study tool note, not the app: the chooser left open by an earlier step; the restore worked.
- T47A 22 (n): PASS INCOMPLETE. The routes it lists were walked by their own pilots on this build (T50 A and B, T46 A and B tables, T47 and T48 tables, T45A, the find-box layer then Replace on T38A, T41 A and B, T51 A and B); the T50 files were written before the golden merge; a missing report.md is the harness's refusal, its content is in the returned text.
- T47B 1 (n): no crash, block or wrong result. No defect.
- T47B 3 (n): PASS INCOMPLETE. The keyboard success path ran on 7d87760756 (rounds/r1/pilot/T47B/p4-keyboard) and crosses none of the three fixes; the touched table route was re-walked (rp3-table); older walks on untouched routes count.
- T48A 5 (n): 15 shown nowhere (6de5c-detour-start/52.png). answers.md grades the layer, not a count on screen (already in the key).
- T48A 6 (n): card 15, layer 5 (6de5c-detour-start/40.png). decided.md 'A condition card's count' (2026-10-19): the card counts its own condition, the layer's count says what the layer paints; the key accepts it.
- T48A 8 (n): nothing crashed or blocked (6de5c-detour-start/24.png, 6de5c-table/10-11.png). No defect: Replace kept the find-box layer on the same 15; the table's groups match the key.
- T48A 9 (n): PASS INCOMPLETE. The routes it lists were walked by their own pilots on this build (T50 A and B, T46 A and B tables, T47 and T48 tables, T45A, the find-box layer then Replace on T38A, T41 A and B, T51 A and B); the T50 files were written before the golden merge; a missing report.md is the harness's refusal, its content is in the returned text.
- T48B 1 (n): none crashes, blocks or spoils. No defect.
- T48B 4 (n): PASS INCOMPLETE. The routes it lists were walked by their own pilots on this build (T50 A and B, T46 A and B tables, T47 and T48 tables, T45A, the find-box layer then Replace on T38A, T41 A and B, T51 A and B); the T50 files were written before the golden merge; a missing report.md is the harness's refusal, its content is in the returned text.
- T49A 6 (n): PASS INCOMPLETE. No listed route belongs to T49A; its follow-up routes were walked directly.
- T49B 7 (n): PASS INCOMPLETE. No listed route belongs to T49B.
- T50A 8 (n): PASS INCOMPLETE. The routes it lists were walked by their own pilots on this build (T50 A and B, T46 A and B tables, T47 and T48 tables, T45A, the find-box layer then Replace on T38A, T41 A and B, T51 A and B); the T50 files were written before the golden merge; a missing report.md is the harness's refusal, its content is in the returned text.
- T50B 4 (n): PASS INCOMPLETE. The routes it lists were walked by their own pilots on this build (T50 A and B, T46 A and B tables, T47 and T48 tables, T45A, the find-box layer then Replace on T38A, T41 A and B, T51 A and B); the T50 files were written before the golden merge; a missing report.md is the harness's refusal, its content is in the returned text; a project file opens without the read-the-file page.
- T51A 3 (n): PASS INCOMPLETE. The routes it lists were walked by their own pilots on this build (T50 A and B, T46 A and B tables, T47 and T48 tables, T45A, the find-box layer then Replace on T38A, T41 A and B, T51 A and B); the T50 files were written before the golden merge; a missing report.md is the harness's refusal, its content is in the returned text.
- T51B 5 (n): PASS INCOMPLETE. T51B's r1 detour set ran on 7d87760756 and crosses none of the three fixes; older walks on untouched routes count.

## What the re-walk covers

After the two units, walk on the new build:

- Unit 1: T41 B's find-box route to the end (find `email`, New layer from selection, switch the
  card to Has no value with no look yet, add `on_record` Yes, Done, Fill red: the four), and T41 A's
  with `phone`; one more task's find-box layer whose condition is edited before its look (T38 A or
  T51 A); one "+" layer success path (T41 A) to show the both-kinds row is unchanged.
- Unit 2: T44 B's detour c and the color walk above (`tmp/director-r1-2/undo-replace/`), then the routes
  that cross a replacing load and Undo: T45 A's Control+O > Replace then Control+Z on neighbors.csv
  (hand-picked edges, the first pass's fix), T51 A or T41 A's find-box layer then Replace then
  Control+Z, and one plain Undo of a style step with no Replace (unchanged). Check the selection
  ring on the first pick after Replace (T38 A) and close its backlog entry if it is back.
