# Round 4 tree test: the navigation after the owner's review

This tests where people look for things in the rebuilt navigation, with no visual design at all:
participants see only the tree below as text, expand one level at a time, and pick the place where
they would do the job. It tests the structure drawn in `../../screens/navigation.html` and
`../../screens/data-panel.html`: the rail lists what a project owns (Graph, Data, Notes,
Assistant), the style stack and results are read in the right panel, data coming in, its versions
and what leaves the project live in the Data panel, and there is no Results place on the rail and
no avatar.

Every participant is simulated from the persona files in `../personas/`. All 16 personas take all
14 tasks, in a random order per participant. Sixteen is far below the 50 or more a real tree test
wants, and simulated participants make similar mistakes, so a failed task here is a strong signal
and a passed task is a weak one.

## How it is scored

- **Correct:** the participant's final pick is one of the task's correct places.
- **Direct:** correct, reached without going back up the tree.
- **Pass:** at least 70% correct and at least 55% direct on every task.
- **The move of Results off the rail is provisional.** It holds only if tasks 1 to 4 each reach 70%
  correct and 70% direct, the bar stated on the navigation page. If any of them misses, Results
  go back to the rail and the next round tests that.
- Record every first choice at the top level, even on correct paths: it shows which place people
  think owns the job.

## The tree

The right panel changes with what is selected, so it appears three times, once for each state.

```
graphty, with a project open
|
+-- Main menu (the button at the top of the rail)
|   +-- Quick actions... (Ctrl+K)
|   +-- File
|   |   +-- Open...
|   |   +-- Open sample
|   |   +-- Connect to data source...
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
|   |   +-- Select neighbors
|   |   +-- Filter to neighbors
|   |   +-- Create set
|   |   +-- Add note...
|   +-- Algorithms
|   |   +-- Centrality (Betweenness, Closeness, Eigenvector, Harmonic, HITS, Katz, PageRank)
|   |   +-- Community (Girvan-Newman, Label propagation, Leiden, Louvain)
|   |   +-- Path (All-pairs distance, Breadth-first search, Depth-first search, Shortest path)
|   |   +-- Structure (K-core, Maximum bipartite matching, Minimum spanning tree, Topological sort)
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
|   +-- Export... (Ctrl+Shift+E)
|   +-- Update with new data...
|   +-- Download project file
|   +-- Version history
|   +-- Project info...
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
|   |   +-- Its columns, each numeric one saying whether it is used as a weight (Change...)
|   |   +-- Update with new data...
|   |   +-- Add a table...
|   +-- Versions
|   |   +-- Each version (open it to read the graph as it was)
|   |   +-- Version history...
|   +-- Recipes and style files (each one applied here; add)
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
+-- Right panel, with a node or a set selected
|   +-- Appearance (the whole stack, with the layers that paint this highlighted; add a layer
|   |   for the selection)
|   +-- Attributes (each saying where it came from)
|   +-- Results (this node's value and rank in each run)
|   +-- Memberships (the kept sets that hold it)
|   +-- Notes (add)
|
+-- Right panel, with a result selected
|   +-- State line (what it ran on, the weight it used; Change...)
|   +-- Top nodes, and how sure the order is
|   +-- Details (the run record: method, seed, settings)
|   +-- Compare with...
|   +-- Show as style layer
|   +-- Show in table, sorted
|
+-- Right panel header
|   +-- Zoom and view menu
|
+-- Canvas
|   +-- Legend (each entry: change color, select these, create set)
|   +-- Floating toolbar
|       +-- Select
|       +-- Path
|       +-- Note
|       +-- Quick actions
|       +-- 2D or 3D
|
+-- Bottom table
    +-- Nodes tab, Edges tab, and a tab for each opened result
    +-- Column header menu (sort, filter to..., color by..., compare with..., join..., new column)
    +-- Search
    +-- More (...)
        +-- Export table...
```

## Tasks

Written in the participant's words, never in the tree's labels. The dataset named in a task is
only there to make it concrete. Tasks 1 to 4 decide whether Results stay off the rail; task 5
and 6 test styles in the right panel and style files in Data; tasks 8 to 13 test the Data panel.

| # | Task (read to the participant) | Correct places |
|---:|---|---|
| 1 | You want a second way of ranking which characters matter, to check against the one already done. Where would you start it? | Right panel, with nothing selected > Results > Run a measure; Main menu > Algorithms > Centrality; Main menu > Quick actions...; Canvas > Floating toolbar > Quick actions |
| 2 | Earlier you worked out which characters hold the groups together. Where do you see how Valjean scored and where he places? | Right panel, with a node or a set selected > Results; Bottom table > Nodes tab, Edges tab, and a tab for each opened result |
| 3 | A colleague asks which settings and which edge column that earlier calculation used. Where do you look? | Right panel, with a result selected > Details; Right panel, with a result selected > State line; Right panel, with nothing selected > Results > Each run |
| 4 | You want every character's score in one sorted list, to scan the whole ranking. | Bottom table > Nodes tab, Edges tab, and a tab for each opened result; Right panel, with a result selected > Show in table, sorted |
| 5 | Two groups are drawn in colors you cannot tell apart. Where do you change one of them? | Right panel, with nothing selected > Style stack > Each layer; Right panel, with a node or a set selected > Appearance; Canvas > Legend |
| 6 | A colleague sent you a file of the colors and sizes their team always uses. Where would you bring it into this project? | Data > Recipes and style files |
| 7 | You narrowed the graph in three steps, and the second one was wrong. Where do you take out only that one? | Filter chip > Filter steps; Main menu > Edit > Undo history |
| 8 | Next month's transfers file has arrived. Where do you bring it in so that everything you set up carries over? | Data > Sources > Update with new data...; Project name menu > Update with new data... |
| 9 | The bank also sent a list of account owners with a risk score for each account. Where do you attach it to the accounts already here? | Data > Sources > Add a table...; Bottom table > Column header menu |
| 10 | Where would you look at the network as it was before this month's file? | Data > Versions > Each version; Data > Versions > Version history...; Project name menu > Version history |
| 11 | Your co-author wants a picture of this network for the paper. Where do you get one? | Project name menu > Export...; Data > Export... |
| 12 | A reviewer wants the ranked list of accounts as a spreadsheet. Where do you get it? | Bottom table > More (...) > Export table...; Project name menu > Export...; Data > Export... |
| 13 | IT asks whether anything from this project has left your computer. Where do you check? | Data > Sent and saved; The line under the project name |
| 14 | Where would you write down why you kept these five accounts, so the reason stays with the project? | Notes > Add a note...; Right panel, with a node or a set selected > Notes; Canvas > Floating toolbar > Note; Main menu > Selection > Add note... |

Watch in particular:

- Task 1 and task 3: a pick in Data (the weight column's Change...) or in Main menu > Algorithms for
  a result that already exists means people look for results where the data is, or where
  runs start. Count those picks separately.
- Task 6: a pick of Main menu > Recipes, or of a layer's swatch (its Libraries tab), is wrong but
  tells us whether style files need a second way in. Count them.
- Task 8: File > Open... means the participant would start a new project and lose their work.
  Count it separately; it is the round-3 failure this Data panel was drawn to fix.

## Before the first-click test and the sessions use the mocks

Three mock inconsistencies would muddy the results; fix them in the mocks first (the tree above
already follows the design as recorded in the decision log):

- `screens/navigation.html` puts Update with new data... under Versions; `screens/data-panel.html`
  puts it under Sources. Pick one.
- The project name menu in `screens/navigation.html` has no Update with new data...;
  `screens/export-dialog.html` and the decision log include it.
- In `screens/navigation.html` at rest, the table already shows the betweenness column and
  Valjean's row highlighted, which can lead the first click on reading a result.
