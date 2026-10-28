# Tier 3 dry run before round 1, fourth pass: what to fix and what to leave

Every tier 3 task (T37 to T51, both halves) was piloted again on the frozen build 6dd0b00bd7, the
build made after the third dry run's fixes, from a clean tree (every pilot's `session.json` says
`uncommittedChanges: false`): the success path by pointer, the commonest detours, and the whole
task by keyboard with a screen reader's reading. This page lists every problem those pilots
reported (283 lines, many of them one problem met on several tasks), sorts each one, and gives the
reason.

The sessions are for learning what a first-time user needs to style a graph. A session spent on a
color that cannot be set, a focus that lands on a dimmed button, or a hover that never ends teaches
nothing about that, so every such problem is fixed before round 1. A real design question -- where
something lives, what a reader expects, what a new concept is called -- is left in, because
answering it is what the sessions are for.

Classes:

- **(a) fix now.** An implementation or polish defect a participant could hit. Each names its fix
  group below.
- **(b) leave for the sessions.** An open design question the study exists to answer.
- **(n) no change.** Expected behavior, a convention already decided (the reason names it), a
  property of the frozen start that the answer key records, an open owner question, or a note
  about the study tool rather than the app.

Screenshots are under `rounds/r1d2/pilot/<task>/<route>/` (for example
`rounds/r1d2/pilot/T49B/detours/28.png`). Fixing the (a) list changes the build, so round 1 runs on
a new frozen build and every task is piloted again on it.

## Not piloted on this build

- **T39A, T39B, T41B**: no walk ran. Every browser slot on the machine was taken (four pilots plus
  older browsers from other sessions), and a pilot's start waited for a slot past the time its
  agent had. T39B's start gave up after 100 seconds with "no browser slot came free".
- **T46A**: no line came back.
- **T37A keyboard** and **T43B keyboard**: not walked (no slot; the machine was loaded). The third
  pass's keyboard findings for T37A (no node reachable from the canvas, focus after opening) are
  unconfirmed on this build.

The next pilot walks these first, one task per free slot, and checks who holds the slots before it
starts.

## Fix groups

Severity 3 lines first: a color equal to the shown default cannot be set (group 3); typing "cube"
in the shape list applies Cylinder (group 12); opening a colleague's rule and pressing ArrowDown and
Enter rewrites it, and the card shows the old value after Undo (group 2); Enter on a Memberships
button drops focus on the panel separator (group 1).

1. **Focus after a style line is written or removed** (graphty, compact-mantine for the tooltip).
   Enter in a newly added Color box moves focus to the section's "+", which the same Enter has just
   disabled, and its tooltip "Everything in node fill is set" covers the Fill heading; on a layer
   made from a selection the same Enter keeps focus in the box (nine tasks). The Color line jumps
   above Width at that moment. After "Remove node color", focus goes to Effects' "+" instead of the
   Fill "+" of the section just emptied. After Undo puts a binding back, focus lands on "Remove
   node color". Enter on a Memberships button opens the group's layer but drops focus on the
   "Resize inspector" separator and names nothing. A tooltip shown on focus covers its section's
   label ("Visibilit"). Fix the cause once: the first value turns a "Node and edge layer" into a
   "Node layer", the tab is drawn again, and the focus hook treats that as a line that came or went.
   A line keeps its place in its section from the moment it is added.
2. **Condition cards: focus, Tab order, keys and words** (graphty). A card's remove button comes
   after its values in Tab order although it is drawn in the card's header. Opening an existing
   card opens its suggestion list over Match case, "Add a condition" and Done, and ArrowDown and
   Enter there rewrites the rule ("Mlle" to "Mlle Baptistine"). After Undo the open card still
   shows the undone value. Removing the "Picked by hand" card opens the next card's list over Done,
   which then takes the click. On a layer with no conditions, "Which nodes" opens with the attribute
   list open, and the first click on "Add a condition" only closes it. In a filter step, picking an
   attribute leaves focus in the attribute box, so typing lands there ("nameGAL"); the layer's card
   moves focus to the text box. Picking a match that needs a number (Highest) leaves focus on the
   match list. Clicking a chip opens its card with no visible focus. Tab with typed letters and a
   highlighted attribute closes the list and takes nothing. Enter on a value check box does
   nothing. Words: the open card reads "24 of 24 Nodes that pass every condition kind" as one run
   with no "Which nodes" name; condition headers read "hours 7" and "trained 15" with no unit; a
   single layer's count reads "8 of 24" where the folder reads "24 of 24 nodes"; committing a
   number with Enter announces no new count.
3. **A line that is not set, and pickers that mark the current value** (graphty, compact-mantine).
   An unset Color line shows the default (6366F1 in italics, or FF0000 on a node's own Style tab),
   but Enter, Tab and typing that same color and Enter all leave it unset, with nothing said; only a
   different color first and then the old one takes. Typing exactly the shown value, or Enter on
   the shown value, sets it. The box's name "Node color, not set, #6366F1, indigo" reads as a
   contradiction; it says the line is not set and what the drawing shows. The shape list checks
   Icosphere while no shape is set. The label source picker reopened from "Fixed text" marks no
   current choice, and lists "name" under "In use" because another layer uses it. A group's Width
   box opens with the caret after its value, so typing 24 gives 824; it selects its value on focus,
   like the color box.
4. **Color picker** (compact-mantine `ColorPickerPanel`). The swatch for the color the picker
   opened on is called "the starting color", although the drawing started at another color; it
   says "the color before this edit". The swatch row differs between openings and drops the
   default 6366F1 on an unset line; the set is the same every time and always holds the color the
   line shows. Enter in the hex box applies the color and leaves the popover open; it closes it.
5. **Hover ends when the pointer leaves** (graphty-element `NodeBehavior.ts`). The built-in Hovered
   layer keeps counting 1 after the pointer leaves the drawing for a panel, a popover or the context
   menu (nine tasks). Hover ends only on a pointer event over the canvas, so leaving the canvas, or
   a right-click that opens a menu over it, never ends it. Clear hover on the canvas's pointer
   leave and when a context menu opens. On T37B the Hovered layer stayed 0 while the pointer was
   over a node: confirm a first move onto a node starts a hover.
6. **Find box** (graphty `FindBox.tsx`). The hint, "Did you mean" and the screen reader still show
   the internal path (`graphty.degree > 30`, `results.degree.value > 16`) where every panel says
   Degree; show each column by its on-screen name. "No column named "degree"" sits beside a Degree
   column; when the element offers a correction, the message names that column as the screen does.
   The hint's example is strict (`hours > 27`), so a reader copying it for "or more" drops the
   boundary value; it shows `>=`. Enter on text with no match does nothing and says nothing. A
   screen reader hears "No match for ..." on keystrokes that do offer a match, and the last thing
   it hears is "Select by a value:", never the count. The "Select by a value:" heading stays under
   the box with no row after the list closes. The result list does not mark the rows already
   selected while Shift+clicking. After a Shift+click the typed text stays once the list closes,
   after a plain click it is cleared; both clear it.
7. **Undo and redo** (graphty `frame/commands.ts`, `CommandButton.tsx`, topbar). A dimmed Undo shows
   no reason on hover, and the old "Undid ..." notice stays on screen after the last undo. Undo's
   name is only "Undo"; what it undoes is in the tooltip alone. Control+Y does nothing (Control+
   Shift+Z redoes). One Control+Z undid a typed "from" and a later handle drag together. Control+Z
   does nothing while focus is in the "Color by kind" popover. "Undid adding "name contains GAL""
   does not say whether the filter step or the layer of the same name was undone. Turning "Hide
   overlapping labels" off adds no undo step.
8. **Keyboard stops and Escape** (graphty, compact-mantine). Disabled "+" buttons ("Add to node
   shape", "Add to node fill") are Tab stops that do nothing; they leave the Tab order and keep
   their hover reason. Tab out of "Filter analyses" closes the list and jumps to Main menu (opened
   with Shift+A), or moves to the inspector, leaves the list open and erases the text (opened from
   the button). Escape on a node's inspector does nothing, though the canvas menu lists "Clear
   selection Escape". Escape in the table grid does nothing. The folder's expand caret is a few
   pixels wide and its tooltip covers the folder's name.
9. **Screen-reader names and announcements** (graphty). The Degree card's button is named "Run"
   with no analysis. On the read-the-file page the region around Load reads as an unnamed section
   footer and the sentence with the node and edge counts is outside it, so Load says only "All 24
   rows". In "Node size by attribute", the "Does not fit" row reads as an option "5 attributes,
   hidden"; its group names and "Show why" are not read. A box whose color varies by data is named
   "Node color: kind, 3 groups, Eight distinct colors" and names no group's color, and the squares
   under it are not reachable. The key's "Color: Poster" is named twice (a fieldset and a span). A
   key swatch and the Values tab's "About Degree" button show no tooltip on hover.
10. **Layer row and key agree with the layer** (graphty layer list, `canvas/LegendCard.tsx`). A
    layer row's count shows the other kind's count while the layer is built on one kind (63 edges
    on a 24-node card reading 0 of 24; 77 nodes while the Edge tab picks 51 edges), and its
    subtitle says "Node and edge layer" while an edge condition is built. A key for a color bound
    to data on a one-node layer lists every value's color, while 23 of 24 nodes stay indigo; it
    lists only the values the layer's nodes hold. The size key says nothing of nodes a layer above
    fixes at another size, as the color key already does. Once one group gets a width, "Edge width:
    kind" lists all three at 8. The key reorders its color lines when a group's color changes,
    while the table keeps file order.
11. **Summaries, the Data place and analysis cards** (graphty, graphty-element if a fact is
    missing). A selection's summary averages node ids ("id mean 17.5"). A number shows only its
    mean ("mean 41.67") where Degree shows "1 to 17"; it shows lowest to highest. The table's
    "Columns: 1 of 1" opens an empty popover. In the Data place, number attributes read "Number,
    99% have a value" and text ones say nothing; every row says its type and how many have a value.
    kind carries the text icon though the read-the-file page and the summary call it a category.
    The Node tab's "Add shared_chapters on the Edge tab" row is cut off with a scrollbar inside the
    list. The inspector's "Degree 36 >" row replaces the selection with the node's neighbors and
    nothing says so; its description shows as a tooltip. A Size line added by Shape "+" waits at 1
    and no layer exists until a value is typed, with nothing saying a layer is made on the first
    value. Quick actions' dimmed "Add label line" says "Pick a node attribute first" without saying
    where. Most flow fills Source and Sink from the first two of a 34-node selection; it fills
    them from a selection only when the selection holds exactly the nodes it needs.
12. **Shape list typing** (compact-mantine shape grid). Typing "cube" highlights Cylinder (its
    first letter matches) and Enter applies it to six layers; Box answers only to "box". When no
    option starts with the whole typed text, nothing is highlighted and Enter writes nothing. The
    typed letters are not shown anywhere while the box still reads Icosphere.
13. **Framing the drawing** (graphty-element, graphty). A sample opens drawn in the right two
    thirds of the canvas with the left third empty (T37B, T44B, T49B). Frame selection (f) in 3D
    turns the view and leaves the node off center.
14. **Labels on the drawing** (graphty-element). With "Hide overlapping labels" on, names are still
    drawn over each other and through nodes (Magnon over Mme Thenardier, Mlle Baptistine at size 96).
    The selection ring covers the top of the selected node's label. Two layers that label the same
    node draw both texts on top of each other; a layer above sets the label as it sets any other
    property.

## Decided in this triage (the team's calls, reversible)

- **Tab in a list keeps a choice the reader typed toward.** With letters typed and an option
  highlighted, Tab takes that option and moves on; with nothing typed, Tab closes the list as
  decided before. Two pilots lost a nearly made condition to Tab.
- **Opening a card to read it changes nothing.** An existing card opens with its suggestion list
  closed; typing or ArrowDown opens it. A reader who opened a colleague's rule to read it rewrote
  it with two keys.
- **A disabled "+" is not a Tab stop**; it keeps its reason on hover. Five pilots tabbed through two
  dead stops on every styling task.
- **Escape on a node's inspector clears the selection**, as the canvas menu says it does; Escape in
  the table grid moves focus to the toolbar's Table button.
- **Control+Y redoes**, beside Control+Shift+Z.
- **An unset line takes the value it shows** when the reader presses Enter on it or types it.
- **A key lists only the values its layer's nodes hold.** The key and the drawing never disagree.
- Kept as (n), with reasons in the rows: the arrow cursor over buttons (compact-mantine sets it on
  purpose); F6 for the long Tab walks; the toolbar's and the tree's one Tab stop; the consent
  notice's place and its leaving; Tab closing a pop-out; a second Escape in find keeping the
  selection; Escape before a just-added line is set taking the line back; no confirmation for an
  undoable act; a menu or popover covering what is under it while open; Recent repeating an
  analysis; the T49 tree-versus-drawing difference.

## A first look (T37)

1. T37A: find hint and suggestions show `graphty.degree` (`detours/16.png`, `19.png`, `22.png`,
   `23.png`). **(a) Find box.** Raw internal text.
2. T37A: "most" hints `name == 'Napoleon'`, no lead toward degree (`detours/11.png`). **(b)**
   Whether find reaches analyses and structural values.
3. T37A: `=degree > 30` refused as "No column named "degree"" while `degree > 30` is taken
   (`detours/19.png`, `22.png`). **(a) Find box** for the message naming the column as the screen
   does; whether a bare name in a rule reads the structure is the owner's open question (n).
4. T37A: "degree" offers "Select the 77 nodes" (`detours/16.png`). **(b)** What Enter in find takes.
5. T37A: no Degree column in the table before a run (`detours/28.png`, `29.png`). **(b)** Which
   structural values the table carries.
6. T37A: "Highest 36" and the histogram name nobody and take no click (`detours/06.png`, `08.png`).
   **(b)** Where "who" lives.
7. T37A: the "About Degree" button shows no tooltip on hover (`detours/09.png`). **(a) Screen-reader
   names.**
8. T37A: "Degree 36 >" replaces the selection with 36 neighbors, no warning (`detours/35.png`).
   **(a) Summaries.** Its description shows as a tooltip.
9. T37A: hovering a node shows no name (`detours/04.png`). **(b)** Hover names.
10. T37A: Hovered reads 1 with the pointer over panels (`detours/23.png`, `27.png`, `29.png`).
    **(a) Hover ends.**
11. T37A: the second Escape in find moves focus to the canvas and keeps the selection
    (`detours/26.png`, `27.png`). **(n)** Decided 2026-10-18: a second Escape leaves the box and
    keeps the selection; Escape on the canvas clears it.
12. T37A: Degree listed under Recent and under Rank nodes and edges (`pointer/11.png`). **(n)**
    Recent repeats an entry by design.
13. T37A: the Analyze popover covers half the open table's header (`pointer/11.png`). **(n)** A
    popover covers what is under it while open.
14. T37A: keyboard walk not done. **(n)** Pilot gap; see "Not piloted on this build".
15. T37B: "Highest 17" and the histogram name nobody (`detours/07.png`, `09.png`). **(b)** As row 6.
16. T37B: find shows `graphty.degree` before a run and `results.degree.value` after; a screen
    reader hears the path (`success/13.png`, `detours/15.png`, `keyboard/66.png`). **(a) Find box.**
17. T37B: "No column named "degree"" beside a table column titled Degree (`success/13.png`). **(a)
    Find box.** As row 3.
18. T37B: Degree shown everywhere but the table before a run (`detours/18.png`, `19.png`). **(b)** As
    row 5.
19. T37B: "Columns: 1 of 1" opens an empty popover (`detours/20.png`, `21.png`). **(a) Summaries.**
20. T37B: "id mean 17.5" (`detours/18.png`). **(a) Summaries.** Ids are not measurements.
21. T37B: the analysis filter does not list Degree for "ties" (`detours/23.png`). **(b)** A word the
    product does not use.
22. T37B: Quick actions finds no analysis by name (`detours/36.png`, `37.png`). **(b)** What Quick
    actions holds.
23. T37B: Most flow fills Source 1 and Sink 2 from a 34-node selection (`detours/26.png`). **(a)
    Summaries and analysis cards.** Nothing the reader did not choose is filled in.
24. T37B: "Start here" points at PageRank (`success/06.png`). **(b)** Which analysis a newcomer is
    pointed to.
25. T37B: the three best-connected nodes in nearly the same brown (`success/08-10.png`). **(n)**
    Neighbors on a continuous ramp are close; the answer key records it.
26. T37B: hovering a node shows nothing and Hovered stays 0 (`detours/05.png`). **(b)** for hover
    names; **(a) Hover ends** to confirm a move onto a node starts a hover.
27. T37B: Tab out of "Filter analyses" loses place (`keyboard/75.png`, `99.png`). **(a) Keyboard
    stops.**
28. T37B: a table cell reads "17" with no row or column (`keyboard/51.png`, `52.png`). **(n)** The Id
    column is the row header; a screen reader speaks it on a row change, the study tool reads only
    the cell's own name (third pass).
29. T37B: the Degree card's button is named "Run" (`keyboard/41.png`, `42.png`). **(a) Screen-reader
    names.**
30. T37B: the drawing opens in the right two thirds (`success/03.png`, `detours/04.png`). **(a)
    Framing.**
31. T37B: two options named Degree in the Analyze list (`keyboard/99.png`). **(n)** As row 12.

## Your own file, then one kind of person (T38)

1. T38A: find rows labeled by id (`detours/07.png`, `09.png`). **(b)** What names a node.
2. T38A: Enter with "board" typed selects the first node row and drops an 8-node selection; the
   "role is board (3)" row is not first (`detours/27.png`). **(b)** What Enter in find takes.
3. T38A: Escape from the node menu leaves a focus outline around the drawing (`detours/17.png`).
   **(n)** Focus returns to the menu's trigger and shows it (third pass).
4. T38A: after Undo empties history, focus stays on the dimmed Undo and Escape there does nothing
   (`detours/14.png`, `15.png`). **(n)** Escape on a button has no job; Escape on the canvas clears
   a selection. The dimmed Undo's missing reason is row T49A 7.
5. T38A: Load's region says only "All 24 rows"; the counts are outside it (keyboard walk). **(a)
   Screen-reader names.**
6. T38A: after Load, 9 Shift+Tabs to "Add a layer or a folder" (keyboard walk). **(n)** F6.
7. T38A: 10 Tabs from the new layer's row to "Which nodes" (keyboard walk). **(n)** F6.
8. T38A: the usage-data notice is last in the start screen's Tab order (`keyboard/02-13.png`).
   **(n)** Decided 2026-10-17.
9. T38A: "Remove role" comes after the value boxes in Tab order (keyboard walk). **(a) Condition
   cards.**
10. T38A: a value row in the attribute summary takes no click or right-click (`detours/20.png`,
    `21.png`). **(b)** Where "everyone like this" lives.
11. T38A: the Fill "+" shows the arrow pointer (`success/13.png`). **(n)** Arrow over buttons,
    decided.
12. T38B: Enter in the new layer's Color box sends focus to the disabled "Add to node fill", whose
    tooltip covers Fill (`pointer/15.png`, `keyboard/74.png`, `detours/13.png`). **(a) Focus after a
    style line.**
13. T38B: find rows and options name nodes by id (`detours/07.png`, `10.png`). **(b)** As row 1.
14. T38B: after a Shift+click the typed text stays; a plain click clears it (`detours/11.png`,
    `08.png`). **(a) Find box.** One rule for both.
15. T38B: Hovered reads 1 after a right-click and Escape (`detours/16.png`, `25.png`). **(a) Hover
    ends.**
16. T38B: a filter step reads "24 to 6 nodes" while all 24 are drawn (`detours/24.png`). **(n)**
    Decided 2026-10-18: a step applies only when added; its count is its preview.
17. T38B: ticking values changes the count but not the drawing (`pointer/11.png`). **(n)** A layer
    with no style draws nothing; the card's count is its preview.
18. T38B: kind carries the text icon though it is a category elsewhere (`pointer/08.png`,
    `detours/18.png`). **(a) Summaries and the Data place.**
19. T38B: the Fill "+" shows the arrow pointer (`pointer/13.png`). **(n)** As row 11.
20. T38B: the region around Load is unnamed and the summary line is outside it (keyboard walk).
    **(a) Screen-reader names.**
21. T38B: after Load, 12 Tabs to "Add a layer or a folder" (keyboard walk). **(n)** F6.
22. T38B: the open card reads as one run with no "Which nodes" name (keyboard walk). **(a) Condition
    cards.**
23. T38B: report.md not written (the harness refuses a subagent's report file). **(n)** Tool note.

## One color for the whole drawing (T39)

1. T39A: the browser never opened; no walk ran. **(n)** Pilot gap.
2. T39B: no browser slot came free; no walk ran. **(n)** Pilot gap.

## Picked out by letters in a name (T40)

1. T40A: Enter in the new Color box sends focus to the disabled "Add to node fill"
   (`success/13.png`, `keyboard/69.png`); a selection's layer keeps it in the box (`detours/09.png`,
   `16.png`). **(a) Focus after a style line.**
2. T40A: the disabled "+"'s tooltip stays up over the Fill heading (`success/13.png`). **(a) Focus
   after a style line.**
3. T40A: in a filter step, focus stays in the attribute box after a pick ("nameMme",
   `detours/20.png`). **(a) Condition cards.**
4. T40A: the find list does not mark the rows already picked by Shift+click (`detours/13.png`,
   `14.png`). **(a) Find box.**
5. T40A: the find list shows ids ("MmeMagloire"), the card's suggestions show names ("Mme
   Magloire") (`detours/05.png`, `success/09.png`). **(b)** What names a node.
6. T40A: the color box is named "not set" beside a value (keyboard walk). **(a) A line that is not
   set.**
7. T40A: Shift+Tab never returns to the graph heading after opening (keyboard walk). **(n)** The
   heading takes focus once to say where the reader is; it is not a Tab stop; F6 reaches the
   layers.
8. T40A: arrow cursor on "+" buttons (`success/04.png`, `11.png`). **(n)** Decided.
9. T40B: Enter in the color box moves focus to the disabled "+" with its tooltip over Fill
   (`success/14.png`, `keyboard/59.png`; kept in the box on `detours/11.png`). **(a) Focus after a
   style line.**
10. T40B: removing "Picked by hand" opens the next card's GAL list over Done, which takes the click
    (`detours/19.png`, `20.png`). **(a) Condition cards.**
11. T40B: in a filter step, focus stays in the attribute box ("nameGAL", `detours/27.png`). **(a)
    Condition cards.**
12. T40B: after Fill "+" the box starts at 6366F1, so the drawing does not change until Enter
    (`success/13.png`). **(n)** Decided 2026-10-18: a "+" never changes the drawing.
13. T40B: eight small purple dots, hard to count; wheel zoom barely zooms (`success/14.png`,
    `15.png`). **(n)** The dataset's density; the answer key reads the count.
14. T40B: a selected node's new purple is hidden under the selection glow (`detours/11.png`,
    `12.png`). **(b)** How a selection looks while it is styled.
15. T40B: the layer renames itself "Picked and name" mid-typing and reads "1 of 331" beside a chip
    of 8, with nothing saying the cards combine (`detours/15.png`, `16.png`). **(b)** Whether readers
    read two cards as "and"; the name follows the cards by design.
16. T40B: "Undid adding "name contains GAL"" does not say which thing was undone
    (`detours/31.png`). **(a) Undo and redo.**
17. T40B: the drawing does not reframe after the step keeps 8 genes (`detours/29.png`). **(n)** The
    drawing stays put (decided 2026-10-18); Frame is one key.
18. T40B: Load leaves focus on the inspector heading; 14 Tabs to the "+" (`keyboard/07-23.png`).
    **(n)** F6.
19. T40B: arrow cursor on "+", Filters and remove (`success/05.png`, `12.png`, `detours/18.png`,
    `23.png`). **(n)** Decided.
20. T40B: the color box is named "not set" beside a value (`keyboard/57.png`). **(a) A line that is
    not set.**
21. T40B: number attributes have a subtitle, id and name have none (`detours/24.png`). **(a)
    Summaries and the Data place.**

## Two facts at once (T41)

1. T41A: Enter in the color box lands on the disabled "+", announced disabled, its tooltip over
   Fill (`success/18.png`, `keyboard/70`, `detours/16.png`). **(a) Focus after a style line.**
2. T41A: the layer row shows 63 (edges) while the card reads 0 of 24 (`detours/26.png`, `28.png`,
   `32.png`). **(a) Layer row and key.**
3. T41A: tooltips on focus cover section labels ("Visibilit", `keyboard/66.png`, `success/18.png`).
   **(a) Focus after a style line.**
4. T41A: "phone" offers only "has a value"; "missing phone" answers "hours > 27" (`detours/07.png`,
   `09.png`, `10.png`). **(b)** Whether find reaches the missing.
5. T41A: the selection summary gives counts, not names (`detours/12.png`). **(b)** Where "who"
   lives.
6. T41A: the table opens on the Id header and Tab leaves it (`keyboard/93.png`, `94.png`). **(n)** A
   grid is one Tab stop and arrows move inside it.
7. T41A: Escape in the table grid does nothing (`keyboard/101.png`, `102.png`). **(a) Keyboard
   stops.**
8. T41A: Shift+Tab out of the condition picker closes it; a later Enter opened Visibility
   (`keyboard/50-53.png`). **(n)** Tab closes a pop-out (decided).
9. T41A: the inspector is titled by id ("v20", `success/19-22.png`). **(b)** As T38 row 1.
10. T41A: "No thanks" is the last stop of the start screen (`keyboard/02-13.png`). **(n)** Decided.
11. T41A: the unanswered consent notice leaves once a file is loaded (`detours/06.png`). **(n)**
    Decided: it leaves when the reader goes past it.
12. T41A: arrow cursor on "+" buttons (`success/06.png`, `16.png`). **(n)** Decided.
13. T41B: the pilot never ran (no browser slot). **(n)** Pilot gap.

## At or over a line (T42)

1. T42A: Enter in the color box of a "+" > Layer layer lands on the disabled "+" with its tooltip
   over Fill (`success/14.png`, `keyboard/79.png`; kept in the box on `detours/11.png`). **(a) Focus
   after a style line.**
2. T42A: the no-match hint teaches only ">" ("hours > 27"); "hours > 20" misses the person at 20
   (`detours/04.png`, `06.png`). **(a) Find box.** The example shows `>=`.
3. T42A: Enter on text with no match does nothing and says nothing (`detours/05.png`). **(a) Find
   box.**
4. T42A: after picking Highest, focus stays on the match list and "20" reopens it
   (`detours/20.png`). **(a) Condition cards.**
5. T42A: one Control+Z undoes a typed "from" and a later drag together (`detours/33-35.png`). **(a)
   Undo and redo.**
6. T42A: Highest 20 gives the top 20 people (`detours/23.png`). **(b)** "At least" against
   "highest".
7. T42A: an attribute's menu in the Data place offers no color (`detours/37.png`, `39.png`,
   `41.png`). **(b)** Where "draw by" lives.
8. T42A: right-clicking a node outside the selection replaces it (`detours/45.png`). **(n)** Decided:
   right-click inside a selection keeps it, outside replaces it.
9. T42A: arrow cursor on "+" buttons (`success/05.png`, `12.png`). **(n)** Decided.
10. T42A: 12 Tabs after Load, 10 from the layer row to "Which nodes" (`keyboard/15-64.png`). **(n)**
    F6.
11. T42A: Enter in the "from" box announces no new count (`keyboard/70.png`). **(a) Condition
    cards.**
12. T42A: the color box is named "not set" beside #6366F1 (keyboard walk). **(a) A line that is not
    set.** "indigo" is the decided word for 6366F1 (2026-10-18).
13. T42A: consent buttons after the samples (`keyboard/02-09.png`). **(n)** Decided.
14. T42A: report.md not written. **(n)** Tool note.
15. T42B: Enter in a new color line sends focus to the disabled "+" (`success/13.png`,
    `keyboard/87.png`; kept in the box on `detours/14.png`). **(a) Focus after a style line.**
16. T42B: every keystroke announces "No match for ...", even where a match is offered; the last
    announcement never names the 9 nodes (`detours/08.png`, `fields/08.png`). **(a) Find box.**
17. T42B: a "Select by a value:" heading stays with no row under it (`fields/19.png`, `24.png`).
    **(a) Find box.**
18. T42B: the hint's example is strict ("donations > 130000", `detours/09.png`). **(a) Find box.**
19. T42B: after Load, 6 Shift+Tabs to "Add a layer or a folder" (`keyboard/08.png`). **(n)** F6.
20. T42B: with "don" typed and donations highlighted, Tab picks nothing (`fields/24.png`). **(a)
    Condition cards.** Decided above: Tab takes a typed-toward choice.
21. T42B: 10000 in the "to" box gives "0 to 10000" (`detours/26.png`). **(b)** "At least" against a
    range.
22. T42B: arrow cursor on "+" and a key swatch (`success/05.png`, `14.png`). **(n)** Decided.
23. T42B: the key reads "Color: Layer 1" (`success/13.png`). **(n)** The key names the layer by its
    name, which the reader can change.
24. T42B: report.md not written. **(n)** Tool note.

## Bigger by a number (T43)

1. T43A: in 3D the two biggest dots look the same size; selection rings grow with the dots
   (`success/08.png`, `10.png`, `detours/27.png`). **(n)** Perspective and the dataset; the answer
   key records it.
2. T43A: the hours attribute shows Highest 52 but not who, and its menu has no size action
   (`detours/30.png`, `31.png`). **(b)** Where "who" and "draw by" live.
3. T43A: Shape "+" > Size waits at 1 and no layer exists until a value, unsaid (`detours/12.png`,
   `25.png`). **(a) Summaries and analysis cards** (the line says a layer is made on its first
   value).
4. T43A: Tab from the Id header leaves the table (`keyboard/83.png`, `84.png`). **(n)** A grid is
   one Tab stop.
5. T43A: "Does not fit" reads as "5 attributes, hidden" with no group names or "Show why"
   (`keyboard/63.png`). **(a) Screen-reader names.**
6. T43A: Tab stops only at Analyze in the toolbar (`keyboard/76-82.png`). **(n)** The toolbar is
   one Tab stop with arrows inside (decided).
7. T43A: arrow cursor on icon buttons (`success/06.png`, `detours/10.png`). **(n)** Decided.
8. T43B: after a canvas click clears the selection, find still holds "donations" over an empty
   "Select by a value:" heading (`detours/22.png`, `23.png`). **(a) Find box.**
9. T43B: 3 nodes fixed at size 4 by a layer above, the size key says nothing of them
   (`detours/29.png`). **(a) Layer row and key.**
10. T43B: bigger dots are cut off by the inspector's edge (`detours/12.png`, `14.png`). **(n)** The
    drawing stays put; Frame is one key.
11. T43B: Shape "+" > Size makes no layer and says nothing (`detours/11.png`). **(a) Summaries and
    analysis cards.** As row 3.
12. T43B: arrow cursor on the link icon (`pointer/06.png`). **(n)** Decided.
13. T43B: the Data place's attribute menu offers no size or color (`detours/34.png`). **(b)** As row 2.
14. T43B: keyboard walk not finished. **(n)** Pilot gap.
15. T43B: report.md not written. **(n)** Tool note.

## Names on the drawing (T44)

1. T44A: bigger labels hide more names, Cosette's among them, with no list of which
   (`pointer/13.png`, `16.png`). **(b)** How a reader learns which labels are hidden.
2. T44A: names drawn over each other and through nodes while "Hide overlapping labels" is on;
   Cosette's partly behind her ring (`keyboard/65.png`, `pointer/16.png`). **(a) Labels on the
   drawing.**
3. T44A: the Graph inspector's Labels section cannot put names on and does not say where
   (`detours/05.png`, `06.png`). **(b)** Where labels are turned on.
4. T44A: turning "Hide overlapping labels" off cannot be undone (`detours/06.png`, `08.png`). **(a)
   Undo and redo.**
5. T44A: Quick actions finds nothing for "names" (`detours/36.png`) **(b)** what Quick actions
   holds; "Pick a node attribute first" does not say where (`detours/37.png`) **(a) Summaries and
   analysis cards.**
6. T44A: Hovered keeps 1 after the pointer leaves (`pointer/13-17.png`, `detours/19.png`, `22.png`).
   **(a) Hover ends.**
7. T44A: the label source picker marks no current choice (`detours/27.png`). **(a) A line that is
   not set.**
8. T44A: Escape on the node inspector's heading does nothing (`keyboard/66.png`). **(a) Keyboard
   stops.**
9. T44A: the bottom toolbar is one Tab stop (keyboard walk). **(n)** Decided.
10. T44A: 17 and 18 Tabs to Text "+"; opening a layer leaves focus on its row (`keyboard/38.png`).
    **(n)** F6; a tree item opens with Enter and keeps focus (decided 2026-10-13).
11. T44B: "N hidden" names nobody and changes with zoom (`pointer/08-10.png`, `16.png`). **(b)** As
    row 1; the count follows what fits on screen by design.
12. T44B: the Labels section holds only overlap switches (`detours/08.png`). **(b)** As row 3.
13. T44B: a selected person is called by id everywhere (`detours/10.png`, `16.png`,
    `keyboard/82.png`). **(b)** What names a node.
14. T44B: a node's own Text "+" labels one person, too small to read (`detours/16.png`). **(b)** A
    node's own Style tab styling one node.
15. T44B: the label picker lists "name" under "In use" because another layer uses it
    (`detours/21.png`). **(a) A line that is not set.**
16. T44B: two layers labeling one node draw both texts on each other (`detours/20.png`). **(a)
    Labels on the drawing.**
17. T44B: the selection ring covers the top of the label (`keyboard/82.png`, `90.png`). **(a) Labels
    on the drawing.**
18. T44B: the label picker and Label settings cover the drawing while open (`pointer/07.png`,
    `12.png`, `14.png`). **(n)** A popover covers while open.
19. T44B: Hovered stays 1 after the pointer leaves (`pointer/14-16.png`). **(a) Hover ends.**
20. T44B: arrow cursor on the label settings gear (`pointer/11.png`). **(n)** Decided.
21. T44B: disabled "Add to node shape" and "Add to node fill" are Tab stops (keyboard walk). **(a)
    Keyboard stops.**
22. T44B: the node menu covers the inspector's values and offers nothing for names
    (`detours/23.png`). **(n)** for covering (a menu is open); **(b)** what the node menu offers.
23. T44B: the first drawing is off center (`pointer/04.png`). **(a) Framing.**
24. T44B: Frame selection turns the view and leaves Lucy Grant off center (`keyboard/82.png`).
    **(a) Framing.**

## Thick ties by a value (T45)

1. T45A: the group Width box opens with the caret after 8, so 24 gives 824 (`detours/17-18.png`).
   **(a) A line that is not set** (a box selects its value on focus); no upper limit is **(n)**, a
   width is the reader's choice.
2. T45A: Control+Z does nothing inside "Color by kind" (`detours/22-25.png`). **(a) Undo and redo.**
3. T45A: Enter in a color box sometimes moves focus to "+" and sometimes keeps it; the Color line
   jumps above Width (`success/18.png`, `detours/56.png`, `keyboard/81.png`, `detours/40.png`). **(a)
   Focus after a style line.**
4. T45A: while an edge condition is built, the row's count and subtitle describe the node part
   (`success/11-15.png`). **(a) Layer row and key.**
5. T45A: after Load and after naming a layer, long Tab walks (`keyboard/15-42.png`). **(n)** F6.
6. T45A: Escape in a just-added Width box removes the line ("Edge width not added",
   `keyboard/70.png`). **(n)** A line never set is taken back by Escape, and says so (decided
   2026-10-18); a set box only discards the edit.
7. T45A: Enter on a ticked value does nothing; "Remove kind" comes after the values
   (`keyboard/57-62.png`). **(a) Condition cards.**
8. T45A: once one group has a width, the key lists all three at 8, and it reorders its color lines
   (`detours/12.png`, `17.png`). **(a) Layer row and key.**
9. T45A: selected ties draw a blue band over the new red (`detours/40-43.png`). **(b)** How a
   selection looks while it is styled.
10. T45B: Enter in a new Color box moves focus to Line "+", the Color row jumps above Width
    (`pointer/20.png`, `keyboard/76.png`, `detours/14.png`). **(a) Focus after a style line.**
11. T45B: the row shows 77 while the Edge tab picks 51 edges (`pointer/12.png`, `13.png`, `17.png`).
    **(a) Layer row and key.**
12. T45B: width 24 looks only a little thicker unselected, far thicker selected (`detours/14.png`,
    `16.png`, `pointer/20.png`). **(b)** As row 9.
13. T45B: "chapters" finds no column "shared_chapters" (`detours/04.png`). **(b)** Whether find
    reaches edges and their columns.
14. T45B: the empty "Select by a value:" heading stays after the selection clears
    (`detours/16.png`, `17.png`). **(a) Find box.**
15. T45B: the Node tab's "Add shared_chapters on the Edge tab" row is cut off with a scrollbar
    (`detours/27.png`). **(a) Summaries and the Data place.**
16. T45B: Escape on a tie's menu leaves the tie selected (`detours/22.png`, `25.png`). **(n)**
    Right-click selects; Escape closes the menu only.
17. T45B: about 10 Shift+Tabs and 13 Tabs to reach the layers and the inspector
    (`keyboard/17-49.png`). **(n)** F6.
18. T45B: Enter in the "from" box announces no count (`keyboard/63.png`). **(a) Condition cards.**
19. T45B: Escape on "Pick edge color" with nothing open does nothing (`keyboard/78-79.png`). **(n)**
    Escape has nothing to close there.
20. T45B: arrow cursor on "+" buttons (`pointer/04.png`, `14.png`). **(n)** Decided.
21. T45B: Everything's "Edge width by attribute" changes every tie in one click (`detours/19.png`).
    **(b)** Where the look of everything lives.
22. T45B: the Data place has no way to style by an attribute, and "Filter to..." hides ties
    (`detours/31.png`, `32.png`). **(b)** Where "draw by" lives.
23. T45B: report.md not written. **(n)** Tool note.

## One group's color (T46)

1. T46A: no line came back. **(n)** Pilot gap.
2. T46B: Enter on the Memberships button opens Group 4's layer but focus falls on "Resize
   inspector" and nothing is announced (`keyboard/63-70.png`). **(a) Focus after a style line.**
3. T46B: Group 5's crimson sits beside the new red (`pointer/18.png`). **(n)** The palette and the
   reader's own choice of red; the answer key reads the layer.
4. T46B: nothing outside the node inspector says which group holds Nebraska (`detours/10.png`,
   `26.png`). **(b)** Where membership is shown.
5. T46B: the chain icon gives all 10 layers one color in one click (`detours/15-17.png`). **(b)**
   The folder's color is the trap question 3 reads; no confirmation for an undoable act (decided).
6. T46B: on a node's own Style tab, Fill "+" shows FF0000 in italics and "red" + Enter does nothing
   (`detours/20.png`, `21.png`). **(a) A line that is not set.**
7. T46B: the folder's caret is a few pixels wide and its tooltip covers the name
   (`pointer/13.png`) **(a) Keyboard stops**; clicking the name opens the folder's inspector and
   does not expand it (`detours/09.png`) **(n)**, a tree item's name opens it; the caret expands.
8. T46B: "Louvain" and "Group 4" name both a tree item and a Memberships button (`pointer/11.png`,
   `15.png`). **(n)** The names differ ("Louvain Group 4" against "Group 4, ..."); the study tool
   matches by part of a name.
9. T46B: Tab stops only at Analyze in the toolbar (`keyboard/27-43.png`). **(n)** Decided.
10. T46B: the folder table's color picker covers the drawing (`detours/11.png`, `12.png`). **(n)** A
    popover covers while open.
11. T46B: the filtered Analyze list keeps its full height (`pointer/05.png`). **(n)** Noted as not a
    defect.

## One shape for every group (T47)

1. T47A: "cube" in the shape list highlights Cylinder and Enter applies it to six layers
   (`detours/31.png`, `32.png`). **(a) Shape list typing.** What the shape is called is **(b)**.
2. T47A: Quick actions finds nothing for "shape" or "cube" (`detours/42.png`, `43.png`). **(b)** What
   Quick actions holds.
3. T47A: find's no-match line for "cube" suggests a name rule (`detours/14.png`). **(b)** Whether
   find reaches how nodes look.
4. T47A: Hovered keeps 1 with the pointer on the layer list (`detours/13-26.png`). **(a) Hover
   ends.**
5. T47A: the shape list checks Icosphere while no shape is set (`pointer/11.png`,
   `detours/30.png`). **(a) A line that is not set.**
6. T47A: "Style nodes" checked and dimmed on a single group layer with no reason
   (`detours/24.png`). **(a) Keyboard stops** (a disabled control shows its reason on hover, decided
   2026-10-18 and still missing here).
7. T47A: arrow cursor on toolbar buttons and the chain icon. **(n)** Decided.
8. T47A: Tab from Analyze goes to the inspector; Tab into the tree lands on Everything
   (`keyboard/28.png`, `40-42.png`). **(n)** The toolbar's one Tab stop is decided; the tree takes
   focus on its current item.
9. T47A: report.md not written. **(n)** Tool note.
10. T47B: adding "Shape: Louvain, Box" pushes Groups 8 to 10 below "3 more below"
    (`pointer/12.png`, `keyboard/64.png`). **(n)** The key says what is below and scrolls (third
    pass).
11. T47B: a selected team is named by id ("37" for GeorgiaTech) (`detours/08.png`, `14.png`,
    `18.png`). **(b)** What names a node.
12. T47B: the cube is hidden under the selection glow (`detours/18.png`). **(b)** How a selection
    looks while it is styled.
13. T47B: typed letters are not shown in the shape box (`keyboard/63.png`). **(a) Shape list
    typing.**
14. T47B: the toolbar is one Tab stop (keyboard walk). **(n)** Decided.
15. T47B: 20 Tabs to Analyze (keyboard walk). **(n)** F6.
16. T47B: "Color from each layer" lists 8 groups and "2 more" (`detours/33.png`). **(n)** "N more"
    opens the whole list (decided round 6).
17. T47B: focus never fell to the page; no missing names; no script errors. **(n)** Recorded.
18. T47B: report.md not written. **(n)** Tool note.

## Keep a group's colors on some nodes (T48)

1. T48A: a new layer's Color line shows 6366F1 in italics, and Enter or typing 6366F1 and Enter does
   not set it (`detours/46-50.png`). **(a) A line that is not set.**
2. T48A: on one cluster layer the card reads 15 while the layer paints 5 (`detours/25.png`). **(b)**
   A card's count read as the layer's.
3. T48A: Tab from "trained: how to match" goes to "Remove trained" above it (`detours/26.png`).
   **(a) Condition cards.**
4. T48A: Escape clears find but keeps the 15 selected, and the selection's Style tab cannot keep
   layer colors on them (`detours/13.png`, `16.png`). **(n)** Escape keeps the selection (decided);
   **(b)** whether find leads toward conditions.
5. T48A: Hovered keeps 1 after a right-click (`detours/36.png`, `38.png`, `41.png`). **(a) Hover
   ends.**
6. T48A: Filters switches the left panel from Style layers to Data (`detours/29.png`). **(b)** Where
   filters live.
7. T48A: Enter in Resolution runs Louvain (keyboard walk). **(n)** A form's Enter submits it; the
   pilot judged it acceptable.
8. T48A: consent last on the start screen; the toolbar one Tab stop (`keyboard/02-14.png`). **(n)**
   Decided.
9. T48A: "trained is Yes" in a filter step gives the right count and the wrong look
   (`detours/32.png`); focus and names clean on the walk. **(n)** Recorded.
10. T48B: on_record = No layer: Fill "+" shows 6366F1 and nothing sets it, not even typing it
    (`detours/43-48.png`). **(a) A line that is not set.**
11. T48B: the find box's Clear empties the text and keeps 12 nodes selected (`detours/14.png`,
    `20.png`, `22.png`). **(n)** Clearing a search keeps the selection it made (decided 2026-10-18).
12. T48B: on Group 1 the card reads 12 while 4 keep a color (`detours/28-29.png`). **(b)** As row 2.
13. T48B: on a new layer "Which nodes" opens with the list open and "Add a condition" takes two
    clicks (`detours/34-35.png`). **(a) Condition cards.**
14. T48B: arrow cursor on Filters and "+" (`detours/15.png`, `30.png`). **(n)** Decided.
15. T48B: a single layer reads "8 of 24" without "nodes" (`detours/24.png`). **(a) Condition
    cards.**
16. T48B: Enter in Resolution runs the analysis (`keyboard/20.png`). **(n)** As row 7.
17. T48B: 8 Tabs from the tree to "Which nodes" (`keyboard/21-40.png`). **(n)** F6.
18. T48B: Tab from "on_record: how to match" goes to "Remove on_record" above it
    (`keyboard/51.png`). **(a) Condition cards.**

## Put a color back (T49)

1. T49A: after a Color line is removed and added back, 6366F1 shows in italics and nothing sets it
   (`detours/31-36.png`). **(a) A line that is not set.**
2. T49A: removing the node color draws the start colors while the tree holds none
   (`detours/29.png`). **(n)** The T49 tree-versus-drawing difference; the answer key grades the
   drawing.
3. T49A: after "Remove node color", focus goes to Effects' "+" (`detours/29.png`). **(a) Focus after
   a style line.**
4. T49A: the swatch row changes between openings, with no indigo on an unset line
   (`detours/06.png`, `25.png`, `37.png`). **(a) Color picker.**
5. T49A: Enter in the hex box leaves the picker open (`detours/06.png`). **(a) Color picker.**
6. T49A: "blue" sets 0000FF, unlike the start's 6366F1 (`detours/23.png`). **(n)** The reader typed
   blue; the box names the start indigo (decided 2026-10-18).
7. T49A: the dimmed Undo shows no tooltip and stays a stop announcing "Nothing to undo"
   (`success/09.png`, `keyboard/78.png`). **(a) Undo and redo** for the hover reason; a dimmed
   command button stays reachable so its state can be read (**(n)**, unlike a dimmed "+").
8. T49A: about 27 key presses to the Everything color box; two disabled "+" are Tab stops
   (keyboard walk). **(n)** F6 for the walk; **(a) Keyboard stops** for the disabled "+".
9. T49A: Control+Y does nothing (keyboard walk). **(a) Undo and redo.**
10. T49B: the picker calls the color it opened on "the starting color" (`detours/15.png`). **(a)
    Color picker.**
11. T49B: the removed-and-re-added line shows 6366F1 and nothing sets it (`detours/28-36.png`). **(a)
    A line that is not set.**
12. T49B: removing the line draws the start while the tree holds none (`detours/27.png`). **(n)** As
    row 2.
13. T49B: after "Remove node color", focus goes to Effects' "+" (`detours/27.png`). **(a) Focus after
    a style line.**
14. T49B: Escape in a just-added Color box removes the line (`detours/29.png`). **(n)** As T45 row 6.
15. T49B: swatches differ between openings and lack 6366F1 when it is needed (`detours/12.png`,
    `34.png`). **(a) Color picker.**
16. T49B: Undo's name is only "Undo" (`keyboard/84.png`). **(a) Undo and redo.**
17. T49B: the dimmed Undo shows no reason; the old "Undid ..." notice stays (`success/09.png`,
    `keyboard/86.png`, `detours/23.png`, `24.png`). **(a) Undo and redo.**
18. T49B: disabled "+" buttons are Tab stops (`keyboard/38.png`, `47.png`). **(a) Keyboard stops.**
19. T49B: focus after opening on the inspector heading; long walks to the tree and to Undo
    (`keyboard/22-84.png`). **(n)** F6.
20. T49B: the drawing sits in the right half (`success/03.png`). **(a) Framing.**
21. T49B: arrow cursor on swatches and the minus (`detours/13.png`, `26.png`). **(n)** Decided.

## A colleague's project (T50)

1. T50A: ArrowDown and Enter on a suggestion in the opened rule rewrites "Mlle" to "Mlle
   Baptistine" (`keyboard/63.png`, `64.png`). **(a) Condition cards.**
2. T50A: after Control+Z the open card still shows "Mlle Baptistine" and 1 (`keyboard/65.png`). **(a)
   Condition cards.**
3. T50A: the suggestion list opening with the rule covers Match case, "Add a condition" and Done
   (`success/07.png`). **(a) Condition cards.**
4. T50A: the key's "Color: Poster" takes no click and has no tooltip (`detours/04.png`) **(b)**,
   whether the key leads anywhere; it is named twice (`detours/06.png`, `07.png`) **(a)
   Screen-reader names.**
5. T50A: hovering a node shows no name (`detours/08.png`). **(b)** Hover names.
6. T50A: ids instead of names in the heading and the Members list (`detours/09.png`,
   `success/05.png`). **(b)** What names a node.
7. T50A: "Select what it paints" names nobody and the table scatters the rows (`detours/17.png`,
   `18.png`). **(b)** Where "who" lives.
8. T50A: Hovered keeps 1 (`detours/10-17.png`). **(a) Hover ends.**
9. T50A: the opened card's reading has no "Which nodes" name (keyboard walk). **(a) Condition
   cards.**
10. T50A: the layer tree is 13 stops from the graph heading (`keyboard/19-32.png`). **(n)** F6.
11. T50A: report.md not written. **(n)** Tool note.
12. T50B: the collapsed "Which nodes" shows each chip's own count and never says both must hold
    (`success/04.png`). **(b)** Whether readers read cards as "and", and a chip's count.
13. T50B: condition headers read "hours 7" and "trained 15" (keyboard walk). **(a) Condition
    cards.**
14. T50B: clicking the second chip leaves no visible focus, and Tab lands on "Remove trained"
    (`success/09.png`, `10.png`). **(a) Condition cards.**
15. T50B: the key's "Color: Thank-you cards" takes no click (`detours/05.png`) **(b)**; its swatch
    has no tooltip (`detours/06.png`) **(a) Screen-reader names.**
16. T50B: the Values tab lists members by id (`success/12.png`). **(b)** What names a node.
17. T50B: the selection summary gives hours only as a mean (`detours/17.png`). **(a) Summaries.**
18. T50B: hovering a node shows no name (`detours/07.png`). **(b)** Hover names.
19. T50B: Escape on member heading "v02" does nothing (`keyboard/59.png`). **(a) Keyboard stops.**
20. T50B: about 13 Tabs to the layer list (`keyboard/06.png` on). **(n)** F6.
21. T50B: the consent notice leaves unanswered once a project opens (`keyboard/01.png`, `06.png`).
    **(n)** Decided; the grader does not count it as answered.

## Color by a kind (T51)

1. T51A: a one-node layer bound to role keys three colors while 23 of 24 nodes stay indigo
   (`detours/10.png`). **(a) Layer row and key.**
2. T51A: the Data place's role attribute offers nothing to color by it (`detours/30.png`, `31.png`,
   `33.png`). **(b)** Where "draw by" lives.
3. T51A: a selection made by "role is board" makes a layer called "3 nodes" whose key does not say
   board (`detours/27.png`). **(b)** Whether a selection made by a value keeps the value.
4. T51A: after Enter in the color box of a condition layer, focus lands on the dimmed Fill "+"
   (`detours/44.png`, `45.png`). **(a) Focus after a style line.**
5. T51A: Hovered reads 1 for the rest of the session after a right-click (`detours/13.png`,
   `24.png`, `45.png`). **(a) Hover ends.**
6. T51A: Tab in the attribute picker with "ro" typed and role highlighted takes nothing (keyboard
   walk). **(a) Condition cards.**
7. T51A: the three value squares under the Color line are not reachable by keyboard (keyboard
   walk). **(a) Screen-reader names** (the box's name says each group's color).
8. T51A: arrow cursor on the binding buttons (`success/06.png`, `13.png`). **(n)** Decided.
9. T51A: disabled "+" buttons are Tab stops (keyboard walk). **(a) Keyboard stops.**
10. T51A: "Everything" matches a tree item and a hidden "Open layer Everything" button
    (`detours/14.png`, `17.png`). **(n)** The study tool's matching; the hidden button is not
    reachable.
11. T51B: nodes named by id in find and the inspector (`detours/11.png`, `22.png`). **(b)** What
    names a node.
12. T51B: a hand-picked layer is named for its count and its key line names no kind; the third kind
    keeps indigo with no key line, close to a typed blue (`detours/15.png`, `20.png`). **(b)** As row
    3; the start color has no key line because nothing styles it (**(n)**).
13. T51B: the bound box's name names no color; the squares and the key are not Tab stops
    (`keyboard/48-52.png`, `62.png`). **(a) Screen-reader names.**
14. T51B: "Stop varying node color by data" removes the binding on one Enter (`keyboard/56.png`)
    **(n)**, no confirmation for an undoable act; after Control+Z focus lands on "Remove node color"
    (`keyboard/58.png`) **(a) Focus after a style line.**
15. T51B: disabled "+" buttons are Tab stops on a 22-Tab route (`keyboard/29.png`, `38.png`). **(a)
    Keyboard stops.**
16. T51B: after Load, the layer list is 6 Shift+Tabs back (`keyboard/11-17.png`). **(n)** F6.
17. T51B: arrow cursor on the link icon (`success/06.png`). **(n)** Decided.
18. T51B: the node menu covers the inspector's row labels (`detours/22.png`). **(n)** A menu covers
    while open.
19. T51B: in the Data place, email has a subtitle and the other attributes none (`detours/24.png`).
    **(a) Summaries and the Data place.**
