# Tier 3 dry run before round 1, third pass: what to fix and what to leave

Every tier 3 task (T37 to T51, both halves) was piloted again on the frozen build 5bd16cda6e, the
build made after the second dry run's fixes: the success path by pointer, the commonest detours,
and the whole task by keyboard with a screen reader's reading. This page lists every problem those
pilots reported (324 lines, many of them the same problem met on several tasks), sorts each one,
and gives the reason.

The sessions are for learning what a first-time user needs to style a graph. A session spent on a
cut-off label, a focus that lands on an empty built-in layer, or a redo that brings back an empty
folder teaches nothing about that, so every such problem is fixed before round 1. A problem that is
a real design question -- where something lives, what a reader expects, what a new concept is
called -- is left in, because answering it is what the sessions are for.

Classes:

- **(a) fix now.** An implementation or polish defect a participant could hit. Each names its fix
  group below.
- **(b) leave for the sessions.** An open design question the study exists to answer.
- **(n) no change.** Expected behavior, a convention already decided (the reason names it), a
  property of the frozen start that the answer key records, an open owner question, or a note
  about the study tool rather than the app.

Screenshots are under `rounds/r1d1/pilot/<task>/`, in the `5bd16cda6e/` folder where the task has
one (for example `T39A/5bd16cda6e/detours/07.png`). Fixing the (a) list changes the build, so round
1 runs on a new frozen build and every task is piloted again on it.

## Not piloted on this build

- **T39B**: its pointer session on 5bd16cda6e has an empty log; no detour or keyboard session ran.
- **T45B**: its pointer session closed after 900 seconds with no step; every T45B line below is
  from the earlier build and unconfirmed.
- **T46A**: the keyboard walk stopped at the start screen.

The next pilot must walk these three first.

## The frozen build holds uncommitted work

Build 5bd16cda6e was made from the studio worktree while it held uncommitted edits in
compact-mantine, graphty and graphty-element (the pilots' `session.json` says
`uncommittedChanges: true`). They are the second dry run's shared-controls fixes and parts of its
inspector, style panel and element work. No source in git reproduces the build the pilots walked.
That work is committed first (fix group 1), so every later fix starts from what was piloted.

## Fix groups

1. **Land the build's uncommitted work** (compact-mantine, graphty, graphty-element). Commit the
   edits the frozen build was made from, with their tests, so the source matches what was piloted.
   Two core dump files in `graphty/` and the scratch folder `compact-mantine-headproof/` are not
   source.
2. **Opening a graph and where focus lands** (graphty). After a sample opens, after Load, and after
   Control+O, focus lands on the built-in "Hovered" (or "Selected") layer row, so the first words a
   screen reader speaks are about an empty layer, and a pointer user sees that row's lock and
   action icons. While the chosen file is read, focus is first reported on the rail's "Graph" button.
   On the read-the-file page, Load says only "All 24 rows"; the node and edge counts are spoken
   only after Load. The start screen's sample buttons carry no count and no description for a
   screen reader. Escape from "Open as a new graph" returns focus to the wrong menu item.
3. **Keys that leave things open or do nothing** (graphty). Focus after Done on a new layer jumps
   to Shape "+"; after "Remove node color" it jumps to Effects' "+". Tab out of the open "Which
   nodes" picker leaves it open under the next control, and Escape there does nothing. A card's
   remove button is still not a Tab stop. Tab and Shift+Tab do nothing in "Filter analyses".
   Escape in a style field (the Size chip) clears the graph's selection. Focus left on a Undo that
   has just become disabled says nothing on the next Enter. Tab from "Add to node text" passes over
   the Fill "+". The canvas sits in no landmark.
4. **Color box and color words** (compact-mantine). A refused entry squeezes the box to a third of
   its width and cuts the typed text. "dark green" is refused while "darkgreen" is taken. Color
   words misname the colors a reader typed or sees: the starting 6366F1 is called "blue" (so a
   reader hears that every node is already blue, and typing "blue" then gives another color),
   "purple" (800080) is called "dark pink", and a palette green is called "teal". Escape that puts
   the committed color back says nothing. The text box shows the arrow pointer, not a text cursor.
5. **Shared lists, table and tree** (compact-mantine). The shape grid stays open after Tab moves
   focus away, covering the panel, and its drawn highlight disagrees with the option a screen reader
   is told is highlighted. A list's active option is a faint gray row. A sorted header shows its
   sort arrow beside an unlabeled "Options for <column>" arrow, which reads as a duplicate. Selected
   table rows are not announced as selected; End and Home do nothing inside a row. A disabled
   control (a dimmed "Style nodes" box, a dimmed Undo) shows no reason on hover. The read-the-file
   page's column-role boxes still look like dropdowns that open. A folder's expand caret is
   invisible at rest. The Size chip sits in its box with an empty slot to its left.
6. **Find box** (graphty, graphty-element if a fact is missing). The hint and the "Did you mean"
   line show the internal path `graphty.degree > 19`, and the suggestion that works is drawn in
   error red. After Enter the box rewrites the reader's text with a leading "=" ("=donations >=
   10000", "=hours", "=trained"). Options are cut off ("Select the 9 nodes (donations 10000 ...");
   the result list is a short scroll box that hides rows while the panel has room, and stays
   scrolled with its first row cut. A second Escape in the empty box clears the selection the
   reader just made with it.
7. **Summaries and inspector values** (graphty, graphty-element if a fact is missing). A
   selection's category row names only its largest value ("staff (5)" for 8 nodes, 3 of them
   board). A column none of the selected nodes has disappears instead of reading "0 of 4 have a
   value". A selection shows no Degree though each node's inspector does. An attribute's inspector
   says "Distinct values 3" without the values, and labels its type "Kind:", beside columns named
   kind. Labels are cut off: "Edges joining these no...", "gal1RGe... 99% have a va...", "Largest
   compon...". The histogram reads one-value bins as ranges ("1 to 1: 1"). The Degree row does not
   say what a click does. One score shows with four different precisions (0.02108, 0.009565, 0.03,
   0.097). An undirected graph's edge table is headed From and To. The "Background color" of label
   settings is named "default None" while its swatch shows white.
8. **Adding a style changes nothing until a value is chosen** (graphty). A "+" writes a starting
   value at once. On a node that a layer above draws as a cube, Shape "+" makes a one-node layer
   that writes Icosphere and turns the cube back into a ball; on a node's Style tab, Fill "+" paints
   it a color nobody chose; a new layer from a selection writes size 1 over a size binding and its
   key entry disappears; the key gains "Color: Layer 1, 8 of 331 nodes" in the starting color before
   any color is picked. A folder's own "+" already waits at the default. Escape before any choice
   does not take back the layer a node's "+" made.
9. **Layer panel words** (graphty). "Made layer 8 nodes for 8 nodes". Fill "+" named "Add to node
   fill" with the tooltip "Add color". "Pick Node color" beside "Remove node color". "Select..."
   beside Layer and Folder in the "+" menu, which reads as selecting nodes. "Update Louvain layer"
   for a folder of six. Undo words that do not say what changed ("Undid Which nodes."), that say
   "Color on Everything" for both a node and an edge color, or "6 layers" for a one-group change.
   The other-kind link reads "Edit edges", "Style edges" or "Edges: 0 styles / Edit" by state. The
   shape list's name drops its value once one is set, and a screen reader hears "Icosphere" for the
   unset default the screen draws in italics. "Node id" in one list and "id" in another for one
   column. "Nodes that pass every card": "card" is used nowhere else. The drop notice "it had no
   value yet" uses the words of the "Has no value" match. "New layer from selection" says nothing
   about the layer it will make. A layer's color is never spoken. "Which nodes" is not a heading.
   The analysis popover's back arrow has no tooltip. Main menu > Open sample does not mark the
   sample that is open.
10. **Layer panel behavior** (graphty). Removing a layer's only "Picked by hand" card widens it to
    every edge with no notice and keeps the name of the one tie it was made from. A card left
    unfinished is dropped with no notice when a click on the canvas closes the picker. A default
    name made from two cards is cut off in the list, the title and the key ("Picked by hand: 1 node
    and nam..."). The Node tab's "kind is an edge attribute; it is on the Edge tab" gives no way to
    get there. One group layer is headed "Node layer" from the tree and "Group, from Louvain, Oct
    18, 6:13:06 AM" from Memberships. A new layer row shows no node count beside rows that do. "Why
    this look" and "Open layer" land on the layer's Values tab, not its rule. "Covered by
    Thank-you cards" is text that cannot be followed.
11. **Key and drawing agree, and the drawing stays put** (graphty, graphty-element). With a filter
    step on, the key still counts nodes that are no longer drawn. The drawing jumps when the key
    grows, and shrinks and moves down after a run. Adding a condition on a folder, and running
    Louvain with a filter step on, re-lay the whole drawing. The floating toolbar sits over the
    drawing when the table is open. A key that scrolls gives only a thin scrollbar as the sign that
    groups are hidden below. A shape key entry is headed by the folder's name although one layer
    in it writes the shape.
12. **Undo and redo of a run** (graphty-element, graphty). Undo of a Louvain run and then Redo
    brings back the folder and its six group layers matching 0 nodes; the drawing stays the
    starting color, the key is gone, and "Update Louvain layer" then changes nothing and adds no
    undo step.
13. **Number card** (graphty). The Highest box takes any number (10000 on 24 nodes reads "highest
    10000, 24" and matches all). The closed chip reads "hours: highest 20, 20". A low end above the
    high end is refused as "not a number". The "not a number" message stays after the text has
    been corrected.
14. **Filter steps** (graphty). A step that was typed but never added is applied when the reader
    navigates away, silently. The "Is" box still has no accessible name. It takes one value, where
    the layer's condition card takes several and offers "contains". Its suggestions are in no
    order (GAL10, GAL11, GAL1, GAL2, ...).

## Decided in this triage (the team's calls, reversible)

- **A second Escape in an empty find box leaves the box and keeps the selection.** The second dry
  run made it clear a selection the find box made. Four pilots then lost the selection they had
  just made by pressing Escape to leave the box. Escape on the canvas clears a selection, as before.
- **A "+" never changes the drawing.** A line a "+" adds starts at what the drawing already shows
  for the layer's nodes, or waits at the default like a folder's "+" when they differ, and the key
  lists it only once the reader picks a value. The second dry run made "+" write a starting value
  so that a new layer is never empty; on a node's own Style tab that value repainted the node.
- **The filter step uses the condition card.** One job, one component: the step's "Is" box was a
  second, smaller way to say "which nodes" (one value, no "contains") beside the card a layer uses.
- **Color words name a CSS color exactly when the hex is one**, and the hue bands give indigo and
  purple their own words. A reader who types "purple" hears "purple".
- **An undirected graph's edge table is headed "Node A" and "Node B".** From and To state a
  direction the graph does not have.
- Kept as (n), with reasons in the rows: Escape in a style field keeps focus in it (decided
  2026-10-17); the find box's live count while typing a number card (decided 2026-10-17: a box
  writes on commit); Done drawn on a new layer (decided 2026-10-17); a list that opens with nothing
  active (decided 2026-10-18); Tab closing a pop-out; the tree's one Tab stop and the toolbar's one
  Tab stop; Reset drawn disabled at its default; the arrow cursor over buttons; F6 for the long Tab
  walks; the T49 tree-versus-drawing difference.

## A first look (T37)

1. T37A: the find hint and suggestions show `graphty.degree` where everything else says Degree
   (`5bd16cda6e/detours/09.png`, `12.png`, `17.png`). **(a) Find box.** Raw internal text.
2. T37A: "degree" and Enter selects all 77 nodes (`detours/12.png`). **(b)** What Enter in find
   takes. The selection's summary showing no Degree is **(a) Summaries** (`13.png`).
3. T37A: the table has no Degree column before a run (`detours/22.png`, `23.png`). **(b)** Which
   structural values the table carries.
4. T37A: "Highest 36" and the histogram name nobody and take no click (`detours/05-08.png`).
   **(b)** Where "who" lives.
5. T37A: the "Degree 36 >" row replaces the selection with 36 neighbors and nothing on it says so
   (`detours/28.png`). **(a) Summaries.** The row carries a description; show it as a tooltip.
6. T37A: hovering a node shows no name (`detours/04.png`). **(b)** Hover names.
7. T37A: the drawing takes focus but no key reaches a node (`keyboard/73-77.png`). **(b)** A
   keyboard walk of the drawing is an element capability not built.
8. T37A: after opening the sample, focus lands on "Hovered, node layer, 0 nodes"
   (`keyboard/19.png`, `pointer/03.png`). **(a) Opening a graph.**
9. T37A: Degree is listed under Recent and under Rank nodes and edges (`pointer/11.png`). **(n)**
   Recent repeats an entry by design, under its own heading.
10. T37A: the sorted Degree header shows two arrows, one an unlabeled "Options for Degree" button
    (`pointer/09.png`, `10.png`, `keyboard/55.png`). **(a) Shared lists.**
11. T37A: "Edges joining these no..." is cut off (`detours/13.png`). **(a) Summaries.**
12. T37A: the analysis list's active option is a faint gray (`keyboard/43-45.png`). **(a) Shared
    lists.** It must meet 3:1 against its row.
13. T37B: "Highest 17" names nobody (`detours-b/06.png`, `07.png`). **(b)** As row 4.
14. T37B: the find box shows `graphty.degree` and puts "=graphty.degree > 16" in the box
    (`detours-b/11-13.png`). **(a) Find box** for the hint and the "="; whether a bare `degree`
    should read the structure is the owner's open question on bare names in rules (not new).
15. T37B: a working suggestion is drawn as an error in red (`detours-b/12.png`). **(a) Find box.**
16. T37B: Degree exists before a run but the table and Data's Attributes list only id
    (`detours-b/21.png`, `22.png`). **(b)** As row 3.
17. T37B: computed columns never appear under Data > Attributes (`detours-b/33.png`). **(b)** Where
    a run's results are listed (as the second dry run).
18. T37B: the analysis filter does not list Degree for "ties" (`detours-b/24.png`). **(b)** A word
    the product does not use.
19. T37B: Start here points at PageRank (`detours-b/33.png`). **(b)** Which analysis a newcomer is
    pointed to.
20. T37B: the three best-connected nodes are drawn in nearly the same brown (`success/08-10.png`).
    **(n)** Neighbors on a continuous ramp are close; the key records it.
21. T37B: hovering shows nothing (`detours-b/05.png`). **(b)** As row 6.
22. T37B: the About Degree popover covers the Lowest row while open (`detours-b/08.png`). **(n)** A
    popover sits over the panel while open; it stays inside the panel (fixed in the second pass).
23. T37B: focus after opening lands on the Hovered row (`keyboard/07.png`). **(a) Opening a graph.**
24. T37B: the sample buttons give a screen reader no count and no description (`keyboard/05.png`,
    `06.png`). **(a) Opening a graph.**
25. T37B: the histogram reads "1 to 1: 1", "2 to 2: 11" (`keyboard/24.png`). **(a) Summaries.**
26. T37B: a table cell reads "17" with no row (`keyboard/38.png`). **(n)** The Id column is the row
    header (built in the second pass); a screen reader speaks it on a row change, and the study
    tool reads only the cell's own name.
27. T37B: one PageRank score in four precisions (`detours-b/33.png`). **(a) Summaries.**
28. T37B: the edge table of an undirected graph is headed From and To (`success/13.png`). **(a)
    Summaries.**

## Your own file, then one kind of person (T38)

1. T38A: a filter step typed but never added is applied on navigating away, with no word
   (`detours/28-29.png`, `32.png`, `33.png`). **(a) Filter steps.** Nothing a reader did not confirm
   changes the drawing.
2. T38A: the step's "Is" box takes one value (`detours/24-27.png`). **(a) Filter steps.** The
   condition card takes several.
3. T38A: after Shift+click the selection's role row reads "staff (5)" for 8 nodes
   (`detours/08.png`). **(a) Summaries.**
4. T38A: find rows are labeled by id (`detours/05.png`). **(b)** What names a node.
5. T38A: "Made layer 8 nodes for 8 nodes" (`detours/10.png`). **(a) Layer panel words.**
6. T38A: the find result list stays scrolled with its first row cut (`detours/08.png`). **(a) Find
   box.**
7. T38A: the role attribute says "Distinct values 3" without them (`detours/21.png`). **(a)
   Summaries.** A count that hides something shows it.
8. T38A: no route outside the condition card picks everyone with a value: node menu, table cell
   menu, column options, attribute menu (`detours/12.png`, `16.png`, `18.png`, `22.png`). **(b)**
   Where "everyone like this" lives. A table cell's right-click doing nothing is the same question.
9. T38A: the consent notice goes away when "New from data..." opens and never returns
   (`detours/02.png`, `04.png`). **(n)** Decided in the second pass: the notice leaves when the
   reader goes past it.
10. T38A: Escape after the node menu leaves a focus outline around the canvas (`detours/13.png`).
    **(n)** Focus returns to the menu's trigger and shows it.
11. T38A: after Load, focus lands on "Hovered" (`keyboard/17-24.png`). **(a) Opening a graph.**
12. T38A: 10 Tabs from the new layer's row to "Add a condition" (`keyboard/28-37.png`). **(n)** F6.
13. T38A: the consent notice is last in the Tab order (`keyboard/02-13.png`). **(n)** Decided.
14. T38A: the color box is named "blue" for 6366F1 and for 0000FF (`keyboard/53.png`, `55.png`).
    **(a) Color box.**
15. T38A: Load announces only "All 24 rows" (`keyboard/15.png`, `17.png`). **(a) Opening a graph.**
16. T38A: Escape after typing puts 0000FF back silently (`keyboard/59.png`). **(a) Color box.**
17. T38A: Fill "+" is named "Add to node fill" with the tooltip "Add color" (`keyboard/52.png`).
    **(a) Layer panel words.**
18. T38B: the color box is named "blue" for 6366F1 (keyboard walk). **(a) Color box.**
19. T38B: the kind row reads "company (6)" for 10 nodes of two kinds (`detours/16.png`). **(a)
    Summaries.**
20. T38B: find results are a short scroll box hiding a row with room to spare (`detours/12.png`).
    **(a) Find box.**
21. T38B: find and the inspector name nodes by id (`detours/07.png`, `12.png`). **(b)** As row 4.
22. T38B: the find box still holds "agency" after the selection is styled (`detours/17.png`,
    `19.png`). **(n)** A search field keeps its text until cleared.
23. T38B: Fill "+" name and tooltip differ; arrow cursor (`success/13.png`). **(a) Layer panel
    words** for the name; **(n)** for the cursor (decided).
24. T38B: "Edit edges" on one layer, "Style edges" on another (`success/14.png`, `detours/19.png`).
    **(a) Layer panel words.**
25. T38B: "Kind: Category" beside a column named kind, no values listed (`detours/21.png`). **(a)
    Summaries.**
26. T38B: 9 Tabs to "Add a condition" (keyboard walk). **(n)** F6.
27. T38B: Load announces only the row count (keyboard walk). **(a) Opening a graph.**
28. T38B: report.md not written (the harness refuses a subagent's report file). **(n)** Tool note.

## One color for the whole drawing (T39)

1. T39A: the refused color box shrinks to a third and cuts "dark green" (`5bd16cda6e/detours/07.png`).
   **(a) Color box.**
2. T39A: "dark green" is refused, "darkgreen" taken, and the app itself says "dark green"
   (`detours/07.png`, `keyboard/45.png`). **(a) Color box.**
3. T39A: the find hint shows `graphty.degree > 19` (`detours/32.png`). **(a) Find box.**
4. T39A: 19 Tabs to the Everything color box (`keyboard/21-39.png`). **(n)** F6.
5. T39A: arrowing onto a layer highlights it while the inspector still shows the Graph until Enter
   (`keyboard/19.png`). **(n)** A tree moves focus with the arrows and opens with Enter (decided
   2026-10-13).
6. T39A: after Done on a new layer, focus jumps to Shape "+" (`detours/17.png`). **(a) Keys.**
7. T39A: Done shows before any condition (`detours/13-16.png`). **(n)** Decided in the second pass:
   Done is always drawn.
8. T39A: the undo notice for an edge color reads as the node color's (`detours/25.png`). **(a)
   Layer panel words.**
9. T39A: the color text box shows the arrow pointer (`pointer/05.png`). **(a) Color box.** A text
   field takes the text cursor; the arrow rule is for buttons.
10. T39A: Graph Style offers only Background color, which paints the canvas (`detours/09.png`,
    `31.png`). **(b)** Where the color of everything lives.
11. T39A: no focus defect on the keyboard walk. **(n)** Recorded.
12. T39B: not piloted on this build. See "Not piloted on this build".

## Picked out by letters in a name (T40)

1. T40A: "purple" is named "dark pink" by the box and the announcement (`5bd16cda6e/keyboard/45.png`).
   **(a) Color box.**
2. T40A: no way to select all find matches; Enter takes the first (`detours/06.png`, `11.png`).
   **(b)** What Enter in find takes.
3. T40A: the find list and the drawing do not mark where the matches are (`detours/05.png`).
   **(b)** Whether find previews.
4. T40A: the drawing shows no preview while a card is typed (`pointer/08.png`). **(n)** A layer
   with no style draws nothing; the card's count is its preview.
5. T40A: the filter step's "Is" box has no accessible name (`detours/15.png`). **(a) Filter steps.**
6. T40A: a text column offers only "Is" in a filter step (`detours/15-17.png`). **(a) Filter
   steps.**
7. T40A: "Select..." in the "+" menu reads as selecting nodes (`detours/23.png`). **(a) Layer panel
   words.**
8. T40A: a rule card added to a hand-picked layer cuts its name off, and the two cards combine
   unsaid (`detours/28.png`). **(a) Layer panel behavior** for the cut-off name; **(b)** whether a
   reader reads two cards as "and".
9. T40A: the key appears in the starting color the moment Fill "+" is pressed (`pointer/10.png`).
   **(a) Adding a style.**
10. T40A: focus after opening lands on the Hovered row (`pointer/03.png`, `keyboard/07.png`). **(a)
    Opening a graph.**
11. T40A: Escape in the color box does nothing (`keyboard/46.png`, `49.png`). **(n)** Decided
    2026-10-17: Escape in a style field keeps focus in it and puts the committed value back.
12. T40A: Escape in a card's text box keeps the typed text (`detours/30.png`). **(b)** Where Escape
    cancels (the combined Style panel spec keeps edits; the sessions decide).
13. T40B: "purple" is announced as "dark pink" (`keyboard/56.png`). **(a) Color box.**
14. T40B: Fill "+" offers the nodes' own color and the key already counts the layer
    (`pointer/11.png`). **(a) Adding a style.**
15. T40B: eight small purple dots, two overlapping; wheel zoom barely changes the view
    (`pointer/12.png`, `16.png`). **(n)** The dataset's density; the answer key reads the count.
16. T40B: a selected node's halo hides the color just given it (`detours/10.png`). **(b)** How a
    selection looks while it is styled.
17. T40B: find rows titled by systematic id; no select-all (`detours/06-07.png`). **(b)** Rows 2
    and T38's row 4.
18. T40B: the "Is" box has no accessible name (`detours/20.png`). **(a) Filter steps.**
19. T40B: with "name is GAL10" on, the key still says 8 of 331 while 1 is drawn (`detours/22.png`).
    **(a) Key and drawing.**
20. T40B: "Is" suggestions in no order (`detours/20.png`). **(a) Filter steps.**
21. T40B: a hand-picked layer plus a name card: 1 of 331, cut-off name (`detours/13.png`). **(a)
    Layer panel behavior** for the name; **(b)** for "and".
22. T40B: "Style nodes" grayed out on a layer made from a selection, with no reason
    (`detours/10-14.png`). **(a) Shared lists** (a disabled control shows its reason on hover).
23. T40B: Data attribute rows and "Largest compon..." cut off (`detours/17.png`, `pointer/04.png`).
    **(a) Summaries.**
24. T40B: focus reported on the rail's "Graph" before Load (`keyboard/17-18.png`). **(a) Opening a
    graph.**
25. T40B: after Load, focus on the Hovered row (`keyboard/19-26.png`). **(a) Opening a graph.**
26. T40B: 10 Tabs to "Add a condition" (`keyboard/30-39.png`). **(n)** F6.
27. T40B: Escape in the color box does nothing visible (`pointer/15.png`, `keyboard/59.png`).
    **(n)** As row 11.

## Two facts at once (T41)

1. T41A: Escape in a card keeps text while the color box reverts (`detours/29-30.png`). **(b)** As
   T40 row 12.
2. T41A: an unfinished card is dropped with no notice when a canvas click closes the picker
   (`detours/34-36.png`). **(a) Layer panel behavior.** The second pass said so on other paths.
3. T41A: "missing" in a text card gives only "phone leaves none" (`detours/27.png`). **(b)** The
   words readers use for a missing value.
4. T41A: the selection's summary leaves out phone, which none of the four has (`detours/14.png`).
   **(a) Summaries.**
5. T41A: "New layer from selection" shows no layer until a style is set (`detours/16.png`). **(a)
   Layer panel words.** The element keeps an empty layer out; the panel must say a layer is made on
   the first style.
6. T41A: right-click on a table row does nothing (`detours/48.png`). **(b)** As T38 row 8.
7. T41A: no node reachable from the canvas by keyboard (`keyboard/88-92.png`). **(b)** T37 row 7.
8. T41A: the table is one Tab stop; End inside a row does nothing (keyboard 99-110). **(n)** for
   one Tab stop (a grid); **(a) Shared lists** for End and Home within a row.
9. T41A: after Load, focus on the Hovered row (keyboard). **(a) Opening a graph.**
10. T41A: the no-match hint suggests "hours > 27" for "missing phone" (`detours/07.png`). **(b)**
    Whether find reaches the missing.
11. T41B: after the card switches to "Has no value", the 15 selected keep their rings while the
    layer paints four others (`detours/18-22.png`). **(b)** How a selection relates to the layer
    made from it.
12. T41B: find answers "email missing" with a number rule (`detours/06-08.png`, `11.png`). **(b)**
    As row 10.
13. T41B: "missing" in "Find an attribute" gives "Nothing found" (`detours/25.png`). **(b)** As
    row 3.
14. T41B: no node reachable on the canvas; "Select what it paints" names nobody
    (`keyboard/95-101.png`). **(b)** As row 7 and where "who" lives.
15. T41B: selected table rows not announced as selected (`keyboard/114.png`, `115.png`). **(a)
    Shared lists.**
16. T41B: the summary leaves out email for four nodes that have none (`keyboard/100.png`,
    `101.png`, `114.png`). **(a) Summaries.**
17. T41B: the drop notice "it had no value yet" echoes "Has no value" (`detours/29.png`,
    `keyboard/53.png`). **(a) Layer panel words.**
18. T41B: after picking an attribute focus is in the text box; Escape on a card's remove button
    closes the editor and drops the card (`keyboard/52.png`, `57-59.png`). **(n)** Focus where the
    next keystroke belongs; Escape on remove closes the card (second pass).
19. T41B: after Load, focus on the Hovered row (`keyboard/20-25.png`). **(a) Opening a graph.**
20. T41B: Escape in the table clears the selection; Tab leaves the table (`keyboard/119.png`,
    `120.png`). **(n)** Escape clears a selection; a grid is one Tab stop.
21. T41B: the table does not mark the rows a layer paints; a missing value is a blank cell
    (`detours/33.png`, `keyboard/118.png`). **(b)** for marking; **(n)** for the blank cell
    (decided 2026-10-17: blank on screen, "No value" to a screen reader).
22. T41B: the starting 6366F1 is named "blue" (`keyboard/87.png`). **(a) Color box.**
23. T41B: the "+" menu opens over the layer names (`pointer/05.png`). **(n)** A menu covers what is
    beneath it while open.
24. T41B: right-click on a node offers nothing for color (`detours/30.png`). **(b)** As T38 row 8.
25. T41B: report.md not written. **(n)** Tool note.

## At or over a line (T42)

1. T42A: count and drawing do not follow a typed number until Enter or Tab (`pointer/10.png`,
   `detours/20.png`). **(b)** Decided in the second pass that a box writes on commit (a mid-typing
   write crashed the inspector); whether readers wait for Enter is for the sessions.
2. T42A: no "at least" match; Highest paints the top 20 (`detours/18.png`, `21.png`). **(b)**
   "At least" on a number card.
3. T42A: the chip reads "hours: highest 20, 20" (`detours/21.png`). **(a) Number card.**
4. T42A: Tab out of the open picker past Done leaves it open (`keyboard/66.png`). **(a) Keys.**
5. T42A: the color box is named "blue" for 6366F1 (`keyboard/41.png`). **(a) Color box.**
6. T42A: a right-clicked node's header shows "v13", not the name (`detours/30.png`). **(b)** What
   names a node.
7. T42A: only Analyze takes a Tab stop on the toolbar (`keyboard/18-20.png`). **(n)** A toolbar is
   one Tab stop with arrows inside (decided).
8. T42A: after Load, focus on the Hovered row (`keyboard/11.png`, `12.png`). **(a) Opening a graph.**
9. T42B: Highest takes 10000 on 24 nodes and matches all (`detours/28-29.png`). **(a) Number card.**
10. T42B: the count does not follow typing (`pointer/11.png`, `keyboard/42.png`). **(b)** As row 1.
11. T42B: a low end above the high end is reported as "not a number" (`detours/38-39.png`). **(a)
    Number card.**
12. T42B: the "is not a number" message stays after a valid entry (`detours/36.png`). **(a) Number
    card.**
13. T42B: Enter rewrites `donations >= 10000` as `=donations >= 10000` (`detours/09.png`). **(a)
    Find box.**
14. T42B: the find option is cut off (`detours/07-08.png`). **(a) Find box.**
15. T42B: right-click on a node replaces the 9-node selection (`detours/19.png`). **(n)** A right-click
    outside the selection selects that node, inside it keeps it (decided 2026-10-17).
16. T42B: 9 Tabs from the layer's name box to "Add a condition" (`keyboard/26-37.png`). **(n)** F6.
17. T42B: focus reported on the rail's "Graph" after the file is read (`keyboard/16-17.png`). **(a)
    Opening a graph.**
18. T42B: the "+" shows the arrow pointer (`pointer/06.png`). **(n)** Decided.
19. T42B: Enter on a tree row does nothing; rename needs F2 (`keyboard/68.png`). **(n)** Enter
    opens a row that is not already open; F2 renames (the platform's key, listed in the row menu).

## Bigger for more (T43)

1. T43A: the Graph Style tab is open after Load with nothing for node looks (`detours/05.png`).
   **(b)** Where the look of every node lives.
2. T43A: a dot's Shape "+" > Size makes a one-node layer named "v09"; binding it changes nothing
   visible (`detours/10.png`, `16.png`). **(b)** What a node's own Style tab styles, and names.
3. T43A: the selection ring grows with the dot, so a near dot looks as big as the biggest
   (`detours/24.png`, `26.png`). **(n)** Depth and the ring are drawn as the camera sees them.
4. T43A: in 3D, 52 and 48 hours are drawn about the same size (`pointer/08.png`, `10.png`). **(n)**
   Close values; the answer key records it.
5. T43A: a new layer from the selection starts at size 1, covering the size binding and removing
   its key with no word (`detours/22.png`). **(a) Adding a style.**
6. T43A: "Select the 24 nodes (hours: has a val..." cut off; Enter writes "=hours"
   (`detours/17.png`, `19.png`). **(a) Find box.**
7. T43A: the hours summary's Highest names nobody; no size by attribute there; "Show in table"
   opens unsorted (`detours/28-30.png`). **(b)** for who and for where "size by" lives; **(n)** for
   the sort (a reader's choice).
8. T43A: "Node id" in the popover's list, "id" elsewhere (`keyboard/67.png`). **(a) Layer panel
   words.**
9. T43A: the size button shows the arrow pointer (`pointer/06.png`). **(n)** Decided.
10. T43A: the popover opens with nothing active; Enter on "Fixed size" closes it with no word
    (`keyboard/51.png`, `57-61.png`). **(n)** for nothing active (decided 2026-10-18); **(a) Layer
    panel words** for the silent close (say what was chosen).
11. T43A: Escape in the sorted table does nothing (`keyboard/100.png`). **(n)** The docked table is
    a panel, not a pop-out; it closes by its own button.
12. T43A: with the table open the floating toolbar sits on the lowest dot (`pointer/12.png`). **(a)
    Key and drawing.**
13. T43B: after Control+O > Replace, "Same size at any depth" is on though nothing turned it on
    (`5bd16cda6e/detours/07.png` against `39.png`). **(a) Opening a graph.** A reopened project
    must keep its settings; find which step turned it on.
14. T43B: Escape on the Size chip clears the graph's selection (`detours/26.png`). **(a) Keys.**
15. T43B: Escape in the table does nothing (`keyboard/39.png`). **(n)** As row 11.
16. T43B: Tab from the popover's find box closes the popover (`keyboard/27.png`). **(n)** Tab closes
    a pop-out (decided).
17. T43B: Enter opens the find box with nothing highlighted (`keyboard/26.png`). **(n)** Decided.
18. T43B: Enter writes "=donations" (`detours/29.png`). **(a) Find box.**
19. T43B: "Select the 24 nodes (donations: has a..." cut off (`detours/27-28.png`). **(a) Find box.**
20. T43B: the attribute menu in the Data place has no size or color by (`detours/42.png`). **(b)**
    Where "by this column" lives.
21. T43B: the Size chip sits beside an empty slot (`pointer/08.png`, `keyboard/39.png`). **(a)
    Shared lists.**

## Names on the drawing (T44)

1. T44A: a second Escape in the find box clears the node it just found (`keyboard/35.png`; the
   pointer route kept it, `detours/16.png`). **(a) Find box.** See the decision above.
2. T44A: the column picker opens with nothing highlighted (`pointer/07.png`, `keyboard/26.png`).
   **(n)** Decided 2026-10-18.
3. T44A: "Node id" in the picker becomes "id" in the label source box (`pointer/21.png`, `22.png`).
   **(a) Layer panel words.**
4. T44A: Text "+" on a selected node labels only that node (`detours/11.png`). **(b)** As T43 row 2.
5. T44A: the Graph inspector's Labels section does not say where names are put on
   (`detours/05.png`). **(b)** Where labels live.
6. T44A: the find hint shows `graphty.degree > 19` (`detours/13.png`). **(a) Find box.**
7. T44A: edges and nearer nodes drawn over labels (`pointer/15.png`, `detours/31.png`,
   `keyboard/49.png`). **(n)** Open owner question: a label over the edges in front of it.
8. T44A: "Show all labels" overlaps them (`pointer/17.png`). **(n)** That is what showing all does.
9. T44A: the hidden-label count changes with size and zoom with no word on which or why
   (`pointer/27.png`, `28.png`). **(b)** Whether readers need to know which labels hide.
10. T44A: label "Background color, default None" while the swatch shows white (`keyboard/44.png`,
    `pointer/27.png`). **(a) Summaries.**
11. T44A: the consent card's "No thanks" comes after the four samples (`keyboard/06-13.png`).
    **(n)** Decided.
12. T44A: Text "+" and the settings gear show the arrow pointer (`pointer/05.png`, `26.png`).
    **(n)** Decided.
13. T44B: ties drawn across label text (`pointer/12.png`, `25.png`, `keyboard/56.png`). **(n)**
    Owner question.
14. T44B: tiny names at the default framing; "Diego Ruiz" over Lucy Grant's dot (`pointer/09.png`).
    **(n)** Owner question on label size.
15. T44B: Verdana named, a serif drawn (`pointer/20.png`). **(n)** Owner question on the fallback.
16. T44B: the Label picker and settings cover the node being labeled (`pointer/14.png`, `20.png`,
    `detours/15.png`). **(n)** A pop-out covers what is beneath while open.
17. T44B: Tab in the picker's search closes it (`pointer/18.png`). **(n)** Decided.
18. T44B: nothing highlighted when the Label picker opens. **(n)** Decided.
19. T44B: "Show all labels" brings names back unreadable (`detours/37.png`). **(n)** As row 8.
20. T44B: find row and inspector heading "v16", not "Lucy Grant" (`detours/11-12.png`,
    `keyboard/52-56.png`). **(b)** What names a node.
21. T44B: Text "+" on the person makes a layer "v16" for one node (`detours/18.png`). **(b)** As
    row 4.
22. T44B: "Hide overlapping labels" off changes nothing visible (`detours/08-10.png`). **(b)** As
    row 5.
23. T44B: the Background color's reset shows dimmed at the default (`detours/08.png`). **(n)**
    Decided 2026-10-17: Reset is drawn disabled at the default.
24. T44B: the read-the-file page's role boxes look like dropdowns but open nothing
    (`detours/05-06.png`). **(a) Shared lists.**
25. T44B: Escape from "Open as a new graph" returns focus to "Open project or file..."
    (`detours/03.png`). **(a) Opening a graph.** Focus goes back to the item that opened it.
26. T44B: hovering a node shows no name (`detours/21.png`). **(b)** Hover names.
27. T44B: the consent notice is last in the Tab order (`keyboard/02-13.png`). **(n)** Decided.
28. T44B: 17 Tabs from Everything to "Add to node text" (`keyboard/20-36.png`). **(n)** F6.
29. T44B: the "=" zoom key works only on the focused canvas (`keyboard/57-63.png`). **(n)** Canvas
    keys belong to the canvas.
30. T44B: Tab from "Add to node text" passes over Fill "+" (`keyboard/37-44.png`). **(a) Keys.**
    Every "+" is a Tab stop in screen order. Typing a column name into the color box and meeting
    its refusal is **(n)**.

## Ties apart from the people (T45)

1. T45A: removing a layer's only "Picked by hand" card widens it to all 30 ties, with no word, and
   keeps the name "Nils -> Pia" (`5bd16cda6e/detours/13.png`). **(a) Layer panel behavior.**
2. T45A: "Made layer 8 edges for 8 edges" (`detours/28.png`). **(a) Layer panel words.**
3. T45A: "kind is an edge attribute; it is on the Edge tab" gives no way there (`detours/37.png`).
   **(a) Layer panel behavior.**
4. T45A: "Style edges" grayed out on a layer from one tie, with no reason (`detours/09.png`).
   **(a) Shared lists.**
5. T45A: after Load, focus on the Hovered row (`keyboard/20.png`). **(a) Opening a graph.**
6. T45A: icon add buttons show the arrow pointer (`pointer/05.png`, `13.png`). **(n)** Decided.
7. T45A: width 24 draws only a little thicker than 8 (`pointer/19.png`). **(n)** Recorded in the key.
8. T45A: report.md not written. **(n)** Tool note.
9. T45B (earlier build, unconfirmed): focus in the from box with the caret after 1 gives 15.
   **(n)** until piloted; the second pass fixed this caret.
10. T45B (earlier build): width 24 a little thicker than 8. **(n)** As row 7.
11. T45B (earlier build): one Control+Z leaves a Fill Color line at 6366F1 and a key entry.
    **(n)** until piloted on the next build; the next pilot walks it.
12. T45B (earlier build): the first click on Which nodes only expands it. **(n)** until piloted; the
    second pass made an empty Which row open the list on one click.
13. T45B (earlier build): the value not selected after Enter in the color box, so "0000FFre".
    **(n)** until piloted; the second pass made a committed box select on a click.
14. T45B (earlier build): a right-click on a tie lands on empty canvas. **(n)** until piloted; the
    second pass widened a tie's hit area.

## Clusters found by the program, one in red (T46)

1. T46A: the color key over the drawing takes no hover or click and shows no counts
   (`5bd16cda6e/detours/08-11.png`). **(b)** Whether the key's lines lead anywhere.
2. T46A: the folder caret has no name of its own and keeps the arrow; clicking the folder's name
   does not expand it (`pointer/13.png`, `14.png`). **(n)** The treeitem carries its expanded
   state; a click on a name selects it and the caret opens it (Figma's layer list).
3. T46A: the folder "Louvain" and the button "Louvain Group 3" (`pointer/11.png`). **(n)** The
   names differ.
4. T46A: one click on the chain icon paints every group one color and loses a changed color
   (`detours/29.png`). **(b)** Whether readers read the bound icon as "stop varying" (Figma
   detaches on one click; it is undoable).
5. T46A: the swatch picker from the folder table covers Group 3 (`detours/23.png`). **(n)** A
   pop-out covers what is beneath while open.
6. T46A: Undo and Redo say "6 layers" for a one-group color change (`detours/41.png`, `43.png`).
   **(a) Layer panel words.**
7. T46A: Fill "+" on a node's Style tab makes a one-node layer (`detours/39.png`). **(b)** As T43
   row 2.
8. T46A: after Run the drawing shrinks and moves down (`pointer/07.png`). **(a) Key and drawing.**
9. T46A: keyboard not walked past the start screen. See "Not piloted on this build".
10. T46B: the caret is not a control (`pointer/15.png`). **(n)** As row 2.
11. T46B: two controls named "Louvain" (`pointer/11.png`). **(n)** As row 3.
12. T46B: "cluster" makes Clustering coefficient the active entry (`detours/04-05.png`). **(b)**
    Which words lead to the grouping analyses.
13. T46B: the key is inert and shows no group sizes (`detours/10-12.png`). **(b)** As row 1.
14. T46B: Fill "+" on a node's Style tab paints 330055 before anything is chosen, keys "Color:
    74", the key scrolls to hide two groups, and Escape takes nothing back (`detours/29.png`,
    `30.png`). **(a) Adding a style** for the paint, the key entry and Escape; **(a) Key and
    drawing** for the hidden groups; the "74" name is **(b)**.
15. T46B: the node inspector is titled "74", not "Nebraska" (`pointer/10.png`). **(b)** What names a
    node.
16. T46B: Tab and Shift+Tab do nothing in "Filter analyses" (`keyboard/50.png`). **(a) Keys.**
17. T46B: a second Escape in the empty find box clears the selection. **(a) Find box.**
18. T46B: after opening the sample, focus on the Hovered row. **(a) Opening a graph.**
19. T46B: only Analyze is in the Tab order of the toolbar. **(n)** Decided.
20. T46B: the color picker stays open after Enter in its hex box (`detours/15-16.png`). **(n)** A
    color picker stays open for more changes until it is closed (Figma).
21. T46B: FF0000 sits beside a crimson group (`pointer/19.png`). **(n)** The reader's chosen color.
22. T46B: "Back to analyses" has no tooltip (`detours/06.png`). **(a) Layer panel words.**
23. T46B: one group layer headed two ways (`detours/23.png`, `pointer/17.png`). **(a) Layer panel
    behavior.**

## Every cluster at once, colors kept (T47)

1. T47A: Undo of the Louvain run then Redo brings back a folder of layers matching 0 nodes; the
   rerun button then changes nothing (`detours/22.png`, `26.png`, `27.png`, `29.png`, `30.png`).
   **(a) Undo and redo of a run.** A false screen and a dead end.
2. T47A: Tab leaves the shape grid open over the panel; Escape does not close it from there
   (`pointer/17.png`, `19.png`, `keyboard/69-71.png`). **(a) Shared lists.**
3. T47A: the grid draws Box highlighted while the screen reader is told Sphere
   (`keyboard/68-71.png`). **(a) Shared lists.**
4. T47A: Shape "+" on a single layer writes Icosphere and the key gains a Shape entry, headed by
   the folder's name, for a change nobody made (`detours/17.png`, `37.png`). **(a) Adding a style**
   and **(a) Key and drawing** for the heading.
5. T47A: the shape list's name drops its value once set; four controls share "Node shape"
   (`pointer/11.png`, `keyboard/63.png`, `66.png`). **(a) Layer panel words** for the dropped
   value; **(n)** for the shared words (each name is whole and different).
6. T47A: "cube" and "shape" in find suggest a degree rule (`detours/08.png`, `10.png`). **(a) Find
   box** for the internal path; **(b)** whether find should point toward looks.
7. T47A: Tab does nothing in "Filter analyses" (`keyboard/85-86.png`). **(a) Keys.**
8. T47A: the rerun card says "Update Louvain layer" for six layers (`detours/27.png`). **(a) Layer
   panel words.**
9. T47B: on a node's Style tab, Shape "+" makes a one-node layer that turns a cube back into a
   ball, named "76" (`detours/34.png`, `35.png`). **(a) Adding a style**; the name is **(b)**.
10. T47B: the node inspector is titled "76" (`detours/14.png`, `16.png`). **(b)** What names a node.
11. T47B: "cluster" puts Clustering coefficient first (`detours/05.png`, `06.png`). **(b)** As T46
    row 12.
12. T47B: the shape box says "Icosphere" while the screen shows the unset default in italics
    (`keyboard/64`). **(a) Layer panel words.**
13. T47B: once the shape is added, the key scrolls and hides Groups 9 and 10 (`pointer/14.png`).
    **(a) Key and drawing.**
14. T47B: the arrow pointer over Shape "+" (`pointer/09.png`). **(n)** Decided.
15. T47B: after Run, focus returns to Analyze; about 40 keys in all (`keyboard/36-58`). **(b)**
    Whether a keyboard participant finds the new folder (F6 reaches it).

## Cluster colors on only some people (T48)

1. T48A: the folder's caret is invisible at rest (`detours/16.png`, `17.png`). **(a) Shared
   lists.**
2. T48A: clicking "Group 1" in the key does nothing (`detours/15.png`). **(b)** As T46 row 1.
3. T48A: the chip "trained: yes, 15" on Group 1 counts the file, not the 5 it paints
   (`detours/24.png`). **(b)** Whether a card's count is read as the layer's.
4. T48A: "Undo Which nodes Ctrl+Z" and "Undid Which nodes." (`detours/31.png`, `34.png`). **(a)
   Layer panel words.**
5. T48A: Done collapses the picker and the rows below move up (`detours/42-44.png`). **(n)** A
   closing editor gives its room back.
6. T48A: after a filter step hides 9 people, the key still lists "9 of 24 nodes" (`detours/55.png`).
   **(a) Key and drawing.**
7. T48A: Enter writes "=trained"; the summary's role row "volunteer (9)" reads as all 15
   (`detours/09.png`). **(a) Find box** and **(a) Summaries.**
8. T48A: "Style nodes" checked but dimmed with no reason (`detours/18.png`). **(a) Shared lists.**
9. T48A: the toolbar's one Tab stop; the key never reached (keyboard walk). **(n)** for the
   toolbar; **(b)** for the key, as row 2.
10. T48A: Tab passes over a card's remove X (keyboard walk). **(a) Keys.**
11. T48A: Escape on the yes/no box keeps the new card (`keyboard/57.png`). **(b)** Where Escape
    cancels.
12. T48A: after Run, focus returns to Analyze (keyboard walk). **(b)** As T47 row 15.
13. T48B: the drawing re-lays itself when a condition is added on the folder and when Louvain runs
    with a filter step on (`pointer/11-12.png`, `keyboard/68-69.png`, `detours/17-18.png`). **(a)
    Key and drawing.** Nothing but a layout may move nodes.
14. T48B: a card's remove X is not in the Tab order (`keyboard/52-58.png`, `70-74.png`). **(a)
    Keys.**
15. T48B: Enter writes "=on_record" (`detours/07.png`, `08.png`). **(a) Find box.**
16. T48B: "Undid Which nodes." (`detours/37.png`). **(a) Layer panel words.**
17. T48B: "on_record: yes, 12" on a layer that paints 4 (`detours/35.png`, `36.png`). **(b)** As
    row 3.
18. T48B: the new "Not on record" row shows no count (`detours/49.png`, `50.png`). **(a) Layer panel
    behavior.**
19. T48B: report.md not written. **(n)** Tool note.

## Put it back (T49)

1. T49A: the minus on the Color line leaves a drawing like the opening one while the tree differs
   (`detours/22.png`). **(n)** Decided in the second pass: the answer key grades the drawing.
2. T49A: Escape in the color box with nothing typed does nothing (`pointer/15.png`,
   `keyboard/47-48.png`). **(n)** Decided 2026-10-17.
3. T49A: Fill "+" on a selected node colors only that node; node and layer share the name
   (`detours/08.png`, `09.png`, `14.png`). **(b)** As T43 row 2.
4. T49A: "red" in find gives a `graphty.degree` example (`detours/29.png`). **(a) Find box.**
5. T49A: the Undo button is 26 Shift+Tabs away; its name is only "Undo" (`keyboard/50-76.png`,
   `81.png`). **(n)** Control+Z and F6; the act is in the button's description, the shortcut out of
   its name (decided 2026-10-13).
6. T49B: removing the color line looks like the start (`detours/19.png`). **(n)** As row 1.
7. T49B: after "Remove node color", focus lands on Effects' "+" (`detours/19.png`). **(a) Keys.**
8. T49B: Undo's name is only "Undo" (`keyboard/30.png`). **(n)** As row 5.
9. T49B: after the last undo, focus stays on the now-disabled Undo; Enter says nothing
   (`keyboard/31.png`, `32.png`). **(a) Keys.**
10. T49B: hovering the dimmed Undo shows no reason (`path/10.png`, `11.png`). **(a) Shared lists.**
11. T49B: no undo in the Main menu, the layer menu or the canvas menu (`detours/12.png`, `14.png`,
    `16.png`). **(b)** Where undo lives for a newcomer.
12. T49B: Open sample does not mark the open sample (`detours/28.png`). **(a) Layer panel words.**
13. T49B: the color box calls 6366F1 "blue" while "blue" gives 0000FF (`keyboard/22.png`,
    `detours/21.png`). **(a) Color box.**
14. T49B: the Undo arrow shows the arrow pointer (`path/08.png`). **(n)** Decided.
15. T49B: "Pick Node color" beside "Remove node color" (`keyboard/22.png`). **(a) Layer panel
    words.**
16. T49B: "Color" matches four controls by name (`path/05.png`). **(n)** Each name is whole and
    different; "Color" is part of each.
17. T49B: 28 Shift+Tabs to Undo (`keyboard/28-30.png`). **(n)** As row 5.

## What a colleague's color picks out (T50)

1. T50A: Why this look opens the layer on its Values tab (`pointer/09.png`). **(a) Layer panel
   behavior.**
2. T50A: the key line "Color: Poster" is static (`pointer/17.png`, `18.png`). **(b)** As T46 row 1.
3. T50A: the arrow pointer over the condition chip (`pointer/11.png`). **(n)** Decided.
4. T50A: Members, find and node lists name characters by id (`pointer/05.png`, `detours/10.png`,
   `keyboard/45.png`). **(b)** What names a node.
5. T50A: "Select what it paints" names none of the three (`detours/20.png`). **(b)** Where "who"
   lives.
6. T50A: the find hint shows `graphty.degree > 19` (`detours/08.png`). **(a) Find box.**
7. T50A: Enter on a 3-node result selects one (`detours/10.png`, `11.png`). **(b)** What Enter in
   find takes.
8. T50A: the node menu and Values tab say nothing about the color (`detours/06.png`). **(b)** Where
   "why this look" lives.
9. T50A: 7 Tabs from the layer list to the Style tab (`keyboard/22-28.png`). **(n)** F6.
10. T50A: "Which nodes" is not read as a heading (`keyboard/37.png`). **(a) Layer panel words.**
11. T50A: Escape on Node actions does nothing; no way back to the layer but Tab
    (`keyboard/49.png`, `50.png`). **(b)** Whether the inspector needs a way back.
12. T50B: members listed by id (`pointer/11.png`, `13.png`, `keyboard/64`, `66.png`). **(b)** As row 4.
13. T50B: each chip's count sits beside the layer's with no word ("hours 30 to 52, 7"; spoken the
    same) (`pointer/04.png`, `keyboard/46`). **(b)** As T48 row 3.
14. T50B: the collapsed rule does not say both must hold; "card" appears only in "Nodes that pass
    every card" (`pointer/04.png`, `06.png`). **(b)** for "and"; **(a) Layer panel words** for
    "card".
15. T50B: the key line is inert and not in the Tab order (`detours/04-05.png`, `keyboard/22-27`).
    **(b)** As row 2.
16. T50B: "Covered by Thank-you cards on 6 of 24" cannot be followed (`detours/15-17.png`). **(a)
    Layer panel behavior.** It names a layer as "Why this look" does, which links.
17. T50B: "Open layer Thank-you cards" lands on the Values tab (`pointer/16.png`). **(a) Layer
    panel behavior.**
18. T50B: the table does not mark the rows a layer colors (`detours/11.png`). **(b)** As T41 row 21.
19. T50B: the node menu offers nothing about the look (`detours/13.png`). **(b)** As row 8.
20. T50B: hovering a green dot shows nothing (`pointer/12.png`). **(b)** Hover names.
21. T50B: Tab out of the open rule leaves the picker open; Escape there does nothing
    (`keyboard/55-56.png`). **(a) Keys.**
22. T50B: Escape from a member's inspector goes to the Graph (`keyboard/67.png`). **(b)** As row 11.
23. T50B: the layer's color is never spoken (`keyboard/35.png`). **(a) Layer panel words.** The
    row's description carries its color in words.
24. T50B: after Control+O, focus lands on "Selected"; on first open on "Hovered" (`detours/23.png`).
    **(a) Opening a graph.**
25. T50B: the consent's "What is collected" has the role DisclosureTriangle (`keyboard/11.png`).
    **(n)** The browser's own role for a summary element; screen readers name it a disclosure.

## Each kind its own color (T51)

1. T51A: find lists ids, not names (`detours/11.png`). **(b)** What names a node.
2. T51A: the key "Color: 3 nodes" and "Made layer 3 nodes for 3 nodes" (`detours/14.png`,
   `15.png`). **(a) Layer panel words** for the notice; **(n)** for the key (it names the layer).
3. T51A: role says "Distinct values 3" without them; no "color by" on its menus (`detours/19.png`,
   `20.png`, `22.png`). **(a) Summaries** for the values; **(b)** for "color by" there.
4. T51A: the node menu opens over the inspector and hides its labels' starts (`detours/16.png`).
   **(n)** A menu covers what is beneath while open.
5. T51A: with two hand-made layers the third value keeps the starting color with no key line
   (`detours/33.png`). **(b)** Whether the key names the color underneath everything.
6. T51A: adding a Fill turns a "Node and edge layer" into a "Node layer" and changes its link
   (`detours/31.png`, `32.png`). **(n)** for the kind (it follows what the layer styles, decided
   2026-10-12); **(a) Layer panel words** for the link's three wordings.
7. T51A: the arrow pointer over the link icon and "+" (`pointer/06.png`, `detours/25.png`). **(n)**
   Decided.
8. T51A: "No results" in the attribute popover is not spoken; Enter there does nothing
   (`keyboard/76.png`). **(a) Layer panel words** (say it); **(n)** for Enter on nothing.
9. T51A: the color popover opens with nothing active (keyboard 66-68). **(n)** Decided 2026-10-18.
10. T51A: the key is not reachable by Tab (`keyboard/70.png`). **(b)** As T50 row 15.
11. T51A: Tab from Load wraps to the Main menu before the page's tables (keyboard 20-30). **(n)**
    Load is last on the page; Tab goes on from there.
12. T51A: focus never fell to the page. **(n)** Recorded.
13. T51B: find lists ids (`detours/21.png`). **(b)** As row 1.
14. T51B: a screen reader calls the agencies "teal" where a sighted reader says green
    (`keyboard/52.png`, `54.png`, `76.png`, `pointer/08.png`). **(a) Color box.**
15. T51B: once bound, the link icon is "Stop varying node color by data" and a click removes the
    binding (`keyboard/52.png`). **(b)** As T46 row 4.
16. T51B: Escape after picking "kind is agency (4)" clears that selection (`detours/22-23.png`).
    **(a) Find box.**
17. T51B: the drawing jumps when the key grows (`detours/28-29.png`). **(a) Key and drawing.** View
    insets never move the drawing (decided 2026-10-08).
18. T51B: a color on Everything adds no key line (`detours/06.png`). **(b)** As row 5.
19. T51B: three hand-made layers cost about ten steps each (`detours/20.png`). **(b)** The route's
    cost is what the sessions measure.
20. T51B: the link icon shows the arrow pointer (`pointer/06.png`). **(n)** Decided.
21. T51B: the canvas sits in no landmark (`keyboard/76.png`). **(a) Keys.** A named region for the
    drawing and its key.
22. T51B: report.md not rewritten. **(n)** Tool note.

## Open questions this dry run hands to round 1

The (b) items gather on the same questions as the first two dry runs:

1. **What names a node.** Ids in find, the inspector, layer names, Members and key entries, on
   every task whose file has a name column.
2. **What a node's own Style tab styles.** Five tasks made a one-node layer from a node's "+" when
   the reader wanted every node like it.
3. **Where the color of everything lives**, and whether the key's lines lead anywhere.
4. **What Enter in find takes**, and whether find reaches "everyone like this" or the missing.
5. **Whether a card's count is read as the layer's**, and whether two cards read as "and".
6. **Where Escape cancels** in a card, and whether a reader waits for Enter on a number.
