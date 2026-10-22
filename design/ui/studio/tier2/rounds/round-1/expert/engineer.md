# Tier 2 screenshot audit -- Design Engineer

Build under test: 946256efb876 (graphty@0.8.56), the frozen tier 2 build named in `../../../criteria.md`,
served from `.study-builds/tier2-r1d4-946256efb/`. Every screen and state the tier 2 tasks reach was
walked twice with `tool/real.mjs`, once in a 1200 x 900 window and once in a 900 x 700 window
(`REAL_VIEWPORT`, added to the tool for this audit; studies still run at 1440 x 900). Every
screenshot was looked at.

Walks (folders under `engineer/<size>/`, one numbered screenshot per step, steps in `<walk>.log`):

| Walk      | What it covers                                                                                                                   |
| --------- | -------------------------------------------------------------------------------------------------------------------------------- |
| start     | Start screen, usage-data card, hover on a start row                                                                              |
| import    | New from data: one table, role list open, second table, unmatched row, Load, Sources, left-out row inspector                     |
| weight    | Import with a weight column, Higher means, Load, Path popover empty and filled, path result                                      |
| filter    | Style tab of a run, attribute row, Attribute actions menu, new filter step, step on, off, edited, saved                          |
| path      | Path popover by keyboard, path result, legend with a categorical block                                                           |
| notes     | Note form, saved note, note about the graph, Save dialog, Recent projects after reopening, Notes after reopening                 |
| replace   | Run Values (histogram, top 10), Sources menu, Replace page, stale run banner, rerun                                              |
| select    | Rule in the find box, edge selection inspector, Selection actions menu, refused rule                                             |
| neighbors | Neighborhood list at 1 and 2 hops, Filter to neighbors                                                                           |
| analyze   | Everything's Style tab with labels on, Analyze popover                                                                           |
| long      | `long-names.csv` (40+ character names, a 30-character column): node inspector, neighborhood, path, Data place, filter, find list |

Severity: 0 cosmetic only if time allows, 1 cosmetic, 2 minor (slows or misleads), 3 major (hides
information a task needs), 4 blocks a task. "Owner" is the package where the fix belongs.

## Findings

### Severity 3

1. **Long node names are cut off at the canvas edges and drawn over each other.** With "Show all
   labels" on, "Northern Regional Distribution Center 01" reads "hern Regional Distribution Center
   01", "Southern Valley Agricultural Cooperative" reads "uthern Valley ...", "Eastside Cold Storage
   and Packing Facility" is cut at the right edge and half covered by the Southern label's white
   ground. Labels are drawn at about 26 px on a six-node graph, so the fit that frames the spheres
   leaves no room for the labels. Both sizes.
   Evidence: `engineer/1200x900/long/01.png`, `engineer/900x700/long/01.png`.
   Owner: graphty-element (the frame-to-fit ignores label extents; overlapping labels are not
   resolved). The app must not work around it by shrinking the font.

2. **The find list cuts long rows with no ellipsis and scrolls sideways.** Typing "Eastside Cold"
   lists "Eastside Cold Storage and Packing Fa", "Northern Regional Distribution Center" and
   "Harbor Street Warehouse -> Eastside", each cut at the panel edge, with a horizontal scrollbar
   under the list. In the edge rows the matched words are the part that is cut away, so the reader
   cannot see why the row matched. Both sizes.
   Evidence: `engineer/1200x900/long/18.png`, `engineer/900x700/long/18.png`.
   Owner: graphty app (`graph-place/FindBox.tsx`: the list's ScrollArea allows horizontal scroll);
   compact-mantine if `ResultRow` cannot ellipsize its label.

3. **A long name hides the neighborhood count, and "Back to ..." is clipped mid-word.** The
   neighborhood heading becomes "Eastside Cold Storage and Packing Fa..." -- the "'s 3
   connections" the task reads is the part the ellipsis removes. The Back row is cut hard at the
   panel edge ("Back to Eastside Cold Storage and Pa") with no ellipsis. Both sizes.
   Evidence: `engineer/1200x900/long/03.png`, `engineer/900x700/long/03.png`.
   Owner: graphty app (`inspector/NodeValues.tsx`): the count belongs outside the truncated name
   (or the heading wraps), and the Back row needs the same truncation as every other row.

### Severity 2

4. **At 900 x 700 the drawing gets 40% of the window, and the popovers cover the left panel.**
   Both side panels keep 240 px, leaving a 363 px canvas. The Analyze and Path popovers (400 px,
   anchored to the toolbar) start at x 220, over the left panel's tree, and cover most of the
   drawing.
   Evidence: `engineer/900x700/weight/09.png`, `engineer/900x700/path/06.png`,
   `engineer/900x700/analyze/02.png`.
   Owner: graphty app (workspace frame and popover placement).

5. **The Path popover covers the lower third of the drawing while it asks for two nodes.** Its
   "pick on the drawing" buttons invite a click on a node, but the popover itself hides the nodes
   below y 528. Both sizes.
   Evidence: `engineer/1200x900/weight/09.png`, `engineer/1200x900/weight/11.png`.
   Owner: graphty app (popover anchor; or the drawing's view insets while it is open).

6. **The legend card covers node labels.** The card refits the drawing only when it hides a node,
   so a label above a node goes under it: after a path run the card grows and covers "Regional
   Distribution Center 01".
   Evidence: `engineer/900x700/long/10.png`, `engineer/900x700/long/12.png`.
   Owner: graphty app (`LegendCard.tsx` reserved margin) once graphty-element reports label bounds
   (finding 1).

7. **The path key's swatch is black on the dark legend card.** "On the path" is marked by a black
   circle on a #2b2b2b card (about 1.3:1), so the only mark of the key is nearly invisible.
   Evidence: `engineer/crops/legend-path.png` (from `engineer/1200x900/weight/14.png`).
   Owner: graphty app (the legend card's swatch needs an outline on dark grounds; the route color
   is the app's choice).

8. **Everything's Style tab mixes two label placements and runs to the panel edge.** Color's label
   sits above its field, while Size and Shape sit beside theirs (the run's Style tab puts every
   label beside its field). "Show all labels" ends 2 px from the panel's right edge with no gutter.
   Evidence: `engineer/900x700/analyze/01.png`, `engineer/crops/show-all-labels.png`,
   compare `engineer/900x700/filter/01.png`.
   Owner: graphty app (`style/StyleTab.tsx`, `style/LabelSection.tsx`).

### Severity 1

9. **Two truncation rules in one inspector.** The path result's "Nodes in order" ellipsizes
   ("Northern Regional Distributio..."), while Made with wraps the same names in full.
   Evidence: `engineer/1200x900/long/10.png`. Owner: graphty app.
10. **A long filter step's name runs into its checkbox** with no gap ("average_minutes_between_..."
    touching the box). Evidence: `engineer/900x700/long/16.png`. Owner: graphty app (Data place
    filter row).
11. **Primary buttons sit in two places.** Add step, Save and turn on and Filter to neighbors are
    small and left-aligned under their controls; Find path, Load and Save are right-aligned at the
    foot. Evidence: `engineer/1200x900/filter/06.png`, `engineer/900x700/neighbors/04.png` against
    `engineer/1200x900/weight/09.png`. Owner: graphty app.
12. **Two segmented-control looks.** "Each row is" and "Higher means" on the import page are
    content-width; Follow and Hops are full-width with equal segments. Evidence:
    `engineer/1200x900/weight/07.png` against `engineer/1200x900/weight/09.png`. Owner: graphty app
    (choose one per context); compact-mantine if the full-width form is meant to be the default.
13. **Two Cancel buttons.** The note form's Cancel is plain text; the Save dialog's and the import
    page's are outlined. Evidence: `engineer/900x700/notes/03.png` against
    `engineer/900x700/notes/10.png`. Owner: graphty app.
14. **"Filters" heading has no chevron and a lighter weight than Sources and Attributes** while
    empty, so the three section headings look like two kinds. Evidence:
    `engineer/1200x900/import/11.png`. Owner: graphty app (Data place).
15. **Inspector notes sit 8 px left of the row labels** ("The counts below are for the whole
    graph.", "Each edge counts as 1."). Evidence: `engineer/900x700/filter/07.png`,
    `engineer/900x700/path/07.png`. Owner: graphty app.
16. **The graph has three names.** The header says "team", the Graph place "Graph team.csv", the
    Data place "team"; after Replace the Graph place says "team-v2.csv" while the header still says
    "team". Evidence: `engineer/900x700/replace/07.png`, `engineer/900x700/replace/05.png`.
    Owner: graphty app.
17. **Recent projects' second line wraps, leaving "AM" alone** even at 1200, and it is set at body
    size, unlike the samples' small gray second line. Evidence: `engineer/1200x900/notes/12.png`,
    `engineer/900x700/notes/12.png`. Owner: graphty app (start screen).
18. **The left-out row's inspector shows a document icon** while its tree row shows the warning
    glyph. Evidence: `engineer/1200x900/import/14.png`. Owner: graphty app.
19. **A role list opens over its own field and the column name** (the chosen option is laid over
    the field), so the name of the column being set is hidden while choosing. Evidence:
    `engineer/1200x900/import/05.png`, `engineer/900x700/weight/05.png`. Owner: compact-mantine
    (Select dropdown position), if that alignment is not deliberate.
20. **The import page's footer floats mid-window on a short table**, with about 440 px of empty
    page below Load. Evidence: `engineer/1200x900/import/09.png`. Owner: graphty app.
21. **A turned-off step reads "off" in the tree and "Off" in its inspector.** Evidence:
    `engineer/900x700/filter/09.png`, `engineer/900x700/filter/11.png`. Owner: graphty app.
22. **A refused rule's example uses another number** ("shared_chapters > `16`" after the reader
    typed 10). Evidence: `engineer/900x700/select/07.png`. Owner: graphty app (words).
23. **The usage card's "What is collected" is larger and in link blue** among small gray text.
    Evidence: `engineer/1200x900/start/01.png`. Owner: graphty app.
24. **Top 10 values are regular gray** where every other inspector value is bold white.
    Evidence: `engineer/900x700/replace/03.png`. Owner: graphty app.

## What held up

At both sizes no control overlapped another, no dialog ran off screen, every primary path stayed
reachable, the import table scrolled inside its frame, and every app control was a compact-mantine
or themed Mantine component (a source check of `graphty/src/workspace` found no bare control where
compact-mantine has one). With the study's own files (short names) at 1440 x 900, findings 4, 1, 2,
3 and 6 do not occur; findings 5, 7, 11 and 12 do.
