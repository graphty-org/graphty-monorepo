# Tier 3 round 1: the Visual Designer's walkthrough

Build: `tier3-r1d2-758b8e8081` (the frozen build named in `../../../criteria.md`), driven with
`real.mjs`. Three sessions, every screenshot looked at:

- `visual/a-lesmis/` -- light, 1440 x 900: start page, Sample library, Les Miserables, a new layer,
  the text card, the number card on the Edge tab, Line color and width, Analyze (Louvain), the run's
  folder, several layers picked together, the folder's Shape set to Box.
- `visual/b-volunteers/` -- light, 1440 x 900: import of volunteers.graphml, the category, yes/no
  and "has no value" cards, a picker that leaves no node, Color by a category, Size by a number.
- `visual/c-poster-dark-900/` -- dark, 900 x 700: start page, lesmis-poster.graphty.json, a layer,
  a node and "Why this look".

Severity: 0 none, 1 polish, 2 slows or misleads, 3 a reader is likely to fail or misread the
result, 4 blocks. Gaps inside words ("Valu es", "edg e") are the headless capture's font hinting,
not the app, and are not reported.

## Summary

Two severity 3 findings. One is new: a picker whose conditions together pick nothing looks
healthy once it is closed. The other is known: the key covers drawn nodes and grows over the
drawing with every layer. The lead severity 2 theme is hierarchy on the condition picker. Its
heading, its combining rule ("every condition") and its warning are the smallest text on the
panel, while "Done" is the most saturated control even when nothing has been changed. The count
of picked elements is also printed in four different looks.

| Sev | Count |
| --- | ----- |
| 3   | 2     |
| 2   | 13    |
| 1   | 12    |

## Severity 3

**1. A picker that leaves no node looks healthy once closed.** Screen: Style, Which nodes.
Open, the picker shows the problem only as a 9 px red line under the cards ("Each condition
leaves some; together none"). Once closed, that line is gone. The three summary chips each print
their own count ("role: board, staff, 8 nodes", "trained: yes, 15 nodes", "phone: no value, 7
nodes"), so they read as the result. The real result, "0 of 24 nodes", is the smallest gray text on
the panel. In the layer tree, the row's "0" looks exactly like the normal "0" of Hovered and
Selected. A reader then sets a color and sees nothing change.
Evidence: `visual/b-volunteers/12.png` (open), `13.png` (closed). Owner: graphty app.
Proposal: when the result is 0, the heading's count takes the warning color and weight. Chips
print only their rule, and their counts move to the open card's header. The tree row's count
takes the same warning look as the heading.

**2. The key covers drawn nodes and grows with every layer.** Screen: canvas key. At 1440 x 900,
a node sits half under the key after Louvain (`visual/a-lesmis/31.png`, node at about 550,170). A
second node goes under it when Shape is added (`39.png`). On volunteers, the top-left node is fully
hidden once the key says "Color: role" (`visual/b-volunteers/23.png`, node at 505,160), and two
are hidden once "Size: hours" is added (`25.png`). This is already in the backlog, and the
decision that the key never moves the drawing stands. The fix here is the key's own size:

- Rows are spaced 32 px apart for 12 px text, so six groups take 200 px.
- The box is a fixed 240 px wide for about 150 px of content.
- The title ("Color: Louvain") is 8 to 9 px, smaller than the entries under it.
- The count line starts at a second left edge (14 px) under the swatches (20 px).

Owner: graphty app. Proposal: 20 px rows, the box sized to its content, the title at the entries'
size and weight 600, one left edge. That shrinks the six-group key by about 40%, which is what
keeps it off the nodes.

## Severity 2

**3. The picker's hierarchy is upside down.** Screen: Style, Which nodes / Which edges.

- "Which nodes" is a bold heading of about 9 px.
- Under it, "+ Add a condition" is 12 px, and the section titles below it (Shape, Fill) are
  11 to 12 px.
- The rule that combines the cards ("Nodes that pass every condition") is a 9 px gray caption.
- Nothing between the stacked cards says AND.

The thing the tier studies is the quietest block on the panel. Evidence:
`visual/a-lesmis/10.png`, `visual/b-volunteers/10.png`. Owner: graphty app. Proposal: the heading
at section-title size, and a small "and" between cards in place of the caption.

**4. "Done" is primary with nothing done.** Screen: the open picker. The first time the picker
opens, with no condition yet, a saturated green Done is the strongest color in the inspector. That
breaks the rule that an untouched form shows no primary button.
Evidence: `visual/a-lesmis/10.png`. Owner: graphty app. Proposal: Done stays a plain button until
a card exists.

**5. One count, four looks.** Screen: picker, cards, chips, tree.

- "6 of 77 nodes" as a right-aligned 8 px gray heading count.
- "6 nodes" in the card header.
- ", 6 nodes" inline in the chip and in every category value ("volunteer, 16 nodes").
- "6" in the tree's count column.

The category card is the worst: its counts are part of the checkbox labels, so they do not line
up. Evidence: `visual/a-lesmis/14.png`, `15.png`; `visual/b-volunteers/07.png`, `13.png`. Owner:
graphty app. Proposal: one look everywhere -- a right-aligned tabular count column in gray, as the
tree already does.

**6. The closed chip and the "Layer" token each have two looks.** Screen: Which nodes, closed.

- The summary chip is bordered like a text field, with about 2 px of vertical padding, and its text
  is larger than its heading.
- On a folder, the chip prints "Louvain: <<Layer>>" in plain black text, while the Fill field
  draws the same token in purple at weight 600.

Evidence: `visual/a-lesmis/15.png`, `32.png`. Owner: graphty app. Proposal: a chip with 4 px
padding, a fill but no field border, text at the heading's size, and the "Layer" token in the
same purple everywhere.

**7. The Edge tab says "not styled" beside a checked "Style edges".** Screen: Style, Edge.

- The green check says on, while the tab's suffix says off.
- The suffix sits inside the pressed tab on Edge and outside it on Node.
- It disappears as soon as an edge condition exists, though nothing is styled yet.

Evidence: `visual/a-lesmis/18.png`, `20.png`. Owner: graphty app. Proposal: the suffix keeps one
position and one rule (nothing set = "not styled"), whatever the conditions.

**8. The arrowhead note belongs to the wrong section.** Screen: Style, Edge. The three-line 9 px
note about direction sits under the Arrowheads divider, so it reads as the start of Effects.
Evidence: `visual/a-lesmis/18.png`. Owner: graphty app. Proposal: put it inside the Arrowheads
section, above its divider.

**9. The run settings form is misaligned, and one glyph explains nothing.** Screen: Analyze,
Louvain.

- Resolution is a half-width gray-filled field whose value sits 20 px in.
- Weight is a full-width white select whose value sits 8 px in.
- A lone glyph has a row to itself, with no label, no tooltip and a default cursor.

Evidence: `visual/a-lesmis/29.png`, `30.png` (hover: "tooltip: null"). Owner: graphty app (the
number field's look may be compact-mantine's NumberInput). Proposal: one field width and one inset.
Either give the glyph its words or remove it.

**10. The shape list covers the screen.** Screen: Shape field, open. The dropdown is about 880 px
tall and covers the top bar and the field it edits. It is wider than the field and runs to the
window's right edge. Nothing marks the current value, so the hovered row's saturated green reads as
the choice. Evidence: `visual/a-lesmis/38.png`. Owner: compact-mantine (the Select dropdown has no
max height), graphty app for the list. Proposal: a max height of about 320 px with scroll, a check on
the current value (as the operator select already does, `visual/b-volunteers/11.png`), or the
icon grid proposed earlier.

**11. Composing a condition shows nothing on the drawing.** Screen: canvas while the picker is open.
The card says "6 nodes" as the reader types, but the drawing stays the same until a property is set.
On a new layer, the reader cannot see which six. Evidence: `visual/a-lesmis/13.png`. Owner:
graphty app, through the element's existing highlight if it has one. Check what the element offers
first. Proposal: while the picker is open, outline the matching elements.

**12. Size by a number lets nodes cover each other.** Screen: canvas after Size by hours (default
1 to 3). Big nodes overlap neighbors, and the one board member in the bottom cluster is hidden
behind a volunteer. The result of one task hides the answer to the next (which color is the board).
Evidence: `visual/b-volunteers/25.png` (green node near 656,580). Owner: graphty-element (layout
spacing ignores drawn size). Treat any change of the default range as breaking.

**13. The selection mark on a small node reads as a rendering fault.** Screen: canvas, 900 x 700,
a node clicked. The selected node gets a faint horizontal smear, not a ring, and the selection is
nearly invisible at about 5 px node size.
Evidence: `visual/c-poster-dark-900/04.png` (node at 478,478). Owner: graphty-element.

**14. "Why this look" comes last and draws a painted-over color at full strength.** Screen: node,
Style tab.

- The only section that answers "why" sits under six empty "+" sections.
- The Selected row has no swatch, which leaves a hole in the swatch column.
- The Everything row shows the indigo that the drawing no longer uses for this node, at full
  strength.

Evidence: `visual/c-poster-dark-900/05.png`. Owner: graphty app. Proposal: put "Why this look" first
on a node, keep the swatch column filled, and dim a covered swatch.

**15. At 900 x 700 the drawing gets 365 px of 900.** Screen: canvas, narrow window. Rail, layers
and inspector keep their full widths. The drawing sits in the lower half under the key's inset, its
nodes are about 5 px, and the three orange answers of T50 are three dots. Evidence:
`visual/c-poster-dark-900/02.png`, `03.png`. Owner: graphty app. Not a study size, so severity 2.

## Severity 1

16. The key's title is smaller than its entries, and it has two left edges (included in finding 2's
    proposal). `visual/a-lesmis/17.png`. graphty app.
17. The folder row's disclosure triangle is a 4 px glyph outside the selection fill.
    `visual/a-lesmis/32.png`. graphty app.
18. Picking several layers drops the Style/Values tabs, so the Node/Edge switch jumps 40 px between
    one layer and several. `visual/a-lesmis/32.png` vs `34.png`. graphty app.
19. A focused bound field draws its column name in a white pill on a gray fill. The unfocused bound
    Color field draws it as plain text. `visual/b-volunteers/25.png`. graphty app.
20. In one card, the select is white and the text and number boxes are gray-filled.
    `visual/a-lesmis/12.png`, `20.png`. compact-mantine.
21. Every menu opens with its first item filled in saturated green, so it reads as already chosen
    (Add, Line, Shape). `visual/a-lesmis/07.png`, `23.png`, `36.png`. compact-mantine Menu.
22. The attribute list has two looks: a menu with divider rules in the picker, and a titled popover
    without rules from the bind button. `visual/a-lesmis/11.png` vs `visual/b-volunteers/22.png`.
    graphty app.
23. The Analyze list keeps its full height after filtering, leaving about 360 px of empty white over
    the drawing. `visual/a-lesmis/28.png`. graphty app.
24. Every analysis has the same bar-chart icon, so the icon says nothing.
    `visual/a-lesmis/27.png`. graphty app.
25. The same empty state has two phrasings: "Edges: nothing set" and "Edges: not styled".
    `visual/b-volunteers/20.png` vs `17.png`. graphty app.
26. The Shape section's add menu offers "Shape", repeating the section's name.
    `visual/a-lesmis/36.png`. graphty app.
27. On the import screen, the hours column (a number) is left-aligned, the column-role strip is 8 px
    gray, and Load is the smallest button on the screen. `visual/b-volunteers/02.png`. graphty app.

(Also seen, not counted: a Box node draws visibly smaller than a sphere of the same size,
`visual/a-lesmis/39.png`, graphty-element; on the start page, three greens compete because the two
secondary buttons are both filled and bordered, `visual/a-lesmis/01.png`.)
