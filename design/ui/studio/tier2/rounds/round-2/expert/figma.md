# Tier 2 round 2: expert walkthrough, controls and gestures (Figma product designer)

Build: 8f0d5a6f7791 (graphty@0.8.61), served from
`/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r2d4-8f0d5a6f7/` and driven with
`tool/real.mjs` at 1440 x 900, and at 1280 x 800 for the Path popover and the Data place. Walked
2026-10-09, before any session of this round was read.

The lens: how each control, gesture, popover and menu behaves, and whether it matches Figma where
Figma already solved the same problem. What a run, a filter step or a note is stays out of this
lens. Screenshot paths are relative to `figma/` beside this file.

Severity: 0 not a problem, 1 cosmetic, 2 minor (slows or confuses), 3 major (a reader can be
misled or stopped on a success path), 4 blocks the task.

Not covered: light mode.

## Screens walked

| Screen                                                   | Session folder | Screenshots                |
| -------------------------------------------------------- | -------------- | -------------------------- |
| Data place, Filters empty, a step on and off             | `filter/`      | 03, 09, 10, 18, 19         |
| Filter step editor: from the attribute, from "+", edit   | `filter/`      | 05 to 08, 11 to 16, 20, 21 |
| Filter step editor: Enter on an edit, Escape, N          | `edit/`        | 02, 03, 05, 07, 08         |
| Header chip                                              | `w1280/`       | 05 (tooltip), 06           |
| Path popover, the path run's Values, node menu, picking  | `path/`        | 02 to 13                   |
| Neighbor list with Hops and Follow, Filter to neighbors  | `path/`        | 18 to 24                   |
| An edge's inspector, Edge actions, edge canvas menu      | `path/`        | 26 to 29                   |
| Find box: column hint, refused rule, accepted, plain     | `find/`        | 02, 04, 06 to 13           |
| Start screen, Open through the Data page, Higher means   | `weight/`      | 02 to 08                   |
| Data page with two tables and an unmatched row           | `tables/`      | 02, 04, 05, 06, 08         |
| Notes place, empty and with two notes                    | `notes/`       | 02, 05, 07, 08, 09         |
| Data page titled "Replace: ...", out-of-date run, Rerun  | `notes/`       | 11 to 15                   |
| Long names (`long-names.csv`)                            | `long/`        | 04, 06, 08, 10             |
| 1280 x 800: Path popover, a path under a filter step     | `w1280/`       | 02, 04                     |

## Findings, most severe first

### Severity 3

1. **A number in a rule must still be wrapped in backticks.** `=minutes >= 10` is refused with
   "Put numbers in backticks:" and the user's condition rewritten in the query language's syntax;
   the correction is plain text, not clickable, and Enter does nothing. Only
   ``=minutes >= `10` `` selects. The resting hint teaches the same syntax ("Type a rule, such as
   minutes > `9`"). No search field a Figma user knows asks for code syntax. Screen: find box with
   a rule hint and with a refused rule. Evidence: `find/02.png`, `find/04.png`, `find/06.png`
   (click on the correction: nothing), `find/08.png` (accepted). Owner: graphty-element (accept a
   bare number; the app then words the hint without backticks).

### Severity 2

2. **A typed condition is recognized but not run.** Typing `minutes > 10` (no "=") shows "Start
   with = to select by a value: =minutes > `10`", yet Enter and the arrow keys do nothing: the app
   knows the exact rule and asks the reader to retype it. Figma's Quick actions turns a match into
   a row that Enter runs. Screen: find box. Evidence: `find/11.png` to `find/13.png`. Owner:
   graphty app.

3. **"Filter to..." from the attribute menu drops focus to the page.** The step form opens in the
   inspector with the Value box empty, but focus is nowhere: typing at once types nothing. Figma
   puts the caret in the field the command opened. Screen: step editor. Evidence: `filter/05.png`,
   `filter/06.png` (the tool: "nothing that takes text has focus"). Owner: graphty app.

4. **Tab does not commit a step edit, and Escape then throws it away silently.** On a step that is
   on, Value 4 changed to 5, Tab, Escape: the editor closes, the row still reads "weight is at
   least 4", the chip still "19 of 20 nodes", and nothing said the edit was dropped. Enter now
   commits (`edit/03.png`), but Figma commits on Tab and blur too, and Escape reverts only text
   still being typed. Screen: step editor. Evidence: `filter/12.png` (5 typed, focus on the button),
   `filter/13.png`, `filter/16.png` (step on, edit lost). Owner: graphty app.

5. **A selected run cannot be deselected.** With PageRank selected, Escape (twice) and a click on
   empty canvas leave the row selected and its inspector open; Figma clears the selection on an
   empty-canvas click and the inspector falls back to the file. The cost shows in Notes: a second
   note meant for the graph is filed "About PageRank" again. Screen: Graph place, Notes place.
   Evidence: `notes/07.png` (after Escape), `notes/09.png` (after the canvas click),
   `notes/08.png` (both notes about PageRank). Owner: graphty app.

6. **Selecting a source opens the table drawer.** A left click on "friends.csv" in Sources also
   opens the Edges table under the canvas; the drawing shrinks and re-centers and the toolbar
   jumps up 240 px. In Figma selecting never opens a panel. Screen: Data place, source inspector.
   Evidence: `notes/10.png`, `notes/11.png`. Owner: graphty app.

7. **A filter step cuts a path result with no sign.** With "weight is at least 4" on, the path
   run's black nodes remain but the path's own low-weight edges are hidden, so the route is drawn
   as scattered dots; the key says only "Shortest path on 20 nodes". A reader sees a broken path.
   Screen: a path run under a filter step, 1280 x 800. Evidence: `w1280/04.png`. Owner:
   graphty-element (which result edges the filter hid, as a fact), graphty app (the words).

8. **"Filter to neighbors" is a toggle that deletes.** After use it turns solid blue (the
   selection and primary color) and stays so; its tooltip reads "Showing only this neighborhood.
   Press again to show every node", and pressing again deletes the step from Filters outright, not
   turning it off, with no notice. One job (show or hide the step) now has two controls, the step's
   checkbox and this button, and they do different things. Screen: neighbor list. Evidence:
   `path/20.png`, `path/22.png`, `path/24.png` (step gone). Owner: graphty app.

9. **One button, two behaviors, and an explicit save.** The step editor's primary button reads
   "Save and turn on" on a step that is off, "Save step" on one that is on. A Figma inspector edits
   live and keeps visibility on the eye. Screen: step editor. Evidence: `filter/11.png`,
   `edit/05.png`. Owner: graphty app.

10. **Show and hide use two different controls.** A filter step has a checkbox at the right of
    its row; a paint-tree row shows an eye on hover. Figma uses the eye for every layer. Screen:
    Data place, Graph place. Evidence: `filter/09.png`, `notes/14.png`. Owner: graphty app.

11. **Two row grammars.** The step editor and the Path popover stack a small label over a
    full-width field ("Keep", "Attribute", "Is", "Value"; "From", "To", "Weight"); the Style tab
    puts the label left of the value ("Color [PageRank]", "Size [1 to 3]"). Figma's Design panel
    has one. Screen: step editor, Path popover, Style tab. Evidence: `filter/11.png`,
    `path/02.png`, `filter/01.png`. Owner: compact-mantine (the row component), then the app.

12. **"+" opens an empty form, not a working step.** Filters "+" shows "New filter step" with an
    empty Attribute select and a disabled "Add step" with no reason; focus stays on "+". Figma's
    "+" adds something that already works. Screen: step editor. Evidence: `filter/20.png`. Owner:
    graphty app.

13. **After Add step or an edit, the inspector jumps to the graph.** The step row keeps a focus
    ring but the inspector shows Graph, Values; in Figma the thing just made or edited stays the
    selection. Screen: Data place. Evidence: `filter/09.png`, `edit/03.png`. Owner: graphty app.

14. **The Path popover covers what it asks about.** About 380 x 345 px over the lower canvas: it
    hides the node "Path between..." was opened from (Ivan, under the popover in `path/10.png`)
    and the nodes a "Pick To on the canvas" click would need; at 1280 x 800 it covers about half
    the canvas height. The From list still covers To. Screen: Path popover. Evidence:
    `path/04.png`, `path/10.png`, `w1280/02.png`. Owner: graphty app.

15. **P after a run starts blank.** With the path run selected, P opens empty From and To; the
    run's ends are read-only rows under "Made with". Figma edits an object's properties on the
    object. The node menu's "Path between..." does fill From with the node. Screen: Path popover.
    Evidence: `path/07.png`, `path/10.png`. Owner: graphty app.

16. **The path's length three ways, and order numbers in the value column.** Row "4 hops",
    Summary "5 nodes, 4 edges", and "Nodes in order" numbers 1 to 5 right-aligned where every
    other list puts a value. Screen: path run's Values. Evidence: `path/06.png`. Owner: graphty
    app.

17. **A filter marks runs with the changed-data mark.** After "Filter to neighbors" both run rows
    get the clock glyph used when the file changed; the data did not change. Screen: Graph place
    with a step on. Evidence: `path/20.png`. Owner: graphty app (one mark per state), from element
    facts.

18. **The neighbor list at 2 hops says nothing per name.** At Hops 1 it has a weight column; at
    Hops 2 the column and its header go, and 14 names sit in one alphabetical list with no mark of
    one step or two. Screen: neighbor list. Evidence: `path/18.png`, `path/19.png`. Owner: graphty
    app (from the element's distance fact).

19. **Two selection marks, and halos that swamp the colors.** A selected node gets a large yellow
    disc, a selected edge a blue double line; at Hops 2 fifteen discs overlap and hide the ranking.
    Figma draws every selection one way, in one thin blue. Screen: neighbor list, edge, rule
    selection. Evidence: `path/19.png`, `path/26.png`, `find/08.png`. Owner: graphty-element
    (selection style).

20. **A note's subject is whatever the inspector shows, and cannot be changed.** Notes "+" with a
    run selected opens "About PageRank"; the form has no way to pick another subject. Screen: Notes
    place. Evidence: `notes/05.png`, `notes/08.png`. Owner: graphty app.

21. **Every deselect raises a toast.** "Selection cleared: 1 node" and "Selection cleared: 15
    nodes" appear over the canvas, with no Undo. Figma deselects silently. Screen: canvas.
    Evidence: `path/16.png`, `path/26.png`. Owner: graphty app.

22. **"As the file says" for a CSV.** A CSV has no direction, yet Direction reads "As the file
    says" and bus links are drawn one way. Screen: Data page. Evidence: `weight/03.png`,
    `weight/07.png`. Owner: graphty app (words), graph-io / graphty-element (what a CSV's direction
    is reported as).

23. **The weight column's own inspector does not say it is the weight.** After loading minutes as
    a weight meaning "farther", the Overview says "Loaded weight: minutes (farther)", but selecting
    the minutes column shows only Table, Kind, Origin, Has a value, Distinct values and Range.
    Selection drives the inspector, so the most specific object should state its role. Screen:
    attribute inspector. Evidence: `weight/07.png`, `weight/08.png`. Owner: graphty app (from the
    element's weight fact).

24. **The toolbar covers a node after load.** With `long-names.csv` the lowest node sits half
    under the bottom toolbar; fit has no inset for the app's own chrome. Screen: Graph place.
    Evidence: `long/04.png`. Owner: graphty-element (a fit inset option; the app sets it).

### Severity 1

25. The key marks an out-of-date run only in its small title ("PageRank, out of date"); the
    colors and range stay at full strength. `notes/13.png`. graphty app.
26. The chosen segment of a segmented control is now a solid white fill, the loudest mark in the
    panel (Figma uses a quiet raised fill). `path/19.png`, `weight/05.png`. compact-mantine.
27. A long edge's inspector title is cut with no tooltip, and its type icon is squeezed to a
    sliver; the From and To rows and the find row do show the whole name on hover.
    `long/08.png`, `long/10.png`. graphty app, compact-mantine.
28. A filter step's context menu holds only "Delete", with no shortcut shown. `filter/17.png`.
    graphty app.
29. The empty Notes place adds "No notes." under the title row with "+". `notes/02.png`. graphty
    app.
30. An attribute shows "#" in the tree and a columns glyph in its inspector title.
    `filter/03.png`. graphty app.
31. "Advanced" in the Path popover and "Advanced run settings" in the run's inspector name the
    same settings. `path/02.png`, `path/06.png`. graphty app.
32. Note subject chips are filled blue, the selection color, for a link. `notes/08.png`. graphty
    app.
33. The weight role's clear control is a bare "x" beside the select. `weight/05.png`.
    compact-mantine.
34. In a note, Enter adds a line and Control+Enter saves; Figma's comment box posts on Enter.
    `notes/05.png`. graphty app.
35. Focus marks differ: a saved note card gets a white ring, a step row a blue one.
    `notes/08.png`, `filter/09.png`. compact-mantine.
36. The start screen draws "Ctrl+O" in a bordered box that reads as a button; Figma shows
    shortcuts as plain gray text. `weight/02.png`. graphty app.
37. An empty run list shows "Analyze (icon) in the toolbar (Shift+A) to add results here", a
    standing signpost. `weight/07.png`. graphty app.
38. "1 row left out" keeps a red warning triangle in Sources after the reader chose "Leave out".
    `tables/05.png`, `tables/08.png`. graphty app.
39. The Replace page reads "Weight: weight auto". `notes/12.png`. graphty app.
40. "Edges per node" wraps its value onto two lines on one graph ("3 to 6, mean 3.667") and
    rounds to one decimal on others ("mean 4.1"). `tables/08.png`, `filter/09.png`. graphty app.
41. Nodes are drawn blue-violet by default, close to the selection blue. `weight/07.png`.
    graphty-element (a neutral default).
42. With focus on the step row (not in the editor), Escape leaves the editor open and N does not
    add a note in the Data place. `edit/05.png`, `edit/07.png`, `edit/08.png`. graphty app.

## Against round 1

- **Fixed:** Enter commits a step edit (`edit/03.png`); Escape closes the editor when focus is
  inside it (`filter/13.png`); the Replace page's button says "Replace" (`notes/12.png`); the find
  row of a long edge shows the whole name on hover (`long/07.png`); the empty Filters header
  follows the empty-section rule.
- **Lowered:** the key's out-of-date mark (3 to 1, finding 25); long edge names (3 to 1, finding
  27); the segmented choice (2 to 1, finding 26).
- **Not re-checked this round:** hover feedback on an edge, label boxes over edges, editing a
  note by double-click, the edge's From and To rows as buttons.
- **Count:** 42 confirmed findings against 35 (bar 10 asks that the count not rise), 1 at
  severity 3 against 4. 25 are carried from round 1 and 17 are new. 9 of the new ones are
  severity 1; of the 8 at severity 2, 5 come from detours round 1 did not walk (Tab then Escape,
  deselecting a run, a path under a filter step, the column inspector after a load-time weight,
  long names under the toolbar), and 3 are on a task route (2, 3 and 6).

## On the tier 2 task paths

These are the findings a participant can meet on a task's own route; the rest sit off it.

- Rule tasks (select by a condition): 1 and 2. A participant who types a plain condition is told
  the syntax and must retype it with "=" and backticks.
- Filter tasks: 3, 4, 9 and 13. Tab-then-Escape loses an edit without notice.
- Path tasks: 7, 14 and 15. A path under a filter step looks broken.
- Notes: 5 and 20. With a run selected, every note is filed under the run.
- Replace and Rerun: 6 and 25. The key's colors stay old until Rerun.
- Neighborhood: 8, 17 and 18.

## Held as Figma-consistent

- The node canvas menu lists commands with their keys right-aligned ("Neighborhood G", "Path
  between... P", "Frame selection F", "Add note N"), and the edge's "..." menu and canvas menu
  match. `path/09.png`, `path/27.png`, `path/29.png`.
- "Path between..." from a node's menu fills From with that node and puts focus in To; the pick
  button arms a canvas pick with a hint, and the pick does not change the selection.
  `path/10.png`, `path/12.png`, `path/13.png`.
- A run row's inspector shows "Data changed since this run" with Rerun after a replacement, like
  Figma's library-update banner. `notes/14.png`.
- The header chip opens Filters, and its tooltip says how to turn the step off. `w1280/05.png`,
  `w1280/06.png`.
- Delete then Control+Z restores the step with "Undid deleting ..."; focus moves to the Filters
  "+" after a delete, not to the page. `filter/18.png`, `filter/19.png`.
- A role select opens with the checked item over its trigger, as Figma's dropdowns do.
  `weight/04.png`.
- The source's inspector "..." holds "Edit source..." and "Replace with file...", the same items as
  the row's right-click menu. `notes/11.png`.
