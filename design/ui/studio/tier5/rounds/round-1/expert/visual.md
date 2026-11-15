# Tier 5 round 1: visual designer's walkthrough

Date: 2026-11-03. Build 1e123d7d33 (`.study-builds/tier5-r1d1-1e123d7d33`, the first line of
`../../../criteria.md`), driven with `tool/real.mjs`. Lens: hierarchy, spacing, alignment, typography,
color, density and polish of the selection editor in both hosts (a style layer's Which nodes and a
Data place filter card), the read-only outlines at rest, and the screens around them that the tasks
reach.

Sessions (screenshots and session records are in each folder; git keeps only this file):

- `visual/v1` -- light, 1440 x 900, `setup:volunteers.txt`: a new rule with its picker open, a step,
  a second step, the Except switch, an Or group with a range step, Done, Fill, the sidebar outline
  at rest, a new filter card (left without a value, then edited), a filter card at rest, Within hops
  with the reference picker, Advanced with Edges where.
- `visual/v2` -- dark, 1280 x 800, `setup:gauges-telemetry.txt` (the colleague's project, node table
  open): the filter card reopened, an Or group with a range step, the Oldest layer's date step, the
  same workspace with the node table closed.
- `visual/v3` -- light, 1440 x 900, `setup:staff-50k.txt`: the 50,000-node attribute picker, the
  value checklist, a picked value, Done, Fill, the result at rest.
- `visual/v4` -- light, 1280 x 800, `setup:volunteers.txt`: a filter card with two groups at rest,
  and keyboard focus through the card and the workspace.

v1 to v3 replay the routes of the expert walk made on this same build before the round was set
aside as void, so the screens are reproducible; every check point matched except one step of v2, a
click that landed on the closing workspace instead of the table's Close button, carried on by hand.
Enlarged crops cited below are in the worktree's `tmp/visual-t5/r1/` (not in git); pixel positions
are measured on the screenshots, not judged by eye.

Severity is the round's scale (`../../../criteria.md`): 4 a wrong result with no sign, 3 a blocked
task or a result a reader would misread, 2 friction a person recovers from, 1 wording or cosmetic,
0 not a problem. No finding is rated 3: none has a reader who paid for it, and each 2 that could
rise says what would raise it. Each rating cites the decided line it breaks, or names the gap in
the decided rules it would fill. "Known" means `../../../backlog.md` or `../../../decided.md` holds it.

## Summary

| #  | Sev | Screen                                    | Finding                                                                                          | Owner           | Status |
| -- | --- | ----------------------------------------- | ------------------------------------------------------------------------------------------------ | --------------- | ------ |
| 1  | 2   | Workspace, both hosts, node table open    | The preview keeps the hidden data table's height: a 240 px blank band above the strip            | graphty app     | Known  |
| 2  | 2   | Workspace outline, both hosts             | The No match chit is drawn as a grey, unticked checkbox, one row under the card's real checkbox  | graphty app     | New    |
| 3  | 2   | Read-only outlines at rest, two groups    | "Except" sits in the verb column, 21 px left of its group's other step; the workspace aligns them | graphty app     | New    |
| 4  | 2   | Workspace, value picker while typing      | The picker jumps up over the header and its own field                                            | graphty app     | Known  |
| 5  | 2   | Within hops, preview                      | The reference node is drawn like every other member; nothing marks the center                   | graphty app     | New    |
| 6  | 2   | Graph at rest after Fill                  | The key grows over a node                                                                        | graphty app     | Known  |
| 7  | 2   | Workspace preview at 50,000 nodes         | Members in the middle sit under the faint non-members' grey fog                                  | graphty-element | Known  |
| 8  | 2   | Filter card with two groups, at rest      | The card's title, its boldest text, still names only group A ("role staff") beside "16 of 24"    | graphty app     | Known  |
| 9  | 1   | Workspace, value picker                   | The list is cut mid-row with no scrollbar, the column below it empty                             | graphty app     | Known  |
| 10 | 1   | Workspace header                          | The result count is the lightest thing in the header                                             | graphty app     | New    |
| 11 | 1   | Workspace header                          | Table "on" and Done share one green                                                              | compact-mantine | Known  |
| 12 | 1   | Reference picker                          | Narrower than its field, covers it; the highlighted row's secondary text is 3.9:1 on the green   | graphty app     | New    |
| 13 | 1   | Within hops pane                          | The "hops" unit touches the box's right border                                                   | graphty app     | New    |
| 14 | 1   | Date step pane                            | The date box is 20 px tall between 24 px fields                                                  | graphty app     | New    |
| 15 | 1   | Advanced, Edges                           | "Edges" is a smaller label than every other in the pane; ellipses spelled two ways               | graphty app     | New    |
| 16 | 1   | Matches strip                             | The last column is cut with no scrollbar, while a cell in the same row ellipsizes                | graphty app     | New    |
| 17 | 1   | Inspector                                 | "Which nodes" starts 7 px right of every other heading in the column                             | graphty app     | New    |
| 18 | 1   | 50,000-node checklist                     | "32 more", the only sign the list is cut, is the smallest text on the pane                       | graphty app     | Known  |
| 19 | 1   | Graph at rest, 50,000 nodes               | One count in three spellings: "1,076 of 50,000", "1,076 of 50k", "1,076"                         | graphty app     | New    |
| 20 | 1   | Key                                       | Three text sizes and two left edges in a five-line card                                          | graphty app     | New    |
| 21 | 1   | Filter card, selected or editing          | A filled box inset inside the card's border                                                      | graphty app     | New    |
| 22 | 1   | Node table, matches strip                 | Numbers in a column do not share decimals ("-73.2" among "-73.21", "0.0355" among "0.03566")     | graphty app     | New    |
| 23 | 1   | Keyboard focus, everywhere                | The focus ring is a 1 px line                                                                    | compact-mantine | Known  |

Eight findings at severity 2 (three new), fifteen at 1. None at 3 or 4.

## Findings

### 1. The preview keeps the hidden data table's height (sev 2, known)

When the workspace opens while the node table is open (T70 B, T71 B, T73 B and T77 B start that
way), the canvas stays the 287 px box it had above the table, and the preview cell below it is a
240 px band of empty panel between the drawing and the matches strip: the workspace's main surface
gets 55% of its cell, and in dark mode the eye lands on a dark slab.

- Evidence: `visual/v2/05.png`, `06.png`, `07.png` (filter host), `09.png` (style host); with the
  table closed first, the same workspace fills the cell: `visual/v2/12.png`.
- Decided as cosmetic (`decided.md` 877, "the blank band ... first in line for bar 9's calm-first
  check"). I keep it at 2 because it is the calm-first check's "a blank pane the step does not use"
  on four task halves.
- Fix (one path): while the workspace is open the canvas takes the preview cell's box, as spec
  section 3.0 says; the table's place is given back when the workspace closes.

### 2. The No match chit looks like a checkbox (sev 2, new)

The outline's last row starts with a 13 px grey rounded square with a darker edge: the size, radius
and edge of an unticked checkbox. With one group nothing else in the outline has a chit, so the row
reads as an option turned off. On a filter card it sits one row under the card's real, ticked
checkbox, the same shape. Its grey (206) is also not the lavender the preview draws non-members in
(about 209, 210, 232), so it does not work as a legend either.

- Evidence: `visual/v1/04.png`, `visual/v1/23.png` (under the card's checkbox), `visual/v4/12.png`,
  dark `visual/v2/05.png`.
- Decided: "No match (dimmed, faint chit, count)" (`decided.md` 768). The chit is decided; its
  drawing is not.
- Fix: draw the No match chit in the preview's own non-member color with no edge, the shape of a
  group chit, so it matches the canvas and stops matching the checkbox.

### 3. "Except" breaks the read-only outline's column (sev 2, new)

Measured on `visual/v1/15.png` (the inspector at rest, 1440 wide): group A's step "role staff"
starts at x 1247, its Except step at x 1226, the same edge as "or" and as the "Which nodes" title.
So A's second step reads as belonging to the whole rule, not to A:

```
Which nodes        7 of 24
    [] A                 1
    role staff
Except trained Yes
or  [] B                 7
    hours min 30
```

The workspace outline draws the same rows with every step at one edge (x 132 for "role", "trained"
and "hours", `visual/v1/12.png`). The filter card at rest repeats the inspector's layout
(`visual/v4/08.png`).

- Spec 3.1: "The same rows draw the sidebar's read-only outline and the workspace's outline
  column." `decided.md` 786 ("the sidebar outline is not indented") is about the indent, not the
  step column; this keeps it unindented.
- After the void round's check: 2, weakly (one skeptic rated it 1).
- Rises to 3 if a reader on a two-group rule reports a count that applies Except to both groups.
- Fix: the read-only rows start every step's value at one x, with the verb ("Except", "or") in a
  column of its own to the left, as the workspace does.

### 4. The value picker jumps up over the header (sev 2, known)

Typing "within" in a new rule's picker shrinks its list and the picker re-anchors upward to y 20,
over the app's top bar, the workspace header's buttons and its own field.

- Evidence: `visual/v1/25.png`.
- Decided, not built: "Pickers under fields never flip up over the header" (`decided.md` 734);
  backlog T73A.2, T73B.10, T74A.7, T74B.2. T73's path types "within" at exactly this point.

### 5. Within hops does not mark its center (sev 2, new)

"Within 2 hops of v02" draws v02 in the same green as the ten members around it. The one node the
step names cannot be found on the preview, and the field shows only the id ("v02") after the reader
typed "James", so neither the field nor the drawing confirms the right person was picked.

- Evidence: `visual/v1/27.png` (typed "James"), `visual/v1/28.png` (result).
- Watch: no reader has paid for it. Rises to 3 if a T73 session picks the wrong reference without
  noticing.
- Fix: the preview draws the reference with the selection ring graphty-element already draws,
  through the preview's style layer; no element API change.

### 6. The key grows over a node (sev 2, known)

After Fill the key gains a swatch line, a count, the PageRank title, the gradient and a coverage
line, grows from 55 to 120 px tall and covers the top-left node.

- Evidence: `visual/v1/14.png` (node at 490, 175 clear) against `visual/v1/15.png` (covered).
- Backlog T74A.19. "The key never moves the drawing" stands, so the fix is the key's own size
  (finding 20).

### 7. Members under the fog at 50,000 nodes (sev 2, known)

With "Grants" ticked, the faint non-members and their edges form a grey slab in the middle of the
preview, and the green members inside it are dimmed by it; only those near the edge read at full
color.

- Evidence: `visual/v3/10.png`.
- `decided.md`, workspace polish 3, not fixed this round: members drawn above faint non-members
  needs an on-top render group in graphty-element.

### 8. A two-group card keeps its first step's name (sev 2, known)

A filter card made from "role staff", then given an Or group "trained Yes", is still titled "role
staff" in the Data place and in the workspace header ("role staff -- Filters 16 of 24"). The title
is the card's boldest text and sits beside a count that includes 11 people who are not staff.

- Evidence: `visual/v4/08.png`, `visual/v4/12.png`.
- Backlog T71B.3, decided not built (repolish 1, "Filter cards are named by their first step ...
  and follow edits"). Listed here because the title is the card's visual anchor: the mismatch is a
  hierarchy problem as much as a wording one.

### 9. The value picker's list is cut mid-row (sev 1, known)

The open picker ends with a section heading and the top pixels of its next row, with no scrollbar
drawn, while the column below it is empty (490 px at 1440 x 900).

- Evidence: `visual/v1/02.png`, `visual/v1/17.png` (filter host), `visual/v3/04.png` (the 50,000
  file: Betweenness, Closeness, PageRank, then a cut row).
- After the void round's check: 1. Backlog T78A.p7.2.
- Fix: let the list use the column's height down to the strip.

### 10. The header's count is the lightest thing in it (sev 1, new)

"Which nodes -- Layer 1" is bold; the result "5 of 24" after it is regular, at the same size; the
green Table toggle and Done carry far more weight. While the workspace is open this is the one
place the result count is drawn (`decided.md` 681, "One count per place").

- Evidence: `visual/v1/04.png`, `visual/v3/10.png`.
- Fix: the count at the title's weight, so title and result read as one line.

### 11. Table "on" and Done look alike (sev 1, known)

The Table toggle's on state is a light green fill; Done is the filled green primary. One hue says
both "this view is on" and "finish".

- Evidence: `visual/v1/04.png`, dark `visual/v2/05.png`.
- compact-mantine's button variants, Figma-locked: listed, not changed.

### 12. The reference picker (sev 1, new)

The reference picker is about 200 px wide under a 287 px field, starts 8 px left of the pane and
covers the field it belongs to. On its highlighted row the secondary text ("name James Carter")
measures 3.9:1 on the green, under the 4.5:1 its size needs; the value picker's highlighted rows
carry only primary ink (9:1).

- Evidence: `visual/v1/27.png` (crop `tmp/visual-t5/r1/v1-27-refpicker.png`), `visual/v1/25.png`
  for the value picker.
- Decided: "The picker is always its field's width" (`decided.md` 774); the value picker keeps it,
  the reference picker does not. The void round's check folded this into "the reference picker is a
  second build of the picker".
- Fix: build it on the value picker's list, which carries the width and the ink.

### 13. The "hops" unit touches the box edge (sev 1, new)

In the Hops box the suffix "hops" runs into the right border.

- Evidence: `visual/v1/28.png`, crop `tmp/visual-t5/r1/v1-30-pane.png`.
- Fix: the suffix gets the box's right padding, as the field's text has on its left.

### 14. The date box is shorter than the fields around it (sev 1, new)

In the date step the value box is 20 px tall (measured y 206 to 225) under two 24 px selects; the
range and Hops boxes elsewhere are 24 px.

- Evidence: `visual/v2/09.png`, `visual/v2/12.png`.
- Decided: "Pane controls are the default size (24 px, 11/16)" (`decided.md` 519). Cause: the date
  step's `Autocomplete` is `size="xs"` (`graphty/src/workspace/style/WhichPicker.tsx`, the date
  card's box).
- Fix: the pane's default size, like the other boxes.

### 15. Advanced's "Edges" label and two ellipses (sev 1, new)

Under Advanced, the label "Edges" is about 8 px grey, smaller than every other label in the pane
(11 px) and starts at the chevron's x, not at "Advanced"'s text. Its control reads "Edges where ..."
with a spaced ellipsis while the pane's other openers read "Condition...", "Or..." and
"Edge value...".

- Evidence: `visual/v1/30.png`, crop `tmp/visual-t5/r1/v1-30-pane.png`.
- Fix: one label size and edge in the pane; one spelling of the ellipsis (the content designer
  picks which).

### 16. The matches strip cuts its last column (sev 1, new)

With a Group column added the strip's last column is cut ("PageR", "Pa", "co") with no horizontal
scrollbar, while in the same row a long name ellipsizes ("Zara Ahm..."): two treatments of
"too long" side by side.

- Evidence: `visual/v1/10.png`, `visual/v1/12.png`, `visual/v4/12.png`, dark `visual/v2/06.png`.
- After the void round's check: 1; whether the scrollbar shows on hover is still unchecked.
- Fix: size columns from the whole attribute, not the matched rows, and show the scrollbar.

### 17. "Which nodes" is out of line in the inspector (sev 1, new)

Measured on `visual/v1/15.png`: "Which nodes" starts at x 1225; Shape, Visibility, Text, Fill and
Shaders at 1218.

- Evidence: `visual/v1/15.png`; dark `visual/v2/08.png`.

### 18. "32 more" is the smallest text on the checklist (sev 1, known)

The 50,000-node checklist shows 8 of 40 values and "32 more" in about 8 px grey; the only sign 32
values are not shown is the least visible text on the pane.

- Evidence: `visual/v3/08.png`, crop `tmp/visual-t5/r1/v3-08-list.png`.
- Backlog T79A.10, T79A.p2.6 (it also looks clickable and is not).
- Fix: "32 more" at the rows' size, in secondary ink.

### 19. One count, three spellings (sev 1, new)

At rest on 50,000 nodes the key says "1,076 of 50,000 nodes", the inspector "1,076 of 50k", the
layer row "1,076" and the Everything row "50,000".

- Evidence: `visual/v3/12.png`.
- Decided: long counts read short (`decided.md` 90, "200k of 200k"). The short form is decided; the
  mix within one screen is the finding. Content designer's call on where each form goes.

### 20. The key: three sizes, two edges (sev 1, new)

The key's five lines use 11 px (swatch title, gradient ends), about 8 px grey (count), 8 px
semibold (PageRank title) and 8 px grey (coverage); the swatch title is indented 24 px while the
lines under it start at the card's edge.

- Evidence: `visual/v1/15.png`; `visual/v3/12.png`.
- Fix: one size per role (title, value line) and one left edge; it also shortens the card
  (finding 6).

### 21. A selected or editing filter card draws a box in a box (sev 1, new)

A selected card, and the card whose workspace is open, fill an inset rectangle inside the card's
own border.

- Evidence: `visual/v2/03.png`, `visual/v4/12.png`.
- The count giving way to Edit is backlog T79B.p3.3 (decided). Fix: one selected treatment, the
  card's own fill.

### 22. Numbers do not share decimals (sev 1, new)

lon reads "-73.2" in a column of "-73.21"; PageRank reads "0.0355" in a column of "0.03566".

- Evidence: `visual/v2/01.png`, `visual/v2/08.png`; `visual/v1/23.png`.
- Fix: a column of numbers is printed to the column's decimals.

### 23. The focus ring is a 1 px line (sev 1, known)

Keyboard focus on Edit, Fit and the strip's Group header is a 1 px olive outline (#588300), the
weight of a field border; on Fit it sits beside the button's grey border.

- Evidence: `visual/v4/09.png`, `visual/v4/12.png`, `visual/v4/14.png` (crop
  `tmp/visual-t5/r1/v4-12-fit.png`).
- Open from earlier tiers (focus visibility). compact-mantine's focus style, Figma-locked: listed,
  not changed.

## Checked and not raised

- Group chits are filled in the workspace and hollow at rest, as decided (`visual/v1/12.png`,
  `visual/v1/15.png`).
- A dark-mode section title drawn white among dim ones (`visual/v2/12.png`, Shape) is the
  pointer's hover, not a theme defect: the empty-section rule dims the others.
- "N so far" beside the attribute field ends that field short of the field below it
  (`visual/v4/06.png`); decided ("The step pane draws N so far beside the verb", `decided.md` 523).
- A node under the canvas toolbar while the node table is open (`visual/v2/08.png`): known and
  cosmetic (backlog T72B.10, T74B.20, T76B.2).
- The canvas stays light in dark mode; the Fit button is dark on it (`visual/v2/05.png`). Decided.
- Number boxes filled grey beside white selects are compact-mantine's Figma inputs.
- The Values tab's "972 nodes joined to no other n..." is cut (`visual/v3/01.png`); not a tier 5
  surface, left for the backlog.
