# Tier 2 round 5: expert walkthrough, controls and gestures (Figma product designer)

Build: 8c015b806086 (graphty@0.8.65), served from
`/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r5-8c015b806/` and driven with
`tool/real.mjs` at 1440 x 900, and at 1280 x 800 for two tables and the Path popover. Walked
2026-10-11, before any session of this round was read.

The lens: how each control, gesture, popover and menu behaves, and whether it matches Figma where
Figma already solved the same problem. What a run, a filter step or a note means stays out of this
lens. Screenshot paths are relative to `figma/` beside this file.

Severity: 0 not a problem, 1 cosmetic, 2 minor (slows or confuses), 3 major (a reader can be
misled or stopped on a success path), 4 blocks the task.

Not covered: light mode, screen-reader mode, clipped long names (bar 10's script counts them).

## Screens walked

| Screen                                                                                   | Session folder | Screenshots |
| ---------------------------------------------------------------------------------------- | -------------- | ----------- |
| Selection grammar: click, Shift-click, Shift-click again, Escape                         | `path/`        | 01 to 05    |
| Path popover, weighted path, P again, second path, Undo, node Delete key                 | `path/`        | 06 to 17    |
| Node menu, neighbor list (Hops, Follow, arrows, Escape), the Escape repeat               | `path/`        | 18 to 26, 30 to 34 |
| Clicking ties (one under a drawn name), an edge's inspector                              | `path/`        | 27 to 29    |
| Made with's pick, Rerun bar, Revert, a "Nodes in order" row                              | `path/`        | 35 to 40    |
| Find box: "10", Enter, a miss, a rule on a missing column, "minutes 10", "minutes", "4"   | `find/`        | 02 to 11    |
| Styling a rule selection (Line > Color), the layer, Escape in the color picker (layer and selection) | `find/` | 12 to 24 |
| Filters door, Attribute pick, typing after it, Add step, the table under the step        | `filter/`      | 02 to 09    |
| Step editor: Delete key, off step left alone, Tab, Escape, leaving an edit, Undo, menu Delete, Redo | `filter/` | 10 to 24 |
| Analyze popover: unfiltered, "path", "brokers", Escape twice                             | `filter/`      | 25 to 29    |
| N after a run row; Main menu; New project > Discard; Open a sample                       | `filter/`      | 34 to 41    |
| Notes: save, Cancel then N, double-click a saved note                                    | `filter/`      | 42 to 47    |
| 1280 x 800: two tables, Add a table menu, unmatched row, load, Path popover, To list, Filter to... | `long/` | 02 to 15 |

## Findings, most severe first

No severity 3 or 4 this round.

### Severity 2, new

1. **"Filter to neighbors" disappears when Follow is Out or In.** Clinic's neighbor list with
   Follow All shows the button (`path/22.png`); click Out and it is gone, with no reason
   (`path/23.png`). A reader who wants only the stops downstream cannot filter to them, and may
   switch back to All to find the command, then filter a different set than the one listed. Figma
   keeps a command where it was and disables it with a reason. Mechanism: `NodeValues.tsx` renders
   the button only when `follow === "all"`, because the element's neighborhood filter rule has no
   direction (`{ kind: "neighborhood", seeds, depth }`). Owner: graphty-element (an optional
   `direction` on the neighborhood rule, additive, the team's call), then the graphty app shows the
   button for every Follow value.

2. **Escape after a Follow click clears the whole selection.** With focus on Hops, Escape returns
   to Clinic as designed (`path/30.png` to `31.png`). Click Follow Out, then Escape: the selection
   is cleared and the toast says "Selection cleared: 2 nodes" (`path/33.png`, `34.png`); the same
   in `path/26.png`. After the Follow click no focus mark is drawn (`path/33.png`), so the key
   seems to reach the canvas's clear-selection handler instead of the list's own Escape. Figma's
   Escape goes up one level. Owner: graphty app. Script: `real.mjs --start <dir>
   setup:bus-stops-names.txt`, then `--click-at 863,661 --key g`, `--click Out`, `--key Escape`.

3. **The To list is painted under the Follow control at 1280 x 800.** Typing "p" in To opens the
   node list over the popover, and "Out | All" draws on top of the first two options
   (`long/08.png`). Figma's dropdowns always sit above the panel they open from. Owner:
   compact-mantine (the combobox dropdown's stacking inside a popover), or the graphty app if it
   turned the portal off for this list.

4. **The node pickers match a name but show only the id.** In To, typing "Kemi" offers one row,
   "p11" (`long/10.png`); nothing says why it matched, so a reader who knows people by name cannot
   confirm the pick. Figma's search rows show the matched text. Owner: graphty app (show the value
   that matched beside the id).

5. **A rule on a column that does not exist answers "Nothing matches this rule", and drops the
   reader's selection.** "=distance > \`5\`" on bus stops (no such column): "Nothing matches this
   rule" (`find/06.png`); Enter replaces the 3-edge selection with an empty one (`find/05.png`
   then `find/07.png`). The scripted claim from round 4, reproduced on this build and not yet
   fixed. Owner: graphty-element (the selector refuses with `E_UNKNOWN_ATTRIBUTE`), graphty app
   (the words "No column named distance", and no selection change on a refusal).

6. **"minutes 10" is "No match" while "10" alone offers "minutes is 10 or more".** The new row
   works for a bare number (`find/02.png`, Enter selects 3 edges, `find/03.png`), but naming the
   column first, the more specific query, gets "No match" and the example rule (`find/08.png`).
   Figma's search treats extra words as narrowing, never as a miss. Owner: graphty-element (`find`
   reads "<column> <number>" as the same row for that column).

### Severity 2, seen again from round 4

7. **Shift-click on a selected node does not take it out** (`path/03.png`, `path/04.png`).
   graphty-element.
8. **Adding a style property moves the inspector from the selection to the new layer.** "3 edges
   selected" becomes "minutes >= \`10\`, Layer" after Line > Color (`find/14.png`, `15.png`). In
   Figma the selection stays the subject. graphty app. (The Width band was not re-walked.)
9. **Made with's pick sets To equal to From.** "Use selected node as To" with Depot selected makes
   From Depot, To Depot, and offers Rerun (`path/38.png`). graphty app, graphty-element (a code
   for equal ends).
10. **The Path form forgets the weight.** P after a "minutes" path opens with Weight None
    (`path/12.png`); the second path runs by hops (`path/14.png`). graphty app.
11. **To accepts the From node** ("p12" offered while From is p12, `long/09.png`). graphty app.
12. **A second Find path replaces the first silently** (`path/11.png`, `path/14.png`). Held by
    the round 3 decisions. graphty app.
13. **The Delete key does nothing on a selected filter step** (`filter/11.png`, `12.png`). graphty
    app.
14. **The step editor's keys.** Tab moves to "Save and turn on" without committing; Escape there
    does nothing (`filter/17.png`, `18.png`). graphty app.
15. **Focus stays where typing goes wrong.** After picking "weight", typing "4" writes "weight4"
    into Attribute (`filter/05.png`); after "Filter to..." focus stays on the attribute row and
    typing types nothing (`long/15.png`). graphty app.
16. **The Filters door opens an empty form** with a disabled "Add step" (`filter/02.png`). graphty
    app.
17. **N does nothing right after clicking a run row** (`filter/35.png`, `36.png`). graphty app.
18. **Arrow keys after clicking a Follow segment do nothing** (`path/23.png`, `24.png`); after
    reaching Hops by focus they work (`path/21.png`). graphty app.
19. **The Analyze search field moves while typing** (y 396 to 754, `filter/25.png`,
    `filter/27.png`). graphty app.
20. **A saved note cannot be edited**; double-click selects a word (`filter/47.png`). graphty app.
21. **The Path popover covers the nodes it asks about** (Market, Library at 1440 x 900,
    `path/07.png`; most of the graph's left half at 1280 x 800, `long/08.png`). graphty app.
22. **"As the file says" for a CSV** (`long/02.png`). graphty app (words), graph-io and
    graphty-element (what a CSV's direction is reported as).
23. **Deferred divergences unchanged:** Save form versus live editing (`filter/17.png`); checkbox
    on steps versus eye on runs (`filter/06.png`, `path/11.png`); label above in the step editor
    and Path popover, label left in the Style tab and neighbor list (`path/07.png`,
    `path/20.png`). graphty app, compact-mantine (the row).

### Severity 1

24. Escape on a selection raises a toast "Selection cleared: 2 nodes" with a close button
    (`path/05.png`). graphty app.
25. The Selection row is not highlighted while the selection is the inspector's subject
    (`path/03.png`, `find/03.png`). graphty app.
26. The inspector's subject and the canvas ring disagree: a finished path run is the subject while
    Depot stays ringed (`path/11.png`); the new filter step is the subject while p12 stays ringed
    (`long/15.png`); after Add step the inspector shows Graph while the new row is focused
    (`filter/06.png`). graphty app.
27. An edge's From and To values are gray, dimmer than its minutes value (`path/28.png`). graphty
    app.
28. A step row wraps "20 to 19 nodes, 41 to 12 edges" to three lines (`filter/06.png`). graphty
    app.
29. A step's context menu holds only Delete, with no shortcut shown (`filter/21.png`). graphty app.
30. The "Add a table" menu (3 items) shows a scrollbar (`long/03.png`). compact-mantine.
31. "1 row left out" keeps a red warning triangle after Leave out was the choice (`long/13.png`).
    graphty app.
32. Overview values wrap: "Undirected, from the / file", "1 to 6, mean / 2.667" (`filter/42.png`,
    `long/05.png`). graphty app.
33. Escape in a filled picker clears the text first and closes on a second press
    (`filter/27.png`, `28.png`). graphty app.
34. The pick button's tooltip says "Use selected node" while its name is "Use selected node as To"
    (`path/37.png`). graphty app.
35. "Open a sample" opens a menu but has no chevron (`filter/39.png`, `40.png`). graphty app.
36. The find box clears its text after Enter on a value row (`find/03.png`) but keeps it after
    Enter on a rule (`find/10.png`). graphty app.
37. A bare column word, "minutes", offers "=minutes, Select its matches" first; Enter selects all
    17 edges (`find/09.png`, `10.png`). A reader typing a column name rarely means "everything
    with it". graphty-element (what `find` offers for a column word), graphty app (row order).
38. G reopens the neighbor list with Follow kept at Out but Hops reset to 1 (`path/33.png`).
    graphty app.
39. An empty project leaves the Table and Find tools enabled in the toolbar (`filter/39.png`).
    graphty app.

## Not re-walked this round (round 4 numbers)

17 (Load primary when every incoming edge repeats), 20 ("Not set" at load and on Replace), 22
(the toolbar covering a node after load; at 1280 x 800 with two tables it did not,
`long/05.png`), 38 (Replace asks "Higher means" again), 42 (a note keeps no mark after its run is
rerun on new data), and the Width band in 4.

## Against round 4

- **Fixed:** New project, then Discard, opens the empty project with no error page and no console
  error (`filter/37.png` to `39.png`); "10" on bus stops offers "minutes is 10 or more (3)" and
  Enter selects the 3 edges, no refused suggestion (`find/02.png`, `03.png`); the layer made from a
  rule is named "minutes >= \`10\`" (`find/15.png`); the data table under a step reads "12 of 41
  edges" (`filter/09.png`); opening an off step's editor and clicking away leaves it off
  (`filter/14.png`, `15.png`); deleting a step returns the inspector to the graph, no "This step is
  gone" (`filter/22.png`); Cancel in the note editor leaves focus on Add note, so N reopens it
  (`filter/45.png`).
- **Scripted claim not reproduced by pointer:** Escape in the Color picker of a selection closes
  the picker and keeps the selection, focus back on the swatch (`find/23.png`, `24.png`); the same
  on a layer (`find/18.png` to `20.png`). The round 4 report came from a keyboard walk.
- **Scripted claim, tie under a drawn name:** a click at the Station-Stadium tie's midpoint, under
  the "Stadium" label, selected the tie, not the label or a node (`path/27.png`, `28.png`).
- **Count:** 39 findings (round 4: 42, of which 5 were not re-walked), 0 at severity 3 (round 4:
  2). New: 1 to 6, 26 (widened), 34 to 39.

## Held as Figma-consistent

- Clicking a row in "Nodes in order" selects that node (`path/40.png`), as a Layers row does.
- A right-click on a node selects it and opens a menu with keys right-aligned (`path/19.png`).
- Undo and Redo of a step name the act in a toast (`filter/24.png`); one Undo restores an edited,
  turned-on step to its off state (`filter/20.png`).
- The Rerun / Revert bar on a run whose settings changed (`path/38.png`).
- The Path popover's Enter on a To option moves on to Find path (`path/08.png`).
- The New project discard dialog: forced by the browser file model (`filter/38.png`).
