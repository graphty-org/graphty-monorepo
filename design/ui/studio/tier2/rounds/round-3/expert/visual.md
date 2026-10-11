# Tier 2 round 3: visual design walkthrough

Every tier 2 screen walked as a visual designer (hierarchy, spacing, alignment, typography, color,
density, polish) on the round 3 study build 26f3bb968e43 (graphty@0.8.61), served from
`.study-builds/tier2-r3d2-26f3bb968/`, at 1440 x 900, with one walk again at 1280 x 800, before
any session was read. Screenshots are in `visual/<walk>/NN.png` beside this file; each walk folder
also holds its `session.json`. Small text was read from crops enlarged 2x to 4x. The screenshots
are at device scale 1, which spaces some letters oddly ("Attrib ute"); that is not reported.

Severity is 0 to 4 (Nielsen). Owner is the package where the fix belongs.

| Walk                | Start                         | Screens                                                                                      |
| ------------------- | ----------------------------- | -------------------------------------------------------------------------------------------- |
| `visual/filters/`   | friends.csv, ranked           | Data place, step editor (new and saved), step on and off, the checkbox's hit area, header chip |
| `visual/path/`      | friends.csv, ranked, names on | Analyze search "linked", Path popover, finished path, a node, neighbor list, filter to it    |
| `visual/edge/`      | friends.csv, ranked, names on | Edge inspector, Selection layer, "+" Color and Width on one edge, the edge after clearing    |
| `visual/notes/`     | friends.csv, ranked, names on | Notes empty, note form, a node note, a graph note                                            |
| `visual/twotables/` | empty                         | Import page with two tables and the unmatched row, Overview, Data place, both inspectors     |
| `visual/replace/`   | friends.csv, ranked           | PageRank Values, Add page with repeated edges, Replace page, out-of-date run, Rerun          |
| `visual/find/`      | bus-stops.csv, ranked, names  | Find box: a plain miss, a rule without "=", a refused rule, Enter, a color on the rule's layer |
| `visual/longnames/` | empty, then long-names.csv    | Import page, Data place, find list, a rule selecting every edge, a node's inspector           |
| `visual/narrow/`    | friends.csv at 1280 x 800     | PageRank Values, Add page with repeated edges                                                |

## Checked and working on this build

- A "+" Color on one edge's layer starts at 000000, the highlight look, and the edge stays black and
  wider after the selection clears (`visual/edge/09.png`, `13.png`).
- A layer made from a rule is named by the rule, "minutes >= `10`", in the layer list and the key
  (`visual/find/07.png`).
- The filter step's checkbox toggles from 6 px outside its drawn box, and the drawn box is
  unchanged (`visual/filters/08.png`).
- A plain-word miss in the find box shows the example rule; a rule typed without "=" and a refused
  rule both become a marked option that Enter runs (`visual/find/02.png` to `05.png`).
- The key no longer names a run's scope at rest ("Size: PageRank").
- Find-list rows and selected-edge rows cut with "..." show the whole name on hover.

## Findings

### Severity 3

**1. Drawn names and nodes cover each other, and a covered node cannot be clicked.** With names on,
"Chloe" is drawn over "Farah" (only "ah" shows) and "Dev" over "Eli" (only "E" shows); the "Hana"
label sits on Ivan's dot. Farah's sphere lies behind Chloe's, so a click at Farah's center selects
Chloe: the pointer cannot reach her at all (`visual/notes/03.png` names the click, `04.png` shows
Chloe selected). On bus-stops the 20 px "Stadium" label covers the selected Depot -> Station tie and
"Harbor" sits on the Station -> Harbor tie. In long-names two nodes are drawn one inside the other.
Evidence: `visual/path/07.png`, `visual/notes/04.png`, `visual/find/05.png`,
`visual/longnames/04.png`. Owner: graphty-element (label placement and the layout overlap under
it).

**2. The key grows over the drawing and covers a node.** After a color is added to the rule's
layer, the key gains a block ("Edge color: minutes >= `10`") and its bottom edge now cuts the
"Depot" label and the top of Depot's node. The key is drawn at a fixed place with no regard for
what lies under it. Evidence: `visual/find/07.png`, `08.png` against `05.png`. Owner: graphty app
(the key's placement over the canvas).

### Severity 2

**3. The repeated-edges warning has no visual weight and sits far from its choice.** "41 edges in
this file are already in friends. Load adds them a second time." is set in the same body text and
color as the count line above it, with no warning mark, at the left edge, while "Replace
friends.csv" sits about 1,000 px away beside the blue Load, the only filled button. The Tables
list shows friends-v2.csv with a green check. The unmatched-row problem on the same page is marked
with a red-orange triangle, so one kind of fact, a problem with the load, has two looks. Evidence:
`visual/replace/04.png`, `visual/narrow/03.png` against `visual/twotables/04.png`. Owner: graphty
app.

**4. The key's swatches and headings are inconsistent.** A path or a black line color is a black
square on the key's near-black panel and nearly disappears. A single-entry block ("Shortest path")
is a swatch row at body size indented 20 px, while the PageRank blocks have 9 px titles at the
panel edge, so the key has two heading styles. A styled layer repeats its name in the title and the
row ("Edge color: Gus -> Hana" over "Gus -> Hana"). Evidence: `visual/path/07.png`,
`visual/edge/09.png`, `visual/find/07.png`. Owner: graphty app (the key).

**5. A filter that hides only edges reads as doing nothing.** "weight is at least 3" hides 21 of
41 ties, yet the header chip reads "20 of 20 nodes", the step's second line "20 to 20 nodes", and
the key a plain "PageRank" (computed on all 41 ties). Only the Overview says "Edges showing 20 of
41". The key compares nodes only (`rowName` in `canvas/legendWords.ts`), as do the chip and the
step line. Evidence: `visual/filters/07.png`, `10.png`. Owner: graphty app.

**6. "Filter to neighbors" shows its done state as a disabled button.** After the press the button
turns gray like an unavailable control, and hovering it shows no tooltip, so the reader cannot tell
"already on" from "not allowed". Evidence: `visual/path/11.png`, `12.png`. Owner: graphty app (the
button's state); compact-mantine if its disabled style is what stops the tooltip.

**7. Two rows look current in the find list.** The Enter option ("=minutes >= `10`", "Select its
matches") is a full-width, square band, while the selected layer row below it (Everything) is an
inset rounded band in the same fill. Two highlighted rows, two shapes. Evidence:
`visual/find/03.png`, `04.png`. Owner: graphty app.

**8. "linked" in Analyze leads to Louvain first.** The new search words do find Shortest path, but
it is the last of three results and Louvain, matched by its description, is the marked Enter
option. Two results carry the same blue "Start here" badge, so the badge does not single anything
out. Evidence: `visual/path/02.png`. Owner: graphty app.

**9. The out-of-date mark is still the quietest type on the screen.** "Data changed since this
run" is about 8 px gray beside a blue Rerun; the key's titles read "Size: PageRank, out of date" in
its smallest text; the old histogram and Top 10 stay at full contrast. Evidence:
`visual/replace/06.png`. Owner: graphty app. Unchanged since round 2.

**10. The selection halo is a translucent disc that tints and rings the wrong node.** Farah, behind
Chloe, turns mustard while Chloe is selected; with 10 nodes selected the discs cover ties and the
bottoms of labels, and Ivan's halo is cut by Hana's sphere. Evidence: `visual/notes/04.png`,
`visual/path/09.png`, `10.png`. Owner: graphty-element (selection drawing). Unchanged.

**11. Selection has two looks.** Nodes get a yellow disc; edges get blue rails on either side of
the gray line. Evidence: `visual/edge/02.png` against `visual/path/08.png`;
`visual/longnames/07.png`. Owner: graphty-element (default selection style). Unchanged.

**12. The two-table source's inspector has no "..." menu.** friends.csv's has one; "people.csv and
messages.csv" has none. Evidence: `visual/twotables/08.png`. Owner: graphty app. Unchanged.

**13. Long edge names read alike in lists.** In the selected-edges list the value column's long
name takes the header row, so "Edge" shrinks to one stroke, and rows read "Northern Regional
Distributi..." twice and "Harbor Street Warehouse -> ..." twice; the find list shows two identical
"Northern Regional Distribution C..." rows. Hover now gives the whole name. Evidence:
`visual/longnames/05.png`, `07.png`. Owner: graphty app.

**14. The header chip does not look or point like a control.** "20 of 20 nodes" is plain text with
no fill at rest; the pointer stays an arrow over it while its tooltip says "Click to open Filters";
the tooltip covers the place title and the key's heading. Evidence: `visual/filters/09.png`,
`10.png`. Owner: graphty app.

**15. One table, two emphasis rules.** Edge inspector: From and To bright labels, dim values;
weight dim label, bright value. Path run: "Nodes in order" bright names, dim numbers; "Made with"
dim labels, bright values. Evidence: `visual/edge/02.png`, `visual/path/07.png`. Owner: graphty
app. Unchanged.

**16. The neighbor list changes shape with the hop count.** At 1 hop it has "Neighbor / weight" and
a value per row; at 2 hops it is a bare list with no hop distance. Evidence: `visual/path/09.png`
against `10.png`. Owner: graphty app. Unchanged.

**17. Step editor labels float between fields.** Each label sits about 10 px from the field above
and 10 px from its own field. Evidence: `visual/filters/05.png`. Owner: compact-mantine if the
editor uses the default field wrapper, otherwise graphty app. Unchanged.

**18. Notes: the delete control is as loud as the note.** Full-contrast trash at rest, no divider,
"Graph" and "Chloe" tags as blue pills that read as buttons. Evidence: `visual/notes/06.png`.
Owner: graphty app. Unchanged.

**19. Top 10 values have ragged digits.** "0.0555", "0.0535", after the rerun "0.0519", among
five-digit values. Evidence: `visual/replace/02.png`, `07.png`. Owner: graphty app. Unchanged.

**20. The Path popover covers the lower half of the drawing.** Evidence: `visual/path/03.png`.
Owner: graphty app. Unchanged.

**21. Overview values wrap.** "Edges per node 3 to 6, mean 3.667" wraps on the two-table graph
(it fits for friends, "mean 4.1"). Evidence: `visual/twotables/06.png`. Owner: graphty app.

### Severity 1

**22. The right panel has three left edges** (section text 1217, field labels and prose 1225, row
labels 1233). Evidence: `visual/replace/02.png`, `visual/twotables/08.png`. Owner: graphty app.

**23. Backticks are set in proportional text** in the find box, the layer list and the key
("minutes >= `10`"), where a backtick reads as a stray quote. Evidence: `visual/find/07.png`.
Owner: graphty app.

**24. Edge and node titles carry an unexplained swatch, and edges are typed with "->".** Evidence:
`visual/edge/02.png`, `visual/path/08.png`. Owner: graphty app.

**25. The Filters heading is gray with no caret while empty, white with one once it holds a
step.** Evidence: `visual/filters/02.png` against `07.png`. Owner: graphty app.

**26. Notes empty state:** "No notes." is indented 8 px past its heading. Evidence:
`visual/notes/02.png`. Owner: graphty app.

**27. The import preview shifts:** the "to" column grows from about 75 to 140 px when only the
unmatched row shows, and the last column stretches across the page. Evidence:
`visual/twotables/04.png` against `05.png`. Owner: graphty app.

**28. Path nodes are flat black** and read as holes on the ranked drawing. Evidence:
`visual/path/07.png`. Owner: graphty-element (the path's suggested style).

**29. The chosen "Nodes" segment's blue dot touches the word**, with no gap. Evidence:
`visual/path/02.png`. Owner: graphty app.

**30. The Attribute list hangs about 9 px left of its field.** Evidence: `visual/filters/04.png`.
Owner: compact-mantine (Select dropdown position).

**31. The toolbar's corner touches the bottom node:** the framing leaves no room for the toolbar.
Evidence: `visual/longnames/05.png`. Owner: graphty app (the canvas inset it gives the element).

**32. The key keeps an entry with nothing drawn:** after filtering to Gus's neighbors no path node
is shown, yet "Shortest path, full graph" stays. Evidence: `visual/path/11.png`. Owner: graphty app.

**33. The Replace page names the new file, its button the old one** ("Replace: friends-v2.csv"
against "Replace friends.csv"). Evidence: `visual/replace/04.png`, `05.png`. Owner: graphty app.

**34. A node's "id" label is squeezed to two letters** while its long value wraps right-aligned.
Evidence: `visual/longnames/09.png`. Owner: graphty app.

## Counts

2 at severity 3, 19 at severity 2, 13 at severity 1: 34 against round 2's 25. Most of the rise is
not new damage: findings 2, 3, 6, 7, 8, 13 (find list), 29 to 34 were first seen on this walk, and
several of them (3, 6, 7, 8) sit on round 3's own changes. Fixed since round 2: the starting value
of a "+" line style, the selection layer's name, the checkbox target, the find box's dead end, the
key's scope words at rest, and the find-list tooltips.
