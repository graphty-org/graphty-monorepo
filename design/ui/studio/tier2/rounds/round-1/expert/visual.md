# Tier 2 round 1: visual design walkthrough

Every tier 2 screen walked as a visual designer (hierarchy, spacing, alignment, typography, color,
density, polish) on build 946256efb876 (graphty@0.8.56), served from
`.study-builds/tier2-r1d4-946256efb/`, at 1440 x 900, before any session was read. Screenshots are
in `visual/<walk>/NN.png` beside this file; each walk folder also holds its `session.json`.

Severity is 0 to 4 (Nielsen). Owner is the package where the fix belongs.

| Walk                 | Start                         | Screens                                                                  |
| -------------------- | ----------------------------- | ------------------------------------------------------------------------ |
| `visual/filters/`    | friends.csv, ranked           | Data place, step editor (new and off), step on and off, header chip      |
| `visual/path/`       | friends.csv, ranked, names on | Path popover, finished path and its Values, neighbor list, filter to it  |
| `visual/edge/`       | friends.csv, ranked, names on | Edge inspector, its menu, Select endpoints                               |
| `visual/notes/`      | friends.csv, ranked           | Notes empty, note form, one note, two notes                              |
| `visual/twotables/`  | empty                         | Import page with two tables and the unmatched row; Data page after Load  |
| `visual/replace/`    | friends.csv, ranked           | PageRank Values, source menu, "Replace: friends-v2.csv", out-of-date run |
| `visual/find/`       | bus-stops.csv, ranked         | Find box: column hint, refused rule, accepted rule and its selection     |
| `visual/longnames/`  | long-names.csv                | Data place, find box and node inspector with 40-character names          |

## Findings

### Severity 3

**1. An out-of-date run looks current.** After Replace, the only sign is a strip at the top of the
inspector, "Data changed since this run", set in the smallest text on the panel (about 9 px, gray
on a gray only slightly lighter than the panel), with no color or icon. The drawing's colors, the
key's range and the Top 10 values below it are all at full contrast, and the tree marks the run by
swapping its icon for a gray clock of the same size and color. The most important fact on the
screen is the quietest one. Evidence: `visual/replace/07.png`; the same clock icon after Filter to
neighbors, `visual/path/11.png`. Owner: graphty app.

**2. Drawn names cover each other.** With names on, "Chloe" is drawn over "Farah" (only "ah"
shows), "Dev" over "Eli" (only "E" shows), and "Hana" sits on Ivan's dot. A reader cannot name
the person behind. Evidence: `visual/path/01.png`, `visual/path/06.png`, `visual/edge/02.png`.
Owner: graphty-element (label placement and the layout overlap under it).

**3. Find results are cut off with no ellipsis.** With long names, each result runs off the
panel's edge mid-letter and a horizontal scrollbar appears. The three edge results all start with
the same place names, so the cut hides the one part that tells them apart ("Harbor Street
Warehouse -> Eastside" ...). Evidence: `visual/longnames/05.png`. Owner: graphty app.

### Severity 2

**4. The filter chip in the header does not look like a control.** "19 of 20 nodes" with a funnel
icon is plain text between Redo and the lock, at the same weight as "Local only"; it gains a
background only under the pointer. Evidence: `visual/filters/09.png` against `10.png`. Owner:
graphty app.

**5. Segmented controls mark the chosen option too faintly.** The chosen segment is an outline on
the darker ground and the others sit on the lighter track, so the chosen one reads as the empty
one. With two options (Follow: Out / All) it is a coin toss. The import page's Add / Leave out
pair uses the same outline-only cue. Evidence: `visual/path/05.png`, `visual/path/10.png`,
`visual/twotables/05.png`. Owner: compact-mantine (SegmentedControl); the Add / Leave out pair in
the graphty app should use the same fixed control.

**6. Selecting a node repaints its fill.** Selection adds a yellow halo and also tints the fill:
black path nodes turn olive, a blue node turns khaki-brown, orange PageRank nodes turn mustard. The
node's own color, which carries meaning, is lost while selected, and the tinted color reads as a
third category. Evidence: `visual/path/09.png`, `visual/notes/04.png`, `visual/longnames/06.png`.
Owner: graphty-element (selection drawing).

**7. A selection halo can mark the wrong dot.** Farah is selected, but she sits behind Chloe, so
the halo rings Chloe. Evidence: `visual/notes/04.png`. Owner: graphty-element.

**8. One table, two emphasis rules.** In the edge inspector, From and To have bright labels and dim
values, while weight has a dim label and a bright value. The rule-selection list does the same:
edge names dim, minutes bright. Evidence: `visual/edge/02.png`, `visual/find/05.png`. Owner:
graphty app.

**9. The neighbor list changes shape with the hop count.** At 1 hop it has a "Neighbor / weight"
header and a value per row; at 2 hops the header and values disappear and it becomes a bare list of
names with no hop distance. Evidence: `visual/path/09.png` against `visual/path/10.png`. Owner:
graphty app.

**10. "Filter to neighbors" shows that it is on only by turning blue.** Its label does not change
and no control to undo it appears beside it. Evidence: `visual/path/10.png` against
`visual/path/11.png`. Owner: graphty app.

**11. The import page jumps when the unmatched row is shown.** Direction, Cancel and Load move from
the bottom edge (y 876) to the middle of the page (y 458) because the preview shrinks to one row.
Evidence: `visual/twotables/05.png` against `06.png`. Owner: graphty app.

**12. Step editor labels float between fields.** Each label ("Attribute", "Is", "Value") is about
as far from the field above as from its own field below, so the eye does not pair them; "Is"
alone as a label adds to it. Evidence: `visual/filters/04.png`, `visual/filters/08.png`. Owner:
compact-mantine (field label spacing) if the editor uses the default field wrapper, otherwise the
graphty app.

**13. Notes: the delete control is as loud as the note.** Every note shows a full-contrast trash
icon at rest; notes have no divider between them; the "Graph" and "Farah" tags are blue pills
that look like buttons. Evidence: `visual/notes/07.png`. Owner: graphty app.

**14. Top 10 values have ragged digits.** "0.0555" and "0.0535" sit among five-digit values
("0.05324"), right-aligned, so the decimals do not line up and the shorter ones look like a
different kind of number. Evidence: `visual/replace/02.png`. Owner: graphty app (number formatting).

**15. The Path popover covers the path.** It sits over the lower third of the drawing; opened again
after a run it hides the path it found, and its From and To are empty while the inspector beside it
says Chloe to Milo. Evidence: `visual/path/05.png`, `visual/path/07.png`. Owner: graphty app.

**16. Overview values wrap or crowd their labels.** "Edges per node" wraps its value onto two lines
("3 to 6, mean / 3.667") and on friends.csv the value nearly touches the label. Evidence:
`visual/twotables/07.png`, `visual/filters/06.png`. Owner: graphty app.

### Severity 1

**17. The right panel has four left edges.** Section headings at x 1217, field labels and notes at
1225, row labels at 1233; the Overview's "The counts below are for the whole graph." starts 8 px
left of the rows it describes. Evidence: `visual/filters/06.png`, `visual/path/06.png`,
`visual/path/10.png`. Owner: graphty app.

**18. Edge title.** "Gus -> Ivan" is typed with "->", and a gray square swatch sits unexplained
between the edge icon and the title (the node inspector has the same swatch). An arrow icon would
read as direction. Evidence: `visual/edge/02.png`. Owner: graphty app.

**19. The rule language's backticks are set in body text.** "minutes > `9`" in a proportional font
makes the backtick hard to tell from an apostrophe; the refused-rule message also starts at x 65,
left of the hint text at 73. Evidence: `visual/find/03.png`, `visual/find/04.png`. Owner: graphty
app.

**20. Section headers change color with content.** "Filters" is gray with no caret while empty and
white with a caret once it holds a step; Sources and Attributes are always white. Evidence:
`visual/filters/02.png` against `06.png`, `visual/twotables/08.png`. Owner: graphty app.

**21. A step that is off keeps the selected-row background** after its editor closes. Evidence:
`visual/filters/07.png`. Owner: graphty app.

**22. Notes empty state.** "No notes." is indented 8 px past its heading and gives no hint of how to
add one. Evidence: `visual/notes/02.png`. Owner: graphty app.

**23. "Values" tab holds a section called "Values".** Evidence: `visual/replace/02.png`. Owner:
graphty app.

**24. The histogram is wider than the table under it.** Its bars and axis run to x 1432; every
value column ends at 1416. Evidence: `visual/replace/02.png`. Owner: graphty app.

**25. The left-out row's inspector drops its warning.** The list marks "1 row left out" with a
red-orange triangle; its inspector heading uses a plain document icon. Evidence:
`visual/twotables/09.png`. Owner: graphty app.

**26. Import page proportions.** Column role boxes are 160 px wide while the preview table stretches
its last column to about 900 px; "Each row is" puts a format select ("CSV auto") right after a
two-segment choice, where it reads as a third segment. Evidence: `visual/twotables/05.png`,
`visual/replace/05.png`. Owner: graphty app.

**27. A long attribute name runs past its selected-row highlight.** Evidence:
`visual/longnames/04.png`. Owner: graphty app.

**28. The header chip's tooltip covers the key's heading.** Evidence: `visual/filters/10.png`.
Owner: graphty app.

**29. Path nodes are flat black.** On the ranked drawing they read as holes rather than as
highlighted people, and the black edge is lost where it crosses the black dots. Evidence:
`visual/path/06.png`. Owner: graphty-element (the path's suggested style).

**30. Letter spacing breaks inside words at device scale 1** ("Attrib ute", "n odes", "Valu es").
Check at device scale 2 before acting: it may be the headless browser's font hinting rather than
the build. Evidence: `visual/filters/08.png`, `visual/filters/09.png`. Owner: compact-mantine
(font) if it holds at scale 2.

## Not covered

- 1280 x 800: the walking tool opens only 1440 x 900; the scripted audit captures the narrower size.
- The last screenshot of each successful session: not seen, so this walk stays apart from the
  sessions.
