# Tier 2 screenshot audit, round 2 -- Design Engineer

Build under test: 8f0d5a6f7791 (graphty@0.8.61), the frozen tier 2 build named at the top of
`../../../criteria.md`, served from `.study-builds/tier2-r2d4-8f0d5a6f7/`. Every tier 2 screen and
state was walked with `tool/real.mjs` by pointer, once in a 1200 x 900 window and once in a 900 x 700
window (`REAL_VIEWPORT`; studies themselves run at 1440 x 900). Every screenshot was looked at.

The walks are scripted in `engineer/audit.sh` and `engineer/audit2.sh` (rerun with
`REAL_DIST=<build> SIZE=<w>x<h> engineer/audit.sh all`). Each walk's screenshots are in
`engineer/<size>/<walk>/NN.png` and its steps in `engineer/<size>/<walk>.log`; step N lands in
screenshot N.

| Walk      | What it covers                                                                                                                            |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| start     | Start screen, usage-data card, hover on a start row                                                                                       |
| openfile  | A data file from "Open project or file...", the Data page, role list, Weight, Higher means, Direction list, Load, Graph inspector         |
| import    | New from data: one table, role list, "Add a table" menu, second table, unmatched row, Load, Sources, source inspector, left-out row       |
| twosrc    | The two-table source: right-click on its row, its inspector                                                                               |
| weight    | Empty Data page, a weight set to Farther, Path popover empty, filled, path result and Values                                              |
| filter    | Attribute row and menu, new step, step on, off, edited, "Add filter step" with the Keep list, Escape, right-click Delete                  |
| chip, chip2 | The "+" route into the step editor, Attribute list, the header chip, its tooltip and click                                              |
| path      | Path popover by keyboard on an undirected graph, path result, legend                                                                      |
| notes     | Notes place empty, a note on a node, a note on the graph, Save dialog, Recent projects after reopening, Notes after reopening              |
| replace   | Run Values (histogram, top 10), source row, "Source actions" menu, Replace page, out-of-date run with its state bar, Rerun                 |
| editsrc   | "Edit source..." from the source's menu                                                                                                   |
| select    | Find box: rule hint, refused rule, accepted rule, edge selection inspector, Selection actions menu                                        |
| neighbors | Neighbor list at 1 and 2 hops with Hops and Follow, Filter to neighbors, the step it makes                                                |
| edge      | Everything's Style tab with labels, an edge found by name, its inspector, Edge actions, Select endpoints, Selection's Style tab            |
| analyze   | Analyze popover, Everything's Style tab with every name drawn (the study's own `friends-ranked-names` setup)                              |
| long      | `long-names.csv` (40+ character names, a 30-character column): node inspector, neighbor list, path, Data place, filter, find list         |

Severity: 0 cosmetic only if time allows, 1 cosmetic, 2 minor (slows or misleads), 3 major (hides
information a task needs), 4 blocks a task. "Owner" is the package where the fix belongs. "Round 1"
marks a finding already in the round 1 audit that is still on this build.

No step printed a script error, a console error or a failed request, and no control was a bare
Mantine control where compact-mantine has one (every segmented control, search input and result
row in the walked screens is compact-mantine's; the differences below are in how the app sets them).

## Findings

### Severity 3

1. **Drawn names cover each other and the ties a task asks about, on the study's own data.** With
   every name drawn on `friends.csv` at 1200 x 900, "Farah" is drawn under "Chloe" (only "F..ah"
   shows) and "Eli" under "Dev"; at 900 x 700 the names shrink to about 8 px and the same pairs
   merge ("Chloeah"). On `bus-stops.csv` the selected tie Station -> Stadium is drawn almost
   entirely under the opaque white ground of the "Stadium" label: at 1200 a short blue stub shows,
   at 900 nothing of the tie is visible after it is picked. Labels also sit on top of their own
   nodes at 900 ("Depot", "School").
   Evidence: `engineer/1200x900/analyze/05.png`, `engineer/900x700/analyze/05.png`,
   `engineer/1200x900/edge/04.png`, `engineer/900x700/edge/04.png`.
   Owner: graphty-element (label placement ignores other labels and the selection; label size
   follows camera distance with no floor). The app must not work around it.

2. **Long names are cut at both canvas edges and drawn over each other** (round 1). "Northern
   Regional Distribution Center 01" reads "hern Regional ...", "Eastside Cold Storage and Packing
   Facility" is cut at the right edge and half covered by "Southern Valley Agricultural
   Cooperative", whose own first letters are cut. The opaque label ground also hides the found
   path's edge where it passes under a name. Both sizes.
   Evidence: `engineer/1200x900/long/01.png`, `engineer/1200x900/long/10.png`,
   `engineer/900x700/long/01.png`.
   Owner: graphty-element (the fit frames spheres, not labels).

### Severity 2

3. **The source's actions vanish for a two-table load, with no reason given.** A source made of
   one file has a "Source actions" menu (Edit source..., Replace with file...) in its inspector and
   on right-click. The source made of `people.csv` and `messages.csv` has no menu in its inspector
   and right-click on its row opens nothing, so a reader who loaded two tables has no way to edit
   or replace them and no word why. Elsewhere an unavailable action is shown disabled with its
   reason ("Neighborhood -- Select a node first").
   Evidence: `engineer/1200x900/import/12.png`, `engineer/1200x900/twosrc/09.png`, compare
   `engineer/1200x900/replace/06.png`.
   Owner: graphty app (`data-place/sourceActions.ts` returns no verbs when `canReplace` is false);
   graphty-element if replacing a several-table source is not supported by its API.

4. **"Edit source..." lands on a page titled "Replace: team.csv" whose button says Replace.** The
   reader chose to edit the loaded settings and is told they are replacing the file, with "Was 12
   nodes, 16 edges; now 12, 16" under the title.
   Evidence: `engineer/1200x900/editsrc/05.png`, compare `engineer/1200x900/replace/07.png`.
   Owner: graphty app (Data page title and button words for an edit).

5. **The refused rule's correction drops the "=" the rule needs.** Typing `=minutes >= 10` shows
   "Put numbers in backticks: minutes >= `10`"; typed as shown, that is a plain-text search, not a
   rule. The hint for a typed condition does include it ("=minutes >= `10`").
   Evidence: `engineer/1200x900/select/05.png`, compare `engineer/1200x900/select/03.png`.
   Owner: graphty app (find box words; the element's suggestion is the selector alone).

6. **A long name in the neighbor list's Back row is cut mid-word and makes the whole inspector
   scroll sideways** (round 1, changed). The heading now wraps and keeps its count, but "Back to
   Eastside Cold Storage and Pac" is clipped with no ellipsis and a horizontal scrollbar appears at
   the inspector's foot. Both sizes.
   Evidence: `engineer/1200x900/long/03.png`, `engineer/900x700/long/03.png`.
   Owner: graphty app (`inspector/NodeValues.tsx` Back row).

7. **Edge rows in the find list ellipsize away the words that matched** (round 1, changed). The
   list no longer scrolls sideways, but "Northern Regional Distribution Ce..." is listed for
   "Eastside Cold" with the matching end cut off, so the reader cannot see why it matched.
   Evidence: `engineer/1200x900/long/18.png`, `engineer/900x700/long/18.png`.
   Owner: graphty app (`graph-place/FindBox.tsx`: keep the match in view, or ellipsize in the
   middle); compact-mantine if `ResultRow` cannot.

8. **The Path popover covers the nodes it asks the reader to pick** (round 1). At 1200 x 900 two of
   trails' nine nodes and four of Florentine's fifteen are under it; at 900 x 700 seven of nine.
   Evidence: `engineer/1200x900/weight/09.png`, `engineer/1200x900/path/06.png`,
   `engineer/900x700/weight/10.png`.
   Owner: graphty app (popover anchor, or the drawing's view insets while it is open).

9. **At 900 x 700 the drawing gets 40% of the window, and popovers and the table cover most of
   it** (round 1). Both side panels keep 240 px, leaving a 363 px canvas; the Analyze and Path
   popovers start over the left panel; with the table open (it opens when a source row is
   clicked) the drawing is 363 x 420 under a 240 x 160 legend card.
   Evidence: `engineer/900x700/analyze/02.png`, `engineer/900x700/path/06.png`,
   `engineer/900x700/replace/06.png`.
   Owner: graphty app (workspace frame and popover placement).

10. **The path key's swatch is black on the dark legend card** (round 1). "On the path" is marked
    by a black dot on the card's near-black ground.
    Evidence: `engineer/1200x900/weight/14.png`, `engineer/1200x900/path/07.png`.
    Owner: graphty app (legend swatch outline on dark grounds).

11. **The legend card covers a drawn name** (round 1). After a path run the card grows over the top
    of "Regional Distribution Center 01" (a few pixels at 1200, the whole line at 900).
    Evidence: `engineer/1200x900/long/10.png`, `engineer/900x700/long/10.png`.
    Owner: graphty app (`LegendCard.tsx` reserved margin), once graphty-element reports label bounds.

12. **Everything's Style tab mixes two label placements** (round 1). Color's label sits above a
    field that starts at the panel's left edge; Size and Shape sit beside fields that start 95 px
    further right. "Show all labels" ends 8 px from the panel edge at 1200 and 4 px at 900.
    Evidence: `engineer/1200x900/edge/01.png`, `engineer/900x700/analyze/01.png`.
    Owner: graphty app (`style/StyleTab.tsx`, `style/LabelSection.tsx`).

13. **The graph has three names** (round 1). The header says "team", the Graph place "Graph
    team-v2.csv" after Replace, the inspector "From team-v2.csv"; for two tables the header says
    "people and messages", the source row "people.csv and messages.csv", the inspector "From 2
    files".
    Evidence: `engineer/1200x900/replace/08.png`, `engineer/1200x900/import/12.png`.
    Owner: graphty app.

### Severity 1

14. **Clicking a source row opens the table at the bottom**, shrinking the drawing; clicking an
    attribute row, or the two-table source, does not. Evidence: `engineer/1200x900/editsrc/03.png`,
    compare `engineer/1200x900/filter/03.png`, `engineer/1200x900/twosrc/12.png`. Owner: graphty app.
15. **After Escape from the step editor, the "+" tooltip covers the step row's checkbox.**
    Evidence: `engineer/1200x900/filter/17.png`, `engineer/900x700/filter/17.png`. Owner: graphty
    app (focus returns to "+" and its Tooltip opens on focus); compact-mantine if the Tooltip
    default should not open on a programmatic focus.
16. **Three left edges in one inspector** (round 1, partly fixed: "Each edge counts as 1." now
    lines up). The histogram's summary line starts at 977 px, the "Damping factor" form and the
    Hops and Follow labels at 985 px, the rows at 993 px. Evidence: `engineer/1200x900/replace/03.png`,
    `engineer/1200x900/neighbors/04.png`. Owner: graphty app.
17. **Values drawn two ways in one section.** An edge's From and To are regular gray while its
    `minutes` is bold white; Top 10 values are regular where every other inspector value is bold
    (round 1). Evidence: `engineer/1200x900/edge/04.png`, `engineer/1200x900/replace/03.png`.
    Owner: graphty app.
18. **Everything's inspector has no kind line and no actions menu**, so its tabs sit 24 px higher
    than in every other inspector. Evidence: `engineer/1200x900/edge/01.png`, compare
    `engineer/1200x900/edge/04.png`. Owner: graphty app.
19. **The Nodes segment's dot touches its word** ("Nodes" with a blue dot at its last letter).
    Evidence: `engineer/1200x900/edge/01.png`. Owner: graphty app (`style/StyleTab.tsx` Indicator
    placement).
20. **Style-tab section headings are smaller than Values-tab headings and have no chevron** (Fill,
    Shape, Effects at about 10 px against Summary, Results at 12 px). Evidence:
    `engineer/1200x900/edge/07.png`, compare `engineer/1200x900/edge/04.png`. Owner: graphty app.
21. **"Edges per node" wraps and changes precision**: "2 to 4, mean / 2.889" on trails and
    "3 to 6, mean / 3.667" on two tables at 1200, against "mean 4.1" and "mean 3" elsewhere.
    Evidence: `engineer/1200x900/weight/09.png`, `engineer/1200x900/import/10.png`. Owner: graphty app
    (number format).
22. **A path is "4 hops" in the tree and "5 nodes, 4 edges" in its inspector.** Evidence:
    `engineer/1200x900/weight/14.png`. Owner: graphty app (words).
23. **Choosing Weight narrows its role list and adds a bare "x" outside the field**, so one of
    three role lists is a different width. Evidence: `engineer/1200x900/openfile/06.png`. Owner:
    graphty app (Data page).
24. **Primary buttons sit in two places** (round 1): Add step, Save and turn on, Filter to neighbors
    small and left under their fields; Find path, Load, Save, Replace right-aligned at the foot.
    Evidence: `engineer/1200x900/filter/06.png`, `engineer/1200x900/weight/13.png`. Owner: graphty app.
25. **Two segmented-control widths** (round 1): Each row is, Higher means and Add / Leave out are
    content-width; Hops, Follow and Nodes / Edges are full-width. All are compact-mantine's control
    with or without `fullWidth`. Evidence: `engineer/1200x900/openfile/06.png`,
    `engineer/1200x900/neighbors/04.png`. Owner: graphty app.
26. **Two Cancel buttons** (round 1): the note form's is subtle, the Save dialog's and the Data
    page's are outlined. Evidence: `engineer/1200x900/notes/09.png`, `engineer/1200x900/notes/12.png`.
    Owner: graphty app.
27. **"Filters" heading has no chevron and a lighter weight while empty** (round 1). Evidence:
    `engineer/1200x900/filter/19.png`. Owner: graphty app.
28. **A long filter step's name runs into its checkbox** (round 1). Evidence:
    `engineer/1200x900/long/16.png`. Owner: graphty app.
29. **Two truncation rules in one inspector** (round 1): "Nodes in order" ellipsizes the names that
    Made with wraps in full. Evidence: `engineer/1200x900/long/10.png`. Owner: graphty app.
30. **A turned-off step reads "off" in the tree and "Off" in its inspector** (round 1). Evidence:
    `engineer/1200x900/filter/11.png`. Owner: graphty app.
31. **A role list opens over its own column name** (round 1). Evidence:
    `engineer/1200x900/openfile/04.png`, `engineer/1200x900/import/05.png`. Owner: compact-mantine
    (Select dropdown position), if that alignment is not deliberate.
32. **Recent projects' second line is body size and wraps at 900 x 700** (round 1; it fits at
    1200). Evidence: `engineer/1200x900/notes/14.png`, `engineer/900x700/notes/14.png`. Owner:
    graphty app (start screen).
33. **The usage card's "What is collected" is larger and in link blue among small gray text**
    (round 1). Evidence: `engineer/1200x900/start/01.png`. Owner: graphty app.

## Compared with round 1

Round 1 confirmed 24 findings; this round lists 33. The rise is mostly new screens walked this round
(the two-table source, Edit source, the header chip, Everything's Style tab with names drawn on the
study's own data, the edge inspector), not regressions; the one change that made a screen worse is
finding 6 (the Back row now scrolls the whole inspector sideways).

Fixed since round 1, checked on this build: the find list no longer scrolls sideways (finding 7
remains for edge rows), the neighbor heading wraps and keeps its count, "Each edge counts as 1."
lines up with the rows, the left-out row's inspector shows the warning glyph its tree row shows,
the Data page footer sits at the foot of the window, and the refused rule's example now uses the
reader's own number.

Findings 2, 6, 7, 11, 28 and 29 need names of 40 or more characters, which no study file has. The
rest were seen with the study's own files at 1200 x 900; this audit did not walk the study's
1440 x 900 window, so whether finding 1 still hides Farah and Eli there is for the session
screenshots to show.
