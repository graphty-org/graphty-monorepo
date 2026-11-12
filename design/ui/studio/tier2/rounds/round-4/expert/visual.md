# Tier 2 round 4: visual design walkthrough

Every tier 2 screen walked as a visual designer (hierarchy, spacing, alignment, typography, color,
density, polish) on the round 4 study build 5277e2cbe1bd (graphty@0.8.64), served from
`.study-builds/tier2-r4d1-5277e2cbe/`, at 1440 x 900, with one walk again at 1280 x 800, before
any session was read. Screenshots are in `visual/<walk>/NN.png` beside this file; each walk folder
also holds its `session.json` (every one reads `5277e2cbe1bd graphty@0.8.64`). Small text was read
from crops enlarged 2x to 3x. The screenshots are at device scale 1, which spaces some letters
oddly ("Attrib ute"); that is not reported.

Severity is 0 to 4 (Nielsen). Owner is the package where the fix belongs.

| Walk                | Start                          | Screens                                                                                                                                                                  |
| ------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `visual/path/`      | friends.csv, ranked, names on  | Toolbar Filters button, step editor (new), step on and off, header chip, Analyze "path" and "linked", Path popover, finished path, a node, neighbor list at 1 and 2 hops, Filter to neighbors, Notes empty, note form, saved note, layer list, edge inspector and its menu |
| `visual/find/`      | bus-stops.csv, ranked, names   | Find box: a bare number with no match, a number with value rows, the "or more" row, a color and a width on rule layers, a typed rule, a refused rule                      |
| `visual/replace/`   | friends.csv, ranked            | PageRank Values, source inspector and table panel, Replace page, out-of-date run, Edit source, Add page with repeated edges                                               |
| `visual/twotables/` | empty                          | Import page with two tables and the unmatched row, Data place, the two-table source inspector                                                                             |
| `visual/longnames/` | empty, then long-names.csv     | Find list with a 30-character column, the "or more" row, selected-edges list, a node's inspector                                                                          |
| `visual/narrow/`    | friends.csv at 1280 x 800      | Find list for a number                                                                                                                                                   |

## Checked and working on this build

- The canvas toolbar has a Filters button (tooltip "Filters"); it opens the Data place with a new
  step's editor open (`visual/path/02.png`, `04.png`).
- A step over an edge column now counts edges: the step reads "20 to 20 nodes, 41 to 20 edges" and
  the header chip "20 of 20 nodes, 20 of 41 edges" (`visual/path/08.png`).
- Analyze shows one "Start here" badge while a filter is typed, and Shortest path comes first for
  both "path" and "linked" (`visual/path/12.png`, `13.png`).
- The repeated-ties line on the Add page has the warning glyph in the danger color
  (`visual/replace/19.png`).
- A number in the find box gives a Values row and an "or more" row of the same shape, glyph and
  size, with "Select where" gone from the visible text; neither row is cut on friends or bus-stops,
  at 1440 x 900 or 1280 x 800 (`visual/find/03.png`, `visual/narrow/03.png`).
- The Replace page's button now reads "Replace", not the old file's name (`visual/replace/08.png`).

## Findings

### Severity 3

**1. The "or more" row names its layer by a field path.** Picking "minutes is 5 or more (10)" and
adding a line color makes a layer named "data.minutes >= `5`" in the layer list, the inspector
header, the key's title and its row. A rule typed into the find box makes "minutes >= `10`" on the
same screen, so one kind of rule has two spellings, and the new one shows the element's field path
on T22's success path. The element builds the row's target text from the stored column key
(`atLeastOf` in `graphty-element/src/session/query.ts` at 5277e2cbe: `` `=${quotePath(path)} >=
...` ``), not in the form the find box's own rule option uses. Evidence: `visual/find/07.png`,
`08.png`, `09.png`, `11.png`. Owner: graphty-element (the target's rule text). New on this build.

**2. Drawn names and nodes cover each other, and a node off the path sits on the path's line.**
Quinn is not on the Theo-to-Milo path, but its node is drawn on the black Ravi -> Pia line, which
runs straight through it, so the drawing reads as if the path passes through Quinn; only the
Values list says otherwise. "Chloe" covers "Farah" (only "ah" shows), "Dev" covers "Eli", "Hana"
sits on Ivan's node, and on bus-stops the "Stadium" label covers the Depot -> Station tie.
Evidence: `visual/path/17.png`, `01.png`, `visual/find/04.png`. Owner: graphty-element (label
placement and the layout overlap under it). Unchanged.

**3. The key grows over the drawing and covers a name.** After a color on a rule's layer the key
gains a block and its bottom edge cuts the "Depot" label to "epot"; with a second layer it stays
there. Evidence: `visual/find/07.png`, `08.png`, `11.png`. Owner: graphty app (the key's placement
over the canvas). Unchanged.

### Severity 2

**4. A problem with a load has two looks, now inverted.** On the Add page the repeated-ties line
has the glyph, while its table row in Tables keeps a green check, so the page says "fine" and
"warning" about the same table. On the two-table import page the unmatched-row line has no glyph
and the glyph sits on the table row instead; after Load the Sources row "1 row left out" has the
glyph and the source inspector's "Left out" section has none. Evidence: `visual/replace/19.png`
against `visual/twotables/03.png`, `07.png`. Owner: graphty app. Round 3's weight problem is fixed;
what is left is one look for one idea.

**5. At 1280 x 800 the find box's Values rows are below the fold.** Typing "4" on friends lists 7
edges first; the "weight is 4 or more (12)" row, the round's new answer to a typed number, is
reached only by scrolling the list. The rows that act on all matches sit under the rows that pick
one. Evidence: `visual/narrow/02.png`, `03.png`. Owner: graphty app (group order). New.

**6. With a long column name the two Values rows look the same.** Both cut to
"average_minutes_between_visits i...", so "is 12" and "is 12 or more" differ only in the part
that is cut; hovering gives the whole text. Evidence: `visual/longnames/04.png`, `05.png`. Owner:
graphty app (what the row cuts). New.

**7. The neighbor list and its rings ignore the active filter.** With "weight is at least 3" on,
Gus's list reads "Gus and 4 connections" with Dev (weight 1) and Ivan (weight 1), and both are
ringed, while the drawing shows two of Gus's ties. Evidence: `visual/path/19.png`. Owner: to be
settled by a script: graphty-element if its neighborhood ignores the filter, the graphty app if it
asks for the unfiltered one. New; one specialist's claim.

**8. "Filter to neighbors" shows its done state as a disabled button**, gray with no tooltip on
hover. Evidence: `visual/path/21.png`, `22.png`. Owner: graphty app. Unchanged.

**9. The out-of-date state has three looks, all quiet.** A dim clock replaces the run's kind icon
in the layer list (its tooltip "Ran on 20 nodes; 10 shown now"); the key appends ", out of date"
after a replacement but ", full graph" after a filter, in its 9 px titles; the inspector strip's
"Data changed since this run" is about 8 px gray beside a blue Rerun; Top 10 keeps full contrast.
Evidence: `visual/path/27.png`, `22.png`, `visual/replace/12.png`. Owner: graphty app. Unchanged.

**10. The selection halo is a translucent disc that tints the node behind it** (Farah behind
Chloe, Eli behind Dev). Evidence: `visual/path/19.png`, `20.png`. Owner: graphty-element.
Unchanged.

**11. Selection has two looks:** yellow discs for nodes, blue rails for edges. Evidence:
`visual/path/18.png` against `visual/find/04.png`. Owner: graphty-element. Unchanged.

**12. The two-table source's inspector has no "..." menu and no tabs**, unlike friends.csv's.
Evidence: `visual/twotables/07.png` against `visual/replace/07.png`. Owner: graphty app.
Unchanged.

**13. Long edge names read alike in the selected-edges list,** and the long value column takes the
header so "Edge" shrinks to one stroke. Evidence: `visual/longnames/06.png`. Owner: graphty app.
Unchanged.

**14. The header chip does not look like a control at rest** (no fill until hovered) and its
tooltip covers the key's title. Evidence: `visual/path/08.png`, `09.png`. Owner: graphty app.
Unchanged.

**15. One table, two emphasis rules.** Edge inspector: From and To bright labels with dim values,
weight a dim label with a bright value; a node's inspector: "id" dim with a bright value, "Degree"
bright with a dim value. Evidence: `visual/path/27.png`, `visual/longnames/07.png`. Owner: graphty
app. Unchanged.

**16. The neighbor list changes shape with the hop count:** "Neighbor / weight" with values at 1
hop, a bare list at 2. Evidence: `visual/path/19.png` against `20.png`. Owner: graphty app.
Unchanged.

**17. The step editor's fields float and do not match.** Each label sits about 10 px from the
field above and 10 px from its own; "Add step" sits 4 px under its field; the Value box has a
lighter fill than the three selects above it, so one form has two field looks. Evidence:
`visual/path/06.png`. Owner: compact-mantine if the editor uses the default wrappers and inputs,
otherwise graphty app. Unchanged, with the field-fill detail new.

**18. Notes: tags outweigh the note, and a note's people have two looks.** Ten names become three
rows of blue pills under a two-line note; the form shows the same names as bold plain words; the
trash is full contrast at rest. Evidence: `visual/path/24.png` against `25.png`. Owner: graphty
app. Unchanged.

**19. Top 10 values have ragged digits** ("0.0555", "0.0535" among five-digit values). Evidence:
`visual/replace/04.png`. Owner: graphty app. Unchanged.

**20. The Path popover covers the lower half of the drawing,** Theo, Ivan and Hana among it.
Evidence: `visual/path/14.png`. Owner: graphty app. Unchanged.

**21. Overview values wrap** ("3 to 6, mean 3.667" on two lines for the two-table graph).
Evidence: `visual/twotables/06.png`. Owner: graphty app. Unchanged.

**22. The key's swatches and headings are inconsistent.** The path's black swatch nearly vanishes
on the key's near-black panel, and "Shortest path" is a body-size row while the PageRank blocks
have 9 px titles. Evidence: `visual/path/17.png`. Owner: graphty app. Unchanged.

**23. The toolbar covers the bottom node.** On long-names the lowest node's lower edge is drawn
behind the toolbar: the framing leaves no room for it. Evidence: `visual/longnames/04.png`,
`06.png`. Owner: graphty app (the canvas inset it gives the element). Raised from 1 (round 3 saw it
touch, not cover).

### Severity 1

**24. The Filters toolbar button sits in the view-toggle group** with List and Table, which stay
pressed while their panel is open, but Filters moves to the Data place; its three-line glyph is
close to List's, and its tooltip has no shortcut where Table's has one. Evidence:
`visual/path/02.png`. Owner: graphty app. New.

**25. The rule has two typefaces:** monospace in the find list's Enter option, proportional in the
layer list and the key, with backticks in both. Evidence: `visual/find/09.png`. Owner: graphty app.

**26. The refusal line is red text with no glyph,** while the unmatched and repeated-ties lines
use one. Evidence: `visual/find/13.png`. Owner: graphty app. New.

**27. A bare number with no matching value offers "=`10`" as the marked Enter option.** Evidence:
`visual/find/02.png`. Owner: graphty app. New.

**28. The right panel has three left edges** (section text, field labels and prose, row labels).
Evidence: `visual/replace/04.png`. Owner: graphty app. Unchanged.

**29. The Filters heading is gray with no caret while empty, white once it holds a step.**
Evidence: `visual/replace/05.png` against `visual/path/08.png`. Owner: graphty app. Unchanged.

**30. A step row wraps "edges" alone onto a third line, and the chip's filter glyph has the gray of
the disabled Redo beside it.** Evidence: `visual/path/08.png`. Owner: graphty app. New.

**31. Layer-list names and counts do not align:** names start at two places (rows with and without
a swatch) and Selection's count sits 25 px right of the others. Evidence: `visual/path/27.png`.
Owner: graphty app. New.

**32. A path run's header uses the groups glyph,** not the path glyph Analyze shows for Shortest
path. Evidence: `visual/path/17.png` against `12.png`. Owner: graphty app. New.

**33. An unavailable Analyze row dims its name but not its icon** (Guided route). Evidence:
`visual/path/12.png`. Owner: graphty app. New.

**34. Notes empty state:** "No notes." is indented 8 px past its heading; the form and a saved note
add two more left edges. Evidence: `visual/path/23.png`, `25.png`. Owner: graphty app. Unchanged.

**35. The import preview shifts:** the "to" column widens when only the unmatched row shows.
Evidence: `visual/twotables/03.png` against `04.png`. Owner: graphty app. Unchanged.

**36. One number column, two alignments:** weight is left-aligned in the import preview and
right-aligned, 650 px from its row's names, in the table panel. Evidence: `visual/replace/08.png`
against `07.png`. Owner: graphty app. New.

**37. "Edit source..." after a replacement opens a page titled "Replace: friends-v2.csv".**
Evidence: `visual/replace/16.png`. Owner: graphty app. New.

**38. Path nodes are flat black** and read as holes on the ranked drawing. Evidence:
`visual/path/17.png`. Owner: graphty-element (the path's suggested style). Unchanged.

**39. The Attribute list hangs about 12 px left of its field** and onto the canvas. Evidence:
`visual/path/05.png`. Owner: compact-mantine (Select dropdown position). Unchanged.

**40. The key keeps an entry with nothing drawn** ("Shortest path, full graph" after filtering to
Gus's neighbors). Evidence: `visual/path/22.png`. Owner: graphty app. Unchanged.

**41. The drawing is not refit after Filter to neighbors:** the ten nodes sit in the lower right
with the upper left empty. Evidence: `visual/path/22.png`. Owner: graphty app (whether it asks the
element to frame). New.

**42. A node's "id" label is squeezed while its long value wraps right-aligned.** Evidence:
`visual/longnames/07.png`. Owner: graphty app. Unchanged.

## Counts

3 at severity 3, 20 at severity 2, 19 at severity 1: 42 against round 3's 34. Like for like, the
rise is new ground, not decay: findings 1, 5, 6 and 27 sit on round 4's own find-box change, 4 is
round 3's warning fix half-done, 24 is the new toolbar button, and 7, 26, 30 to 33, 36, 37 and 41
are on screens or detours walked for the first time. Fixed since round 3: two "Start here" badges
and Louvain first for "linked", the edge-blind filter counts, the repeated-ties line's weight, the
cut Values row, the Replace button naming the old file, and the two highlighted rows in the find
list (not seen this round). Of round 3's severity 3s, both are still open.
