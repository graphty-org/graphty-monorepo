# T73 A pilot -- targeted re-walk on build 47c95a09fc

Task: put everyone within two shifts of James Carter in orange, James included, and report the
count. Start: `volunteers.graphml` open and ranked by PageRank (setup `volunteers.txt`), table open.
Expected: a style layer "Within 2 hops of v02", filled orange, 16 of 24 nodes.

The changes in this build touch filter cards (Cancel and Escape on a new or existing card) and the
style layer's agreement reading. None of the routes those changes touched belongs to this task,
which builds a style layer and never opens a filter card. This re-walk therefore covers the pointer
success path, and the keyboard walk as a check that the agreement-reading change left the layer
inspector unchanged. Screenshots are under
`/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d2/pilot/T73A/`.

## Result

The task is reached on both walks. Each ends with one new layer whose rule is "Within 2 hops of
v02", reading 16 of 24 in the layer list, the inspector and the legend. The data stays the task's
own 24 people and 63 ties throughout (`data.json`: 24 nodes, 63 edges, all visible). Nothing
crashed or blocked, and no route gives a wrong count.

## Routes walked

### success -- pointer success path

Folder `success/`, replayed from the previous pass's success walk. All 20 steps matched the
earlier screens.

- + > Layer, Which nodes, "within", Enter, Enter: the reference picker opens with its search
  focused. "James" and "Carter" each list "v02 name James Carter"; v02 then Enter gives "Within 2
  hops of v02", 16 of 24.
- Done, Fill, FF8C00, Enter: Layer 1 reads 16, the legend "Color: Layer 1, 16 of 24 nodes, 16
  nodes covered by Layer 1" (success/15.png). No false "Covered by" warning.
- Reopening Which nodes and editing Hops: 1 gives 9, 2 then Tab gives 16, 3 then Escape keeps 3
  (decided: Escape never discards work), 2, Enter, Escape, Escape returns to 16 of 24 with the
  orange fill intact (success/21.png).
- End state (`success/styles.json`): one row, Layer 1, node rule hops max 2 of v02, node.color
  #FF8C00.

### keyboard -- keyboard only, with screen-reader output

Folder `keyboard/`, replayed from the first round's keyboard walk (started `--keys --sr`). All 55
steps matched the earlier screens, so focus order and stops are as that walk recorded them.
It ends with Layer 1 at 16 of 24, "Within 2 hops of v02", filled E4572E (keyboard/56.png).

## Answer key against the screen

No mismatch. The key's Path (A) (12 steps, name search lists "v02 name James Carter", row reads
"Within 2 hops of v02", 16 of 24) matches the screen.

## Defects

None new on these walks. The earlier pass's open items (Tab in the reference picker's search
moving focus to the main menu; the table drawn under the workspace preview) were not on the
routes walked here and were not re-checked.
