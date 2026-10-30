# T64 A pilot, targeted re-walk -- build 79ed770292

Task: on pantries + deliveries (start `pantries-joined.txt`), make the site's name the label, make
trips the weight with "Higher means" closer, then report what the program calls P05.

Verdict: REACHED by pointer and by keyboard. Answer on screen: **Harbor Market**. The data stayed
the task's own the whole way (13 nodes, 18 edges, pantries.csv and deliveries.csv).

## What was walked

Every walk below is its own fresh session on the frozen build 79ed770292, started from the task's
real start and replayed from the newest earlier walk of the same route; every replay matched every
check point to the end and ended its session. Of the routes the fix pass touched, only "T64A success
path and T64A/T64B detour: the table role re-run and Analyze's weight" belongs to this task; the
T65A, T65B, T66A/B and T68A/B routes start from other tasks' setups and are walked in those pilots.

- **Success path by pointer** (`v-success`, 14 steps). Data > Fields > pantries.csv "+" > Label >
  site; deliveries.csv "+" > Weight > trips; Higher means > closer. Graph Values reads Loaded weight
  "trips (closer)" (tmp/design-studio/tier4/r1d3/pilot/T64A/v-success/10.png). Find "P05" lists
  Harbor Market; clicking it opens the inspector titled Harbor Market (site Harbor Market, id P05)
  with the P05 row highlighted (tmp/design-studio/tier4/r1d3/pilot/T64A/v-success/14.png).
- **Detour: the table header's Role menu, then the re-run** (`v-rerun`, 10 steps). trips > Role >
  Weight leaves Higher means empty; Shortest path opens on None ("Each edge counts as 1"); after
  closer, PageRank opens on "trips (closer, loaded)". Shortest path P01 to P12 on None gives P01,
  P08, P12. After Higher means > farther, the same ends asked again compute a new run: Weight trips
  (farther), Total trips 20, a new "ran" time
  (tmp/design-studio/tier4/r1d3/pilot/T64A/v-rerun/11.png). Nodes in order show codes there, which
  is right: this route never sets the label.
- **Detour: the Analyze list's weight** (`v-analyze-list`, 7 steps). Shortest path's Weight list
  offers "trips (farther)" for that run only; once the weight is set in Data with closer, Shortest
  path opens on None and says "Each edge counts as 1. A path needs a distance, and "trips" means
  closer." (tmp/design-studio/tier4/r1d3/pilot/T64A/v-analyze-list/08.png).
- **The fixed detour set** (`v-detours`, 31 steps): the Style panel's Text for the name (Everything
  layer > Text > Label > site), find "P05", the Analyze list for "weight", Betweenness, the node
  table's column menu Role > Label, the edge table's Role > Weight, Quick actions searches for
  "name" and "weight", then Higher means > closer and Shortest path again. Shortest path's list
  shows "trips (closer, loaded, not read)" and None, and the edge table names both ends by site
  name (tmp/design-studio/tier4/r1d3/pilot/T64A/v-detours/32.png).
- **Keyboard only, screen-reader names recorded** (`v-keys`, 77 steps). F6 into the panels, Fields
  by Tab and Enter, Node label by arrows to site, Edge weight to trips, Higher weight means to
  closer, Control+F, "P05", ArrowDown, Enter: the inspector reads Harbor Market
  (tmp/design-studio/tier4/r1d3/pilot/T64A/v-keys/72.png); "Harb" finds it too, Tab, Shift+Tab and
  Escape behave as expected in the find box (v-keys/75.png to 78.png). Every focused control had a
  name ("Node label", "Edge weight", "Higher weight means", "Find", "Add to node fields", ...); no
  step left focus on the page body.

## Answer key against the screen

No mismatch that changes grading. One wording difference: for the Analyze-list detour the key says
A's Shortest path "opens on None, lists "trips (closer, loaded, not read)" and shows why"; the
screen does exactly that, with the reason as a line above the list.

## Defects (crash, block, or wrong graded result)

None.

## Skipped

None of this task's routes.
