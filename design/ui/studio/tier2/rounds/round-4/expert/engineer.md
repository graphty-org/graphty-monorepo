# Tier 2 screenshot audit, round 4 -- Design Engineer

Build under test: 5277e2cbe1bd (graphty@0.8.64), the frozen tier 2 build named at the top of
`../../../criteria.md`, served from `.study-builds/tier2-r4d1-5277e2cbe/`. Every tier 2 screen and
state was walked with `tool/real.mjs`, one direct call per step, once in a 1200 x 900 window and once
in a 900 x 700 window (`REAL_VIEWPORT`; studies run at 1440 x 900). Every screenshot was looked at.
Every session's `session.json` names the same build; the tool checkout moved under other agents'
commits during the walks, which changes nothing about the app served.

Screenshots are in `engineer/<size>/<walk>/NN.png` and each walk's printed output in
`engineer/<size>/<walk>.log`; step N lands in screenshot N. Crops used to read small text are in
`engineer/crops/`.

| Walk      | What it covers                                                                                                                   |
| --------- | -------------------------------------------------------------------------------------------------------------------------------- |
| import    | Start screen, New from data: one table, role list, second table, unmatched row, Load, Sources, source inspector, left-out row    |
| openfile  | A data file from "Open project or file...", role list, Weight, Higher means, Direction list, Load, Graph inspector                |
| weight    | A weight set to Farther, Path popover empty and filled, weighted path result                                                     |
| filter    | Attribute inspector and menu, new step, step on, edited ("Save step"), "Add filter step" with the Keep list, Escape, Delete      |
| chip2     | The "+" route into the step editor, the disabled Add step and its reason, the header chip, its tooltip and click                 |
| tools     | New: the canvas toolbar's Filters tool, the step editor it opens, the Is list, a step over an edge column, the tool again        |
| ormore    | New: a bare number, a column name, and "column number" typed in the find box; `ormore2` scrolls the list to its Values rows      |
| shift     | New: Shift-click adding two nodes to a clicked one, the selection's Style tab and actions menu                                   |
| path      | Path popover on an undirected graph, path result, legend                                                                        |
| notes     | Notes on a node and on the graph, Save dialog, Recent projects after reopening, Notes after reopening                           |
| replace   | Run Values (Distribution), source menu, Replace page, out-of-date run, Rerun, then Undo of the Rerun                             |
| editsrc   | "Edit source..." from the source's menu, Escape on that page                                                                    |
| addrepeat | Opening the loaded file again: the "Add to" page with its repeated-ties warning, Escape                                          |
| select    | Find box: typed condition offered as a rule, the rule run, edge selection inspector, actions menu, Style tab                     |
| neighbors | Neighbor list at 1 and 2 hops, Filter to neighbors, its disabled state and reason, the step it makes                             |
| staleicon | 900 only: a run's tree row and inspector while a neighbor filter is on (row icon hovered)                                       |
| edge      | An edge found by name with every name drawn, its inspector, Edge actions, Select endpoints, the selection's Style tab             |
| analyze   | New: Analyze typed "path" and "brokers" (name matches first, one badge); Everything's Style tab with every name drawn            |
| long      | `long-names.csv` (40+ character names): node, neighbor list, path, Data place, filter, find list                                |
| twosrc    | The two-table source: right-click on its row, its inspector                                                                     |

Severity: 0 cosmetic only if time allows, 1 cosmetic, 2 minor (slows or misleads), 3 major (hides
information a task needs), 4 blocks a task. "Owner" is the package where the fix belongs. "Round 3"
marks a finding already in the round 3 audit that is still on this build; "new" marks one first seen
this round. Nothing was found at severity 4.

No step printed a script error, a console error or a failed request. No screen uses a bare Mantine
control where compact-mantine has one; the differences below are in how the app sets the shared
controls, and one in a shared control's own disabled look (finding 9).

## Findings

### Severity 3

1. **A number typed in the find box shows its new "at least" row only after scrolling past every
   matching edge** (new). Typing `4` on `friends.csv` lists "Edges 7" first; the list is a fixed
   box of about 280 px, so the Values rows "weight is 4 (7)" and "weight is 4 or more (12)" sit
   below its fold at both sizes, even at 1200 x 900 where 400 px of empty panel lie under the list.
   The only sign that more is there is the list's own scrollbar. This is round 4's change for T22,
   and a reader who types the prompt's number first sees seven edges and no "or more".
   Evidence: `engineer/1200x900/ormore/02.png`, `engineer/900x700/ormore/02.png` (what shows),
   `engineer/1200x900/ormore2/03.png` and `engineer/crops/ormore2-03-values-below.png` (after a
   wheel turn on the list).
   Owner: graphty app (`graph-place/FindBox.tsx`: order of the sections, or the list's height).

2. **Drawn names cover each other and the tie a task asks about, on the study's own data** (round
   3). On `friends.csv` with every name drawn, "Farah" is under "Chloe" ("Chloeah" at 900) and "Eli"
   under "Dev"; on `bus-stops.csv` the picked tie Station -> Stadium is a short blue stub under the
   "Stadium" label at both sizes, and "Depot" is drawn over School's sphere.
   Evidence: `engineer/1200x900/analyze/07.png`, `engineer/900x700/analyze/07.png`,
   `engineer/1200x900/edge/04.png`, `engineer/900x700/edge/04.png`.
   Owner: graphty-element (label placement ignores other labels and the selection). The app must
   not work around it.

3. **Sized nodes are drawn inside each other, and with Shift-click now working the halo of the
   hidden node reads as the front one being selected** (round 3, widened). After Size by PageRank
   Chloe sits in front of Farah; Shift-clicking "Farah" draws a halo that a reader sees around
   Chloe. The same pairs as round 3 (Chloe and Farah, Eli and Dev; two pairs on `team.csv`).
   Evidence: `engineer/1200x900/shift/04.png`, `engineer/900x700/shift/04.png`,
   `engineer/1200x900/filter/07.png` (lower middle).
   Owner: graphty-element (the layout spaces node centers, not node sizes).

4. **Long names are cut at both canvas edges and drawn over each other** (round 3). "Northern
   Regional Distribution Center 01" reads "hern Regional ..." at 1200 and "Regional ..." at 900;
   "Eastside Cold Storage and Packing Facility" is cut at the right edge and half covered by
   "Southern Valley Agricultural Cooperative".
   Evidence: `engineer/1200x900/long/03.png`, `engineer/900x700/long/01.png`.
   Owner: graphty-element (the fit frames spheres, not labels).

### Severity 2

5. **After Undo of a Rerun, the key shows the undone run's range** (new). On `team.csv` replaced by
   `team-v2.csv`: before the Rerun the key and the inspector both read 0.03273 to 0.1293; the Rerun
   makes both 0.02333 to 0.1339; after Ctrl+Z the drawing goes back (Mo and Nia are unmeasured blue
   again) and the inspector's Distribution, Top 10 and "Ran" go back to 0.03273 to 0.1293, but both
   rows of the key still read "0.02333 ... 0.1339", now marked "out of date". The key then describes
   a scale the drawing does not use. Both sizes.
   Evidence: `engineer/crops/replace09-before-rerun.png`, `engineer/1200x900/replace/10.png`,
   `engineer/crops/replace12-key-vs-values.png`; `engineer/900x700/replace/09.png`, `10.png`,
   `11.png`.
   Owner: graphty app (the key's range), unless the element's style layer still reports the
   re-run's range after Undo; script which one before any fix.

6. **The Analyze search box moves as the list narrows** (new). The popover grows up from the
   toolbar, so its filter box sits at y = 396 with the full list, at 378 (900 x 700) after "path"
   and at 753 after "brokers" (1200 x 900): the field under the reader's caret jumps by up to 357 px
   while they type, and the matches land where the box used to be.
   Evidence: `engineer/1200x900/analyze/02.png` then `04.png`; `engineer/900x700/analyze/02.png`,
   `03.png`, `04.png`.
   Owner: graphty app (popover anchoring; keep the box's top edge fixed).

7. **The two-table source has no actions and says nothing about why** (round 3). Right-click on
   "people.csv and messages.csv" opens nothing, and its inspector has no "..." menu, where a
   one-file source has Edit source... and Replace with file... in both places.
   Evidence: `engineer/900x700/twosrc/09.png`, `engineer/900x700/twosrc/11.png`, compare
   `engineer/1200x900/editsrc/04.png`.
   Owner: graphty app (`data-place/sourceActions.ts`); graphty-element if its API cannot replace a
   several-table source.

8. **"Edit source..." lands on a page titled "Replace: team.csv" whose button says Replace** (round
   3), with "Was 12 nodes, 16 edges; now 12, 16" under the title.
   Evidence: `engineer/900x700/editsrc/05.png`, compare `engineer/900x700/replace/07.png`.
   Owner: graphty app (Data page title and button words for an edit).

9. **The disabled "Filter to neighbors" looks like an empty text field, and its reason does not
   show to the person who just pressed it** (round 3). Disabled, it is a gray outline around gray
   text; the step editor's disabled "Add step" is a filled gray button, so the app now has two
   disabled looks. Hovering right after the press reads `tooltip: null` at both sizes; the reason
   opens only after the pointer leaves and returns, and still has no final period ("... Its step in
   Filters turns it off").
   Evidence: `engineer/crops/neighbors06-disabled.png`, `engineer/900x700/neighbors/09.png`
   (tooltip after leaving and returning), compare `engineer/900x700/chip2/04.png`; logs
   `engineer/900x700/neighbors.log`, `engineer/1200x900/neighbors.log`.
   Owner: compact-mantine (the default Button's disabled look); graphty app (showing the reason when
   the press disables the button, and the period).

10. **The neighbor list's Back row is cut mid-word and makes the whole inspector scroll sideways**
    (round 3). "Back to Eastside Cold Storage and Pac" has no ellipsis; a horizontal scrollbar sits
    at the inspector's foot. Both sizes.
    Evidence: `engineer/1200x900/long/03.png`, `engineer/900x700/long/03.png`.
    Owner: graphty app (`inspector/NodeValues.tsx` Back row).

11. **Edge rows in the find list ellipsize away the words that matched** (round 3). For "Eastside
    Cold", the edge "Northern Regional Distribution Ce..." is listed with its matching end cut off.
    Evidence: `engineer/1200x900/long/18.png`, `engineer/900x700/long/18.png`.
    Owner: graphty app (`graph-place/FindBox.tsx`); compact-mantine if `ResultRow` cannot keep the
    match in view.

12. **The Path popover covers the nodes it asks the reader to pick** (round 3): three or four of
    Florentine's fifteen at 1200 x 900, about half of trails' nine at 900 x 700.
    Evidence: `engineer/1200x900/path/03.png`, `engineer/900x700/weight/13.png`.
    Owner: graphty app (popover anchor, or the drawing's view insets while it is open).

13. **At 900 x 700 the drawing gets 40% of the window, and popovers and the table cover most of
    it** (round 3). Both side panels keep 240 px, leaving a 363 px canvas that the 316 px toolbar
    nearly spans; Analyze and Path popovers start over the left panel; with the table open the
    toolbar floats in the middle of a 363 x 420 drawing.
    Evidence: `engineer/900x700/analyze/02.png`, `engineer/900x700/replace/09.png`.
    Owner: graphty app (workspace frame and popover placement).

14. **The path key's swatch is black on the dark key card**, and the path is drawn black over the
    dark-orange nodes (round 3).
    Evidence: `engineer/1200x900/path/08.png`, `engineer/900x700/weight/14.png`.
    Owner: graphty app (key swatch outline on dark grounds).

15. **Everything's Style tab mixes two label placements** (round 3). Color's label sits above a
    field at the panel's left edge; Size and Shape sit beside fields of two widths 95 px further
    right; "Show all labels" ends 8 px from the panel edge at 1200 and touches it at 900.
    Evidence: `engineer/1200x900/analyze/07.png`, `engineer/900x700/analyze/07.png`.
    Owner: graphty app (`style/StyleTab.tsx`, `style/LabelSection.tsx`).

16. **The graph has three names** (round 3). After Replace the header says "team", the Graph place
    "Graph team-v2.csv"; for two tables the header says "people and messages", the source row
    "people.csv and messages.csv", the inspector "From 2 files".
    Evidence: `engineer/1200x900/replace/12.png`, `engineer/1200x900/import/12.png`.
    Owner: graphty app.

### Severity 1

17. **A run under a filter has three names for one state** (new). With a neighbor filter on, the
    PageRank row's icon becomes the same clock that marks a run whose data changed, and its
    accessible name is "PageRank, out of date"; the row's tooltip says "Ran on 20 nodes; 7 shown
    now", the inspector bar says the same with Rerun, and the key says "PageRank, full graph". The
    path row gets the same clock under an attribute filter.
    Evidence: `engineer/900x700/staleicon/07.png`, `engineer/900x700/staleicon.log`,
    `engineer/1200x900/long/18.png`, compare `engineer/900x700/replace/09.png` (data changed).
    Owner: graphty app (words and icon for a run on another scope).
18. **The step editor's Attribute list is blank with no placeholder** (new). A new step (from "+"
    or the toolbar Filters tool) shows an empty field under "Attribute"; only the disabled Add
    step's tooltip says "Choose an attribute first".
    Evidence: `engineer/1200x900/tools/03.png`, `engineer/900x700/chip2/04.png`. Owner: graphty app.
19. **Escape does nothing on the Data pages** (round 3). Evidence: `engineer/900x700/editsrc/06.png`,
    `engineer/900x700/addrepeat/04.png`. Owner: graphty app.
20. **The same column is aligned two ways** (round 3): the Data page's table left-aligns the weight
    numbers, the table under the Graph place right-aligns them.
    Evidence: `engineer/900x700/editsrc/05.png`, compare `engineer/1200x900/editsrc/04.png`.
    Owner: graphty app.
21. **Values drawn several ways** (round 3): an edge's From and To are regular gray while its
    `minutes` is bold white; Top 10 values are regular where other values are bold; in "Nodes in
    order" the names are white and the order numbers gray.
    Evidence: `engineer/1200x900/edge/04.png`, `engineer/1200x900/replace/03.png`,
    `engineer/1200x900/weight/15.png`. Owner: graphty app.
22. **Four left edges and two alignments in one inspector** (round 3): the histogram, "Damping
    factor" (an input inside "Made with"), and the rows start at three x positions; "Weight: weight
    (read as closer)" and "Each edge counts as 1." flow from the left where every other value is
    right-aligned. Evidence: `engineer/1200x900/replace/03.png`, `engineer/1200x900/path/08.png`.
    Owner: graphty app.
23. **Everything's Style tab shows Color 6366F1 while every node is drawn in PageRank's orange**
    (round 3). Evidence: `engineer/1200x900/analyze/07.png`. Owner: graphty app.
24. **The find box's offered rule is in a monospace face**, the box above in the sans face (round
    3). Evidence: `engineer/1200x900/select/03.png`, `engineer/900x700/ormore/04.png`. Owner:
    graphty app.
25. **The Attributes tree's "Nodes" and "Edges" rows leave a 33 px gap** between chevron and word
    (round 3). Evidence: `engineer/900x700/filter/18.png`. Owner: graphty app.
26. **Clicking a source row opens the table at the bottom**, shrinking the drawing; clicking an
    attribute row does not (round 3). Evidence: `engineer/1200x900/editsrc/04.png`, compare
    `engineer/900x700/filter/04.png`. Owner: graphty app.
27. **Everything's inspector has no kind line and no actions menu**, so its tabs sit 24 px higher
    than in every other inspector (round 3). Evidence: `engineer/1200x900/analyze/07.png`, compare
    `engineer/1200x900/edge/04.png`. Owner: graphty app.
28. **Style-tab section headings are smaller than Values-tab headings and have no chevron** (round
    3). Evidence: `engineer/900x700/select/07.png`, compare `engineer/900x700/select/04.png`.
    Owner: graphty app.
29. **"Edges per node" wraps and changes precision**: "3 to 6, mean / 3.667" against "mean 3.4"
    and "mean 4.1" (round 3). Evidence: `engineer/1200x900/import/11.png`,
    `engineer/1200x900/weight/13.png`. Owner: graphty app.
30. **An unweighted path is "4 hops" in the tree and "5 nodes, 4 edges" in its inspector**; a
    weighted one is "km 7.5" with the unit first (round 3). Evidence:
    `engineer/1200x900/path/08.png`, `engineer/1200x900/weight/15.png`. Owner: graphty app (words).
31. **Choosing Weight adds a bare "x" outside its field** (round 3). Evidence:
    `engineer/900x700/openfile/06.png`. Owner: graphty app (Data page).
32. **Primary buttons sit in two places** (round 3): Add step, Save step, Filter to neighbors small
    and left under their fields; Find path, Load, Save, Replace right-aligned at the foot.
    Evidence: `engineer/900x700/filter/06.png`, `engineer/900x700/weight/13.png`. Owner: graphty app.
33. **Two segmented-control widths** (round 3): Each row is and Higher means are content-width;
    Hops, Follow and Nodes / Edges are full-width. Evidence: `engineer/900x700/openfile/06.png`,
    `engineer/900x700/neighbors/05.png`. Owner: graphty app.
34. **Two Cancel buttons** (round 3): the note form's is subtle, the Save dialog's and the Data
    page's are outlined. Evidence: `engineer/900x700/notes/10.png`, `engineer/900x700/notes/12.png`.
    Owner: graphty app.
35. **"Filters" heading has no chevron and a lighter weight while empty** (round 3). Evidence:
    `engineer/900x700/filter/18.png`, compare `engineer/900x700/filter/16.png`. Owner: graphty app.
36. **Two truncation rules in one inspector** (round 3): "Nodes in order" ellipsizes the names that
    Made with wraps in full. Evidence: `engineer/900x700/long/10.png`. Owner: graphty app.
37. **A list opens over its own label** (round 3): the role lists, the Keep list and the Is list.
    Evidence: `engineer/1200x900/import/06.png`, `engineer/900x700/tools/06.png`,
    `engineer/900x700/filter/14.png`. Owner: compact-mantine (Select dropdown position), if that
    alignment is not deliberate.
38. **Recent projects' second line is body size and wraps at 900 x 700** (round 3). Evidence:
    `engineer/1200x900/notes/14.png`, `engineer/900x700/notes/14.png`. Owner: graphty app.

## By owner

| Owner           | Findings                                                         |
| --------------- | ---------------------------------------------------------------- |
| graphty-element | 2, 3, 4 (and 7 if its API cannot replace a several-table source; 5 if its layer keeps the re-run's range) |
| compact-mantine | 9 (disabled Button look), 37; shares 11                          |
| graphty app     | everything else                                                  |

## Compared with round 3

Round 4's changes as seen on screen: Shift-click adds a node to the selection (3 nodes selected at
both sizes); the Add page's repeated-ties line now carries the warning glyph (Load stays the
primary button, as decided); a filter step over an edge column counts edges ("20 to 19 nodes, 41 to
12 edges", the last word on its own line); the toolbar's Filters tool opens the step editor; the
step editor's disabled submit says "Choose an attribute first"; a measure run's first Values
section is "Distribution"; Analyze "path" puts Shortest path first with the only "Start here"
badge, and "brokers" shows Betweenness with none; "Save and turn on" is now "Save step". The "+"
tooltip after Escape from the step editor now sits beside the step row instead of over its
checkbox (`engineer/crops/filter16-plus-tooltip.png`), and the Nodes segment's dot no longer
touches its word (`engineer/crops/analyze07-nodes-segment.png`): round 3's findings 23 and 25 are
gone. A reopen from Recent projects showed "Opened friends" at both sizes.

New this round: findings 1, 5, 6, 17 and 18. Finding 1 is on the find box's new "or more" row and
decides whether T22 readers ever see it; finding 5 is on the Undo route that round 4's "Made with"
change touched; finding 3 widened because Shift-click now reaches overlapped nodes.

Findings 4, 10, 11 and 36 need names of 40 or more characters, which no study file has. The rest
were seen with the study's own files.
