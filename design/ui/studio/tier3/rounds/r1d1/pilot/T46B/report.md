# T46 B pilot: one cluster in red (College football)

Build 6de5f95d12 (frozen, `.study-builds/tier3-r1d1-6de5f95d12`), served by `real.mjs` with `REAL_DIST`.
A targeted re-pilot: only the success path by pointer and the one changed route that belongs to this
task (the table's Nodes tab after a Louvain run) were walked. Both start at the empty app. The data
stayed College football (115 teams, 613 games) the whole way.
Folders: `6de5-pointer/`, `6de5-table/`. `pointer/`, `detours/`, `keyboard/` and
`superseded-ed4351b258/` are earlier builds' walks.

## 1. Success path by pointer (`6de5-pointer/`): reached, matches the answer key

- 02: the start page. 03: "Samples" alone is ambiguous to the tool (the hero button and the top-bar
  link share the name); a person clicks either one. 04: the sample library. Every card's thumbnail is a
  broken image (34 generator thumbnails from graphty.app blocked, `ERR_BLOCKED_BY_ORB`); already
  reported on other tasks.
- 05: "Conferences fall out of who played whom" opens College football. 06-07: Analyze, `louvain`
  (one row, Louvain). 08: Enter opens the Louvain card. 09: Run gives a "Louvain" folder and the
  "Color: Louvain" key, Group 1 to 10.
- 10-12: find box, `Nebraska`, Enter: the inspector is titled `74`, Memberships "Louvain Group 4"; the
  camera glides to the node and cuts the drawing at the top and right (decided).
- 13-14: the folder caret (tooltip "Expand Louvain", default cursor) expands Group 1 to 10 of
  16, 15, 14, 12, 11, 10, 10, 9, 9, 9.
- 15: Group 4 ("Group 4, node layer, 12 nodes"): "Louvain: Group 4, 12 nodes", "12 of 115 nodes",
  color `A1CAF1`.
- 16-17: the color box ("Node color, set here, light blue"), `red` Enter: `FF0000`. Group 4 is red in the
  drawing, the key and the row; the other nine keep their colors.
- 18: `blue` then Escape: "Edit discarded; this stays FF0000.", focus kept (decided).
  19: Tab goes to "Node color by attribute". 20: Undo's tooltip "Undo changing node color on Group 4 Ctrl+Z".
- Answer on screen: 12.

## 2. Table detour after Louvain, Nebraska's row (`6de5-table/`): fixed

- 02-05: as above, through the Louvain run.
- 06-07: the toolbar's Table (tooltip "Table Shift+T"). The Nodes tab's Louvain column now reads
  "Group 3", "Group 8", ... (not the run's raw 0-based numbers). The drawing shrinks into the top half
  and the key shows three rows with "7 more below" (known).
- 08: scrolled to row 74: Nebraska, "Group 4". KansasState, TexasTech, IowaState read "Group 4" too,
  as the tree has them.
- 09: the table's Louvain tab: Group 1 to 10 of 16, 15, 14, 12, 11, 10, 10, 9, 9, 9, the same as the tree.
- 10-11: Group 4's options > "Show members in table": the Nodes tab filtered to "Louvain: Group 4",
  12 nodes, Nebraska among them.
- 12-14: expanding the folder, Group 4, `red` Enter with the table still open: Group 4 is red and the
  table's group name is the one painted. Painting the group the table names now paints the right one.

## Defects

None that crashes, blocks the task or spoils its grading on either route.

## Not walked

- The detours of the earlier report (the `cluster` filter, the key, a node's Style tab, "Why this look",
  the folder's color table and chain icon, right-click, Memberships) and the keyboard walk: not routes
  the fixes touched.
- The other routes on the re-pilot list (T50 A and B, saved projects, T46 A, T47, T48, T45 A, T38, T41,
  T51): they belong to other tasks.
