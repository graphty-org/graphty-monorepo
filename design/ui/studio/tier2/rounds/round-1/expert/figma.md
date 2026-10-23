# Tier 2 round 1: expert walkthrough, controls and gestures (Figma product designer)

Build: 946256efb876 (graphty@0.8.56), served from
`/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r1d4-946256efb/` and driven with
`tool/real.mjs` at 1440 x 900. Walked 2026-10-09, before any session of this round was read.

The lens: how each control, gesture, popover and menu behaves, and whether it matches Figma where
Figma already solved the same problem. Graph structure (what a run, a filter step or a note is)
is out of this lens. Screenshot paths are relative to `figma/` beside this file.

Severity: 0 not a problem, 1 cosmetic, 2 minor (slows or confuses), 3 major (a reader can be
misled or stopped on a success path), 4 blocks the task.

Not covered: the 1280 x 800 width (the tool captures 1440 x 900 only) and light mode.

## Screens walked

| Screen                                                  | Session folder | Screenshots            |
| ------------------------------------------------------- | -------------- | ---------------------- |
| Data place, Filters empty, with a step on and off       | `filter/`      | 02, 09, 11, 16         |
| Filter step editor (new, edit, from the attribute)      | `filter/`      | 04 to 08, 12 to 15, 19 |
| Header chip                                             | `filter/`      | 09, 10 (tooltip), 17   |
| Path popover and the path run's Values and Style        | `path/`        | 04 to 11               |
| Notes place, empty and with two notes                   | `notes/`       | 02, 05, 07, 09 to 11   |
| Data page with two tables and an unmatched row          | `tables/`      | 03, 05, 06, 07, 08     |
| Data page titled "Replace: ...", the out-of-date run    | `replace/`     | 03, 04, 05, 07, 08, 09 |
| Neighbor list with Hops and Follow, Filter to neighbors | `neighbors/`   | 02, 05 to 08           |
| An edge's inspector, Edge actions, canvas menu          | `edge/`        | 02 to 06               |
| Find box: column hint, refused rule, accepted rule      | `edge/`        | 08, 09, 11, 13, 14     |
| Weight meaning at load, Path popover reading it         | `weight/`      | 04, 06, 08             |
| Long names (`long-names.csv`)                           | `long/`        | 03, 04, 06, 07, 08     |

## Findings, most severe first

### Severity 3

1. **Enter in the filter step editor does not commit.** Editing a step's Value from 4 to 5 and
   pressing Enter leaves the step at 4: the drawing, the chip ("19 of 20 nodes") and the row
   ("weight is at least 4") do not change, and nothing says the edit is pending; only the
   "Save step" button applies it. Every other value field in the inspector commits on Enter, Tab
   or blur, as Figma's do. A reader who presses Enter reports the old count as the new one.
   Screen: step editor. Evidence: `filter/15.png` (5 typed, Enter pressed, still 19 of 20),
   `filter/16.png` (after the button). Owner: graphty app.

2. **A number in a rule must be wrapped in backticks.** `=minutes >= 10` is refused with "Put
   numbers in backticks: minutes > `9`"; only `=minutes >= \`10\``selects. That is the query
language's own syntax shown on the success path of "select where". No search field a Figma user
knows asks for it. Screen: find box with a refused rule. Evidence:`edge/09.png`, `edge/13.png`.
   Owner: graphty-element (accept a bare number, or return a neutral refusal code the app words).

3. **Edge names are cut inside the string, so the far end is lost everywhere.** An edge between
   two long-named nodes is named "Northern Regional Distribution Center 01 -> Eastsi": the cut is
   in the name itself (its accessible name ends the same way), so the find result, the inspector
   title and a hover all lose the "To" node, with no tooltip on the title or the result (hover
   prints `tooltip: null`). The find list also clips at the panel edge with a horizontal scroll bar
   instead of an ellipsis, which Figma's Layers never shows. Only the inspector's To row has a
   tooltip. Screen: find box and an edge's inspector with `long-names.csv`. Evidence:
   `long/04.png`, `long/06.png`, `long/07.png` (title hover), `long/08.png` (To row hover). Owner:
   graphty app (edge naming, list truncation).

4. **The canvas key keeps an out-of-date run's range with no out-of-date mark.** After the list
   was replaced, the key still reads "Size: PageRank 0.03779 to 0.06394" and the dots keep the old
   colors at full strength; only the inspector's bar ("Data changed since this run", Rerun) and a
   small clock glyph on the paint row say the numbers are old. The key is the reading of the
   canvas, so it is where the mark is needed. Screen: an out-of-date run. Evidence:
   `replace/05.png`, `replace/08.png` (old Values at full contrast under the bar), `replace/09.png`
   (after Rerun the range changes to 0.02872 to 0.08012). Owner: graphty app (key words), from the
   element's staleness fact.

### Severity 2

5. **One button, two behaviors, and an explicit save.** The step editor's primary button reads
   "Save and turn on" when the step is off and "Save step" when it is on. A Figma inspector has no
   Save button: an edit is live and the eye is separate. Here saving also flips visibility, so
   "edit, then tick" turns the step off again. Screen: step editor. Evidence: `filter/12.png`,
   `filter/15.png`. Owner: graphty app.

6. **Escape does not close the step editor.** With the editor open, Escape moves focus to the step
   row and leaves the editor showing. Screen: step editor. Evidence: `filter/13.png`. Owner:
   graphty app.

7. **Show and hide use two different controls.** A filter step is turned on and off with a
   checkbox at the right of its row; a paint-tree row shows an eye on hover. Figma uses the eye
   for every layer. Screen: Data place and Graph place. Evidence: `filter/09.png` (checkbox),
   `replace/07.png` (eye). Owner: graphty app.

8. **The step editor uses a different row grammar from the Style tab.** Its fields stack a small
   label above a full-width select ("Keep", "Attribute", "Is", "Value"), while the Style tab puts
   the label at the left of the value ("Color [PageRank]", "Size [1 to 3]"). The path run's Style
   tab and the Everything Style tab mix both on one screen (Color stacked, Size inline). Figma's
   Design panel has one row grammar. Screen: step editor, path run Style, Everything Style.
   Evidence: `filter/07.png`, `path/09.png`, `edge/02.png`. Owner: compact-mantine (the row
   component), then the app's use of it.

9. **The new step opens as an empty form, not as a working default.** Filters "+" opens "New
   filter step" with a blank Attribute select (no prompt) and a disabled "Add step"; after an
   attribute is picked the Value box is empty with no hint of the range, although the attribute's
   own summary knows it ("Range 1 to 5", `filter/19.png`). Figma's "+" adds something that already
   works. Screen: step editor. Evidence: `filter/04.png`, `filter/07.png`. Owner: graphty app.

10. **After Add step or Save step the inspector jumps to the graph.** The new step is not selected;
    the inspector shows Graph, Values instead of the step that was just made. In Figma the thing
    you just made is the selection. Screen: Data place. Evidence: `filter/09.png`,
    `filter/17.png`. Owner: graphty app.

11. **A segmented choice shows its chosen segment only with an outline.** "a node / an edge",
    "Add / Leave out", "Not set / Closer / Farther / Capacity", "Out / In / All" and Hops "1 2 3"
    all mark the choice with a thin outline that reads as keyboard focus. Figma's segmented control
    fills the chosen segment. "Add / Leave out" also sits inside a sentence and reads as two
    commands. Screen: Data page, Path popover, neighbor list. Evidence: `tables/05.png`,
    `weight/06.png`, `path/04.png`, `neighbors/05.png`. Owner: compact-mantine (SegmentedControl).

12. **The Path popover covers what it asks about.** Its suggestion list opens over the next field
    (From's list over To; To's list over Follow), and the popover covers the lower third of the
    canvas, including path segments and the nodes a "pick on the canvas" button would need.
    Figma anchors such panels beside the canvas or lets them be moved. Screen: Path popover.
    Evidence: `path/04.png`, `path/05.png`, `path/10.png`, `weight/08.png`. Owner: graphty app.

13. **A path cannot be edited; P starts a blank one.** With a path run selected, its From and To
    are read-only rows under "Made with"; pressing P opens an empty popover rather than the
    selected path's ends, so changing one end means a second run. In Figma an object's properties
    are edited on the object. Screen: path run's Values, Path popover. Evidence: `path/07.png`,
    `path/10.png`. Owner: graphty app.

14. **The path run names its length three ways and puts order numbers where values go.** The row
    says "4 hops", the Summary "5 nodes, 4 edges", and "Nodes in order" lists 1 to 5 right-aligned
    in the value column, where every other list puts a node's value. Screen: path run's Values.
    Evidence: `path/07.png`. Owner: graphty app.

15. **A filter marks a ranking out of date with the same mark as changed data.** After "Filter to
    neighbors" the PageRank row gets the clock glyph and its inspector says "Ran on 20 nodes; 15
    shown now" with Rerun, the mark used when the file itself changed. The data did not change, and
    it is not clear whether Rerun would rank only the 15. Screen: Graph place with a step on.
    Evidence: `neighbors/06.png`, `neighbors/08.png`. Owner: graphty app (one mark per state), from
    element facts.

16. **"Filter to neighbors" turns into a filled blue button.** After use the command looks like a
    pressed primary toggle; pressing it again is not obviously "undo". A command stays a command;
    the step it made lives in Filters. Screen: neighbor list. Evidence: `neighbors/06.png`. Owner:
    graphty app.

17. **The neighbor list does not say how far each name is.** At Hops 2 it lists 14 names in one
    alphabetical list with no mark for one step or two. Screen: neighbor list. Evidence:
    `neighbors/05.png`. Owner: graphty app (from the element's distance fact).

18. **Two selection marks on the canvas, and halos that swamp the colors.** A selected node gets a
    large yellow halo; a selected edge is drawn blue. At Hops 2 fifteen halos overlap and hide the
    ranking's colors. Figma draws every selection the same way, in one thin blue. Screen: neighbor
    list, edge selection, rule selection. Evidence: `neighbors/05.png`, `edge/03.png`,
    `edge/05.png`, `edge/13.png`. Owner: graphty-element (selection style), app's choice of values.

19. **An edge gives no hover feedback before the click.** Over an edge the pointer turns to a hand
    but the line does not change, so a reader cannot tell which of two close lines a click will
    take. Figma outlines the object under the pointer. Screen: canvas. Evidence: `edge/02.png`
    (hover at the Station-Stadium line, drawing unchanged). Owner: graphty-element.

20. **Label boxes cover edges.** Drawn names sit on opaque white boxes that cut through lines,
    including the selected edge's end at Stadium. Screen: canvas with names drawn. Evidence:
    `edge/03.png`. Owner: graphty-element.

21. **A note's subject is whatever the inspector happens to show.** Notes "+" with the ranking
    selected opens "About PageRank", with no way to change the subject in the form. Figma's comment
    is placed where the user points. Screen: Notes place. Evidence: `notes/05.png`. Owner: graphty
    app.

22. **A note cannot be edited.** A card has only a delete icon; double-click selects text instead
    of editing (rename and edit by double-click is the rule elsewhere). Screen: Notes place.
    Evidence: `notes/09.png`, `notes/11.png`. Owner: graphty app.

23. **"1 note" in the graph header while two notes are listed.** The header counts only notes
    about the graph itself, but its words do not say so. Screen: Graph inspector with two notes.
    Evidence: `notes/09.png`. Owner: graphty app.

24. **Every deselect raises a toast.** Escape shows "Selection cleared: 1 node" (or "1 edge")
    above the toolbar, over the canvas, with no Undo in it. Figma deselects silently. Screen:
    canvas. Evidence: `notes/09.png`, `edge/08.png`. Owner: graphty app.

25. **The replace page's button says Load.** The page is titled "Replace: friends-v2.csv", but its
    primary button is "Load", the same word as opening a new graph. Figma's buttons name the
    action. Screen: Replace page. Evidence: `replace/04.png`. Owner: graphty app.

26. **"As the file says" for a file that says nothing.** A CSV has no direction, yet Direction
    reads "As the file says" and the drawing gets one-way arrows (trails and bus links drawn as
    one-way). Screen: Data page, Graph place after load. Evidence: `weight/06.png`,
    `weight/08.png`, `tables/07.png`. Owner: graphty app (the words), graph-io / graphty-element
    (what a CSV's direction is reported as).

### Severity 1

27. The Filters section header has no disclosure arrow, unlike Sources and Attributes beside it.
    `filter/02.png`. graphty app.
28. A filter step's context menu holds only "Delete", with no shortcut shown (Figma lists the
    key). `filter/17.png`. graphty app.
29. The empty Notes place adds a "No notes." line under the title row with "+". `notes/02.png`.
    graphty app.
30. An attribute shows "#" in the tree and a columns glyph in its inspector title. `filter/19.png`.
    graphty app.
31. "Advanced" in the Path popover and "Advanced run settings" in the run's inspector name the
    same settings. `path/04.png`, `path/07.png`. graphty app.
32. Note subject chips are filled blue, the selection color, for a link. `notes/09.png`. graphty
    app.
33. The weight column's clear control is a bare "x" beside the role select rather than the
    select's own clear. `weight/06.png`. compact-mantine.
34. An edge's From and To rows are buttons that open the node but look like plain text.
    `edge/03.png`. graphty app.
35. A long edge title squeezes its type icon to a sliver. `long/06.png`. compact-mantine.

## Held as Figma-consistent

- The edge's "..." menu and its canvas context menu hold the same commands with the same words
  and shortcuts ("Select endpoints", "Frame selection F", "Add note N"). `edge/04.png`,
  `edge/06.png`.
- The header chip ("19 of 20 nodes") opens Filters and its tooltip says how to turn the step off.
  `filter/10.png`.
- "Filter to neighbors" lands as a step in Filters, "within 2 hops of Ava", so filtering has one
  home. `neighbors/07.png`.
- Add step applies at once and the drawing changes. `filter/09.png`.
- Escape from the Path popover closes it and returns focus to the inspector. `path/11.png`.
- A role select opens with the checked item over the trigger, as Figma's dropdowns do.
  `weight/04.png`.
