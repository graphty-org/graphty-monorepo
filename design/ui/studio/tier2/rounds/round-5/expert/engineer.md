# Tier 2 screenshot audit, round 5 -- Design Engineer

Build under test: 8c015b806 (graphty@0.8.65), the frozen tier 2 build named at the top of
`../../../criteria.md`, served from `.study-builds/tier2-r5-8c015b806/`. Every tier 2 screen and
state was walked with `tool/real.mjs`, one direct call per step, once in a 1200 x 900 window and once
in a 900 x 700 window (`REAL_VIEWPORT`; studies run at 1440 x 900). Every screenshot was looked at.

Screenshots are in `engineer/<size>/<walk>/NN.png`, each walk's printed output in
`engineer/<size>/<walk>.log`; step N lands in screenshot N + 1. Crops are in `engineer/crops/`.

| Walk      | What it covers                                                                                                         |
| --------- | ---------------------------------------------------------------------------------------------------------------------- |
| import    | Start screen, New from data: one table, role list, second table, unmatched row, Load, Sources, source inspector         |
| openfile  | A data file from "Open project or file...", Weight, Higher means, Direction list, Load, Graph inspector                 |
| weight    | A weight set to Farther, Path popover, weighted path result                                                            |
| filter    | Attribute menu, new step, step on, edited ("Save step"), "Add filter step", Keep list, Escape, Delete                  |
| chip2     | The "+" route into the step editor, disabled Add step and its reason, the header chip and its tooltip                  |
| tools     | The toolbar's Filters tool, the step editor, the Is list, a step over an edge column                                   |
| ormore    | A bare number, a column name and "column number" in the find box; the list scrolled to "weight is 4 or more"           |
| bus10     | New this round: "10" typed on bus stops, the "minutes is 10 or more" row, the selection; then "5"                      |
| table     | New this round: the data table's Edges tab before and after a filter step ("12 of 41 edges")                           |
| newproj   | New this round: New project, Cancel, New project, Discard                                                              |
| notes     | Notes on a node and on the graph, the note editor's Cancel (new), Save, reopen                                         |
| edgeonly  | New: an edge filter step that hides no node, and the run row it marks                                                  |
| shift, path, replace, editsrc, addrepeat, select, neighbors, edge, analyze, long, twosrc | As round 4                      |

Severity: 0 cosmetic only if time allows, 1 cosmetic, 2 minor (slows or misleads), 3 major (hides
information a task needs), 4 blocks a task. "Owner" is the package where the fix belongs. "Round 4"
marks a finding still on this build; "new" one first seen this round.

No step printed a script error, a console error or a failed request. No screen uses a bare Mantine
control where compact-mantine has one. Nothing was found at severity 4.

## Fixed on this build (checked)

- New project, then Discard, opens an empty "Untitled" project with "No nodes to draw", no error
  page (`900x700/newproj/07.png`, `1200x900/newproj/07.png`).
- Typing "10" on bus stops lists only "minutes is 10 or more (3)" and picking it selects the three
  edges; typing "5" lists the edges first and the two Values rows under them
  (`1200x900/bus10/02.png`, `04.png`, `09.png`).
- On friends, "4" now shows "weight is 4 or more (12)" -- still only after a scroll (finding 1).
- The data table follows the filter: "12 of 41 edges" with only kept rows (`1200x900/table/09.png`).
- The note editor's Cancel returns to the list with "+" (`1200x900/notes/12.png`).

## Findings

### Severity 3

1. **"N or more" for a number is still below the fold of the find list** (round 4). On friends,
   "4" lists "Edges 7" first in a fixed box; "weight is 4 (7)" and "weight is 4 or more (12)" show
   only after a wheel turn on the list, at both sizes, with empty panel under the list at 1200 x 900.
   Evidence: `1200x900/ormore/07.png` (what shows), `1200x900/ormore/08.png` (after scrolling);
   `900x700/ormore/07.png`, `08.png`. Owner: graphty app (`graph-place/FindBox.tsx`: section order or
   list height).
2. **Drawn names cover each other and the tie a task asks about** (round 4). "Farah" under "Chloe"
   ("Chloeah"), "Eli" under "Dev" ("EDev"); on bus stops the Station -> Stadium tie is a stub under the
   "Stadium" label. Evidence: `1200x900/analyze/01.png`, `900x700/analyze/07.png`,
   `1200x900/edge/04.png`. Owner: graphty-element (label placement).
3. **Sized nodes drawn inside each other; a Shift-clicked hidden node's halo reads as the front one**
   (round 4). Evidence: `900x700/shift/04.png`, `1200x900/shift/04.png`. Owner: graphty-element
   (layout spaces centers, not sizes).
4. **Long names cut at both canvas edges and drawn over each other** (round 4): "hern Regional
   Distribution Center 01", "uthern Valley Agricultural Cooperative", "Eastside Cold Storage and
   Packing Facili" half under it. Evidence: `1200x900/long/03.png`, `900x700/long/01.png`. Owner:
   graphty-element (fit frames spheres, not labels).

### Severity 2

5. **An edge-only filter step marks every run "out of date" with words that contradict it** (new).
   A step "weight is at least 3" keeps all 20 nodes and 20 of 41 edges. The PageRank row gets the
   out-of-date clock, its accessible name is "PageRank, out of date", and its tooltip and the inspector
   bar say "Ran on 20 nodes; 20 shown now" beside Rerun -- the two counts are equal, so the reader is
   told nothing changed and asked to rerun. The key, by contrast, says plain "PageRank". The run did
   change in substance (PageRank over 20 edges is a different answer), so the words name the wrong
   count. Evidence: `crops/edgeonly09-stale-20-of-20.png`, `1200x900/edgeonly/09.png`,
   `1200x900/edgeonly.log`. Owner: graphty-element if `run.stale` has no edge counts to say what
   changed (`StaleNote` carries `ranOn`/`nowVisible` nodes only; additive edge fields); graphty app
   for the words (`inspector/words.ts` `staleWords`).
6. **The table's new "12 of 41 edges" is cut to "12 of 41 ed..." at 900 x 700, and "Columns: 3 of 3"
   to "Columns: 3 o..."** (new; the count is this round's change). At 1200 both fit. Evidence:
   `crops/table09-count-cut.png`, `900x700/table/09.png`, compare `1200x900/table/09.png`. Owner:
   graphty app (`table/TableDock.tsx` header: let the count wrap or drop "Columns:" first).
7. **After Undo of a Rerun, the key still shows the undone run's range** (round 4). Inspector and
   drawing are back to 0.03273 to 0.1293; both key rows read "0.02333 ... 0.1339, out of date".
   Evidence: `crops/replace12-key-vs-values.png`, `1200x900/replace/12.png`. Owner: graphty app
   (key range), unless the element's layer still reports the rerun's range after Undo; script first.
8. **The Analyze search box moves as the list narrows** (round 4): at 1200 x 900 its box sits near
   y = 330 with the full list, y = 480 after "path", y = 627 after "brokers". Evidence:
   `1200x900/analyze/02.png`, `03.png`, `04.png`. Owner: graphty app (popover anchoring).
9. **The two-table source has no actions** (round 4): right-click on "people.csv and messages.csv"
   opens nothing and its inspector has no "..." menu. Evidence: `900x700/twosrc/09.png`, `10.png`,
   `11.png`, compare `1200x900/editsrc/04.png`. Owner: graphty app (`data-place/sourceActions.ts`);
   graphty-element if its API cannot replace a several-table source.
10. **"Edit source..." lands on "Replace: team.csv" with a Replace button** (round 4). Evidence:
    `1200x900/editsrc/05.png`. Owner: graphty app.
11. **The disabled "Filter to neighbors" looks like an empty field, and its reason does not show on
    the press** (round 4): two `tooltip: null` hovers, the reason only after leaving and returning, no
    final period. Evidence: `1200x900/neighbors/06.png`, `09.png`, `1200x900/neighbors.log`. Owner:
    compact-mantine (default Button disabled look); graphty app (reason on press, period).
12. **The neighbor list's Back row is cut mid-word and scrolls the inspector sideways** (round 4):
    "Back to Eastside Cold Storage and Pa", horizontal scrollbar at the foot. Evidence:
    `crops/long03-back-row.png`, `900x700/long/03.png`. Owner: graphty app (`inspector/NodeValues.tsx`).
13. **Edge rows in the find list ellipsize away the matched words** (round 4): "Northern Regional
    Distribution Ce...". Evidence: `1200x900/long/18.png`, `900x700/long/18.png`. Owner: graphty app
    (`FindBox.tsx`); compact-mantine if `ResultRow` cannot keep the match in view.
14. **The Path popover covers the nodes it asks for** (round 4). Evidence: `1200x900/path/02.png`,
    `900x700/long/05.png`. Owner: graphty app.
15. **At 900 x 700 the drawing gets about 40% of the window, and the table leaves it 360 x 420 with
    the toolbar floating mid-canvas** (round 4). Evidence: `900x700/table/09.png`,
    `900x700/analyze/03.png`. Owner: graphty app (workspace frame).
16. **The path key's swatch is black on the dark key card; the path is drawn black over dark nodes**
    (round 4). Evidence: `1200x900/path/07.png`, `1200x900/weight/14.png`. Owner: graphty app (swatch
    outline).
17. **Everything's Style tab mixes two label placements** (round 4). Evidence: `1200x900/analyze/01.png`.
    Owner: graphty app (`style/StyleTab.tsx`, `style/LabelSection.tsx`).
18. **The graph has three names** (round 4): header "team", Graph place "Graph team-v2.csv"; header
    "people and messages", source "people.csv and messages.csv", inspector "From 2 files". Evidence:
    `1200x900/replace/12.png`, `1200x900/import/12.png`. Owner: graphty app.

### Severity 1

19. **"Each edge counts as 1." and "Weight: none (each edge counts 1)"** -- one fact in two phrasings
    (new). Evidence: `1200x900/import/09.png`, `1200x900/path/07.png`. Owner: graphty app.
20. **A run under a filter has three names** (round 4): clock icon and "out of date", "Ran on 20
    nodes; 15 shown now", "PageRank, full graph". Evidence: `1200x900/neighbors/11.png`. Owner: graphty
    app.
21. **The step editor's Attribute list is blank with no placeholder** (round 4). Evidence:
    `1200x900/chip2/03.png`, `900x700/table/04.png`. Owner: graphty app.
22. **Escape does nothing on the Data pages** (round 4). Evidence: `1200x900/editsrc/06.png`,
    `1200x900/addrepeat/04.png`. Owner: graphty app.
23. **The weight column is left-aligned on the Data page and right-aligned in the table** (round 4).
    Evidence: `1200x900/editsrc/05.png`, compare `1200x900/editsrc/04.png`. Owner: graphty app.
24. **Values drawn several ways** (round 4): an edge's From/To regular gray, its `minutes` bold white;
    Top 10 regular; selected-edge names gray. Evidence: `1200x900/edge/04.png`, `1200x900/ormore/09.png`.
    Owner: graphty app.
25. **Edges per node wraps to two lines ("3 to 6, mean / 3.667")** at both sizes on the two-table
    graph, where friends shows "3 to 6, mean 4.1" on one; four decimals here, one there (new).
    Evidence: `900x700/twosrc/09.png`, `1200x900/twosrc/09.png`, `1200x900/weight/13.png` ("2.889").
    Owner: graphty app (number format of the mean).
