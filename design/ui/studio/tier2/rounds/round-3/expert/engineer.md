# Tier 2 screenshot audit, round 3 -- Design Engineer

Build under test: 26f3bb968e43 (graphty@0.8.61), the frozen tier 2 build named at the top of
`../../../criteria.md`, served from `.study-builds/tier2-r3d2-26f3bb968/`. Every tier 2 screen and
state was walked with `tool/real.mjs` by pointer and key, once in a 1200 x 900 window and once in a
900 x 700 window (`REAL_VIEWPORT`; studies run at 1440 x 900). Every screenshot was looked at.

Each walk's steps are listed in `engineer/walks.txt` and `engineer/walks2.txt` (one line per walk:
name, start, then one `--step` per field). Its screenshots are in `engineer/<size>/<walk>/NN.png`
and its log in `engineer/<size>/<walk>.log`; step N lands in screenshot N. Crops used to read small
text are in `engineer/crops/`.

| Walk      | What it covers                                                                                                               |
| --------- | ---------------------------------------------------------------------------------------------------------------------------- |
| start     | Start screen, usage-data card, hover on a start row (1200 only)                                                               |
| import    | New from data: one table, role list, second table, unmatched row, Load, Sources, source inspector, left-out row              |
| twosrc    | The two-table source: right-click on its row, its inspector                                                                  |
| openfile  | A data file from "Open project or file...", role list, Weight, Higher means, Direction list, Load, Graph inspector            |
| weight    | A weight set to Farther, Path popover empty and filled, weighted path result                                                 |
| filter    | Attribute inspector and menu, new step, step on, off, edited, "Add filter step" with the Keep list, Escape, right-click Delete |
| chip2     | The "+" route into the step editor, the header chip, its tooltip and click                                                   |
| path      | Path popover on an undirected graph, path result, legend                                                                     |
| notes     | Notes on a node and on the graph, Save dialog, Recent projects after reopening, Notes after reopening                         |
| replace   | Run Values, source menu, Replace page, out-of-date run with its state bar, Rerun                                             |
| editsrc   | "Edit source..." from the source's menu, Escape on that page                                                                 |
| addrepeat | Opening the loaded file again: the "Add to" page with its repeated-ties warning and Replace beside Load                      |
| select    | Find box: typed condition offered as a rule, the rule run, edge selection inspector, actions menu, Style tab                 |
| neighbors | Neighbor list at 1 and 2 hops, Filter to neighbors, the step it makes                                                        |
| nbrtip    | The disabled "Filter to neighbors" and its reason tooltip                                                                    |
| edge      | An edge found by name with every name drawn, its inspector, Edge actions, Select endpoints, the selection's Style tab        |
| analyze   | Analyze popover, Everything's Style tab with every name drawn                                                                |
| long      | `long-names.csv` (40+ character names): node, neighbor list, path, Data place, filter, find list                             |

Severity: 0 cosmetic only if time allows, 1 cosmetic, 2 minor (slows or misleads), 3 major (hides
information a task needs), 4 blocks a task. "Owner" is the package where the fix belongs. "Round 2"
marks a finding already in the round 2 audit that is still on this build; "new" marks one first seen
this round. Nothing was found at severity 4.

No step printed a script error, a console error or a failed request. No screen uses a bare Mantine
control where compact-mantine has one; the differences below are in how the app sets the shared
controls, and one in a shared control's own disabled look (finding 6).

## Findings

### Severity 3

1. **Drawn names cover each other and the tie a task asks about, on the study's own data** (round
   2). On `friends.csv` with every name drawn, "Farah" is drawn under "Chloe" and "Eli" under "Dev"
   at 1200 x 900; at 900 x 700 they merge into "Chloeah". On `bus-stops.csv` the picked tie
   Station -> Stadium is almost entirely under the opaque ground of the "Stadium" label: a short
   blue stub at 1200, nothing visible at 900.
   Evidence: `engineer/1200x900/analyze/05.png`, `engineer/900x700/analyze/05.png`,
   `engineer/1200x900/edge/04.png`, `engineer/900x700/edge/04.png`.
   Owner: graphty-element (label placement ignores other labels and the selection). The app must
   not work around it.

2. **Long names are cut at both canvas edges and drawn over each other** (round 2). "Northern
   Regional Distribution Center 01" reads "hern Regional ..." at 1200 and "Regional ..." at 900;
   "Eastside Cold Storage and Packing Facility" is cut at the right edge and half covered by
   "Southern Valley Agricultural Cooperative".
   Evidence: `engineer/1200x900/long/01.png`, `engineer/900x700/long/03.png`.
   Owner: graphty-element (the fit frames spheres, not labels).

### Severity 2

3. **Sized nodes are drawn inside each other** (new as its own finding). After Size by PageRank
   (1 to 3), pairs of spheres overlap so one hides most of the other: Chloe and Farah, Eli and Dev on
   `friends.csv`; two pairs on `team.csv` and `team-v2.csv`. A reader counting or clicking nodes
   sees one where there are two. It is the cause under finding 1's "Farah under Chloe".
   Evidence: `engineer/1200x900/chip2/09.png` (lower left and lower middle),
   `engineer/1200x900/replace/10.png`, `engineer/1200x900/analyze/05.png`.
   Owner: graphty-element (the layout spaces node centers, not node sizes).

4. **The two-table source has no actions and says nothing about why** (round 2). Right-click on
   "people.csv and messages.csv" opens nothing, and its inspector has no "..." menu, where a
   one-file source has Edit source... and Replace with file... in both places.
   Evidence: `engineer/1200x900/twosrc/09.png`, `engineer/1200x900/import/12.png`, compare
   `engineer/900x700/editsrc/03.png`.
   Owner: graphty app (`data-place/sourceActions.ts`); graphty-element if its API cannot replace a
   several-table source.

5. **"Edit source..." lands on a page titled "Replace: team.csv" whose button says Replace** (round
   2), with "Was 12 nodes, 16 edges; now 12, 16" under the title.
   Evidence: `engineer/900x700/editsrc/05.png`, compare `engineer/1200x900/replace/07.png`.
   Owner: graphty app (Data page title and button words for an edit).

6. **The disabled "Filter to neighbors" looks like an empty text field, and its reason does not
   show to the person who just pressed it** (new). Disabled, it is a gray outline around gray text,
   the same as an empty input with a placeholder. The reason tooltip ("The drawing already shows
   only this neighborhood...") opens only when the pointer leaves and comes back: hovering right
   after the press reads no tooltip at both sizes, because the button turned disabled under a
   pointer that was already over it and the tooltip opens on pointer entry. The tooltip's text also
   has no final period.
   Evidence: `engineer/1200x900/nbrtip/06.png` (no tooltip), `engineer/1200x900/nbrtip/08.png`
   (tooltip after leaving and returning), `engineer/crops/nbrtip08.png`; logs
   `engineer/1200x900/nbrtip.log`, `engineer/900x700/nbrtip.log`.
   Owner: compact-mantine (the default Button's disabled look); graphty app (showing the reason
   when the press disables the button, and the period).

7. **The repeated-ties warning on the "Add to team" page is plain text, and Load stays the
   primary button** (new). "16 edges in this file are already in team. Load adds them a second
   time." sits in body text above the footer with no warning glyph or color, where the
   unmatched-row warning on the same footer has a red glyph and an inline Add / Leave out choice.
   The blue primary button is Load, the choice the warning describes as doubling every tie;
   "Replace team.csv" is the outlined secondary.
   Evidence: `engineer/1200x900/addrepeat/02.png`, `engineer/900x700/addrepeat/02.png`, compare
   `engineer/1200x900/import/09.png`.
   Owner: graphty app (Data page footer).

8. **The neighbor list's Back row is cut mid-word and makes the whole inspector scroll sideways**
   (round 2). "Back to Eastside Cold Storage and Pac" is clipped with no ellipsis, and a horizontal
   scrollbar sits at the inspector's foot. Both sizes.
   Evidence: `engineer/1200x900/long/03.png`, `engineer/900x700/long/03.png`.
   Owner: graphty app (`inspector/NodeValues.tsx` Back row).

9. **Edge rows in the find list ellipsize away the words that matched** (round 2). For "Eastside
   Cold", the edge "Northern Regional Distribution Ce..." is listed with its matching end cut off.
   Evidence: `engineer/1200x900/long/18.png`.
   Owner: graphty app (`graph-place/FindBox.tsx`); compact-mantine if `ResultRow` cannot keep the
   match in view.

10. **The Path popover covers the nodes it asks the reader to pick** (round 2): four of
    Florentine's fifteen at 1200 x 900, seven of trails' nine at 900 x 700.
    Evidence: `engineer/1200x900/path/06.png`, `engineer/900x700/weight/13.png`.
    Owner: graphty app (popover anchor, or the drawing's view insets while it is open).

11. **At 900 x 700 the drawing gets 40% of the window, and popovers and the table cover most of
    it** (round 2). Both side panels keep 240 px, leaving a 363 px canvas; the Analyze popover
    starts over the left panel; with the table open the drawing is 363 x 420 with the toolbar
    floating in its middle.
    Evidence: `engineer/900x700/analyze/02.png`, `engineer/900x700/replace/09.png`.
    Owner: graphty app (workspace frame and popover placement).

12. **The path key's swatch is black on the dark legend card** (round 2), and the path itself is
    drawn black over the dark-orange nodes.
    Evidence: `engineer/900x700/weight/15.png`, `engineer/1200x900/path/08.png`.
    Owner: graphty app (legend swatch outline on dark grounds).

13. **Everything's Style tab mixes two label placements** (round 2). Color's label sits above a
    field at the panel's left edge; Size and Shape sit beside fields 95 px further right; "Show all
    labels" ends 8 px from the panel edge at 1200.
    Evidence: `engineer/1200x900/long/01.png`, `engineer/900x700/analyze/05.png`.
    Owner: graphty app (`style/StyleTab.tsx`, `style/LabelSection.tsx`).

14. **The graph has three names** (round 2). After Replace the header says "team", the Graph
    place "Graph team-v2.csv"; for two tables the header says "people and messages", the source
    row "people.csv and messages.csv", the inspector "From 2 files".
    Evidence: `engineer/1200x900/replace/10.png`, `engineer/1200x900/import/12.png`.
    Owner: graphty app.

### Severity 1

15. **Escape does nothing on the Data pages** (new). On "Replace: team.csv" (from Edit source...)
    and "Add to team", Escape leaves the page open; every popover, menu and the step editor close
    on Escape. Evidence: `engineer/900x700/editsrc/06.png`, `engineer/1200x900/addrepeat/04.png`.
    Owner: graphty app.
16. **The same column is aligned two ways** (new). The Data page's table left-aligns the weight
    numbers; the table at the bottom of the Graph place right-aligns them.
    Evidence: `engineer/900x700/editsrc/05.png`, compare `engineer/900x700/editsrc/03.png`.
    Owner: graphty app (or compact-mantine, if both tables are its component).
17. **Values drawn several ways** (round 2, widened). An edge's From and To are regular gray while
    its `minutes` is bold white; Top 10 values are regular where other values are bold; in "Nodes
    in order" the names are white and the order numbers gray, the reverse of every other row.
    Evidence: `engineer/1200x900/edge/04.png`, `engineer/1200x900/replace/03.png`,
    `engineer/crops/weight15-order.png`. Owner: graphty app.
18. **Four left edges and two alignments in one inspector** (round 2, widened). The histogram's
    summary starts at 977 px, "Damping factor" at 985 px, the rows at 993 px; "Weight: weight (read
    as closer)" flows from the left where every other value is right-aligned.
    Evidence: `engineer/1200x900/replace/03.png`. Owner: graphty app.
19. **Everything's Style tab shows Color 6366F1 while every node is drawn in PageRank's orange**
    (new). Nothing on the tab says a layer above overrides the base color.
    Evidence: `engineer/1200x900/analyze/05.png`. Owner: graphty app.
20. **The find box's offered rule is in a monospace face**; the box above shows the same text in
    the sans face (new). Evidence: `engineer/1200x900/select/03.png`. Owner: graphty app.
21. **The Attributes tree's "Nodes" and "Edges" rows leave a 33 px gap** between chevron and word,
    where every other row has an icon there (new). Evidence: `engineer/900x700/filter/03.png`.
    Owner: graphty app.
22. **Clicking a source row opens the table at the bottom**, shrinking the drawing; clicking an
    attribute row does not (round 2). Evidence: `engineer/900x700/editsrc/03.png`, compare
    `engineer/900x700/filter/03.png`. Owner: graphty app.
23. **After Escape from the step editor, the "+" tooltip covers the step row's checkbox** (round
    2). Evidence: `engineer/900x700/filter/17.png`. Owner: graphty app (focus returns to "+" and
    its Tooltip opens on focus); compact-mantine if the Tooltip should not open on a programmatic
    focus.
24. **Everything's inspector has no kind line and no actions menu**, so its tabs sit 24 px higher
    than in every other inspector (round 2). Evidence: `engineer/1200x900/long/01.png`, compare
    `engineer/1200x900/edge/04.png`. Owner: graphty app.
25. **The Nodes segment's dot touches its word** (round 2). Evidence:
    `engineer/1200x900/analyze/05.png`. Owner: graphty app (`style/StyleTab.tsx`).
26. **Style-tab section headings are smaller than Values-tab headings and have no chevron** (round
    2). Evidence: `engineer/1200x900/select/09.png`, compare the Values tab of the same selection,
    `engineer/900x700/select/04.png`. Owner: graphty app.
27. **"Edges per node" wraps and changes precision**: "3 to 6, mean / 3.667" and "2 to 4, mean /
    2.889" against "mean 4.1" and "mean 3" elsewhere (round 2). Evidence:
    `engineer/1200x900/import/10.png`, `engineer/900x700/weight/13.png`. Owner: graphty app.
28. **An unweighted path is "4 hops" in the tree and "5 nodes, 4 edges" in its inspector** (round
    2; a weighted path's row now shows "km 7.5"). Evidence: `engineer/1200x900/path/08.png`.
    Owner: graphty app (words).
29. **Choosing Weight narrows its role list and adds a bare "x" outside the field** (round 2).
    Evidence: `engineer/900x700/openfile/07.png`. Owner: graphty app (Data page).
30. **Primary buttons sit in two places** (round 2): Add step, Save and turn on, Filter to neighbors
    small and left under their fields; Find path, Load, Save, Replace right-aligned at the foot.
    Evidence: `engineer/900x700/filter/06.png`, `engineer/900x700/weight/13.png`. Owner: graphty app.
31. **Two segmented-control widths** (round 2): Each row is and Higher means are content-width;
    Hops, Follow and Nodes / Edges are full-width. Evidence: `engineer/900x700/openfile/07.png`,
    `engineer/900x700/neighbors/05.png`. Owner: graphty app.
32. **Two Cancel buttons** (round 2): the note form's is subtle, the Save dialog's and the Data
    page's are outlined. Evidence: `engineer/1200x900/notes/10.png`,
    `engineer/1200x900/notes/12.png`. Owner: graphty app.
33. **"Filters" heading has no chevron and a lighter weight while empty** (round 2). Evidence:
    `engineer/1200x900/addrepeat/02.png`, compare `engineer/900x700/filter/08.png`. Owner: graphty
    app.
34. **Two truncation rules in one inspector** (round 2): "Nodes in order" ellipsizes the names that
    Made with wraps in full. Evidence: `engineer/1200x900/long/10.png`. Owner: graphty app.
35. **A turned-off step reads "off" in the tree and "Off" in its inspector** (round 2). Evidence:
    `engineer/900x700/filter/11.png`. Owner: graphty app.
36. **A list opens over its own label** (round 2): the role lists and the Keep list. Evidence:
    `engineer/1200x900/import/05.png`, `engineer/900x700/filter/15.png`. Owner: compact-mantine
    (Select dropdown position), if that alignment is not deliberate.
37. **Recent projects' second line is body size and wraps at 900 x 700** (round 2). Evidence:
    `engineer/1200x900/notes/14.png`, `engineer/900x700/notes/14.png`. Owner: graphty app.
38. **The usage card's "What is collected" is larger and in link blue among small gray text**
    (round 2). Evidence: `engineer/1200x900/start/01.png`. Owner: graphty app.

## By owner

| Owner             | Findings                                                                   |
| ----------------- | -------------------------------------------------------------------------- |
| graphty-element   | 1, 2, 3 (and 4 if its API cannot replace a several-table source)           |
| compact-mantine   | 6 (disabled Button look), 36; shares 9 and 23                              |
| graphty app       | everything else                                                            |

## Compared with round 2

Fixed or changed on this build: Add step now turns its step on at once; under a filter step the
Graph inspector splits "Overview" (what is showing) from a "Full graph" section; a long filter
step's name is ellipsized before its checkbox instead of running into it; a weighted path's tree row
shows its total; the find box offers a typed condition as a rule with its "=" kept. Round 2's
legend-covers-a-name finding did not appear: after the path run the legend card ended above the
name at both sizes on this layout. Round 2's refused-rule correction (finding 5 there) was not
walked this round, because a typed condition is now offered as a rule before it can be refused.

New this round: findings 3 (node overlap, the element cause under finding 1), 6, 7 and 15 to 21.
Findings 6 and 7 are on screens round 3 added (the disabled neighbor command, the repeated-ties
warning). Every other round 2 finding is still on this build.

Findings 2, 8, 9 and 34 need names of 40 or more characters, which no study file has. The rest were
seen with the study's own files.
