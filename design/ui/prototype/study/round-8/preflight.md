# Round 8 preflight (attempt 6)

Run 2026-10-02 from design/ui/prototype, before any session. Every check was redone from scratch
on the files and the skeleton as they are now; nothing is carried over from an earlier preflight.

**Result: all ten checks pass.** Notes that do not fail a check are listed under each one.

## 1. A fresh round folder

Commands: `ls study/round-8/` and `find study/round-8 -mindepth 1 -type d`.

Result: PASS. No sessions/, tree-test/, first-click/ or focus-groups/ directory, and no
subdirectory at all. Present: preflight.md (this file), tree.md, tree-test.md. Note: gate.md is
not there yet; its absence does not make the round stale.

```
preflight.md
tree.md
tree-test.md
exit 0
```

```
exit 0 (no lines above = no subdirectories)
```

## 2. Every route renders in the participant view

Command: `timeout 600 node app-b/study.mjs --check <the 79 routes the plan names>` (one batch;
the line fit).

Result: PASS, exit 0, 0 of 79 routes failed. The dataset each route draws is in brackets.

```
ok   app-b/#/start-screen/first-run (lesmis)
ok   app-b/#/graph-place/at-rest (lesmis)
ok   app-b/#/analyze-popover/open (lesmis)
ok   app-b/#/analyze-popover/essentials (lesmis)
ok   app-b/#/inspector-measure-row/data (lesmis)
ok   app-b/#/inspector-measure-row/style (lesmis)
ok   app-b/#/inspector-selection-and-everything/everything (lesmis)
ok   app-b/#/project-menu/open (lesmis)
ok   app-b/#/export-dialog/image (lesmis)
ok   app-b/#/data-page/graph-file (lesmis)
ok   app-b/#/canvas-and-states/loading (lesmis)
ok   app-b/#/start-screen/wide-first-use (wide)
ok   app-b/#/start-screen/wide-choose (wide)
ok   app-b/#/data-page/wide-hosts (wide)
ok   app-b/#/graph-place/wide (wide)
ok   app-b/#/data-page/refused-ids (lesmis)
ok   app-b/#/inspector-nothing-selected/overview (lesmis)
ok   app-b/#/inspector-nothing-selected/computed (lesmis)
ok   app-b/#/data-place/graph-file (lesmis)
ok   app-b/#/inspector-run-row/data (lesmis)
ok   app-b/#/style-pickers/bind-prop (lesmis)
ok   app-b/#/style-pickers/bind (lesmis)
ok   app-b/#/toolbar/layout-open (lesmis)
ok   app-b/#/inspector-nothing-selected/layout-method (lesmis)
ok   app-b/#/commands-and-search/find-exact (lesmis)
ok   app-b/#/inspector-node/data (lesmis)
ok   app-b/#/selection-bar/neighborhood (lesmis)
ok   app-b/#/export-dialog/data (lesmis)
ok   app-b/#/project-menu/save-as (lesmis)
ok   app-b/#/start-screen/returning (lesmis)
ok   app-b/#/start-screen/disclosure (lesmis)
ok   app-b/#/start-screen/declined (lesmis)
ok   app-b/#/graph-place/empty (lesmis)
ok   app-b/#/data-place/no-sources (lesmis)
ok   app-b/#/graph-place/transfers-loaded (transactions)
ok   app-b/#/data-place/empty-filters (transactions)
ok   app-b/#/inspector-attribute-and-filter-step/step (transactions)
ok   app-b/#/path-popover/from-analyze (lesmis)
ok   app-b/#/path-popover/found (lesmis)
ok   app-b/#/inspector-group-set-path-row/path-lesmis-found (lesmis)
ok   app-b/#/graph-place/many-groups (transactions)
ok   app-b/#/path-popover/transfers-directed (transactions)
ok   app-b/#/path-popover/found-tied (transactions)
ok   app-b/#/inspector-node/why-this-look (lesmis)
ok   app-b/#/notes-place/writing (lesmis)
ok   app-b/#/notes-place/about-selection (lesmis)
ok   app-b/#/inspector-edge/data (lesmis)
ok   app-b/#/notes-place/edge-note (lesmis)
ok   app-b/#/graph-place/louvain-open (lesmis)
ok   app-b/#/inspector-group-set-path-row/community-3 (lesmis)
ok   app-b/#/inspector-group-set-path-row/path-lesmis (lesmis)
ok   app-b/#/notes-place/all (lesmis)
ok   app-b/#/graph-place/path-found (transactions)
ok   app-b/#/inspector-group-set-path-row/path (transactions)
ok   app-b/#/inspector-group-set-path-row/path-notes (transactions)
ok   app-b/#/data-page/people (doorEntries)
ok   app-b/#/data-page/entries (doorEntries)
ok   app-b/#/data-page/entries-pair (doorEntries)
ok   app-b/#/data-page/unmatched-rows (doorEntries)
ok   app-b/#/canvas-and-states/door-entries-loading (doorEntries)
ok   app-b/#/graph-place/door-entries (doorEntries)
ok   app-b/#/data-page/transfers (transactions)
ok   app-b/#/canvas-and-states/transfers-loading (transactions)
ok   app-b/#/inspector-nothing-selected/transfers (transactions)
ok   app-b/#/data-page/buildings (doorEntries)
ok   app-b/#/inspector-nothing-selected/door-entries (doorEntries)
ok   app-b/#/data-page/weight-moved (transactions)
ok   app-b/#/context-menus/source (transactions)
ok   app-b/#/data-page/replace (transactions)
ok   app-b/#/data-page/replace-chosen (transactions)
ok   app-b/#/data-place/after-replace (transactions)
ok   app-b/#/data-page/add-rows (transactions)
ok   app-b/#/commands-and-search/find-rule (transactions)
ok   app-b/#/select-where/where (transactions)
ok   app-b/#/context-menus/run-row (lesmis)
ok   app-b/#/views-place/at-rest (lesmis)
ok   app-b/#/views-place/saving (lesmis)
ok   app-b/#/present-mode/presenting (lesmis)
ok   app-b/#/data-place/at-rest (transactions)
0 of 79 routes failed
exit 0
```

## 3. Every task and first-click prompt has fresh renders of exactly its routes

Commands: `node tmp/preflight-r8-a6/cmp.mjs` (compares each shots/tasks/<id>/routes.json with
the plan's routes for that id, without the app-b/#/ prefix, in order, and checks the folder holds
exactly 01.png to NN.png, one per route), then `timeout 120 node app-b/study.mjs --fresh <the 46 ids>`.

Result: PASS. All 46 ids match the plan route for route; --fresh exits 0 with 0 problems on 145
renders (every render newer than every file under app-b/).

```
ok   r8-t01: 9 routes, routes.json matches, PNGs 01.png 02.png 03.png 04.png 05.png 06.png 07.png 08.png 09.png
ok   r8-t02: 2 routes, routes.json matches, PNGs 01.png 02.png
ok   r8-t03: 3 routes, routes.json matches, PNGs 01.png 02.png 03.png
ok   r8-t04: 4 routes, routes.json matches, PNGs 01.png 02.png 03.png 04.png
ok   r8-t05: 2 routes, routes.json matches, PNGs 01.png 02.png
ok   r8-t06: 5 routes, routes.json matches, PNGs 01.png 02.png 03.png 04.png 05.png
ok   r8-t07: 5 routes, routes.json matches, PNGs 01.png 02.png 03.png 04.png 05.png
ok   r8-t08: 4 routes, routes.json matches, PNGs 01.png 02.png 03.png 04.png
ok   r8-t09: 4 routes, routes.json matches, PNGs 01.png 02.png 03.png 04.png
ok   r8-t10: 4 routes, routes.json matches, PNGs 01.png 02.png 03.png 04.png
ok   r8-t11: 4 routes, routes.json matches, PNGs 01.png 02.png 03.png 04.png
ok   r8-t12: 5 routes, routes.json matches, PNGs 01.png 02.png 03.png 04.png 05.png
ok   r8-t13: 5 routes, routes.json matches, PNGs 01.png 02.png 03.png 04.png 05.png
ok   r8-t14: 6 routes, routes.json matches, PNGs 01.png 02.png 03.png 04.png 05.png 06.png
ok   r8-t15: 3 routes, routes.json matches, PNGs 01.png 02.png 03.png
ok   r8-t16: 2 routes, routes.json matches, PNGs 01.png 02.png
ok   r8-t20: 2 routes, routes.json matches, PNGs 01.png 02.png
ok   r8-t20-transactions: 3 routes, routes.json matches, PNGs 01.png 02.png 03.png
ok   r8-t21: 4 routes, routes.json matches, PNGs 01.png 02.png 03.png 04.png
ok   r8-t21-transactions: 3 routes, routes.json matches, PNGs 01.png 02.png 03.png
ok   r8-t22: 6 routes, routes.json matches, PNGs 01.png 02.png 03.png 04.png 05.png 06.png
ok   r8-t23: 5 routes, routes.json matches, PNGs 01.png 02.png 03.png 04.png 05.png
ok   r8-t23-transactions: 3 routes, routes.json matches, PNGs 01.png 02.png 03.png
ok   r8-t24: 6 routes, routes.json matches, PNGs 01.png 02.png 03.png 04.png 05.png 06.png
ok   r8-t24-transactions: 4 routes, routes.json matches, PNGs 01.png 02.png 03.png 04.png
ok   r8-t25: 5 routes, routes.json matches, PNGs 01.png 02.png 03.png 04.png 05.png
ok   r8-t25-transactions: 4 routes, routes.json matches, PNGs 01.png 02.png 03.png 04.png
ok   r8-t26: 6 routes, routes.json matches, PNGs 01.png 02.png 03.png 04.png 05.png 06.png
ok   r8-t30: 4 routes, routes.json matches, PNGs 01.png 02.png 03.png 04.png
ok   r8-t32: 3 routes, routes.json matches, PNGs 01.png 02.png 03.png
ok   r8-t33: 2 routes, routes.json matches, PNGs 01.png 02.png
ok   r8-t34: 4 routes, routes.json matches, PNGs 01.png 02.png 03.png 04.png
ok   r8-fc01: 1 routes, routes.json matches, PNGs 01.png
ok   r8-fc02: 1 routes, routes.json matches, PNGs 01.png
ok   r8-fc03: 1 routes, routes.json matches, PNGs 01.png
ok   r8-fc04: 1 routes, routes.json matches, PNGs 01.png
ok   r8-fc05: 1 routes, routes.json matches, PNGs 01.png
ok   r8-fc06: 1 routes, routes.json matches, PNGs 01.png
ok   r8-fc07: 1 routes, routes.json matches, PNGs 01.png
ok   r8-fc08: 1 routes, routes.json matches, PNGs 01.png
ok   r8-fc09: 1 routes, routes.json matches, PNGs 01.png
ok   r8-fc10: 1 routes, routes.json matches, PNGs 01.png
ok   r8-fc11: 1 routes, routes.json matches, PNGs 01.png
ok   r8-fc12: 1 routes, routes.json matches, PNGs 01.png
ok   r8-fc13: 1 routes, routes.json matches, PNGs 01.png
ok   r8-fc14: 1 routes, routes.json matches, PNGs 01.png
0 of 46 ids differ
exit 0
```

```
0 problems on 145 renders
exit 0
```

## 4. The study tool's own check is sound

Command: `timeout 300 node app-b/study.mjs --prove`.

Result: PASS, exit 0, no FAIL line. (The line "nothing that takes text has focus ..." is the
expected message of the planted --type failure that the next line proves.)

```
ok   a good route passes
ok   an unknown section fails: no section "no-such-section" (the manifest lists the sections; --list shows every route)
ok   an unknown state fails: section graph-place has no state "no-such-state" (its states: at-rest, empty, door-entries, louvain-open, many-groups, rerun-failed, transfers-loaded, door-entries-path, door-entries-running, path-found, transfers-running, running, queued, finished, partial, failed, solo, everything-hidden, show-hidden, scope-mark, out-of-date, invalid-drop, find, list-menu, rename, rename-chain, rename-run-group, rename-builtin, rename-run-disabled, notes-eye-off, find-no-match, one-group, long-names, wide, wide-sized, nested, nested-set, plain-json, registry, painted)
ok   a stub fails: section prove-stub is a stub (no render)
ok   --type types into a focused box
nothing that takes text has focus (focus is on h2 "Data"); typed nothing, not "abc"
ok   --type with nothing that takes text focused fails
ok   a ctrl-click keeps two rows selected
ok   a shift-click adds a second row
ok   a plain click keeps one row selected
ok   a reviewer word in text or a tooltip fails, one in a design note does not
ok   an unknown step is refused with exit 2
exit 0
```

## 5. The tree outline matches the skeleton and holds only the outline

Command: `bash tmp/preflight-r8-a6/treelabels.sh` (every outline label, with its parenthetical
removed, searched in app-b/; the number is how many skeleton files carry that text), plus a
reading of tree.md against sections/main-menu.js, sections/project-menu.js and lib.js's File list.

Result: PASS. Every named control in tree.md is in the skeleton. The 26 labels with 0 hits are
outline descriptions, not control names ("A row's right-click menu", "Each column's role, under
its name", "Legend card", "Right-click on a node", "Usage data card"); their controls were
checked by their own words ("Compare with another", "As the file says", "Each row is", "One edge
per", "Shortest paths", "switcher", "In tour" all found). The main menu order (New project, Open
recent, the File list, Select where..., Select edges between, Show hidden elements, Settings...,
Keyboard shortcuts, Help) and the project-name menu (Rename, the File list, Save as..., Close
project) match the section files. tree.md holds no task text from tree-test.md, no answers,
no correct locations, no scoring, no routes or section ids, and none of the examples the tree
tasks name (a country and a score over 50, badge swipes, April, 40 times).

```
  2  Accessibility and input
  0  A column header's menu
  2  Add as steps
  4  Add label line
  1  Add node...
  7  Add note
  3  Add rows from file...
  2  Add to set...
  3  A measure
 14  Analyze
  2  Analyze...
  2  An attribute's menu
  1  A note's menu
  4  Apply recipe or style file...
  1  A row's menu
  0  A row's right-click menu
  0  A run that finds groups, opening to its groups
  6  Assistant
  0  A tab for a run's groups
 39  Attribute
 14  Attributes
 16  Back
 17  Cancel
 16  Canvas
  3  Clear graph data
  1  Close project
  8  Columns
  0  Compare with another run... / Compare with another row...
  2  Compute the overview
  2  Copy link to note
 10  Create set
 38  Data
 14  Data tab
 15  Delete
  2  Diagnostics
  0  Direction: As the file says | Directed | Undirected
  7  Distance
  0  Each column's role, under its name
  0  Each file or address, with its menu
  0  (each project you opened, with its menu)
  0  Each row is: a node | an edge
  0  Each step, with a checkbox to apply it
  1  Edge id
 19  Edges
 18  Edit
  1  Edit on the Data page
  2  Edit source...
  3  Effects
  2  Enter AR
  4  Enter VR
  0  Every note, newest first, each with what it is about and when
 15  Everything
  4  Export...
  1  Export table as CSV...
  1  File settings
 11  Fill
  7  Filters
  4  Filter to...
  1  Filter to neighbors
  2  Find groups
  1  Find in notes
  1  Find paths and edge sets
  3  Find rows and notes
  6  Fit
  3  Folders
  4  Frame selection
  1  From ->
 10  Full graph
  3  General
  4  Go to column
 26  Graph
  0  Graph switcher
  0  Header: name, kind, where it came from, and "..."
  4  Headset
  2  Help
  6  Hide on canvas
  1  How it is drawn
  3  Image
  2  Invert selection
 40  Key
  4  Keyboard shortcuts
 22  Label
 11  Layout
  2  Lay out by these groups
  1  Layout tab
 10  Legend
  0  Legend card
  3  List options
 22  Load
  4  Local only
  1  Locate...
  7  Lock
 10  Made with
  4  Main menu
  1  Makes
  2  Match report
  1  Measure the graph
  7  Method
 12  More
  1  Motion
 39  Name
  5  Neighborhood
  2  Neighborhood...
  1  New from data...
  1  New project
 24  Nodes
  2  Nodes | Edges
 32  Notes
  1  No thanks
  1  One edge per: Row | Pair
  4  Open project or file...
  2  Open recent
  1  or drop a file anywhere in this window
 12  Paints
  5  Path between
  3  Path between...
  2  Performance
  4  Pin
  3  Pinned nodes
  1  Place by
  9  Position
  5  Present
  5  Privacy
  0  Project name
  8  Quick actions
  1  Rank nodes and edges
  2  Read as...
  7  Recent
  1  Recent exports
  2  Recent projects
  6  Recipe
  7  Redo
 20  Remove
  3  Remove from list
  2  Remove from list view
 18  Rename
  4  Replace with file...
  4  Report
  6  Rerun
  2  Re-run layout
  3  Reselect previous
  2  Reshuffle layout seed
  2  Restore the suggested look
  0  Right-click on a node
  0  Right-click on empty canvas
  0  Rows added by Analyze, each with its eye
  4  Run as copy
  1  Samples
 19  Save
  1  Save as...
  3  Save view
  1  Search, or say what to find
  6  Seed
  2  Select all visible
  1  Select edges between
 25  Selection
  1  Select top N...
  6  Select where
  2  Select where...
  4  Sets
 17  Settings
  2  Settings...
  8  Shape
  2  Share usage data
  0  Shortest paths, opening to each one found
 31  Show
  1  Show as groups
  2  Show hidden elements
  5  Show in table
  3  Show members in table
  5  Show only this row
  1  Show rows removed from list view
  6  Sizes
  7  Sources
  4  Standard views
 17  Start
 18  Style tab
  2  Subtype
 15  Summary
  1  Switch to 2D / Switch to 3D
  3  Table options
  1  Tables
  0  The chosen table
  0  The list of rows, top to bottom
 32  Time
  2  Time slider
  0  To ->
  5  Tooltip
 25  Undo
  2  Unpin all
  0  Usage data card
  0  Values or Members
  4  Version history
  3  Video
 27  View
 10  Views
 23  Weight
  2  What is collected
  8  Why this look
  0  Your saved views, in order, each with In tour
  3  Your views
```

## 6. Answer keys stay away from participants

Method: every task scenario, tree prompt and first-click prompt read against the words its target
shows (section source searched for "arrang", "key", "picture", "left", "Top", "Dates in order";
renders shots/tasks/r8-t01/01.png, r8-t04/01.png, r8-t20/01.png and r8-t24/01.png viewed).

Result: PASS. No prompt names its answer or its place, and none uses the label on its target:
"reminder" for Add note, "picture" for Image, "arranging" for Layout and Method, "bigger dot" for
Size, "names written" for Label, "pick out" for Select where, "in place of" for Replace with file,
"hold both months" for Add rows from file, "by itself" for Show only this row, "keep that angle"
for Save view. The renders show no review bar, no design notes and no section or state names
(--check in check 2 also fails on a review bar or reviewer word), render files are named 01.png,
02.png and so on, and every task's 01.png is its start state: the empty first-launch screen for
r8-t01 to r8-t15 (r8-t04 on the IT estate's empty start), the empty project for r8-t16, an open
project or the import page for the tier 2 and regression tasks, as their scenarios say.

Notes, judged not to break the rule:
- r8-t07 asks for "the top three"; the reading place is headed "Top 10". "Top" is the plain word
  for the answer, and the scenario names neither the measure nor where to read it.
- r8-t20 and r8-t20-transactions ask how many "are left"; a filter step writes "N nodes left" only
  when other steps are above it, which is not the case in either task.
- r8-t21-transactions asks "whether the dates allow it"; the result line says "Dates in order".
  The dates are a property of the data the participant must judge; the scenario does not say how.
- r8-t32 names "flagged" and Great Britain, values of the data the rule needs; the controls
  (Select where, Select 1) are not named.
- r8-t24-transactions starts on the import page, which already shows the match line it asks the
  participant to read; the task is to find and read it, then load and confirm on the graph.
- The IT estate's sample card on the start screen reads "300 hosts", the count r8-t04 asks for;
  the card is a sample, not the participant's files, and the task's routes never open it.

## 7. Coverage

Method: the plan's coverage list against each task's routes; each persona file read for its
field of work; datasets compared with the dataset column of check 2; sessions counted.

Result: PASS.
- Every key has a task whose routes exercise it: first-session r8-t01; sample r8-t02; load r8-t03,
  r8-t04, r8-t05; characterize r8-t06; rank r8-t07; communities r8-t08; color-size r8-t09; labels
  r8-t10; layout r8-t11; find-explore r8-t12; export r8-t13; save r8-t14; filter r8-t20,
  r8-t20-transactions; path r8-t21, r8-t21-transactions; note r8-t22, r8-t23, r8-t23-transactions;
  multi-table r8-t24, r8-t24-transactions; weight r8-t25, r8-t25-transactions; reuse r8-t26.
- Every covering task has personas from at least two fields of work (the smallest, r8-t15 and
  r8-t16, have six personas from six fields). Fields confirmed from the persona files: for
  example explorer-elena is a product manager, recipe-recipient a wet-lab cell biology member,
  gephi-holdout a computational social scientist, cytoscape-holdout runs a university genomics
  core's network service (the plan files her under molecular biology research; either way every
  task she is in keeps two or more fields).
- No key in the list is wide-field or nested-json. r8-t04 draws the wide dataset and lists it;
  every task's datasets list equals the datasets its routes draw (lesmis for r8-t01 to r8-t03,
  r8-t05 to r8-t16, r8-t20, r8-t21, r8-t22, r8-t23, r8-t33, r8-t34; transactions for the
  -transactions tasks, r8-t26, r8-t30, r8-t32; doorEntries for r8-t24 and r8-t25).
- Sessions: 262 in total; tasks covering tier 1 keys (r8-t01 to r8-t14) hold 161 sessions,
  61 percent (167, 64 percent, with the usage-data moment r8-t15). Every tier 1 task starts on the
  empty first-launch screen (start-screen/first-run, or start-screen/wide-first-use for r8-t04).
- Task and first-click ids (r8-tNN, r8-fcNN) name no answer.

## 8. Decided changes the skeleton does not draw

Method: each undrawn change compared with the tasks' routes; `timeout 300 node app-b/study.mjs
--counts` run to see where hand-typed counts still show.

Result: PASS. Every task touching an undrawn change is flagged in its grader notes or in the
success criteria's "not testable" list, or does not depend on it:
- bind icon at rest: r8-t09 and the coloring focus group flagged; Layout's Pause/Resume tooltip:
  r8-t11 flagged; reopening with the saved selection: r8-t14 flagged; the hop-date inversion line:
  r8-t21-transactions flagged; the selection-cleared notice, the filter chip's off-steps tooltip,
  provenance rows in Made with, labeling only noted elements, "Saving as", "Show label anyway",
  "Not on a bridge edge", the past-limit table, the dated footer and the column menu wording:
  listed as excluded in the success criteria, and no task's grade rests on them.
- The chain note chip is drawn on inspector-group-set-path-row/path-notes, the route
  r8-t23-transactions uses, so that task tests what is drawn.
- --counts still exits 1. Its six hand-typed counts are on the nested research network
  (inspector-nothing-selected.js lines 564 and 683) and on style-tab-same-panel/nodes; no task or
  first-click route draws either, so no participant sees them this round.
- The message keys, the owner-feedback log, the glossary proposals and the tiering rule have no
  screen, so no task depends on them.

```
sections/inspector-nothing-selected.js:564: "? 514" types the fixture count 514 by hand; read it from the fixture
sections/inspector-nothing-selected.js:564: ": 510" types the fixture count 510 by hand; read it from the fixture
sections/inspector-nothing-selected.js:564: "? 242" types the fixture count 242 by hand; read it from the fixture
sections/inspector-nothing-selected.js:564: ": 118" types the fixture count 118 by hand; read it from the fixture
sections/inspector-nothing-selected.js:683: "? 200" types the fixture count 200 by hand; read it from the fixture
sections/style-tab-same-panel.js:46: "AB.count(28" types the fixture count 28 by hand; read it from the fixture
6 problems: counts not written by AB.count, banned scope strings, reviewer words
exit 1
```

## 9. Every persona has a file

Command: `ls study/personas/`.

Result: PASS. All 21 persona ids in the plan (and every focus-group member) have a file:
alert-reviewer, analyst-alex, bioinformatics-researcher, class-project-student,
cybersecurity-analyst, cytoscape-holdout, data-journalist, expert-emma, explorer-elena,
fraud-analyst, gene-ontology-cytoscape-user, genomics-cytoscape-user, gephi-holdout,
intelligence-analyst, knowledge-engineer, marketing-analyst, ml-engineer-recsys,
nonprofit-operations-analyst, recipe-recipient, screen-reader-analyst, supply-chain-analyst.

## 10. The success criteria carry the round's targets

Result: PASS. The plan's success criteria open with the round's targets word for word: 80 percent
graded success or success with difficulty on every tier 1 and tier 2 task, no confirmed
severity-4 problem unresolved, mean ease rating (SEQ) of at least 5.5 of 7, 70 percent direct
success on every tree-test task, and tier 1 first.
