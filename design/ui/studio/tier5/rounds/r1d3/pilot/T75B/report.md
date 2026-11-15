# T75 B pilot on build c3100058ab (targeted re-walk): the yeast network made readable

The study build is c3100058ab (`.study-builds/tier5-r1d3-c3100058ab`). Every walk starts from the
task's real start (`rounds/tier-5/setups/yeast.txt`, 1440 x 900). Screenshots stay out of git, under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d3/pilot/T75B/<walk>/.

This pass walks the pointer success path and the routes the last fixes touched that belong to
T75 B. None of the touched routes asked for this pass belongs to T75 B: each names another task
(T70 A, T70 B, T72 B, T79 A or T79 B) and its own data (staff-50k, the 50,000-node graph, the
Otter Creek fixture, a small graph of T70 A), and is walked in that task's own pilot. The detours
were not asked for this pass; their last reading (round 1 and dry run pass 1) stands. The keyboard
walk was replayed as well, since a replay costs one start.

## Result

Reached. The answer key's value holds: the top bar reads "24 of 331 nodes, 4 of 361 edges", one
filter card "Largest component" with its three steps. The data stayed the task's own the whole way:
the end record reads 331 nodes and 361 edges in all, 24 nodes and 4 edges showing, the source's
count, recount and chips all 331 / 361 (nothing deleted). No crash, no script error.

## Walks

### success -- the pointer success path

Replayed the dry run pass 2 route (15 steps); every check point matched. Data; Add filter; type
"largest"; Enter (249 of 331); Condition...; "degree"; Enter; 2; Enter (170 of 331); Condition...;
"gal80"; Enter; 0.5; Enter (24 of 331, success/15.png); Done.

- Before Done: workspace "Largest component -- Filters 24 of 331"; outline Largest component /
  Degree min 2 / gal80Rexp min 0.5 / No match 307 (success/15.png).
- End: the card lists its three steps; top bar "24 of 331 nodes, 4 of 361 edges"; Values "Nodes
  showing 24 of 331", "Edges showing 4 of 361" (success/16.png). The Done here also stands for the
  touched route "Done on a small graph": the workspace closed on the painted result.
- No mismatch with the answer key.

Screenshots: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d3/pilot/T75B/success/01.png
to 16.png.

### keyboard -- the success path by keyboard only

Replayed the dry run pass 1 keyboard route (61 steps, started keyboard-only, screen reader on);
every check point matched and the walk reached the end: live "Done, 24 of 331", focus on the card's
row "Largest component, 24 of 331 nodes" (keyboard/62.png); end record 24 nodes, 4 edges.

- Still present: after Enter picks Largest component in the new card's value picker, focus leaves
  the workspace for the sidebar's "Add filter" (live "249 of 331 nodes", keyboard/25.png); the
  workspace's Condition... is reached by Tabbing through the separator, the preview and the header.
  Nothing falls to the page body. Does not block.
- Names: every focused control had a name; none duplicated on the route.

Screenshots: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d3/pilot/T75B/keyboard/01.png
to 62.png.

## Defects

1. Keyboard: picking a value with no test (Largest component) in a new card's picker sends focus to
   the sidebar's "Add filter", out of the workspace (keyboard/25.png). Unchanged since dry run pass
   1. Does not block or spoil the grade.
