# Tier 2 round 3: expert walkthrough, controls and gestures (Figma product designer)

Build: 26f3bb968e43 (graphty@0.8.61), served from
`/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r3d2-26f3bb968/` and driven with
`tool/real.mjs` at 1440 x 900, and at 1280 x 800 for long names and the Path popover. Walked
2026-10-10, before any session of this round was read.

The lens: how each control, gesture, popover and menu behaves, and whether it matches Figma where
Figma already solved the same problem. What a run, a filter step or a note is stays out of this
lens. Screenshot paths are relative to `figma/` beside this file.

Severity: 0 not a problem, 1 cosmetic, 2 minor (slows or confuses), 3 major (a reader can be
misled or stopped on a success path), 4 blocks the task.

Not covered: light mode.

## Screens walked

| Screen                                                          | Session folder | Screenshots            |
| --------------------------------------------------------------- | -------------- | ---------------------- |
| Data place; Filters empty, a step on and off; header chip       | `filter/`      | 02, 07, 12, 20, 22     |
| Step editor: from the attribute, from "+", Tab, Escape, click-away, a half-made step | `filter/` | 03 to 19 |
| Delete a step and undo                                          | `filter/`      | 23 to 25               |
| Find box: a miss, a refused rule, a plain condition, a column word | `find/`     | 02 to 08               |
| Styling a rule selection: Color, Width, deselect                | `find/`        | 09 to 13               |
| Path popover, a weighted path, P again, a second path, Undo     | `path/`        | 02 to 11               |
| Node menu, neighbor list with Hops and Follow, Filter to neighbors | `path/`     | 12 to 17               |
| An edge's inspector and Edge actions                            | `path/`        | 18, 19                 |
| Notes place empty and with two notes; N; double-click a note    | `notes/`       | 02 to 06, 15, 16       |
| Add page over a loaded file, "Replace: ...", out-of-date run, Rerun | `notes/`   | 09 to 14               |
| Data page with two tables and an unmatched row                  | `tables/`      | 03 to 07               |
| Start screen, weight meaning at load, the weight column's inspector | `weight/`  | 02 to 06 (and `tables/02`) |
| 1280 x 800: long names, a filter step on a long column, Path popover | `long/`   | 03 to 12               |

## Findings, most severe first

### Severity 3

1. **After Undo, a path run's "Made with" names the inputs of the run that was undone.** A
   weighted path Depot to Stadium ("minutes 14"), then a second path Market to Station, then Undo:
   the drawing, the run row, Summary and "Nodes in order" are back to Depot, School, Stadium, but
   Made with reads From Market, To Station, with the restored weight. The inspector states a run
   that does not exist, with no mark that the fields differ from the run. Figma's undo restores an
   object and its properties together. Screen: path run's Values. Evidence: `path/06.png` (first
   run), `path/08.png` (second run), `path/11.png` (after Undo). Owner: graphty app (Made with's
   From and To come from the panel's draft, which survives the undo; `inspector/RunValues.tsx`,
   `settingsOf(run, draft)`).

2. **A second Find path replaces the first path run, silently.** Running Market to Station after
   Depot to Stadium leaves one "Shortest path" row; the "minutes 14" run is gone, with no notice
   and no prompt. Undo brings it back (`path/11.png`), but nothing says it went. In Figma a command
   that makes something never overwrites a sibling; a reader comparing two routes loses the first
   without knowing. Screen: Graph place run list. Evidence: `path/06.png`, `path/08.png`. Owner:
   graphty app.

### Severity 2

3. **An edge filter step and the header chip count only nodes.** "weight is at least 3" hides 21
   of 41 edges, yet the step row reads "20 to 20 nodes", the chip "20 of 20 nodes", and the key
   drops its "full graph" mark, all as if the step did nothing. Only the Overview says "Edges
   showing 20 of 41". Screen: Data place with a step on, header chip. Evidence: `filter/12.png`,
   `filter/22.png` (chip tooltip). Owner: graphty app (the element already reports edges showing).

4. **Tab still lands inside the step editor, so Tab then Escape still loses the edit.** From
   Value, Tab goes to "Save step", which is inside the editor, so nothing commits; Escape then
   closes it and the row still reads "at least 4". A second Tab (leaving the editor) commits, and
   a click away commits. Escape's "cancelled" message reaches a screen reader only. Screen: step
   editor. Evidence: `filter/09.png` (5 typed, focus on Save step), `filter/10.png` (closed, still
   4), `filter/11.png` (Tab, Tab committed), `filter/12.png` (click-away committed). Owner:
   graphty app.

5. **"Filter to..." still leaves focus on the attribute row.** The editor opens with Value empty
   and focus on the "weight" tree row; typing types nothing. Figma puts the caret in the field the
   command opened. Screen: step editor. Evidence: `filter/04.png`, `filter/05.png`. Owner: graphty
   app.

6. **The Path form forgets the weight.** After a weighted path, P opens with Weight "None"; a
   second path then runs by hops ("2 hops", "Each edge counts as 1."). Nothing marks that the
   setting changed from the run just made. Screen: Path popover. Evidence: `path/07.png`,
   `path/08.png`. Owner: graphty app.

7. **To accepts the From node.** With a node selected, P fills From with it; typing part of its
   name in To and pressing Enter picks the same node, and Find path makes a "0 hops" run,
   "1 node, 0 edges", without a word. Screen: Path popover at 1280 x 800. Evidence:
   `long/11.png`, `long/12.png`. Owner: graphty app (leave From out of the To list, or refuse on
   the element's code for equal ends).

8. **When every incoming edge repeats, Load is still the primary button.** The Add page says "41
   edges in this file are already in friends. Load adds them a second time." in plain body text,
   with "Replace friends.csv" as a secondary button beside a blue Load. Figma makes the
   recommended action the filled one. Screen: Add page. Evidence: `notes/09.png`. Owner: graphty
   app.

9. **Rule syntax still shows code.** A refused rule is headed in error red "Put numbers in
   backticks:", the miss hint teaches `` =minutes > `9` ``, the find box is rewritten with
   backticks, and a layer made from the rule is named "minutes >= `10`" in the layer list, its
   inspector title and the key. Enter now runs the suggestion, so the reader is no longer stopped
   (round 2 rated this 3). Screen: find box, Style key. Evidence: `find/02.png`, `find/03.png`,
   `find/11.png`. Owner: graphty-element (bare numbers; already an owner item), then the app's
   words.

10. **"Not set" means two things.** Picking a weight at load starts "Higher means" at "Not set",
    and the line under it says that until set, a path counts every edge as one step while PageRank
    and communities read higher as closer. One choice, two behaviors. Screen: Data page. Evidence:
    `weight/04.png`. Owner: graphty-element (what an unset weight meaning does per algorithm).

11. **A new or edited step never stays the subject.** After Add step the inspector jumps to Graph,
    Values (`filter/07.png`), or, with a node selected, stays on the node (`long/08.png`). Figma
    keeps what was just made selected. Screen: Data place. Owner: graphty app.

12. **Arrow keys after a click on Follow do nothing.** Click "Out", then ArrowRight twice: Follow
    stays Out, Hops unchanged, no focus ring anywhere. Screen: neighbor list. Evidence:
    `path/14.png`. Owner: graphty app (where focus goes after the list re-renders).

13. **A saved note cannot be edited.** Double-click selects a word of the date; the card offers
    only Delete. Figma edits a comment in place. Screen: Notes place. Evidence: `notes/16.png`.
    Owner: graphty app.

14. **The Path popover covers what it asks about.** About 380 x 310 px over the lower canvas
    hides Clinic and the nodes a canvas pick would need; at 1280 x 800 it covers the lower half.
    Screen: Path popover. Evidence: `path/02.png`, `long/11.png`. Owner: graphty app.

15. **"+" opens an empty form.** Filters "+" shows "New filter step" with an empty Attribute and
    a disabled "Add step" with no reason; Escape with focus on "+" does not close it. Screen: step
    editor. Evidence: `filter/14.png`, `filter/15.png`, `filter/20.png`. Owner: graphty app.

16. **The step editor is a Save form; show and hide use a checkbox here and an eye on runs.**
    Figma edits live and uses the eye for every layer. Screen: step editor, Graph place. Evidence:
    `filter/08.png`, `notes/13.png`. Owner: graphty app.

17. **Two row grammars.** The step editor and Path popover stack a label over a full-width field;
    the Style tab puts the label left of the value. Evidence: `filter/08.png`, `path/02.png`,
    `find/12.png`. Owner: compact-mantine (the row component), then the app.

18. **The neighbor list at 2 hops says nothing per name.** Nine names in one alphabetical list,
    no mark of one step or two. Evidence: `path/16.png`. Owner: graphty app, from the element's
    distance fact.

19. **Two selection marks.** A node gets a large yellow disc, an edge a blue double line; at 2
    hops ten discs crowd the drawing. Evidence: `path/16.png`, `path/18.png`. Owner:
    graphty-element (selection style).

20. **The weight column's own inspector does not say it is the weight.** Evidence:
    `weight/06.png`. Owner: graphty app, from the element's weight fact.

21. **The toolbar covers a node after load.** Evidence: `long/03.png`. Owner: graphty-element (a
    fit inset option; the app sets it).

22. **"As the file says" for a CSV.** Evidence: `tables/05.png`, `weight/02.png`. Owner: graphty
    app (words), graph-io / graphty-element (what a CSV's direction is reported as).

### Severity 1

23. A bare column word ("minutes") offers "=minutes" as Enter's option, which selects all 17
    edges. `find/06.png`, `find/08.png`. graphty app.
24. Right-click on a panel row (an attribute, a step) opens its menu but does not select it; on
    the canvas it does. `filter/03.png`, `filter/23.png`, `path/12.png`. graphty app.
25. "Replace friends.csv" on the Add page opens a second page, "Replace: friends-v2.csv", that
    needs a second Replace. `notes/09.png`, `notes/10.png`. graphty app.
26. The inspector shows "New filter step" while a node stays selected on the canvas.
    `filter/19.png`. graphty app.
27. "Filter to neighbors" turns disabled after use, with no reason. `path/17.png`. graphty app.
28. The key lists a selection layer's Color but not its Width. `find/12.png`. graphty app.
29. A step on a long column cuts its rule at 1280; the tooltip has it whole. `long/08.png`,
    `long/09.png`. graphty app.
30. The filter step's attribute list offers only file columns, not a run's result (PageRank);
    possibly by design. `filter/15.png`. graphty app.
31. In a note, Enter adds a line and Control+Enter saves. `notes/05.png`, `notes/06.png`.
    graphty app.
32. The chosen segment of a segmented control is a solid white fill, the loudest mark in the
    panel. `path/02.png`. compact-mantine.
33. "1 row left out" keeps a red warning triangle after Leave out was the choice.
    `tables/05.png`, `tables/07.png`. graphty app.
34. "Edges per node" wraps ("3 to 6, mean 3.667"). `tables/07.png`. graphty app.
35. The empty Notes place adds "No notes." under the title row with "+". `notes/02.png`.
    graphty app.
36. An empty run list shows a standing signpost "Analyze ... (Shift+A) to add results here".
    `find/02.png`. graphty app.
37. The Replace page reads "Weight: weight auto". `notes/10.png`. graphty app.
38. A filter step's context menu holds only "Delete", with no shortcut. `filter/23.png`. graphty
    app.
39. An attribute shows "#" in the tree and a columns glyph in its inspector title.
    `weight/06.png`. graphty app.
40. Nodes are drawn blue-violet by default, close to the selection blue. `find/02.png`.
    graphty-element (a neutral default).
41. The start screen draws "Ctrl+O" in a bordered box that reads as a button. `tables/02.png`.
    graphty app.
42. Note subject chips are filled blue, the selection color; a saved note's focus ring is white,
    a step row's blue. `notes/15.png`, `filter/07.png`. graphty app, compact-mantine.

## Open owner items seen again (not counted)

- Drawn labels in white boxes cover edges, including a path's own edge (`path/06.png`), and nodes
  overlap after load (`long/05.png`): element label placement and the unseeded layout.
- Numbers in rules need backticks (finding 9 is the app's side of it).

## Against round 2

- **Fixed:** a refused rule's suggestion shows with its "=" and Enter runs it (`find/03.png`,
  `find/04.png`); a plain condition becomes a runnable row (`find/05.png`); a layer from a rule is
  named by its rule (`find/11.png`); Color and Width on a selection start at the highlight look and
  read after deselecting (`find/11.png` to `find/13.png`); a click on empty canvas deselects a run,
  so a note is filed "About Graph" (`notes/03.png`, `notes/04.png`); deselecting raises no toast;
  "Filter to neighbors" is a plain command (`path/17.png`); a weighted path's row reads "minutes
  14" (`path/06.png`); the step checkbox takes a click 6 px outside its box (`filter/20.png`); the
  key says "full graph" only under a filter (`filter/07.png`, `notes/14.png`); the Add page offers
  Replace beside Load (`notes/09.png`); a half-made step is kept when the inspector moves on
  (`filter/19.png`); Tab, Tab and click-away commit a step edit (`filter/11.png`,
  `filter/12.png`).
- **Lowered:** rule syntax (3 to 2, finding 9).
- **New, both severity 3:** findings 1 and 2, on running a second path, a detour no walk before
  this one took.
- **Count:** 42 confirmed findings, the same as round 2 (bar 10 asks that it not rise), 2 at
  severity 3 against 1. 15 are new: 1, 2, 3, 6, 7, 10, 12, 13 and 23 to 28 and 30.

## On the tier 2 task paths

- Path tasks: 1, 2, 6, 7 and 14. Running a second path loses the first; Undo restores it with the
  wrong inputs stated.
- Filter tasks: 3, 4, 5, 11 and 15. An edge filter reads as doing nothing.
- Rule tasks: 9 and 23. Enter now runs the suggestion.
- Replace and Rerun: 8 and 25.
- Weight at load: 10 and 20.
- Notes: 13 and 31.

## Held as Figma-consistent

- Find produces a selection that drives the inspector; Enter on a rule selects its matches
  (`find/04.png`).
- Path popover pickers: Enter picks the top match and moves to the next field (`path/03.png`,
  `path/04.png`); P with a node selected fills From with it (`long/11.png`).
- Node canvas menu and the edge's "..." menu share commands with their keys right-aligned
  (`path/12.png`, `path/19.png`); right-click on a node selects it first.
- The Rerun bar on an out-of-date run, like Figma's library-update banner (`notes/13.png`).
- Delete then Control+Z restores a step with "Undid deleting ..." (`filter/25.png`).
- N saves a note about the selected run from any place (`notes/15.png`).
- Escape cancels a field edit without a visible message, as Figma's Escape reverts a field
  (`filter/13.png`).
