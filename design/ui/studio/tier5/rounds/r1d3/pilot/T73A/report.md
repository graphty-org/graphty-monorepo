# T73 A pilot -- targeted re-walk on build c3100058ab

Task: put everyone within two shifts of James Carter in orange, James included, and report the
count. Start: `volunteers.graphml` open and ranked by PageRank (setup `volunteers.txt`), table open.
Expected: a style layer "Within 2 hops of v02", filled orange, 16 of 24 nodes.

The changes in this build touch filter cards (Cancel, Done and Undo on a new or existing card,
announcements, focus after a card goes, and the Drawing notice held until the closing repaint).
None of the routes those changes touched belongs to this task: it builds a style layer and never
opens a filter card. This re-walk therefore covers the pointer success path only. Screenshots are
under `/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d3/pilot/T73A/`.

## Result

The task is reached. The walk ends with one new layer whose rule is "Within 2 hops of v02",
reading 16 of 24 in the layer list, the inspector and the legend, filled FF8C00. The data stays
the task's own 24 people and 63 ties throughout (`success/data.json`: 24 nodes, 63 edges, all
visible, no filter). Nothing crashed or blocked, and no route gives a wrong count.

## Routes walked

### success -- pointer success path

Folder `success/`, replayed from the previous pass's success walk. All 20 steps matched the
earlier screens, and the end state in `success/styles.json` is identical to the previous pass's.

- + > Layer, Which nodes, "within", Enter, Enter: the reference picker opens with its search
  focused. "James", "Carter" and "v02" each find James Carter; Enter gives "Within 2 hops of v02",
  16 of 24, with the 16 matched nodes drawn in the preview (success/11.png).
- Done, Fill, FF8C00, Enter: Layer 1 reads 16, the legend "Color: Layer 1, 16 of 24 nodes, 16
  nodes covered by Layer 1" (success/15.png).
- Reopening Which nodes and editing Hops: 1 gives 9, 2 then Tab gives 16, 3 then Escape keeps 3
  (decided: Escape never discards work), then 2, Enter, Escape, Escape returns to 16 of 24 with the
  orange fill intact (success/21.png).

A keyboard-only replay of the first round's keyboard walk was also started as an extra check
(folder `keyboard/`); its first 15 steps matched the earlier screens.

## Answer key against the screen

No mismatch. The key's Path (A) (name search finds James Carter as v02, row reads "Within 2 hops
of v02", 16 of 24) matches the screen.

## Defects

None new on this walk.
