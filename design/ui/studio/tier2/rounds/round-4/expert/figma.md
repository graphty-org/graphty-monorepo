# Tier 2 round 4: expert walkthrough, controls and gestures (Figma product designer)

Build: 5277e2cbe1bd (graphty@0.8.64), served from
`/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r4d1-5277e2cbe/` and driven with
`tool/real.mjs` at 1440 x 900, and at 1280 x 800 for long names and the Path popover. Walked
2026-10-11, before any session of this round was read.

The lens: how each control, gesture, popover and menu behaves, and whether it matches Figma where
Figma already solved the same problem. What a run, a filter step or a note means stays out of this
lens. Screenshot paths are relative to `figma/` beside this file.

Severity: 0 not a problem, 1 cosmetic, 2 minor (slows or confuses), 3 major (a reader can be
misled or stopped on a success path), 4 blocks the task.

Not covered: light mode, screen-reader mode.

## Screens walked

| Screen                                                                      | Session folder | Screenshots       |
| --------------------------------------------------------------------------- | -------------- | ----------------- |
| Selection grammar: click, Shift-click a node, Shift-click it again, Escape, drag | `path/`    | 02 to 07          |
| Path popover, weighted path, P again, second path, Undo, Made with's pick, Rerun | `path/`    | 08 to 21          |
| Node menu, neighbor list (Hops, Follow, arrows), Filter to neighbors, chip  | `path/`        | 22 to 31          |
| An edge's inspector, Edge actions, Select endpoints, edge context menu      | `path/`        | 32 to 36          |
| Find box: a miss, "minutes 10", "10", a column word, a rule, a value "4"     | `find/`        | 02 to 09          |
| Styling a rule selection by Width, deselect, Escape twice in the find box   | `find/`        | 10 to 16          |
| Filters toolbar door, Keep and Attribute lists, typing after a pick         | `filter/`      | 02 to 09          |
| Step editor: edit, Tab, Escape, click-away; Delete key; menu Delete; Undo, Redo | `filter/`  | 10 to 29          |
| Analyze popover: unfiltered, "path", "brokers", Escape                      | `notes/`       | 02 to 11          |
| N from a run row and from the inspector; a saved note; double-click         | `notes/`       | 12 to 17          |
| Main menu; Add page over a loaded file; Replace; out-of-date run; Rerun     | `notes/`       | 18 to 28          |
| Data page with two tables, "Add a table" menu, an unmatched row; the load   | `tables/`      | 03 to 06          |
| 1280 x 800: Path popover, To list, New project, long column, Filter to...    | `long/`        | 02 to 16          |
| Reproduction of the New project crash                                       | `repro-new/`   | all               |

## Findings, most severe first

### Severity 3

1. **New project, then Discard, crashes the app.** From a loaded graph (bus-stops with labels, a
   node selected, the Path popover just closed), Main menu > New project > Discard shows the
   app's "Something went wrong / Try again" screen; the console has `GraphtyError: the session
   has been disposed, so data.snapshot() cannot answer` from a component still reading the old
   session's `attributes()`. Try again lands on the start screen, so nothing the reader chose to
   keep is lost, but the first thing they see after a deliberate choice is an error page. Figma's
   File > New never shows an error. Screen: main menu, discard dialog. Evidence: `long/07.png`
   (dialog), `long/08.png` (crash), `long/10.png` (after Try again). A plain load has no unsaved work, so it shows no dialog and no
   crash (`repro-new/`); the trigger needs the unsaved state below. Owner: graphty
   app (a component renders against the disposed session; the element is right to refuse).
   Script: `REAL_VIEWPORT=1280x800 real.mjs --start <dir> setup:bus-stops-names.txt`, then
   `--click Clinic --key p`, `--key Escape`, `--click "Main menu" --click "New project"`,
   `--click Discard`.

2. **The find box offers a rule for a bare number that it then refuses.** On bus-stops, typing
   "10" offers one highlighted row, "=\`10\`" with "Select its matches" (`find/04.png`). Enter
   rewrites the box to "=\`10\`" and answers in error red "Not a rule Find can read (at character
   2)" (`find/08.png`): a command the app suggested, which the app cannot run, worded as a parser
   message. Round 4's "is N or more" row appears only when the number is itself a value in the
   data ("4" offers "minutes is 4 or more (14)", `find/07.png`); for "10", which no tie has, it
   does not, and "minutes 10" is "No match" (`find/03.png`). Figma never offers an Enter-able
   action that fails. Screen: find box. Owner: graphty app (the suggestion it builds for a bare
   number), graphty-element (an `atLeast` row for a number that is in a number column's range but
   not one of its values). Script: `real.mjs --start <dir> setup:bus-stops.txt`, then
   `--click "Find nodes, edges, values" --type 10`, then `--key Enter`.

### Severity 2

3. **Shift-click on a selected node does not take it out.** Depot and School selected; Shift-click
   on Depot leaves both selected. In Figma Shift-click toggles. With no toggle, removing one node
   from a selection means starting over. Screen: canvas. Evidence: `path/03.png`, `path/04.png`.
   Owner: graphty-element (the same `shiftKey` handling that now adds).

4. **Width on a selection draws a 24 px blue band, and the inspector leaves the selection.**
   Adding Width to a rule's 3-edge selection paints the selection highlight as wide as the line
   (the blue band in `find/12.png`), while the layer's own drawing after deselecting is a modest
   gray line (`find/13.png`): what the reader sees while choosing is not what the layer paints.
   The inspector also jumps from "3 edges selected" to the new layer. Figma's selection outline
   stays thin whatever the stroke, and adding a property keeps the selection the subject. Screen:
   Style tab on a selection. Owner: graphty-element (selection style follows the width), graphty
   app (subject change).

5. **Made with's pick button can set To equal to From, and Rerun makes a 0-hop run in place.**
   After Undo, the path run's Made with offers "Use selected node as To" beside To; with Depot
   selected, one click sets To Depot (From is Depot), the "Settings changed since the run" bar
   offers Rerun, and Rerun replaces the 14-minute path with "minutes 0", "1 node, 0 edges".
   Screen: path run's Values. Evidence: `path/19.png`, `path/20.png`. Owner: graphty app (offer
   no pick that equals the other end), graphty-element (a code for equal ends).

6. **The Path form still forgets the weight.** P after a "minutes" path opens with Weight "None",
   and the second path runs by hops. Evidence: `path/14.png`, `path/16.png`. Owner: graphty app.

7. **To still accepts the From node.** At 1280 x 800, From Clinic, typing "Cli" in To offers
   Clinic. Evidence: `long/03.png`. Owner: graphty app.

8. **A second Find path still replaces the first silently** (held by the round 3 decisions).
   Evidence: `path/13.png`, `path/16.png`. Owner: graphty app.

9. **The Delete key does nothing on a selected filter step.** The step row is selected and
   focused; Delete and Backspace leave it. Only right-click > Delete works, and that menu shows no
   shortcut. In Figma Delete removes the selected layer. Screen: Data place. Evidence:
   `filter/26.png`, `filter/27.png`, `filter/16.png`. Owner: graphty app.

10. **After deleting a step, or undoing its creation, the inspector shows a dead object.** The
    inspector reads "New filter step / This step is gone", under a title the deleted step never
    had. Figma returns the inspector to the page when its object goes. Screen: inspector.
    Evidence: `filter/28.png` (menu Delete), `filter/19.png` (Undo of adding). Owner: graphty app.

11. **The step editor's keys: Tab still does not commit, and Escape on Save step does nothing.**
    Value 3 to 4, Tab: focus moves to "Save step", nothing committed (`filter/11.png`); Escape
    there leaves the editor open (`filter/12.png`); Escape from Value then closes it and the step
    still reads "at least 3" (`filter/14.png`). Escape should close the innermost thing on every
    control inside it. Owner: graphty app.

12. **Focus stays where typing goes wrong.** After picking "weight" in the step's Attribute list,
    focus stays in that combobox, so typing the value writes "weight3" into Attribute
    (`filter/08.png`). "Filter to..." from an attribute's menu still leaves focus on the attribute
    row; typing types nothing (`long/15.png`). Figma puts the caret in the next field. Owner:
    graphty app.

13. **The Filters door and "+" open an empty form.** "New filter step" with an empty Attribute and
    a disabled "Add step" (its tooltip now says "Choose an attribute first"). Add-first would add
    a step on the first number attribute that keeps everything. Evidence: `filter/02.png`,
    `filter/03.png`. Owner: graphty app.

14. **N does nothing right after clicking a run row.** Click the PageRank run in the list, press N:
    nothing (`notes/13.png`); the same key with focus elsewhere opens "About PageRank"
    (`notes/15.png`). The tree's type-ahead takes the letter. Click a layer, press a key is the
    most common Figma sequence. Owner: graphty app (the list's key handling).

15. **Arrow keys after clicking Follow still do nothing.** Evidence: `path/24.png`, `path/25.png`.
    Owner: graphty app.

16. **The Analyze search field moves while typing.** The popover is anchored at its bottom, so the
    field jumps from y 396 to 578 to 754 as "path" and "brokers" shorten the list. Figma's Actions
    menu keeps the field still. Evidence: `notes/02.png` to `notes/04.png`. Owner: graphty app.

17. **When every incoming edge repeats, Load is still the filled button.** The line now has a
    warning icon. Evidence: `notes/22.png`. Owner: graphty app.

18. **A saved note still cannot be edited.** Double-click selects a word of the date. Evidence:
    `notes/17.png`. Owner: graphty app.

19. **The Path popover covers the nodes it asks about** (Market, Library; the lower half at
    1280 x 800). Evidence: `path/09.png`, `long/02.png`. Owner: graphty app.

20. **"Not set" still means two things** at load and on Replace. Evidence: `notes/22.png`,
    `notes/23.png`. Owner: graphty-element.

21. **Deferred divergences unchanged:** Save form versus live editing; checkbox on steps versus eye
    on runs; two row grammars (label above in the step editor and Path popover, label left in the
    Style tab and neighbor list). Evidence: `filter/11.png`, `path/23.png`, `path/09.png`. Owner:
    graphty app, compact-mantine (the row).

22. **The toolbar covers a node after load.** Evidence: `long/12.png`. Owner: graphty-element (a
    fit inset option; the app sets it).

23. **"As the file says" for a CSV.** Evidence: `tables/03.png`. Owner: graphty app (words),
    graph-io / graphty-element (what a CSV's direction is reported as).

### Severity 1

24. Escape on a 2-node selection raises a toast "Selection cleared: 2 nodes" with a close button;
    a click on empty canvas raises none. `path/05.png`. graphty app.
25. A drag on empty canvas turns the 3D camera; there is no marquee. A recorded 3D divergence,
    noted for 2D. `path/07.png`. graphty-element.
26. A finished path run is the inspector's subject while Depot stays selected and ringed.
    `path/13.png`. graphty app.
27. "Settings changed since the run" wraps to two lines beside Rerun and Revert. `path/19.png`.
    graphty app.
28. "Filter to neighbors" turns disabled with no reason after use; a filter that keeps all 10 of
    10 nodes is allowed. `path/28.png`, `path/29.png`. graphty app.
29. An edge's From and To values are gray, dimmer than its minutes value, as if disabled.
    `path/32.png`. graphty app.
30. The Selection row is not highlighted while the selection is the subject. `find/10.png`.
    graphty app.
31. Escape in a filled picker (Analyze, Path's To) clears the text first and closes on a second
    press; the decided picker rule is one Escape closes. `notes/09.png`, `long/04.png`. graphty
    app.
32. The Keep list marks its chosen option with both a checkmark and a blue fill. `filter/04.png`.
    compact-mantine.
33. A step row wraps "20 to 20 nodes, 41 to 20 edges" to three lines. `filter/09.png`. graphty
    app.
34. A step's context menu holds only Delete, with no shortcut. `filter/16.png`. graphty app.
35. The "Add a table" menu (3 items) shows a scrollbar. `tables/04.png`. compact-mantine.
36. "1 left out" keeps a red warning triangle after Leave out was chosen. `tables/05.png`. graphty
    app.
37. "Edges per node" wraps ("3 to 6, mean / 3.667"). `tables/06.png`. graphty app.
38. Replace opens a second page that asks "Higher means" again, with "Weight: weight auto".
    `notes/23.png`. graphty app.
39. Right-click on an attribute opens its menu over the name and does not select the row.
    `long/14.png`. graphty app.
40. The attribute tooltip breaks the column name mid-word ("...between_visi / ts").
    `long/15.png`. compact-mantine (Tooltip width).
41. The step's attribute list offers file columns only, not a run's result. `filter/06.png`.
    graphty app.
42. A note about a run keeps no mark after the run is rerun on new data. `notes/28.png`. graphty
    app.

## Open owner items seen again (not counted)

- Drawn labels and nodes overlapping (`path/01.png`, `long/12.png`); numbers in rules need
  backticks (`find/09.png`, finding 2 is the app's side); the chosen face of a segmented control
  (`path/23.png`).

## Against round 3

- **Fixed:** Shift-click on a node adds it (`path/03.png`, "2 nodes selected", "Edges joining
  these nodes 1"); Made with after Undo shows the restored run's inputs (`path/17.png`); an edge
  step counts edges, in the row and the header chip (`filter/09.png`); the disabled Add step says
  why (`filter/03.png`); Analyze puts name matches first ("path" lands Shortest path with one
  "Start here", `notes/03.png`; "brokers" still finds Betweenness, `notes/04.png`); the toolbar
  Filters icon opens the step editor (`filter/02.png`); a number that is a value offers "is N or
  more" with no cut row (`find/07.png`); the repeated-ties line carries a warning icon
  (`notes/22.png`); a second Escape keeps focus in the find box (`find/15.png`, `find/16.png`).
- **Still open from round 3:** 6, 7, 8, 11 (part), 12 (part), 13, 15, 17, 18, 19, 20, 21, 22, 23,
  and most severity 1s.
- **New:** 1 (crash), 2 (refused suggestion), 3, 4, 5, 9, 10, 14, 16, 24, 31, 35, 40, 42.
- **Count:** 42 findings (round 3: 42), 2 at severity 3 (round 3: 2). Both severity 3s carry a
  script above.

## Held as Figma-consistent

- Shift-click adds a node; Ctrl-click replaces, as decided (macOS Ctrl-click is the context
  menu).
- Edge actions and the edge's canvas menu share commands with keys right-aligned (`path/33.png`,
  `path/35.png`); right-click on a canvas object selects it first.
- Undo and Redo of a step restore it with a toast naming the act (`filter/20.png`,
  `filter/29.png`).
- The Rerun bar on an out-of-date run (`notes/26.png`), like Figma's library-update banner.
- Find: a rule's Enter selects its matches and the inspector lists them (`find/09.png`).
- The New project discard dialog: forced by the browser file model.
