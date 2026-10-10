# Tier 2 round 2: visual design walkthrough

Every tier 2 screen walked as a visual designer (hierarchy, spacing, alignment, typography, color,
density, polish) on the round 2 study build 8f0d5a6f7791 (graphty@0.8.61), served from
`.study-builds/tier2-r2d4-8f0d5a6f7/`, at 1440 x 900, before any session was read. Screenshots are
in `visual/<walk>/NN.png` beside this file; each walk folder also holds its `session.json`. Small
text was read from crops enlarged 2x to 4x.

Severity is 0 to 4 (Nielsen). Owner is the package where the fix belongs.

| Walk                | Start                         | Screens                                                                       |
| ------------------- | ----------------------------- | ----------------------------------------------------------------------------- |
| `visual/filters/`   | friends.csv, ranked           | Data place, step editor (new and saved), step on and off, header chip, tooltip |
| `visual/path/`      | friends.csv, ranked, names on | Path popover, finished path, a path node selected, neighbor list, filter to it |
| `visual/edge/`      | friends.csv, ranked, names on | Edge inspector (Values and Style), its menu, Select endpoints                 |
| `visual/notes/`     | friends.csv, ranked, names on | Notes empty, note form, a graph note, a node note, two notes                  |
| `visual/twotables/` | empty                         | Import page with two tables and the unmatched row, Data page, left-out row    |
| `visual/replace/`   | friends.csv, ranked           | PageRank Values, source inspector and menu, Replace page, out-of-date run     |
| `visual/find/`      | bus-stops.csv, ranked         | Find box: typed condition and its hint, accepted rule and its selection       |
| `visual/longnames/` | empty, then long-names.csv    | Import page, Data place, find list, a rule selecting every edge               |

## Findings

### Severity 3

**1. Drawn names and nodes cover each other.** With names on, "Chloe" is drawn over "Farah" (only
"ah" shows), "Dev" over "Eli" (only "E" shows), and the "Hana" label sits on Ivan's dot, so a
reader cannot name the person behind. In long-names.csv two nodes are drawn one inside the other.
Evidence: `visual/path/01.png`, `visual/edge/02.png`, `visual/longnames/05.png`. Owner:
graphty-element (label placement and the layout overlap under it). Deferred on purpose; expected
to stay open.

### Severity 2

**2. The out-of-date mark is still the quietest type on the screen.** After Replace, the canvas
key's titles read "Size: PageRank, out of date" in the key's smallest text and the same color as
every other title, so the words are there but nothing makes them read as a state. The inspector
strip "Data changed since this run" is still about 8 px gray, but it now carries a blue Rerun
button, the most saturated thing on the panel, which is why this drops from 3 to 2. The same state
reached by a filter reads "PageRank on 20 nodes" in the key, a second phrasing of "this run does
not describe what is drawn", and the tree marks both runs only by swapping their icon for a gray
clock. Evidence: `visual/replace/07.png`, `visual/replace/09.png`, `visual/path/09.png`. Owner:
graphty app.

**3. The selection halo is a translucent disc that tints what lies behind it.** The node's own
color is kept now (Ava stays black, Farah stays brown), but the halo is a see-through yellow disc
wider than the node, so an unselected node behind it changes color: Farah, behind Chloe, reads
mustard while only Chloe is selected. With 15 nodes selected the discs (Hana's is about 90 px
across) cover edges, arrowheads and the bottoms of neighbors' labels. A halo on a node behind
another still rings the front one: Farah is selected, Chloe is ringed. Evidence:
`visual/path/07.png` (Chloe and Farah), `visual/path/08.png`, `visual/notes/06.png`. Owner:
graphty-element (selection drawing).

**4. Selection has two looks.** A selected node gets a yellow halo; a selected edge becomes a pair
of blue rails on either side of its gray line, thick enough to swallow its arrowhead. One idea,
two colors and two shapes. Evidence: `visual/edge/02.png`, `visual/find/06.png`,
`visual/longnames/08.png`, against `visual/edge/04.png`. Owner: graphty-element (default selection
style).

**5. The two-table source's inspector has no "..." menu.** friends.csv's source inspector has the
header "..." with Edit source and Replace with file, as every other inspector does; the
"people.csv and messages.csv" source's inspector header has none. One kind of inspector, two
headers. Evidence: `visual/twotables/11.png` against `visual/replace/04.png`, `05.png`. Owner:
graphty app.

**6. The selected-edges list cuts long names so rows read the same, and its header collapses.**
With every edge of long-names.csv selected, the value column's long name takes the header row, so
the "Edge" heading shrinks to a single stroke; each edge name is cut at about 28 characters, so
"Northern Regional Distributi..." and "Harbor Street Warehouse -> ..." each appear twice and differ
only by their numbers. The find list's own rows now end in "..." correctly. A hover tooltip on
these rows was not checked. Evidence: `visual/longnames/08.png`. Owner: graphty app.

**7. The filter chip in the header does not look like a control.** "19 of 20 nodes" with a funnel
icon is plain text between Redo and the lock; it gains a background only under the pointer.
Evidence: `visual/filters/07.png` against `visual/filters/12.png`. Owner: graphty app.

**8. One table, two emphasis rules.** In the edge inspector From and To have bright labels and dim
values, while weight has a dim label and a bright value; the selected-edges list does the same
(edge names dim, minutes bright), while Overview, Summary and Made with use dim labels and bright
values. Evidence: `visual/edge/02.png`, `visual/find/06.png`. Owner: graphty app.

**9. The neighbor list changes shape with the hop count.** At 1 hop it has a "Neighbor / weight"
header and a value per row; at 2 hops header and values go and it becomes a bare list of names
with no hop distance. Evidence: `visual/path/07.png` against `visual/path/08.png`. Owner: graphty
app.

**10. "Filter to neighbors" shows that it is on only by turning blue.** Its label stays the same
and nothing beside it undoes it. Evidence: `visual/path/08.png` against `visual/path/09.png`.
Owner: graphty app.

**11. Step editor labels float between fields.** Each label ("Attribute", "Is", "Value") sits
8 px under the field above and 8 px over its own field, so the eye does not pair them; "Is" alone
as a label adds to it. Evidence: `visual/filters/05.png`, `visual/filters/13.png`. Owner:
compact-mantine (field label spacing) if the editor uses the default field wrapper, otherwise the
graphty app.

**12. Notes: the delete control is as loud as the note.** Every note shows a full-contrast trash
icon at rest, notes have no divider between them, and the "Graph" and "Farah" tags are blue pills
that read as buttons. Evidence: `visual/notes/08.png`. Owner: graphty app.

**13. Top 10 values have ragged digits.** "0.0555" and "0.0535" sit among five-digit values,
right-aligned, so the decimals do not line up and the short ones look like another kind of number.
Evidence: `visual/replace/02.png`. Owner: graphty app (number formatting).

**14. The Path popover covers the lower half of the drawing.** It opens over Ava, Gus, Ben, Hana
and the path's own middle. Evidence: `visual/path/04.png`. Owner: graphty app.

**15. Overview values wrap.** "Edges per node" wraps its value onto two lines ("3 to 6, mean /
3.667"). Evidence: `visual/twotables/08.png`. Owner: graphty app.

### Severity 1

**16. The right panel has three left edges.** Section text at x 1217 (the histogram's axis and its
"20 of 20 have a value" line), field labels at 1225 (Damping factor, the Left out sentences), row
labels at 1233. Evidence: `visual/replace/02.png`, `visual/twotables/10.png`. Owner: graphty app.

**17. Edge title.** "Gus -> Ivan" is typed with "->", and a gray square swatch sits unexplained
between the edge icon and the title. Evidence: `visual/edge/02.png`. Owner: graphty app.

**18. The typed rule's backticks are set in body text.** The hint under the box now shows the
example in monospace, but the box itself shows "=minutes >= `10`" in the proportional font, where
a backtick is hard to tell from an apostrophe. Evidence: `visual/find/03.png` against
`visual/find/05.png`. Owner: graphty app.

**19. Section headers change color with content.** "Filters" is gray with no caret while empty and
white with a caret once it holds a step; Sources and Attributes are always white. Evidence:
`visual/filters/03.png` against `visual/filters/07.png`, `visual/twotables/09.png`. Owner: graphty
app.

**20. Notes empty state.** "No notes." is indented 8 px past its heading and gives no hint of how
to add one. Evidence: `visual/notes/02.png`. Owner: graphty app.

**21. "Values" tab holds a section called "Values".** Evidence: `visual/replace/02.png`. Owner:
graphty app.

**22. A long attribute name runs past its selected-row highlight.** Evidence:
`visual/longnames/05.png`. Owner: graphty app.

**23. The header chip's tooltip covers the key's heading and the place title.** Evidence:
`visual/filters/12.png`. Owner: graphty app.

**24. Path nodes are flat black.** On the ranked drawing they read as holes, and the black path
edge is lost where it meets them. Evidence: `visual/path/05.png`. Owner: graphty-element (the
path's suggested style).

**25. The import preview shifts.** Column widths change between the full preview and the
unmatched-row view ("to" grows from 65 to 140 px), "File settings" moves 15 px left when the
preview's scrollbar appears, and the last column stretches to fill the page. Evidence:
`visual/twotables/06.png` against `07.png`, `visual/twotables/04.png`. Owner: graphty app.

**26. Two bound values, two looks.** In a run's Style tab, Color's binding shows as a left-aligned
"PageRank" chip; Size's shows "1 to 3" centered in a box inside the field's own box. Evidence:
`visual/find/04.png`. Owner: graphty app.

**27. Letter spacing breaks inside words at device scale 1** ("Weig ht", "Valu es", "Attrib ute").
Still to check at device scale 2 before acting. Evidence: `visual/path/04.png`,
`visual/replace/02.png`, `visual/filters/05.png`. Owner: compact-mantine (font) if it holds at
scale 2.

## Fixed since round 1, seen on this build

- A segmented control's chosen side is a white fill with bold text, the same in Hops, Follow, Each
  row is, Add / Leave out and Higher means (`visual/path/07.png`, `visual/twotables/06.png`).
- Selecting a node no longer repaints its fill: a black path node stays black
  (`visual/path/06.png`).
- The import page's footer stays at the bottom when the unmatched row is shown
  (`visual/twotables/07.png`).
- Find result rows end in "..." with no sideways scroll (`visual/longnames/06.png`).
- The left-out row's inspector carries the warning triangle its row has
  (`visual/twotables/10.png`).
- The histogram ends where the values under it end (`visual/replace/02.png`).
- "The counts below are for the whole graph." lines up with the rows it describes
  (`visual/filters/07.png`).
- A single file's source inspector has the "..." menu, styled as the other inspectors' menus
  (`visual/replace/05.png`).
- The find box's hint shows the rule example in monospace at body size (`visual/find/03.png`).

## Not covered

- 1280 x 800 and 900 x 700: this walk ran at 1440 x 900 only; the scripted audit captures the
  narrower sizes.
- Keyboard focus marks: walked by pointer only, apart from the find box and the note shortcuts.
- The last screenshot of each session: not seen, so this walk stays apart from the sessions.
