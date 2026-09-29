# Round 5 tree test: where results live, and the navigation after round 4

This tests where people look for things, with no visual design at all: participants see only a
tree of text, open one level at a time, and pick the place where they would do the job.

It tests the navigation as recorded after round 4 (`../decision-log.md`, "Round 4"): the rail
lists what a project owns (Graph, Data, Notes, Assistant); the style stack is read in the right
panel and changed from the legend; Main menu > File and the project-name menu open one File list
(Open..., Update with new data..., Export..., Download project file, Version history, Rename,
Duplicate, Close); style files are gone and a style-only recipe replaces them, so "Recipes" is the
one word; the meaning of a weight is chosen for each run; the table totals a selection; weighted
degree is in the algorithm list; a cleared selection is reported on the undo line; "Undo back to
here" is gone.

**Two arms.** Round 4 missed its own bar for keeping Results off the rail, and the studio kept
them in the right panel and the table until a two-arm test decides. Arm A is the design as it
stands (Results a section of the right panel). Arm B is identical except that Results is a place
on the rail and the right panel with nothing selected has no Results section. Every other branch
is word for word the same in both arms.

Every participant is simulated from the persona files in `../personas/`. All 16 personas take
all 16 tasks in both arms, as two separate sessions with no memory of each other; half see arm A
first and half arm B first, and the task order is shuffled per session. Sixteen is far below the
50 or more a real tree test wants, and simulated participants share blind spots, so a failed task
is a strong signal and a passed task a weak one.

## How it is scored (frozen before the round; do not change it after seeing answers)

- **Correct:** the final pick is one of the task's correct places for that arm.
- **Direct:** correct, reached without going back up the tree.
- **Pass:** at least 70% correct and at least 55% direct on every task, in arm A.
- **Where Results live (tasks 1 to 4).** Results stay in the right panel and the table if arm A
  reaches at least 70% correct and 70% direct on each of tasks 1 to 4, AND arm B's total of direct
  successes over tasks 1 to 4 is not higher than arm A's by more than 4 (of 64). Otherwise Results
  become a rail place, and round 6 tests that. This is the rule; there is no rescoring afterwards.
- **Picks counted separately** (they are wrong or indirect, and each tells us something):
  - Task 3: any pick in Data > Sources > a column. If 6 or more of 16 still go there with this
    wording, which never mentions a column, a "Used by" list on data columns is drawn for round 6.
  - Task 5: Data > Sources > a column's "Default for new runs". It works for future runs, so it
    counts as correct but not direct; count it, because the per-run choice is the design.
  - Task 6 and task 8: Main menu > File > Open... . It is no longer destructive (it opens a new
    project), but it does not carry the setup over.
  - Task 7: Main menu > File > Open... and Style stack > Add a layer.
  - Task 9: any Look (Screen, Print, High contrast). Round 4 saw people read a look as the fix.
  - Task 13: Main menu > Edit > Undo. It takes back a filter step, not the selection.
  - Task 14: Main menu > Edit > Undo history. The round-4 key counted it; it is now wrong,
    because it undoes in order and would also take out the third step.
- Record every first top-level place opened, even on correct paths.

## The tree, arm A (Results in the right panel)

The right panel changes with what is selected, so it appears once for each state.

```
graphty, with a project open
|
+-- Main menu (the button at the top of the rail)
|   +-- Quick actions... (Ctrl+K; type what you want to do, in your own words)
|   +-- File
|   |   +-- Open... (opens a file as a new project; this one stays in Recent)
|   |   +-- Update with new data...
|   |   +-- Export... (Ctrl+Shift+E)
|   |   +-- Download project file
|   |   +-- Version history
|   |   +-- Rename
|   |   +-- Duplicate
|   |   +-- Close
|   +-- Edit
|   |   +-- Undo
|   |   +-- Redo
|   |   +-- Undo history
|   |   +-- Previous selection
|   |   +-- Copy ids
|   |   +-- Select all
|   +-- View
|   |   +-- 2D or 3D
|   |   +-- Minimize UI
|   +-- Selection
|   |   +-- Neighbors... (hops, direction, a date window)
|   |   +-- Path between...
|   |   +-- Create set
|   |   +-- Add note...
|   +-- Algorithms
|   |   +-- Centrality (Betweenness, Closeness, Eigenvector, Harmonic, HITS, Katz, PageRank,
|   |   |   Weighted degree: in, out, total)
|   |   +-- Community (Girvan-Newman, Label propagation, Leiden, Louvain)
|   |   +-- Path (All-pairs distance, Breadth-first search, Depth-first search, Shortest path)
|   |   +-- Structure (Bridges, K-core, Maximum bipartite matching, Minimum spanning tree,
|   |   |   Topological sort)
|   |   +-- Flow (Maximum flow, Minimum cut)
|   |   +-- Prediction (Link prediction)
|   +-- Recipes
|   |   +-- Apply a recipe...
|   |   +-- Save as a recipe...
|   +-- Preferences
|   |   +-- Your name on notes and recipes
|   |   +-- Theme
|   |   +-- Assistant provider
|   |   +-- Use WebGPU when available
|   |   +-- Reduced motion
|   +-- Help
|       +-- Documentation
|       +-- Keyboard shortcuts
|
+-- Project name menu (the project's name at the top of the left panel)
|   +-- Open...
|   +-- Update with new data...
|   +-- Export... (Ctrl+Shift+E)
|   +-- Download project file
|   +-- Version history
|   +-- Rename
|   +-- Duplicate
|   +-- Close
|
+-- The line under the project name ("Nothing has been sent from this project")
|
+-- Filter chip ("Full graph", or the steps applied)
|   +-- Filter steps (each step: turn off, edit, move, delete)
|   +-- Add a step
|
+-- Graph (rail)
|   +-- Graphs (each graph in the project; search; new graph)
|   +-- Sets and paths (each kept set or path; add)
|   +-- Views (saved camera, filter and look; add)
|
+-- Data (rail)
|   +-- Export...
|   +-- Sources
|   |   +-- Each file or query, with the choices made when it was loaded (Change...)
|   |   +-- Its columns (each numeric edge column: "Default for new runs", Change...)
|   |   +-- Update with new data...
|   |   +-- Add a table...
|   |   +-- Add a source (a file or a query)
|   +-- Versions
|   |   +-- Each version (open it to read the graph as it was)
|   |   +-- Version history...
|   +-- Recipes (each one applied here; Apply a recipe...)
|   +-- Sent and saved (every file written and everything sent)
|
+-- Notes (rail)
|   +-- Add a note...
|   +-- Every note, newest first (find in notes)
|
+-- Assistant (rail)
|   +-- Conversations
|
+-- Right panel, with nothing selected (the graph)
|   +-- Overview (counts, the last import, the edges line)
|   +-- Style stack
|   |   +-- Each layer (top wins; drag to reorder; hide; its swatch opens the color picker
|   |   |   with Custom and Libraries)
|   |   +-- Add a layer
|   |   +-- Look (Screen, Print, High contrast)
|   +-- Results
|       +-- Each run, newest first (open it)
|       +-- Run a measure (opens the list of algorithms)
|
+-- Right panel, with a node selected
|   +-- Header actions: Neighbors (hops, direction, a date window), Path to..., Create set
|   +-- Appearance (the whole stack, with the layers that paint this node highlighted; add a
|   |   layer for the selection)
|   +-- Attributes (each saying where it came from)
|   +-- Results (this node's value and rank in each run)
|   +-- Memberships (the kept sets that hold it)
|   +-- Notes (add)
|
+-- Right panel, with a set, a group or a path selected
|   +-- Appearance
|   +-- Members (count; show in table)
|   +-- Notes (add)
|
+-- Right panel, with a result selected
|   +-- State line (what it ran on; the weight it used and what a bigger value meant; Change...)
|   +-- Top nodes, with near ties marked
|   +-- Details (the run record: method, seed, settings)
|   +-- Compare with... (another result, or the rest of the graph)
|   +-- Show as style layer
|   +-- Show in table, sorted
|
+-- Right panel header
|   +-- Zoom and view menu
|
+-- Canvas
|   +-- Legend
|   |   +-- Each entry's label (selects that group)
|   |   +-- Each entry's swatch (opens the color picker, unused colors first)
|   |   +-- Each entry's menu (Change color..., Select these, Create set)
|   |   +-- The "too close" flag on an entry (Fix...)
|   +-- Floating toolbar
|   |   +-- Select
|   |   +-- Path (pick two nodes; options: weight by, what a bigger value means)
|   |   +-- Note
|   |   +-- Quick actions
|   |   +-- 2D or 3D
|   +-- The one-line notice (after an undo or a cleared selection: what happened, and a way back)
|
+-- Bottom table
    +-- Nodes tab, Edges tab, and a tab for each opened result
    +-- Search (goes to the matching row, with every result column shown)
    +-- Column header menu (sort, filter to..., color by..., compare with..., join..., new column)
    +-- Row menu (select, create set, compare this group with the rest)
    +-- Footer (the sum of each numeric column over the selected rows; the tie rule, Change...)
    +-- More (...)
        +-- Keep top rows...
        +-- Export table...
```

## The tree, arm B (Results as a rail place)

Identical to arm A except for these three changes. Build the arm-B tree for participants by
applying them to the arm-A text; never show a participant both trees in one session.

1. The rail gains a place between Data and Notes:

```
+-- Results (rail)
|   +-- Each run, newest first (open it)
|   +-- Run a measure (opens the list of algorithms)
```

2. "Right panel, with nothing selected" has only Overview and Style stack (no Results section).
3. "Right panel, with a result selected" becomes "Results (rail) > an opened run", with the same
   six children (State line, Top nodes, Details, Compare with..., Show as style layer, Show in
   table, sorted).

The node's own values stay under "Right panel, with a node selected > Results" in both arms: they
are facts about that node, and the arms differ only in where runs are listed, started and read.

## Tasks

Written in the participant's words, never in the tree's labels. Datasets are named only to make a
task concrete. Tasks 1 to 4 decide where Results live; the others test each placement the
decision log calls provisional or new, plus two regressions (tasks 14 and 15).

| # | Task (read to the participant) | Correct places, arm A | Correct places, arm B (only where different) |
|---:|---|---|---|
| 1 | You want a second way of ranking which characters matter, to check against the one already done. Where would you start it? | Right panel, with nothing selected > Results > Run a measure; Main menu > Algorithms > Centrality; Main menu > Quick actions...; Canvas > Floating toolbar > Quick actions | Results (rail) > Run a measure; the same Main menu and Quick actions places |
| 2 | Earlier you worked out which characters hold the groups together. Where do you see how Valjean scored and where he places? | Right panel, with a node selected > Results; Bottom table > Nodes tab...; Bottom table > Search; Bottom table > Column header menu (sort) | same |
| 3 | A colleague wants to repeat an earlier calculation exactly. Where do you find how it was set up? | Right panel, with a result selected > Details; Right panel, with a result selected > State line; Right panel, with nothing selected > Results > Each run | Results (rail) > an opened run > Details or State line; Results (rail) > Each run |
| 4 | You want every character's score in one list, highest first, to scan the whole ranking. | Bottom table > Nodes tab...; Bottom table > Column header menu (sort); Right panel, with a result selected > Show in table, sorted | Results (rail) > an opened run > Show in table, sorted; the same Bottom table places |
| 5 | You are about to find the cheapest route between two accounts. Where do you make sure a bigger transfer counts as more expensive, not less? | Canvas > Floating toolbar > Path (options); Main menu > Selection > Path between...; Right panel, with a node selected > Header actions (Path to...); Main menu > Algorithms > Path; Data > Sources > Its columns (correct, not direct: counted separately) | same |
| 6 | Your co-author wants a picture of this network for the paper. Where do you get one? | Main menu > File > Export...; Project name menu > Export...; Data > Export... | same |
| 7 | A colleague sent you a file of the colors and sizes their team always uses. Where would you bring it into this project? | Main menu > Recipes > Apply a recipe...; Data > Recipes | same |
| 8 | Next month's transfers file has arrived. Where do you bring it in so that everything you set up carries over? | Main menu > File > Update with new data...; Project name menu > Update with new data...; Data > Sources > Update with new data... | same |
| 9 | Two groups are drawn in colors you cannot tell apart. Where do you change one of them? | Canvas > Legend > an entry's swatch, menu or "too close" flag; Right panel, with nothing selected > Style stack > Each layer; Right panel, with a set, a group or a path selected > Appearance | same |
| 10 | Your manager wants the accounts that take in far more money than they send out. Where do you start? | Main menu > Algorithms > Centrality (Weighted degree); Main menu > Quick actions...; Canvas > Floating toolbar > Quick actions; Right panel, with nothing selected > Results > Run a measure | Results (rail) > Run a measure instead of the right panel's |
| 11 | You have selected the transfers along one route. Where do you see how much money moved along it in total? | Bottom table > Footer | same |
| 12 | Where do you find out how the biggest group differs from the rest of the network? | Right panel, with a result selected > Compare with...; Bottom table > Row menu (compare this group with the rest) | Results (rail) > an opened run > Compare with...; the same Bottom table place |
| 13 | A stray click just cleared the 18 characters you had picked out. Where do you get them back? | Main menu > Edit > Previous selection; Canvas > The one-line notice | same |
| 14 | You narrowed the graph in three steps, and the second one was wrong. Where do you take out only that one? | Filter chip > Filter steps | same |
| 15 | IT asks whether anything from this project has left your computer. Where do you check? | Data > Sent and saved; The line under the project name | same |
| 16 | Where do you see where money went next after it left one account in early August? | Right panel, with a node selected > Header actions (Neighbors: direction, date window); Main menu > Selection > Neighbors... | same |

## Placements this covers

| Placement the decision log calls provisional or new | Tasks |
|---|---|
| Results as a right-panel section, not a rail place (two-arm test) | 1, 2, 3, 4, 10, 12 |
| One File list, in Main menu > File and the project-name menu | 6, 8 |
| Open... no longer replaces the project | 6, 8 (counted separately) |
| Style files folded into recipes; "Recipes" the one word | 7 |
| What a bigger weight means, chosen per run; the column holds only the default | 5, and 3 for the "Used by" question |
| The legend as the place to change a color; the too-close flag | 9 |
| Weighted degree in the algorithm list; task words in Quick actions | 10 |
| The table footer totals the selection | 11 |
| Compare with the rest of the graph | 12 |
| A cleared selection on the undo line; Previous selection in Edit | 13 |
| "Undo back to here" deleted; each step's own delete | 14 |
| Data > Sent and saved and the line under the name (regression) | 15 |
| Neighbors with a direction and a date window | 16 |

## Before the tree test, the first-click test and the sessions run

The tree test is text only and can run now. The first-click screens and the session screens must
show the design above, or round 5 measures the mocks again. On the screens as rendered on
2026-09-28:

- `screens/navigation.html` (the menu and Data states) still shows the project-name menu without
  Open..., and a Data section named "Recipes and style files". Both must follow the round-4
  decisions: one File list, and "Recipes".
- Two right panels exist: `screens/navigation.html` (Overview, Style stack, Results) and
  `screens/frame-at-rest.html` (Graph, Background, Layout, Statistics, Style stack, Results).
  Every task screen needs the same one.
- `screens/navigation.html?frame=new-node` still reads "on no bridge"; the decided wording is
  "Not on a bridge edge".
- `screens/results-panel.html` (catalog and Quick actions states) must list Weighted degree with
  its one plain line, and Quick actions must answer the task words "money in", "important",
  "groups" and "cheapest route".
- `screens/table-dock.html` must draw the selection footer sum, the "Near tie" marks and the tie
  rule line; `screens/styles-list.html` the legend's Change color..., spoken color names and the
  too-close flag; `screens/binding-step.html` and `screens/run-and-read.html` the per-run "A bigger
  amount means" choice; `screens/undo.html` the cleared-selection notice.
- The flagged-account scenario uses ACC-365386, the account in `kit/fixtures.json`; round 4 named
  ACC-705989, which no screen showed.
- Once these land, re-render the first-click screens with the commands below, so the PNGs match:

```
node kit/shoot.mjs --study --out round-5-fc-lesmis-rest.png "screens/navigation.html?frame=new"
node kit/shoot.mjs --study --out round-5-fc-lesmis-node.png "screens/navigation.html?frame=new-node"
node kit/shoot.mjs --study --out round-5-fc-transfers-rest.png "screens/frame-at-rest.html?dataset=transactions"
node kit/shoot.mjs --study --out round-5-fc-ppi-rest.png "screens/frame-at-rest.html?dataset=ppi"
```
