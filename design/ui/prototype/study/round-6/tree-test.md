# Round 6 tree test: runs on the rail, and the navigation after round 5

This tests where people look for things, with no visual design at all: participants see only a
tree of text, open one level at a time, and pick the place where they would do the job.

It tests the navigation as decided after round 5 (`../decision-log.md`, "Round 5"). The rail
lists what a project owns: the main menu, Graph, Data, Results, Notes and the Assistant. Results
is the rail place for runs: "every run of a measure, with its settings and date"; opening a run
shows its record in place. The right panel with nothing selected has no Results section; a node's
own value and rank are still read on the node and in the table. Styles are the Style stack in the
right panel, and its "+" offers "From a recipe or file...". A group's or a set's own panel offers
"Compare with the rest". Ctrl+Z (Edit > Undo) first brings back a selection that was just
cleared. Weighted degree is in the algorithm list, Quick actions and the table's New column, in
money words when the weight is a currency. The meaning of a bigger weight is chosen in each run,
never on the data column. A selected node whose name is hidden gets "Show label anyway".

Every participant is simulated from the persona files in `../personas/`. Sixteen simulated
participants are far below the 50 or more a real tree test wants, and they share blind spots: a
failed task is a strong signal and a passed task a weak one. Every table of results from this
test says so beside its numbers.

## How it runs

- **Two trees.** The main tree is below. The label variant is word for word the same, except that
  the rail place is named "Runs" instead of "Results" (the node's own "Results" section keeps its
  name; it holds values, not runs).
- **Separate sessions.** All 16 personas take both trees, each as its own session with no memory
  of the other. Main tree first: alert-reviewer, bioinformatics-researcher, expert-emma,
  fraud-analyst, gephi-holdout, knowledge-engineer, ml-engineer-recsys, screen-reader-analyst.
  Variant first: analyst-alex, cybersecurity-analyst, explorer-elena, genomics-cytoscape-user,
  intelligence-analyst, marketing-analyst, recipe-recipient, supply-chain-analyst.
- **Both sessions take all 16 tasks,** in an order shuffled per session. Only tasks 1 to 4 of the
  variant session count for the label; its other 12 answers are reported as a check that the main
  tree's results repeat, and are never merged into them. (A variant session of only the four
  run tasks would tell the participant what is being tested.)
- **No shortcuts.** A session that answers both trees in one sitting, or whose answers are filled
  in from the other tree, is thrown away and run again. A session that returns no answers is run
  again, never left out.
- **What is recorded for every task:** each place opened, in order; the final pick; whether the
  participant went back up the tree; confidence from 1 to 7; one sentence in the participant's
  words. Record every first top-level place opened, even on correct paths.

## How it is scored (frozen before the round; do not change it after seeing answers)

- **Correct:** the final pick is one of the task's correct places.
- **Direct:** correct, reached without going back up the tree.
- **Pass:** on every task, at least 70% correct and at least 55% direct, main tree, all 16.
- **The label ("Results" or "Runs"):** "Runs" replaces "Results" only if, over tasks 1 to 4, the
  variant earns more than 4 extra direct successes (of 64) over the main tree. Otherwise the label
  stays "Results". This is a studio decision; there is no rescoring afterwards.
- **Picks counted separately** (each is wrong or indirect, and each tells us something):
  - Task 2: Results (rail) > an opened run > Top nodes. It shows Valjean only because he is first.
  - Task 3: any pick in Data > Sources (a file or a column).
  - Task 5: Data > Sources > Its columns. The column no longer holds what a bigger value means,
    so this is now wrong (round 5 counted it correct but not direct).
  - Task 7: Main menu > File > Open...; Style stack > Add a layer > Empty layer; Data > Sources >
    Add a source; and every visit to Main menu > Recipes that backs out.
  - Task 9: any Look (Screen, Print, High contrast).
  - Task 10: Bottom table > Edges tab (sorting single transfers is not a total).
  - Task 11: Right panel, a path selected > Members (a count, not a sum).
  - Task 12: Results (rail) > an opened run > Compare with... . It now lists runs, not the rest of
    the graph, so it is wrong (round 5 counted it correct in the rail arm).
  - Task 13: Main menu > Edit > Undo history. Also report task 13 scored with Edit > Undo counted
    wrong, the key for the design without the Ctrl+Z restore, so the two undo designs can be read
    side by side.
  - Task 14: Main menu > Edit > Undo history and Edit > Undo (both take back the steps in order).
  - Task 15: Style stack > Add a layer > Empty layer (it works, but it is not the route drawn).
- **Where the key changed since round 5,** so a change in the number is partly a change in the
  key, not only in behaviour: task 5 (the column is now wrong), task 10 (the table's New column is
  now correct), task 12 (the group's own panel is now correct and direct; the run's Compare with...
  is now wrong), task 13 (Edit > Undo is now correct; Previous selection is gone). Report each of
  these tasks under both keys.

## The tree (main: Results as a rail place)

The right panel changes with what is selected, so it appears once for each state.

Updated after the round so the next round tests the current screens: a source no longer offers
"Change..." beside the choices made when it was loaded, and the table footer no longer names the tie
rule with "Change...". Participants in this round saw both.

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
|   |   +-- Project info...
|   |   +-- Rename
|   |   +-- Duplicate
|   |   +-- Close
|   +-- Edit
|   |   +-- Undo (Ctrl+Z)
|   |   +-- Redo (Ctrl+Shift+Z)
|   |   +-- Undo history
|   |   +-- Copy ids
|   |   +-- Select all
|   +-- View
|   |   +-- 2D or 3D
|   |   +-- Minimize UI
|   +-- Selection
|   |   +-- Neighbors... (hops, direction, from a date)
|   |   +-- Paths between...
|   |   +-- Create set
|   |   +-- Add note...
|   +-- Algorithms
|   |   +-- Centrality (Betweenness, Closeness, Eigenvector, Harmonic, HITS, Katz, PageRank,
|   |   |   Weighted degree: Money in, Money out, Money in minus out)
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
|   +-- Project info...
|   +-- Rename
|   +-- Duplicate
|   +-- Close
|
+-- The line under the project name ("Nothing has been sent from this project")
|
+-- The loaded file's chip (under the project name, "transfers-2026-03.csv")
|   +-- Update with new data...
|   +-- The file's row in Data (where it came from, when it was read, the choices made loading it)
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
|   |   +-- Each file or query, with the choices made when it was loaded
|   |   +-- Its columns (what each holds: "amount, dollars, 0.5 to 9,800")
|   |   +-- Update with new data...
|   |   +-- Add a table...
|   |   +-- Add a source (a file or a query)
|   +-- Versions
|   |   +-- Each version (open it to read the graph as it was)
|   |   +-- Version history...
|   +-- Recipes (each one applied here; Apply a recipe...)
|   +-- Sent and saved (every file written and everything sent)
|
+-- Results (rail) ("Every run of a measure, with its settings and date")
|   +-- Run a measure... (opens the list of algorithms)
|   +-- Each run, newest first, named by its settings and date ("PageRank, damping 0.85,
|   |   Sep 28 10:14")
|   +-- An opened run
|       +-- State line (what it ran on; the weight it used and what a bigger value meant)
|       +-- Settings (method, seed, options, when it ran)
|       +-- Re-run (keeps this run)
|       +-- Compare with... (earlier runs of this measure first, then other runs, then another
|       |   data version)
|       +-- Top nodes, with near ties marked
|       +-- Show in table, sorted
|       +-- Show as style layer
|
+-- Notes (rail)
|   +-- Add a note...
|   +-- Every note, newest first (find in notes)
|
+-- Assistant (rail)
|   +-- Conversations
|
+-- Right panel, with nothing selected (the graph)
|   +-- Overview (counts with their units: nodes, edges (rows), linked pairs, density)
|   +-- Style stack
|       +-- Each layer (top wins; drag to reorder; hide; its swatch opens the color picker
|       |   with Custom and Libraries)
|       +-- Add a layer (+)
|       |   +-- Empty layer
|       |   +-- From a recipe or file... ("Only a recipe's styles; your data stays here")
|       |   +-- Suggested for this graph (for example Shape by kind)
|       +-- Look (Screen, Print, High contrast)
|
+-- Right panel, with a node selected
|   +-- Header actions: Neighbors (hops, direction, from a date), Path to..., Create set
|   +-- Appearance (the whole stack, with the layers that paint this node marked; add a layer for
|   |   the selection)
|   +-- Show label anyway
|   +-- Attributes (each saying where it came from; on transfers: Money in, Money out, Links in
|   |   (count), Links out (count))
|   +-- Results (this node's value and rank in each run)
|   +-- Memberships (the kept sets that hold it)
|   +-- Notes (add)
|
+-- Right panel, with a set, a group or a path selected
|   +-- Appearance
|   +-- Members (count; show in table)
|   +-- Compare with the rest
|   +-- Notes (add)
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
|   |   +-- The labels line ("7 more hidden where they overlap"; each hidden name selects its node)
|   +-- Floating toolbar
|   |   +-- Select
|   |   +-- Path (pick two nodes; options: weight by, and in this run what a bigger value means)
|   |   +-- Quick actions
|   |   +-- 2D or 3D
|   +-- The one-line notice (what just happened, and a way back)
|
+-- Bottom table
    +-- Nodes tab, Edges tab, and a tab for each opened run
    +-- Search (goes to the matching row, with every result column shown)
    +-- Column header menu (sort, filter to..., color by..., compare with..., join..., new column:
    |   Money in, Money out, Money in minus out)
    +-- Row menu (select, create set, compare this group with the rest)
    +-- Footer (the sum of each numeric column over the selected rows)
    +-- More (...)
        +-- Keep top rows...
        +-- Export table...
```

## The label variant

Identical to the main tree except one line: "Results (rail)" reads "Runs (rail)". Build the
variant tree for participants by changing that one line; never show a participant both trees in
one session.

## Tasks

Written in the participant's words, never in the tree's labels. Tasks 1 to 14 and 16 keep round
5's wording exactly, so each change shows as a difference between rounds. Task 15 is new and
replaces round 5's "has anything left this computer" (100% correct and direct in round 5; still
measured by first-click prompt 11 and two think-aloud tasks).

| # | Task (read to the participant) | Correct places (main tree; in the variant, read "Runs" for "Results (rail)") |
|---:|---|---|
| 1 | You want a second way of ranking which characters matter, to check against the one already done. Where would you start it? | Results (rail) > Run a measure...; Main menu > Algorithms > Centrality; Main menu > Quick actions...; Canvas > Floating toolbar > Quick actions |
| 2 | Earlier you worked out which characters hold the groups together. Where do you see how Valjean scored and where he places? | Right panel, with a node selected > Results; Bottom table > Nodes tab...; Bottom table > Search; Bottom table > Column header menu (sort) |
| 3 | A colleague wants to repeat an earlier calculation exactly. Where do you find how it was set up? | Results (rail) > Each run; Results (rail) > An opened run > Settings; Results (rail) > An opened run > State line |
| 4 | You want every character's score in one list, highest first, to scan the whole ranking. | Bottom table > Nodes tab...; Bottom table > Column header menu (sort); Results (rail) > An opened run > Show in table, sorted |
| 5 | You are about to find the cheapest route between two accounts. Where do you make sure a bigger transfer counts as more expensive, not less? | Canvas > Floating toolbar > Path (options); Main menu > Selection > Paths between...; Right panel, with a node selected > Header actions (Path to...); Main menu > Algorithms > Path |
| 6 | Your co-author wants a picture of this network for the paper. Where do you get one? | Main menu > File > Export...; Project name menu > Export...; Data > Export... |
| 7 | A colleague sent you a file of the colors and sizes their team always uses. Where would you bring it into this project? | Main menu > Recipes > Apply a recipe...; Data > Recipes; Right panel, with nothing selected > Style stack > Add a layer (+) > From a recipe or file... |
| 8 | Next month's transfers file has arrived. Where do you bring it in so that everything you set up carries over? | Main menu > File > Update with new data...; Project name menu > Update with new data...; Data > Sources > Update with new data...; The loaded file's chip > Update with new data... |
| 9 | Two groups are drawn in colors you cannot tell apart. Where do you change one of them? | Canvas > Legend > an entry's swatch, menu or "too close" flag; Right panel, with nothing selected > Style stack > Each layer; Right panel, with a set, a group or a path selected > Appearance |
| 10 | Your manager wants the accounts that take in far more money than they send out. Where do you start? | Main menu > Algorithms > Centrality (Weighted degree); Main menu > Quick actions...; Canvas > Floating toolbar > Quick actions; Results (rail) > Run a measure...; Bottom table > Column header menu (new column) |
| 11 | You have selected the transfers along one route. Where do you see how much money moved along it in total? | Bottom table > Footer |
| 12 | Where do you find out how the biggest group differs from the rest of the network? | Right panel, with a set, a group or a path selected > Compare with the rest; Bottom table > Row menu (compare this group with the rest) |
| 13 | A stray click just cleared the 18 characters you had picked out. Where do you get them back? | Canvas > The one-line notice; Main menu > Edit > Undo |
| 14 | You narrowed the graph in three steps, and the second one was wrong. Where do you take out only that one? | Filter chip > Filter steps |
| 15 | One character you care about has no name showing on the drawing, because names are hidden where they would overlap. Where do you make sure that character's name always shows? | Right panel, with a node selected > Show label anyway; Canvas > Legend > The labels line |
| 16 | Where do you see where money went next after it left one account in early August? | Right panel, with a node selected > Header actions (Neighbors: direction, from a date); Main menu > Selection > Neighbors... |

## Placements this covers

Every placement the decision log calls provisional or new after round 5:

| Placement | Tasks |
|---|---|
| Results as a rail place for runs, and its label ("Results" against "Runs") | 1, 2, 3, 4, 10 |
| A run's record opens inside the run; Compare with... lists earlier runs first | 3, 12 (counted separately) |
| The node's own value stays on the node and in the table, not in the rail place | 2 |
| What a bigger weight means is chosen in each run; the column holds only the data | 5 |
| One File list in the main menu and the project-name menu (regression) | 6, 8 |
| The file chip opens its source, with Update with new data... first | 8 |
| A team's colors come in as a recipe, also from the Style stack's "+" | 7 |
| The legend recolors; the too-close flag (regression) | 9 |
| Weighted degree in money words in the algorithm list, Quick actions and the table | 10 |
| The table footer totals the selection | 11 |
| Compare with the rest on the group's or set's own panel | 12 |
| Ctrl+Z (Edit > Undo) brings back a just-cleared selection; the notice names the way back | 13 |
| One filter step taken out with its own delete; "Undo back to here" gone (regression) | 14 |
| Show label anyway on the selected node, and the legend's hidden-labels line | 15 |
| Neighbors with a direction and a from date | 16 |

## Before the tree test, the first-click test and the sessions run

The tree test is text only and can run now. The first-click screens and the session screens must
show the design above. On 2026-09-29, `node kit/check.mjs --all` reports no problem on 69 pages,
but these are still open, and every one of them must be fixed and checked on the rendered page
before any first click or session runs:

- **The gate is not proven.** `node kit/prove-gate.mjs` reports 2 of 15 proofs failing: planting
  a missing "Ctrl+Enter" on `screens/take-a-note.html` (states s2 and s4) does not make the check
  fail, so the rule for required strings is not shown to work. Round 6's plan requires every
  proof to pass.
- **The Note tool is still on the floating toolbar** of every frame (`kit/template.html`), although
  it is decided that there is no separate Note tool. In round 5 three participants tried it.
- **`screens/navigation.html`, a node selected,** still reads "on no bridge"; the decided wording
  is "Not on a bridge edge". The same page's opened run reads "Re-run" without "(keeps ...)", and
  its toolbar's lightning button has no "Quick actions" label (the frame-at-rest has one).
- **Two right panels still exist:** `screens/navigation.html` (Overview, Style stack) and
  `screens/frame-at-rest.html` (Graph, Background, Layout, Statistics, Attributes, Style stack).
  First-click prompts use both, so participants see two designs of one panel.
- **The algorithm list on `screens/results-panel.html`** (the catalog state) has no Weighted
  degree, which is decided for the list and for Quick actions.
- **Task fixtures:** `kit/fixtures.json` has no task entry for the tasks first run in round 4 or
  5 (money in and out, a team's colors file, two runs compared, notes with names, a calculation
  that stopped, the dated trace, the weekly update, the gray figure, restyling two groups, top 200
  past the limit, amount end to end), so `node kit/check.mjs --tasks` and
  `node kit/shoot.mjs --tasks` do not cover their screens. Add them, then run both.
- **A decided change that could not be drawn:** the sample card is still shown next to a recipe
  that is waiting for data (the start screen and the recipe-recipient's path). The task "use a
  colleague's recipe on your gene list" depends on it: it runs, but it is flagged, it is left out
  of the ease bar, and a mix-up between a sample card and the colleague's file is logged as known
  and not drawn, not as a new finding.

Once these land, render the first-click screens again with the commands below, so the PNGs match
what the sessions show:

```
node kit/shoot.mjs --study --out round-6-fc-lesmis-rest.png "screens/navigation.html?frame=new"
node kit/shoot.mjs --study --out round-6-fc-lesmis-node.png "screens/navigation.html?frame=new-node"
node kit/shoot.mjs --study --out round-6-fc-lesmis-run.png "screens/navigation.html?frame=new-run"
node kit/shoot.mjs --study --out round-6-fc-undo-notice.png "screens/undo.html#notice"
node kit/shoot.mjs --study --out round-6-fc-transfers-rest.png "screens/frame-at-rest.html?dataset=transactions"
node kit/shoot.mjs --study --out round-6-fc-ppi-rest.png "screens/frame-at-rest.html?dataset=ppi"
```
