# Tier 2 round 5: visual design walkthrough

Every tier 2 screen walked as a visual designer (hierarchy, spacing, alignment, typography, color,
density, polish) on the round 5 study build 8c015b806086 (graphty@0.8.65), served from
`.study-builds/tier2-r5-8c015b806/`, at 1440 x 900 and again at 1280 x 800, before any session was
read. Screenshots are in `visual/<walk>/NN.png` beside this file; every walk's `session.json` reads
`8c015b806086 graphty@0.8.65`. Small text was read from crops enlarged 2x to 3x. The screenshots
are at device scale 1, which spaces some letters oddly ("Attrib ute"); that is not reported.

Severity is 0 to 4 (Nielsen). Owner is the package where the fix belongs.

| Walk                     | Start                              | Screens                                                                                                                                                                                                   |
| ------------------------ | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `visual/path/`           | friends.csv, ranked, names on      | Toolbar Filters, step editor (new, on, off), header chip, Analyze "path" and "linked", Path popover, finished path, a node, neighbor list at 1 and 2 hops, Filter to neighbors, Notes empty, note form, two notes, layer list, edge inspector, out-of-date runs and their Values |
| `visual/find/`           | bus-stops.csv, ranked, names on    | Find box: "10" (the "or more" row), a line color on its layer, a typed rule, "minutes >> 3", a rule on a missing column, a refused rule, a name search                                                     |
| `visual/replace/`        | friends.csv, ranked                | Source inspector and table panel, its menu, Replace page, out-of-date run, Edit source after a replacement, Add page with repeated edges                                                                   |
| `visual/twotables/`      | empty                              | Import page with two tables, the unmatched row, Data place, the two-table source inspector, the left-out row                                                                                              |
| `visual/longnames/`      | empty, then long-names.csv         | Find list for a number, Values rows, an edge's and a node's inspector, the selected-edges list                                                                                                            |
| `visual/table/`          | friends.csv, ranked                | Data table under a filter step                                                                                                                                                                            |
| `visual/narrow/`         | friends.csv, ranked, names, 1280 x 800 | Find list for a number, Path popover, finished path, a filter step after the path, the out-of-date path run, neighbor list, a note, an edge's inspector                                                |
| `visual/narrow-tables/`  | empty, 1280 x 800                  | Import page with two tables and the unmatched row                                                                                                                                                         |

## Checked and working on this build

- A bare number on bus stops ("10", no 10 in minutes) offers one row, "minutes is 10 or more (3)",
  marked as Enter's option; Enter selects the three edges with no refusal (`visual/find/02.png`,
  `03.png`).
- That row's layer is named "minutes >= `10`" in the layer list, the inspector and the key, the
  same spelling a typed rule gets; no field path shows (`visual/find/06.png`).
- The data table under a filter step reads "20 of 41 edges" and lists only the kept edges
  (`visual/table/04.png`).
- The "No match" hint is gray body text with a monospace example, no longer red
  (`visual/find/10.png`).
- The step editor has one help line, "Keeps edges that pass and the nodes at their ends."
  (`visual/path/05.png`).
- An edge's inspector holds From, To and the weight only (`visual/path/30.png`).
- Nothing at 1280 x 800 cuts a word on the import page, the neighbor list, the note or the edge
  inspector (`visual/narrow-tables/03.png`, `visual/narrow/15.png`, `17.png`, `18.png`).

## Findings

### Severity 3

**1. Drawn names and nodes cover each other and the ties under them.** "Chloe" covers "Farah"
(only "ah" shows), "Dev" covers "Eli", "Hana" sits on Ivan's node; Quinn, not on the Theo-to-Milo
path, is drawn on the black Ravi -> Pia line. On bus stops the "Stadium" name covers the selected
Depot -> Station tie, and "Clinic", "Museum" and "Library" sit on ties ending at them. Evidence:
`visual/path/01.png`, `18.png`, `visual/find/03.png`. Owner: graphty-element (label placement and
the layout overlap under it). Unchanged.

**2. The key grows over the drawing and covers a name.** After a line color on the "10 or more"
layer the key gains a block and its bottom edge cuts "Depot" to "epot". Evidence:
`visual/find/06.png`, `07.png`. Owner: graphty app (the key's placement over the canvas).
Unchanged.

### Severity 2

**3. A path broken by a filter keeps a key that says nothing, and its strip reads "20 shown".**
At 1280 x 800, a "weight is at least 3" step after a Theo-to-Milo path hides two of the path's four
ties; the black nodes stand apart, the key still reads plain "Shortest path", and the run's strip
says "Ran on 20 nodes; 20 shown now" beside Rerun, which reads as nothing changed. The layer list
does show the clock. The rule behind the key's scope words and the strip compares node counts
only; a step that keeps every node and drops ties is invisible to it. Evidence:
`visual/narrow/11.png`, `13.png`. Owner: graphty app (the scope rule for the key and the strip).
New on screen; the node-only rule was reported in round 3.

**4. The out-of-date state has three looks, all quiet.** A dim clock in the layer list; the key
appends ", full graph" after a neighbor filter but ", out of date" after a replacement, in 9 px
titles; the strip's text is about 8 px gray beside a blue Rerun; Top 10 and Nodes in order keep
full contrast. Evidence: `visual/path/32.png`, `34.png`, `visual/replace/09.png`. Owner: graphty
app. Unchanged.

**5. The neighbor list and its rings ignore the active filter, and Filter to neighbors then draws
a node with no tie.** With "weight is at least 3" on, Gus's list reads "Gus and 4 connections" with
Dev and Ivan (weight 1), both ringed; after Filter to neighbors, Dev floats alone and Ivan has no
tie to Gus. Evidence: `visual/path/20.png`, `22.png`. Owner: to be settled by a script
(graphty-element if its neighborhood ignores the filter, the graphty app if it asks for the
unfiltered one). Unchanged, with the floating node new.

**6. An off step's editor makes "turn it back on" the loudest thing on the panel.** Unticking a step
leaves its editor open with a blue primary "Save and turn on" although nothing was edited; the same
editor on an on step with no edit shows a disabled gray "Save step". The reader's own choice
(off) is answered by the most saturated control inviting its undo. Evidence: `visual/path/10.png`
against `09.png`. Owner: graphty app. New.

**7. At 1280 x 800, Find path shrinks the drawing to about half its size.** Before, the friends
drawing fills the canvas with names at about 11 px; after Find path it sits in the middle third
with names at about 8 px, and it stays there after the layout settles. At 1440 x 900 the same run
kept the frame. Evidence: `visual/narrow/02.png` against `09.png`; `visual/path/15.png` against
`18.png`. Owner: not settled (the framing the app asks for after a run, or the element's fit).
New.

**8. At 1280 x 800 the find box's Values rows are below the fold.** Typing "4" on friends lists
seven edges first; the rows that act on every match are reached only by scrolling. Evidence:
`visual/narrow/02.png`. Owner: graphty app (group order). Unchanged.

**9. With a long column name the two Values rows look the same.** Both cut to
"average_minutes_between_visits i...", so "is 12" and "is 12 or more" differ only in the cut part;
hovering gives the whole text. Evidence: `visual/longnames/05.png`, `08.png`. Owner: graphty app.
Unchanged.

**10. A problem with a load has two looks.** The Add page's repeated-ties line has the glyph while
its table row keeps a green check; the two-table page's unmatched line has no glyph and the glyph
sits on the table row; after Load, "1 row left out" has the glyph and the inspector's "Left out"
section has none. Evidence: `visual/replace/13.png`, `visual/twotables/05.png`, `09.png`. Owner:
graphty app. Unchanged.

**11. The Add page's second button names the old file:** "Replace friends-v2.csv" beside Load,
while the page adds friends.csv, so it reads as "replace with friends-v2". The Replace page's own
button was fixed to read "Replace" last round. Evidence: `visual/replace/13.png`. Owner: graphty
app. New on this page.

**12. A rule on a missing column answers like an empty rule.** "speed > 3" with Enter becomes
"=speed > `3`" in the box and "Nothing matches this rule", the same quiet gray as a valid rule with
no matches. Evidence: `visual/find/11.png`. Owner: not settled (whether the element reports a
missing column as its own code). Known before this round; unchanged.

**13. "Filter to neighbors" shows its done state as a disabled button**, gray, no tooltip.
Evidence: `visual/path/22.png`, `23.png`. Owner: graphty app. Unchanged.

**14. The selection halo is a translucent disc that tints the node behind it** (Farah behind
Chloe). Evidence: `visual/path/20.png`. Owner: graphty-element. Unchanged.

**15. Selection has two looks:** yellow discs for nodes, blue rails for edges. Evidence:
`visual/path/19.png` against `visual/find/03.png`. Owner: graphty-element. Unchanged.

**16. The two-table source's inspector has no "..." menu and no tabs**, unlike friends.csv's.
Evidence: `visual/twotables/09.png` against `visual/replace/03.png`. Owner: graphty app. Unchanged.

**17. Long edge names read alike.** In the selected-edges list the rows cut to "Northern Regional
Distributi..." and the header "Edge" shrinks to one stroke; in the find list an edge row cuts to
its first end only, with no "->" left. Tooltips give the whole text. Evidence:
`visual/longnames/18.png`, `06.png`. Owner: graphty app. Unchanged, with the find-list row new.

**18. The header chip does not look like a control at rest** and its tooltip covers the key's
title. Evidence: `visual/path/07.png`, `08.png`. Owner: graphty app. Unchanged.

**19. One table, two emphasis rules.** Edge inspector: From and To bright labels with dim values,
weight dim label with bright value; a node's inspector: "id" dim with a bright value, "Degree"
bright with a dim value; the selected-edges list: dim names, bright numbers. Evidence:
`visual/path/30.png`, `19.png`, `visual/find/03.png`. Owner: graphty app. Unchanged.

**20. The neighbor list changes shape with the hop count:** "Neighbor / weight" with values at 1
hop, a bare list at 2. Evidence: `visual/path/20.png` against `21.png`. Owner: graphty app.
Unchanged.

**21. The step editor's fields float and do not match.** Labels sit about as far from the field
above as from their own; the Value box has a lighter fill than the selects above it. Evidence:
`visual/path/05.png`. Owner: compact-mantine if the editor uses the default wrappers and inputs,
otherwise graphty app. Unchanged.

**22. Notes: tags outweigh the note.** Five names become two rows of blue pills under a one-line
note; the trash is full contrast at rest; two notes have no divider. Evidence:
`visual/path/28.png`. Owner: graphty app. Unchanged.

**23. Top 10 values have ragged digits** ("0.0555", "0.0535" among five-digit values). Evidence:
`visual/path/33.png`. Owner: graphty app. Unchanged.

**24. The Path popover covers the lower half of the drawing.** Evidence: `visual/path/15.png`,
`visual/narrow/07.png`. Owner: graphty app. Unchanged.

**25. Overview values wrap** ("3 to 6, mean 3.667" on two lines). Evidence:
`visual/twotables/08.png`. Owner: graphty app. Unchanged.

**26. Black on the key nearly vanishes.** The path's black swatch, and now a new line color's
starting black, sit on the key's near-black panel; "Shortest path" is a body-size row while the
PageRank blocks have 9 px titles. Evidence: `visual/path/18.png`, `visual/find/06.png`. Owner:
graphty app. Unchanged, with the line-color case new.

**27. The toolbar covers the bottom node.** On long-names the lowest node is cut by the toolbar.
Evidence: `visual/longnames/04.png`. Owner: graphty app (the canvas inset it gives the element).
Unchanged.

### Severity 1

**28. The Filters toolbar button sits in the view-toggle group** with List and Table but takes a
gray pressed look of its own while the Data place is open. Evidence: `visual/path/03.png`. Owner:
graphty app. Unchanged.

**29. The rule has two typefaces:** monospace in the find list's Enter option and hint,
proportional in the layer list and the key, with backticks in both. Evidence:
`visual/find/08.png`, `06.png`. Owner: graphty app. Unchanged.

**30. The refusal line is red with no glyph, and its last word wraps alone** ("(at character" /
"11)"). Evidence: `visual/find/12.png`. Owner: graphty app. Unchanged, with the wrap new.

**31. Panels have too many left edges.** The right panel has three (section text, field labels and
prose, row labels); the neighbor list has five (subtitle, title, Hops, names, "Back to Gus"); the
source inspector's "Left out" prose starts 8 px left of the "Loaded" rows. Evidence:
`visual/path/20.png`, `visual/twotables/09.png`. Owner: graphty app. Unchanged, with the neighbor
list new.

**32. The Filters heading is gray while empty, white once it holds a step.** Evidence:
`visual/twotables/08.png` against `visual/path/07.png`. Owner: graphty app. Unchanged.

**33. Step rows count two ways and wrap one word.** "20 to 20 nodes, 41 to 20 edges" wraps "edges"
alone onto a third line; the neighbor step beside it reads "20 to 5 nodes" with no edge count.
Evidence: `visual/path/22.png`. Owner: graphty app. Unchanged, with the second count new.

**34. Layer-list names and counts do not align:** names start at two places (rows with and without
a swatch) and Selection's count sits about 25 px right of the others. Evidence:
`visual/path/30.png`. Owner: graphty app. Unchanged.

**35. A path run's header uses the groups glyph,** not the path glyph Analyze shows. Evidence:
`visual/path/18.png` against `13.png`. Owner: graphty app. Unchanged.

**36. An unavailable Analyze row dims its name but not its icon** (Guided route). Evidence:
`visual/path/13.png`. Owner: graphty app. Unchanged.

**37. Notes empty state:** "No notes." is indented 8 px past its heading. Evidence:
`visual/path/24.png`. Owner: graphty app. Unchanged.

**38. The import preview shifts:** the "to" column widens when only the unmatched row shows.
Evidence: `visual/twotables/05.png` against `06.png`. Owner: graphty app. Unchanged.

**39. One number column, two alignments:** left-aligned in the import preview, right-aligned and
about 650 px from its row's names in the table panel. Evidence: `visual/replace/06.png` against
`03.png`. Owner: graphty app. Unchanged.

**40. "Edit source..." after a replacement opens a page titled "Replace: friends-v2.csv".**
Evidence: `visual/replace/11.png`. Owner: graphty app. Unchanged.

**41. Path nodes are flat black** and read as holes on the ranked drawing. Evidence:
`visual/path/18.png`. Owner: graphty-element (the path's suggested style). Unchanged.

**42. The Attribute list hangs about 9 px left of its field** and onto the canvas. Evidence:
`visual/path/04.png`. Owner: compact-mantine (Select dropdown position). Unchanged.

**43. The key keeps an entry with nothing drawn** ("Shortest path, full graph" after filtering to
Gus's neighbors). Evidence: `visual/path/22.png`. Owner: graphty app. Unchanged.

**44. The drawing is not refit after Filter to neighbors:** five nodes sit in the lower right.
Evidence: `visual/path/22.png`. Owner: graphty app (whether it asks the element to frame).
Unchanged.

**45. A node's "id" label is squeezed while its long value wraps right-aligned.** Evidence:
`visual/longnames/10.png`. Owner: graphty app. Unchanged.

**46. A step's state is 9 px gray, spelled two ways:** "Filter step  Off" in the editor header,
"off" in the row. Evidence: `visual/path/10.png`. Owner: graphty app. New.

**47. Run headers draw the run time in the link blue** ("ran Oct 11, 7:18:29 AM", and "From
friends.csv" on the graph), so plain facts look like links. Evidence: `visual/path/18.png`,
`32.png`. Owner: graphty app. New.

**48. A run's Label section puts a "Show" checkbox in its heading line**, unlike every other
section on that tab. Evidence: `visual/path/31.png`. Owner: graphty app. New.

**49. The edge inspector cuts the From name and the column name with long names**, while To shows
whole; tooltips give the text. Evidence: `visual/longnames/14.png`, `15.png`, `16.png`. Owner:
graphty app. New.

**50. The Everything layer's Color shows a swatch no node is drawn in** (6366F1 blue under every
orange node), with nothing saying a layer above sets it. Evidence: `visual/path/01.png`. Owner:
graphty app. New.

**51. The note form's "About" line runs bold names together** ("Dev Farah Gus Hana Ivan") with no
separator. Evidence: `visual/path/26.png`. Owner: graphty app. New.

**52. The table's filtered count is its smallest text:** "20 of 41 edges" is about 9 px gray beside
the tabs, the number a reader opens the table to check. Evidence: `visual/table/04.png`. Owner:
graphty app. New.

## Counts

2 at severity 3, 25 at severity 2, 25 at severity 1: 52 against round 4's 42. Fixed since round 4:
the field-path layer name (round 4's severity 3), the bare number offered as "=`10`" and refused,
the red "No match" line, and the table counting everything under a step. Like for like, the rise
is new ground and new walks, not decay: findings 3, 7 and 33's second count come from the 1280 x
800 walk going further than round 4's (which stopped at the find list) and from a filter added
after a path; 6, 46 and 52 sit on round 5's own changes (the off step, the table count); 11, 47 to
51 are screens or details not looked at before; 12 is a known claim now in this list. Of round 4's
severity 3s, two of three are still open, both on the owner's list or the app's key placement.
