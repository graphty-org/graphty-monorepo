# Tier 5 round 1: visual designer's walkthrough

Date: 2026-11-03. Build 1e123d7d33 (`.study-builds/tier5-r1d1-1e123d7d33`), driven with
`tool/real.mjs`. Lens: hierarchy, spacing, alignment, typography, color, density and polish of the
selection editor in both hosts (a style layer's Which nodes and a Data place filter card), the
sidebar outline at rest, and the screens around them that the tasks reach.

Sessions (screenshots are in each folder; git keeps only this file):

- `visual/v1` -- light, 1440 x 900, `setup:volunteers.txt`: a new rule with its picker open, a step,
  a second step, the Except switch, an Or group, Done, Fill, the sidebar outline at rest, a new
  filter card (left without a value, then edited), a filter card at rest, Within hops with the
  reference picker, Advanced with Edges where.
- `visual/v2` -- dark, 1280 x 800, `setup:gauges-telemetry.txt` (the colleague's project, node
  table open): the card reopened, an Or group with a range step, the Oldest layer's date step, the
  same workspace with the node table closed.
- `visual/v3` -- light, 1440 x 900, `setup:staff-50k.txt`: the 50,000-node checklist, a picked
  value, Done, Fill, the result at rest.

Enlarged crops cited below are in the worktree's `tmp/visual-t5/` (not in git).

Severity is the round's scale (`../../../criteria.md`): 4 a wrong result with no sign, 3 a blocked
task or a result a reader would misread, 2 friction a person recovers from, 1 wording or cosmetic.
No finding is rated 3: none has a reader who paid for it yet, and each 2 that could rise says what
would raise it. "Known" means the backlog or `decided.md` already holds it; it is listed so the
fix list sees it again on the frozen build, not as a new proposal.

## Summary

| #  | Sev | Screen                                   | Finding                                                                                     | Owner                 | Status |
| -- | --- | ---------------------------------------- | ------------------------------------------------------------------------------------------- | --------------------- | ------ |
| 1  | 2   | Workspace, both hosts, node table open   | The preview keeps the hidden data table's height: a 240 px blank band above the strip       | graphty app           | Known  |
| 2  | 2   | Workspace outline, both hosts            | The No match chit is drawn as a grey, unticked checkbox                                     | graphty app           | New    |
| 3  | 2   | Sidebar outline at rest, two groups      | "Except" sits flush with the title, out of A's column; value names at three left edges      | graphty app           | New    |
| 4  | 2   | Workspace, value picker while typing     | The picker jumps up over the header and its own field                                       | graphty app           | Known  |
| 5  | 2   | Workspace, value picker                  | The list is cut mid-row under "Results" with no scrollbar, 490 px of free space below       | graphty app           | Known  |
| 6  | 2   | Within hops, preview                     | The reference node is drawn like every other member; nothing marks the center              | graphty app           | New    |
| 7  | 2   | Graph at rest after Fill                 | The key grows over a node                                                                   | graphty app           | Known  |
| 8  | 2   | Workspace preview at 50,000 nodes        | Members in the middle sit under the faint non-members' grey fog                            | graphty-element       | Known  |
| 9  | 1   | Workspace header                         | The result count is the lightest thing in the header                                        | graphty app           | New    |
| 10 | 1   | Workspace header                         | Table "on" and Done share one green                                                         | compact-mantine       | New    |
| 11 | 1   | Reference picker                         | The picker is narrower than its field and hangs past the pane's left edge                   | graphty app           | New    |
| 12 | 1   | Within hops pane                         | The "hops" unit touches the box's right border                                              | graphty app           | New    |
| 13 | 1   | Matches strip                            | The last column is cut with no horizontal scrollbar; column widths jump as rows change      | graphty app           | New    |
| 14 | 1   | Inspector                                | "Which nodes" starts 8 px right of every other heading in the column                       | graphty app           | New    |
| 15 | 1   | 50,000-node checklist                    | "32 more", the only sign the list is cut, is the smallest text on the pane                  | graphty app           | New    |
| 16 | 1   | Graph at rest, 50,000 nodes              | One count in three spellings: "1,076 of 50,000", "1,076 of 50k", "50,000"                   | graphty app           | New    |
| 17 | 1   | Key                                      | Three text sizes and two left edges in a five-line card                                     | graphty app           | New    |
| 18 | 1   | Filter card, selected                    | A filled box inset inside the card's border; the count gives way to Edit                    | graphty app           | Known  |
| 19 | 1   | Node table, matches strip                | Numbers in a column do not share decimals ("-73.2" among "-73.21")                           | graphty app           | New    |

Eight findings at severity 2 (four new), eleven at 1. None at 3 or 4.

## Findings

### 1. The preview keeps the hidden data table's height (sev 2, known)

When the workspace opens while the node table is open (T70 B, T71 B, T73 B and T77 B start that
way), the canvas stays the 287 px tall box it had above the table, and the preview cell below it
is a 240 px band of empty panel between the drawing and the matches strip. The preview is the
workspace's main surface; here it gets 55% of its cell, and the eye lands on a dark slab in dark
mode. Closing the node table first gives the full cell, so the cause is the kept place, not the
layout.

- Evidence: `visual/v2/05.png`, `06.png`, `07.png` (filter host), `09.png` (style host); the same
  workspace with the table closed fills the cell: `visual/v2/11.png`.
- Already in the backlog (T70A.p2.2, T71B.p2.5, T72B.p2.7, T73B.p2.2, "calm-first risk, first in
  line") and decided as cosmetic (`decided.md`, "The blank band under the workspace preview is the
  hidden data table's place"). I keep it at 2: it is the calm-first check's "a blank pane the step
  does not use", on four of the round's task halves.
- Fix (one path): while the workspace is open, let the canvas take the preview cell's box, as spec
  section 3.0 already says ("graphty-element's canvas takes the preview cell's box"); the data
  table's place is given back when the workspace closes.

### 2. The No match chit looks like a checkbox (sev 2, new)

The outline's last row, No match, starts with a 13 px grey rounded square with a darker edge: the
size, radius and edge of an unticked checkbox. With one group nothing else in the outline has a
chit, so the row reads as an option that is turned off. On a filter card it sits one row below the
card's real on box, the same shape (dark mode makes them almost identical). Its grey (206, 206,
206) is also not the color the preview draws non-members in (lavender, about 209, 210, 232), so it
does not work as a legend either.

- Evidence: `visual/v1/04.png` (crops `tmp/visual-t5/v1-04-nomatch.png` beside
  `v1-04-check.png`), `visual/v1/12.png`, `visual/v2/05.png` (under the card's checkbox).
- Spec 3.1 asks for "No match (dimmed, faint chit, count)"; the chit is right, its drawing is not.
- Fix: draw the No match chit in the preview's own non-member color with no edge, the same shape
  as a group chit, so it matches what the canvas shows and stops matching the checkbox.

### 3. The sidebar outline breaks its column on Except (sev 2, new)

At rest, in the inspector, a rule with two groups reads:

```
Which nodes        7 of 24
    [] A                 1
    role staff
Except trained Yes
or  [] B                 7
    hours min 30
```

"Except" starts at the title's left edge, the same level as "or", so A's second step looks like
it belongs to the whole rule, not to A; the value names start at three different x positions. The
workspace's outline draws the same rows with a fixed 40 px verb column and lines them up
(`visual/v1/12.png`). Spec 3.1: "The same rows draw the sidebar's read-only outline and the
workspace's outline column."

- Evidence: `visual/v1/15.png`, `16.png`, `20.png` (crop `tmp/visual-t5/v1-15-sideoutline.png`).
- Related: the calm-first check's finding 6 (rows out of line in the workspace outline). Decided:
  "The sidebar outline is not indented" (workspace polish 3) -- that is the indent, not the verb
  column; this keeps it unindented.
- Rises to 3 if a reader on a two-group rule reports a count that applies Except to both groups
  (a misread result).
- Fix: give the sidebar rows the workspace's fixed verb column, so verb, value and test start at
  the same x in both places.

### 4. The value picker jumps up over the header (sev 2, known)

Typing "within" in a new rule's picker shrinks its list, and the picker re-anchors upward to
y = 20, over the app's top bar, the workspace header's Styled, Table, Clear, Cancel and Done, and
its own field.

- Evidence: `visual/v1/25.png`.
- Decided ("Pickers under fields never flip up over the header", workspace polish 2), not built
  on this build (backlog T73A.2, T73B.10, T74A.7, T74B.2). T73's path types "within" at exactly
  this point.

### 5. The value picker's list is cut mid-row (sev 2, known)

The open picker ends with the "Results" heading and the top pixels of its first row, with no
scrollbar drawn, while 490 px of the properties column below it are empty. A reader scanning for
PageRank (T75) sees a Results section with nothing in it.

- Evidence: `visual/v1/02.png`, `05.png` (crop `tmp/visual-t5/v1-05-picker.png`),
  `visual/v1/17.png` (filter host).
- Backlog T78A.p7.2 ("a scroll hint is the ask"); the calm-first check did not count it. My fix
  is the smaller one: let the list use the column's height down to the strip, so at 1440 x 900 the
  Results rows are on screen without a scroll.

### 6. Within hops does not mark its center (sev 2, new)

"Within 2 hops of v02" draws v02 in the same group color as the ten nodes around it. The one node
the step names cannot be found on the preview, and the field shows only the id ("v02") after the
reader typed "James", so neither the field nor the drawing confirms the right person was picked.

- Evidence: `visual/v1/28.png`, `29.png`.
- Watch: no reader has paid for it yet. Rises to 3 if a T73 session picks the wrong reference
  without noticing.
- Fix: the preview draws the reference with the selection ring graphty-element already draws
  (spec 9's "ring kept"), through the preview's style layer; no new element API.

### 7. The key grows over a node (sev 2, known)

After Fill the key gains "Color: Layer 1", a count, the PageRank title, the gradient and "7 nodes
covered by Layer 1", grows from 55 to 120 px tall and covers the top-left node; at 50,000 nodes it
covers a corner of the drawing.

- Evidence: `visual/v1/01.png` (node at 490, 175 visible) against `visual/v1/15.png` (covered);
  `visual/v3/12.png`.
- Backlog T74A.19; the decision that the key never moves the drawing stands, so the fix is the
  key's own size (see finding 17).

### 8. Members under the fog at 50,000 nodes (sev 2, known)

With "Grants" ticked, the faint non-members and their edges form a grey slab in the middle of the
preview, and the green members inside it are dimmed by it; only the ones near the edge read at
full color.

- Evidence: `visual/v3/10.png`.
- `decided.md` workspace polish 3, "Not fixed this round": members drawn above faint non-members
  needs an on-top render group in graphty-element.

### 9. The header's count is the lightest thing in it (sev 1, new)

"Which nodes -- Layer 1" is bold, the result "5 of 24" after it is regular, the same grey-black, at
the same size; the green Table toggle and Done carry far more weight. The header is the one place
the result count is drawn while the workspace is open (spec 3.0).

- Evidence: `visual/v1/04.png` (crop `tmp/visual-t5/v1-04-outline.png`), `visual/v3/10.png`.
- Fix: the count at the title's weight (600), so title and result read as one line.

### 10. Table "on" and Done look alike (sev 1, new)

The Table toggle's on state is a light lime fill; Done is the filled lime primary. One hue says
both "this view is on" and "finish". Squinting, Table is the second strongest thing in the header.

- Evidence: `visual/v1/02.png` (crop `tmp/visual-t5/v1-04-head.png`), `visual/v2/05.png`.
- Owner compact-mantine's button variants, which are Figma-locked: listed, not changed.

### 11. The reference picker is narrower than its field (sev 1, new)

The reference picker is about 200 px wide under a 287 px field and starts 8 px left of the pane,
over the preview's border.

- Evidence: `visual/v1/27.png`.
- Decided: "The picker is always its field's width" (workspace polish 3); the value picker keeps
  it, the reference picker does not.

### 12. The "hops" unit touches the box edge (sev 1, new)

In the hops number box the unit "hops" runs into the right border; the "s" meets the edge.

- Evidence: `visual/v1/29.png` (crop `tmp/visual-t5/v1-29-pane.png`).
- Fix: the box's right padding, as the other number boxes have.

### 13. The matches strip cuts its last column (sev 1, new)

With a Group column added, the strip's last column is cut ("Pa" for PageRank; "co" for code in
the dark session) and no horizontal scrollbar is drawn. Column widths also re-flow as the matched
rows change (the trained column moves 12 px between two steps).

- Evidence: `visual/v1/12.png`; `visual/v2/05.png`, `06.png`, `07.png`; `visual/v1/08.png`
  against `09.png`.
- Fix: size columns from the attribute (the full column), not from the matched rows, and show
  the strip's horizontal scrollbar.

### 14. "Which nodes" is out of line in the inspector (sev 1, new)

In the layer inspector "Which nodes" and its rows start at x 1225 (1440 wide), every other heading
(Shape, Visibility, Text, Fill, Shaders) and Style nodes at 1217.

- Evidence: `visual/v1/15.png`; dark `visual/v2/08.png` (crop `tmp/visual-t5/v2-08-insp.png`).

### 15. "32 more" is the smallest text on the checklist (sev 1, new)

The 50,000-node checklist shows 8 of 40 values and "32 more" in about 8 px grey. The search box
above it does the work, but the only sign that 32 values are not shown is the least visible text
on the pane.

- Evidence: `visual/v3/08.png`.
- Fix: "32 more" at the rows' size, in secondary ink.

### 16. One count, three spellings (sev 1, new)

At rest on 50,000 nodes the key says "1,076 of 50,000 nodes", the inspector "1,076 of 50k", the
layer row "1,076" and the Everything row "50,000".

- Evidence: `visual/v3/12.png`.
- Spec 3.1's short form ("1.9k values") is for list lengths; a result count reads the same way in
  every place. Content designer's call on which spelling.

### 17. The key: three sizes, two edges (sev 1, new)

The key's five lines use 11 px (title, gradient ends), about 8 px grey (count), 8 px semibold
(PageRank title) and 8 px grey (coverage); the swatch title is indented 24 px while the lines under
it start at the card's edge.

- Evidence: `visual/v1/15.png` (crop `tmp/visual-t5/v1-15-key.png`).
- Fix: one text size per role (title, value line) and one left edge; it also shortens the card
  (finding 7).

### 18. A selected filter card draws a box in a box (sev 1, known in part)

Clicking a card at rest fills an inset rectangle inside the card's border, and the count "7 of 11"
gives way to Edit until focus moves.

- Evidence: `visual/v2/02.png` against `03.png`.
- The count swap is backlog T79B.p3.3 (decided: focus returns to the card). The inset box is new:
  one selected treatment, the card's own fill, would do.

### 19. Numbers do not share decimals (sev 1, new)

In the node table and the strip, lon reads "-73.2" in a column of "-73.21"; depth_cm is fine.

- Evidence: `visual/v2/01.png`, `08.png`, `05.png`.
- Fix: a column of numbers is printed to the column's decimals.

## Checked and not raised

- Group chits are filled in the workspace and hollow at rest, as decided (`visual/v1/12.png`,
  `15.png`).
- The Except switch's off state: its thumb edge measures 3.6:1 on white, above 3:1.
- The group B color (vermillion) is close to the round's orange fill; the Okabe-Ito palette and
  the Styled toggle are decided, and no task reads the preview as the result.
- Number boxes filled grey beside white selects are compact-mantine's Figma inputs.
- The filter card left without a value titles itself "trained pick yes or no" (`visual/v1/20.png`);
  words are the content designer's.
