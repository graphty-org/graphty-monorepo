# Tier 3 dry run before round 1, second pass: what to fix and what to leave

Every tier 3 task (T37 to T51, both halves) was piloted again on the frozen build ed4351b258, the
build made after the first dry run's fixes: the success path by pointer, the commonest detours, and
the whole task by keyboard with a screen reader's reading. This page lists every problem those
pilots found, sorts it, and gives the reason.

The sessions are for learning what a first-time user needs to style a graph. A session spent on a
typed color glued to the old one, a dead key or focus falling to the page teaches nothing about
that, so every such problem is fixed before round 1. A problem that is a real design question --
where something lives, what a reader expects, what a new concept is called -- is left in, because
answering it is what the sessions are for.

Classes:

- **(a) fix now.** An implementation or polish defect a participant could hit. Each names its fix
  group below.
- **(b) leave for the sessions.** An open design question the study exists to answer.
- **(n) no change.** Expected behavior, a convention already decided (the reason names it), a
  property of the frozen start that the answer key records, or a note about the study tool rather
  than the app.

Screenshots are under `rounds/r1d1/pilot/<task>/` (for example `T39B/success/08.png`). Fixing the
(a) list changes the build, so round 1 runs on a new frozen build and every task is piloted again
on it.

## Fix groups

- **Color box** (compact-mantine, graphty). A click into a box that already has focus places the
  caret, so a typed color is glued to the old one ("FF0000blue"): this happens after Enter and
  after Escape, which both keep focus in the box. Control+Z right after Enter does nothing. The
  refusal message squeezes the row into a narrow column, drops the Color label, sits under the link
  button's tooltip, and stays after an undo or after focus has moved on. Swatches and the box are
  named only by hex; a picked swatch leaves its row.
- **Number card** (graphty, compact-mantine). Focus put into a from or to box leaves the caret
  after the old value ("2" then "20" gives "220"). Escape keeps what was typed, unlike the color
  box. A notice on every keystroke of an unfinished number, and the count spoken mid-typing. While
  a box holds an unreadable value, the count and the drawing show the last readable one with no
  sign. A message that asks for "digits only" while a comma is taken, and an example (10000) that
  ignores the column's range. Unreadable text dropped on leaving with no word. "of all nodes"
  wrapped onto two cramped lines. "donations from" naming both a box and a slider thumb. Number
  boxes exposed as comboboxes.
- **Spoken messages** (graphty). Committing a color, binding a color or a size, and applying a
  binding say nothing. "24 labels, 4 hidden" and "Nothing found" in Find an attribute are never
  spoken. One change spoken twice ("15 of 24 nodes"). A status region that keeps its last text, so
  browse mode reads an old message long after.
- **Focus and keys** (graphty, compact-mantine). Focus falling to the page on the start screen
  (Shift+Tab from Main menu, Tab past No thanks) and after Enter on a Values member. After Load or
  Control+O, focus on the rail's "Graph" button. The canvas toolbar entered at its pressed Legend
  toggle, not its first item. Disabled Undo and Redo taking Tab stops. Focus after Done, after
  removing a line, after Escape closes "Color from each layer", and after Escape clears a
  selection, each landing somewhere the reader never went. Escape on a card's remove button not
  closing the card; the remove buttons unreachable by Tab. Escape doing two things in the Data
  place and on a Size chip; Escape not leaving the layer-checking mode. A right-click on empty
  canvas switching the inspector away from the open layer.
- **Layer panel** (graphty). Adding a style from a node or a selection makes a layer and says
  nothing; a cancelled first add leaves that layer behind. Removing a layer's last condition
  repaints every node with no notice and closes the picker. An unfinished card silently dropped
  (Enter in its empty box, a click on the canvas, Escape in a new Label line). A layer's default
  name kept after its rule changes ("Color: MmeHucheloup" for six people). A new layer opening on
  the Edge tab. "New layer for <value>" copying unrelated values (line pattern, motion). Two
  creation paths showing a layer's kinds differently. A "+" whose menu holds one item. Everything's
  "Which nodes" drawn like a control that does nothing; a collapsed "Which nodes" needing two
  clicks. A presence condition from find drawn read-only. An unfinished card showing a count. The
  disabled "Style nodes" box's three-line note. The label source box squeezed in some panels; the
  Node tab opening on "Edges: 4 styles"; the rule chip with no tooltip.
- **Names and words** (graphty, compact-mantine). Controls named only by their column ("phone",
  "name: text"), duplicate names ("Shape Shape", two "Which nodes", two "Everything", two
  "Degree"), the filter step's unnamed "Is" box and empty Attribute select, the guillemets of the
  Layer token read aloud, a badge read as part of a name ("Louvain, Start here"), a name that drops
  its count after Done, options read without their counts, ranges or reasons, every highlighted
  option read as "selected". Wrong words: "5 values" for five attributes, "Holds groups" and
  "Kind: Category" for text whose every value differs, "Paints from / to" for a size, "has a card",
  "70% filled" beside "70% have a value", "not set, 48" for a default, "More layers than colors"
  when there are enough, a shortcut inside a name, "not styled" said twice, a count split over two
  lines, a disabled Delete with no reason, "Color by" dialog rows read with every word twice,
  section titles that are not headings.
- **Lists** (graphty). The color-by list starting with "id" active and read "selected" before any
  choice; a disabled option made active by typing; a name that starts with the typed text ranked
  after one that only contains it; the analysis filter ignoring the words on its own options; the
  filter step's Is box offering one value where six match; an edge column typed on the Node tab
  answered "Nothing found"; a yes/no column with the text icon and "id" and "Node id" for one
  column, in different lists; the Analyze popover jumping as its list shrinks.
- **Find box** (graphty, graphty-element). The hint and the correction teach the backtick form
  (`` =donations > `125000` ``) though the box reads `donations >= 10000`, and take their example
  from a column of the wrong kind (a tie column for a node question). "No column named degree"
  while the inspector shows Degree. Shift+click on a value row replacing the selection. Escape in
  an empty box doing nothing, so a selection made by find cannot be cleared from it. Enter acting
  differently depending on how focus reached the box. "Select its matches" not saying how many or
  what. A miss that leaves the earlier selection drawn with no word. "Yes" not finding a yes/no
  value.
- **Key** (graphty). The key over the drawing covers nodes; with many groups it scrolls with no
  keyboard stop. An entry for a layer that paints only some nodes, or that a layer above wholly
  covers, reads as if it painted everything. Entries spoken with no color word. Legend reads
  "pressed" while no key is drawn.
- **Inspector and table** (graphty). The table's cells read without their row; the table opens
  four rows tall. The Degree "i" bubble running past the panel; the Degree row changing the
  selection with no word. An email broken mid-word. A selection's summary leaving out columns some
  nodes lack. "Why this look" opening a folder's layer without showing it in the tree; a folder
  caret a few pixels wide. The docked table shrinking the canvas over the drawing.
- **Shared controls** (compact-mantine). The shape grid swallowing a click until the pointer moves
  (no click lands at all for a touch or pen tap). A select's list covering its own field and the
  header. Tooltips that stay after a click or open over the control beside them. Reset drawn on
  its own line under the field. A disabled button with no reason on hover. Selects on the
  read-the-file page that look open to change but do nothing.
- **Drawing** (graphty-element). Ties and the selection ring drawn over label text. Wheel zoom out
  much slower than zoom in. A tie that cannot be hit unless the pointer is exactly on its line.

## Decided in this triage (the team's calls, reversible)

- **A box that holds its committed value selects it on a click.** The first dry run called the
  caret on a second click the platform's behavior. Its own fix then kept focus in the box after
  Enter and Escape, so the "second" click became the reader's first, and twelve tasks hit a glued
  color. A box with typing in progress still places the caret.
- **The find box's hint shows the plain form it already reads.** The first dry run left the
  backtick hint as a design question. This build reads `donations >= 10000` as typed, so the hint
  and correction teach a harder spelling of an input the box takes: that is polish. Whether find
  should be a rule language at all stays a question.
- **F6 answers the long Tab paths.** F6 moves from the layer list to the inspector in one press
  (decided 2026-10-17); Tab follows the screen's order. The 8 to 20 Tab walks are (n). Whether a
  keyboard participant finds F6 is for the sessions to show.
- **The canvas toolbar is entered at its first item.** The roving rule enters a tool bar at its
  pressed tool (Figma's tool bar); on a bar of toggles that put Legend mid-row and Analyze three
  arrows away. compact-mantine gains an optional entry choice (additive, recorded in
  `owner-decisions.md`), and the graphty app picks the first item.
- **Find rules answer the structure the inspector shows.** "No column named degree" beside a Degree
  section is a false screen. The element's rule check names the structural degree as the candidate
  for a bare `degree`, the same way it names a run's result, and find offers the rewrite.

## A first look (T37)

1. T37A: hovering a node shows nothing, though the cursor turns to a pointer and a Hovered layer
   exists (`detours/04.png`). **(b)** Hover names, as the first dry run; Hovered is an empty starting
   row a reader styles.
2. T37A: "Highest 36" and the histogram name nobody and take no click (`detours/05.png`, `06.png`).
   **(b)** Where "who" lives.
3. T37A: the find box says 'No column named "degree"' while the inspector shows Degree
   (`detours/11.png`). **(a) Find box.** A false screen.
4. T37A: the find hint and error teach backticks at a first search (`detours/08.png`, `10.png`).
   **(a) Find box.** The plain form works.
5. T37A: the table has no Degree column before a run; Columns offers only name (`detours/13.png`,
   `15.png`). **(b)** Which structural values the table carries.
6. T37A: clicking the inspector's "Degree 36" row replaces the selection with 36 neighbors and says
   nothing (`detours/20.png`). **(a) Inspector and table.** The row must say what it does and the
   change must be spoken.
7. T37A: the Degree "i" bubble covers the Lowest row and runs to the window's edge
   (`detours/07.png`). **(a) Inspector and table.** It must stay within the panel.
8. T37A: Tab from the table's Id header leaves the table; other headers only by arrows
   (`keyboard/26-28.png`). **(n)** A grid is one Tab stop with arrows inside it.
9. T37A: table cells read as bare values with no row (`keyboard/33.png`). **(a) Inspector and
   table.** The id column is the row header.
10. T37A: the toolbar is entered at Legend; Analyze is three arrows away (`keyboard/17.png`,
    `18.png`). **(a) Focus and keys.** Entered at its first item.
11. T37A: the analysis list opens with nothing active; after a run two options are both "Degree"
    (`keyboard/20.png`, `39.png`). **(n)** for nothing active before typing (a combobox's rule);
    **(a) Names and words** for the duplicate.
12. T37A: Escape on Clear search empties the box and leaves the list open (`keyboard/39.png`,
    `40.png`). **(n)** Escape clears first, then closes: the innermost thing first.
13. T37A: the canvas takes focus but no key reaches a node (`keyboard/42.png`). **(b)** A keyboard
    walk of the drawing is an element capability not built.
14. T37A: the counts say Nodes and Edges where the start card said "77 characters"
    (`pointer/03.png`). **(n)** The app's terms are node and edge; the card quotes the dataset.
15. T37B: "Highest 17" names nobody and neither row nor histogram can be clicked (`detours/06.png`,
    `07.png`). **(b)** As row 2.
16. T37B: Degree shows before a run, but `=degree` gives "No column" and the table has no Degree
    column (`detours/12.png`, `19.png`). **(a) Find box** for the message; **(b)** for the table.
17. T37B: the analysis filter does not list Degree for "connected", "ties" or "most"
    (`detours/21-23.png`). **(a) Lists** for "connected" and "most", words on screen (the "Most
    connected" group); **(b)** for "ties", a word the product does not use.
18. T37B: "most" makes the disabled "Most flow" active and Enter is silently ignored
    (`detours/23-24.png`). **(a) Lists.** A disabled option is never active.
19. T37B: the Start here badge points to PageRank, which gives no count of ties (`detours/26.png`,
    `30.png`). **(b)** Which analysis a newcomer is pointed to.
20. T37B: the two most connected nodes are drawn in nearly the same brown (`pointer/06.png`,
    `08.png`). **(n)** Neighbors on a continuous ramp are close; the key records it.
21. T37B: hovering a node shows nothing (`detours/05.png`). **(b)** As row 1.
22. T37B: ArrowDown in the Degree column reads "17" with no row (`keys/35.png`). **(a) Inspector
    and table.** As row 9.
23. T37B: Tab from the Id header leaves the table (`keys/28-33.png`). **(n)** As row 8.
24. T37B: Data's Attributes list shows only id after two runs (`detours/30.png`). **(b)** Where a
    run's results are listed.
25. T37B: the Main menu opens on "New project" by pointer (`detours/02.png`). **(n)** Decided
    2026-10-16: a menu opened by a click starts on its first enabled row.
26. T37B: ArrowLeft from Analyze wraps to the magnifier named Quick actions. **(n)** Wrapping is the
    toolbar convention; the magnifier opens Quick actions and its tooltip says so.

## Your own file, then one kind of person (T38)

1. T38A: Shift+click on a find value row replaces the selection (`detours/11.png`). **(a) Find
   box.** Shift+click adds, everywhere else in the app.
2. T38A: find rows are ids (v01, v13) (`detours/08.png`). **(b)** What names a node.
3. T38A: the key names the layer ("Color: Layer 1", "Color: 3 nodes") (`success/17.png`,
   `detours/21.png`). **(b)** A new layer's default name.
4. T38A: "Select..." in the add menu selects layers, not nodes (`detours/29.png`). **(b)** Its name
   and place.
5. T38A: Escape in the layer-checking mode clears the node selection but stays in the mode
   (`detours/30.png`). **(a) Focus and keys.** Escape leaves the innermost thing, the mode.
6. T38A: no "select everyone like this one" on the node menu or a table cell (`detours/26.png`,
   `34.png`). **(b)** Where that act lives.
7. T38A: committing a color with Enter says nothing (`keyboard/50.png`). **(a) Spoken messages.**
8. T38A: 8 Tabs from the new layer's row to its inspector (`keyboard/23-30.png`). **(n)** F6.
9. T38A: the consent notice is last in the Tab order (`keyboard/09-13.png`). **(n)** Decided: it
   never blocks, and a sample can be opened first.
10. T38A: after Load, focus is on "Graph", then "Graph volunteers.graphml" (`keyboard/16-17.png`).
    **(a) Focus and keys.** After Load focus goes to the layer list.
11. T38A: the "+" buttons show the arrow cursor (`success/13.png`). **(n)** Decided arrow cursor.
12. T38A: the consent notice leaves when a graph opens (`detours/07.png`). **(n)** Decided: shown
    on every launch until answered.
13. T38B: find rows and the inspector header are ids (`detour-new-from-data/08.png`, `10.png`,
    `26.png`). **(b)** As row 2.
14. T38B: the group row "kind is company (6)" comes after every node row (`detour-new-from-data/08.png`,
    `09.png`). **(b)** The order of find's rows.
15. T38B: Shift-click on a second value row replaces the selection (`detour-new-from-data/14.png`).
    **(a) Find box.** As row 1.
16. T38B: layers named "6 nodes", "4 nodes", "Layer 1" in the key (`detour-new-from-data/25.png`,
    `success/16.png`). **(b)** As row 3.
17. T38B: no way from a node to every node with its value (`detour-new-from-data/26.png`, `28.png`).
    **(b)** As row 6.
18. T38B: Escape on a card's "Remove kind" button does not close the editor (`keyboard/99.png`).
    **(a) Focus and keys.** Escape anywhere in the card closes it.
19. T38B: "Nothing found" in Find an attribute is never spoken (`keyboard/91.png`). **(a) Spoken
    messages.**
20. T38B: 11 Tabs from the new layer's row to Add a condition (`keyboard/24-38.png`). **(n)** F6.
21. T38B: after Done, the Effects "+" moves up under the resting pointer (`success/12.png`).
    **(n)** A panel reflows when a picker closes, as in every property panel; Undo restores.
22. T38B: with an error shown, Tab to the link button puts its tooltip over the error
    (`success/18.png`). **(a) Color box.**
23. T38B: a click into the focused color box appends ("0000FFnavy") (`success/18.png`). **(a) Color
    box.**
24. T38B: the inspector breaks an email mid-word (`detour-new-from-data/10.png`). **(a) Inspector
    and table.** Break at the @ or the dot.

## One color for the whole drawing (T39)

1. T39A: the Graph inspector's only color is Background, and typing a color there is a convincing
   false finish (`detours/07.png`). **(b)** Where the color of everything lives.
2. T39A: Background's Reset is a lone dash on its own line (`detours/04.png`). **(a) Shared
   controls.** Reset sits beside its field, as on layer rows.
3. T39A: a new layer opens on the Edge tab the last layer showed (`detours/25.png`). **(a) Layer
   panel.** A new layer opens on its Node tab.
4. T39A: after Escape the box keeps focus; a click places the caret and "green" is appended
   (`detours/19.png`, `20.png`). **(a) Color box.**
5. T39A: after Tab out of a refused color, the link button's tooltip covers the box
   (`detours/17.png`, `20.png`). **(a) Color box.**
6. T39A: 20 Tabs from Everything to the color box (`keyboard/45-64.png`). **(n)** F6.
7. T39A: Shift+Tab from Main menu drops focus to the page (`keyboard/18.png`). **(a) Focus and
   keys.** Tab rounds the start screen too.
8. T39A: Enter on a new color says nothing of the 77 nodes (`keyboard/66.png`). **(a) Spoken
   messages.**
9. T39A: Legend reads "pressed" with no key drawn (`keyboard/33.png`, `pointer/03.png`). **(a)
   Key.** Pressed only while a key shows, as the toggle is documented.
10. T39A: the usage-data card is reached after all four samples (`keyboard/11-13.png`). **(n)** As
    T38-9.
11. T39A: a right-click menu near the edge overlaps the inspector (`detours/09.png`). **(n)** Menus
    float over panels.
12. T39A: "color" in find answers with a tie column's rule (`detours/31.png`). **(a) Find box** for
    the wrong-kind example; **(b)** for whether find points to styling.
13. T39B: a click into the focused box does not select; "FFA500red", "bright oorangerange"
    (`success/07-08.png`, `detours/17.png`). **(a) Color box.**
14. T39B: Control+Z in the box after Enter does nothing (`detours/13-14.png`, `keyboard/26.png`).
    **(a) Color box.** With nothing typed, Control+Z is the app's undo.
15. T39B: after Control+Z the red message stays, "so this stays FFA500" (`success/09.png`). **(a)
    Color box.**
16. T39B: the error wraps into a narrow column, the label drops and the tooltip covers the box
    (`success/08.png`, `detours/16-17.png`). **(a) Color box.**
17. T39B: the Graph Style tab's Background color is a false finish (`detours/06.png`, `09.png`).
    **(b)** As row 1.
18. T39B: Background's Reset is a lone dash (`detours/06.png`, `08.png`, `10.png`). **(a) Shared
    controls.** As row 2.
19. T39B: a new layer opens on the Edge tab (`detours/23-24.png`). **(a) Layer panel.** As row 3.
20. T39B: Fill "+" opens a menu with one item (`detours/26.png`). **(a) Layer panel.** A "+" with
    one choice adds it.
21. T39B: after Remove edge color the Width remove button moves under the pointer
    (`detours/21.png`). **(n)** As T38-21.
22. T39B: no status line says the drawing changed after Enter (`keyboard/25.png`). **(a) Spoken
    messages.**
23. T39B: "No thanks" is last, after a "DisclosureTriangle" (`keyboard/10-13.png`). **(n)** The order
    is decided; DisclosureTriangle is Chromium's role for a summary, which screen readers say as a
    collapsed button.
24. T39B: ArrowDown in the tree moves focus without opening the layer; the color box is 20 Tabs on
    (`keyboard/19-23.png`). **(n)** Arrows move and Enter opens in a tree (decided 2026-10-13); F6.
25. T39B: a right-click on empty canvas switches the inspector from the open layer to Graph
    (`detours/29.png`). **(a) Focus and keys.** A right-click opens a menu and changes nothing else.

## Picked out by letters in a name (T40)

1. T40A: Filters > name > Is offers only "Mme Magloire" for "Mme" though six names match; Enter
   narrows the drawing to one (`detours/18.png`, `23.png`, `24.png`, `20.png`). **(a) Lists.** The
   box lists every value that matches.
2. T40A: find cannot select all its matches; Enter takes the first; Shift+click replaces and closes
   (`detours/04.png`, `06.png`). **(b)** for Enter; **(a) Find box** for Shift+click.
3. T40A: removing a layer's last card makes it paint all 77 with no warning (`detours/12.png`).
   **(a) Layer panel.** Said, with Undo, and the picker stays open.
4. T40A: a layer made from one node keeps its name ("MmeHucheloup") after its rule picks six
   (`detours/14.png`). **(a) Layer panel.** A default name follows its rule until renamed.
5. T40A: ids without the space ("MmeMagloire") beside the name "Mme Magloire" (`detours/03.png`,
   `04.png`). **(b)** What names a node.
6. T40A: the Data panel calls the name column, every value different, "Kind: Category", and offers
   no styling from it (`detours/29.png`). **(a) Names and words** for the kind; **(b)** for styling
   from the Data place.
7. T40A: the filter step's Attribute select is empty with no placeholder (`detours/15.png`). **(a)
   Names and words.**
8. T40A: a new Color line starts at 6366F1, so adding it shows no change (`pointer/11.png`). **(n)**
   A new line starts at the value in force (Figma's convention); its box takes the typing.
9. T40A: the keyboard walk stopped at the start screen. **(n)** Study run; T40A's keyboard walk runs
   in full on the next build.
10. T40B: a layer made from a gene's Style tab is named "YBR019C" and keeps it after its card becomes
    "name contains GAL" (`detours/12.png`, `14.png`, `20.png`). **(a) Layer panel** for the stale
    name; **(b)** for ids.
11. T40B: removing the only card repaints all 331 purple and closes the picker (`detours/16.png`).
    **(a) Layer panel.** As row 3.
12. T40B: find's Enter takes only GAL10 and clears its list of 8 (`detours/08.png`, `09.png`).
    **(b)** As row 2.
13. T40B: the filter step's Is box is a bare "combobox" (`detours/25.png`). **(a) Names and words.**
14. T40B: the card's match menu is "name" and its text box "name: text" (`keyboard/95.png`,
    `49.png`). **(a) Names and words.** Say what each control chooses.
15. T40B: icon buttons show the arrow cursor (`pointer/05.png`, `14.png`, `detours/15.png`,
    `21.png`). **(n)** Decided arrow cursor.
16. T40B: the 8 purple genes are small dots in the dense center; a wheel turn barely zooms
    (`pointer/18.png`, `19.png`). **(n)** for the colors, the reader's pick; **(a) Drawing** for the
    wheel.
17. T40B: browse mode still reads "Node color added" long after (`keyboard/110.png`). **(a) Spoken
    messages.** A status region empties after it has spoken.
18. T40B: hand-picked cards and the inspector title show ids (`detours/09.png`, `14.png`). **(b)**
    As row 5.

## Two facts at once (T41)

1. T41A: Enter in an empty text card closes the picker and deletes the card silently
   (`detours/31.png`). **(a) Layer panel.** A dropped card is said.
2. T41A: after Escape a click appends ("6366F1red"); the message is squeezed and covered
   (`detours/41.png`, `42.png`). **(a) Color box.**
3. T41A: the match combobox is named only "phone" (`pointer/14.png`, `keyboard/47.png`). **(a)
   Names and words.**
4. T41A: after picking a text column, focus is in the text box past the match menu that holds "Has
   no value" (`keyboard/46.png`). **(b)** Whether presence is found in the match menu.
5. T41A: "missing" and "no value" in the attribute picker give "Nothing found" (`detours/25.png`,
   `27.png`). **(b)** The words readers use for a missing value.
6. T41A: find cannot pick nodes with no value; "=phone" selects those WITH one, and its hint is a
   number rule in backticks (`detours/07.png`, `08.png`, `10.png`). **(b)** whether find picks
   missing values; **(a) Find box** for the offer that does not say what it selects, and the hint.
7. T41A: a miss leaves the 17-node selection drawn; a second Escape does not clear it
   (`detours/10-12.png`). **(a) Find box.**
8. T41A: the 17-node selection's summary has no phone row (`detours/08.png`). **(a) Inspector and
   table.** The summary lists every column the selection holds values in.
9. T41A: the filter step's Is box offers phone numbers and no "no value" (`detours/17.png`). **(b)**
   Whether a filter picks missing values.
10. T41A: the yes/no card's menu also offers "Has no value" (`detours/36.png`). **(n)** Any column
    can lack values; presence is a match option on every card (decided 2026-10-16).
11. T41A: the table does not mark painted rows; an empty cell is blank while the inspector says "No
    value" (`pointer/25.png`, `keyboard/90.png`). **(b)** for marking rows; **(n)** for the blank,
    the spreadsheet convention, named for screen readers (decided 2026-10-17).
12. T41A: Enter on the color says nothing (`keyboard/64.png`). **(a) Spoken messages.**
13. T41A: 12 Tabs from the layer row to Add a condition (`keyboard/26-37.png`). **(n)** F6.
14. T41A: Tab past "No thanks" drops focus to the page (`keyboard/14.png`). **(a) Focus and keys.**
15. T41A: the "Add a layer or a folder" tooltip covers the Hovered row's buttons
    (`detours/13.png`). **(a) Shared controls.**
16. T41A: "70% have a value" in the picker, "70% filled" in the Data place (`pointer/07.png`,
    `detours/14.png`). **(a) Names and words.** One wording.
17. T41B: an unreadable rule ("=email missing") leaves the earlier selection drawn and gives no
    working example (`detours/09.png`, `10.png`). **(a) Find box.**
18. T41B: an unfinished card disappears on a canvas click or Enter, unsaid (`detours/27-29.png`,
    `keyboard/52.png`, `53.png`). **(a) Layer panel.** As row 1.
19. T41B: "=email" selects those who have one and nothing says so; the summary has no email row
    (`detours/08.png`). **(a) Find box** for the offer; **(a) Inspector and table** for the summary.
20. T41B: a layer from that selection has a read-only card reading "email, 15" (`detours/16.png`).
    **(a) Layer panel.** A presence condition is an ordinary card with "Has a value" in its menu.
21. T41B: "no value" in Find an attribute gives "Nothing found" (`detours/24.png`). **(b)** As row 5.
22. T41B: after picking an attribute, focus skips the match menu (`keyboard/52.png`, `61.png`,
    `63.png`). **(b)** As row 4.
23. T41B: no node can be reached on the canvas (`keyboard/103-106.png`). **(b)** As T37-13.
24. T41B: Tab leaves the table from a header; 4 rows show at 1440x900; blank cells sort last both
    ways; a blank cell is "No value" to a screen reader (`detours/35-38.png`,
    `keyboard/109-116.png`, `138.png`). **(n)** for Tab (a grid), blanks last (the spreadsheet
    convention) and the blank; **(a) Inspector and table** for the four rows.
25. T41B: "on" makes "donations" active before "on_record" (`keyboard/42.png`). **(a) Lists.** A
    name that starts with the typed text ranks first.
26. T41B: an email card on an empty "Contains" shows 12, then 9 once set (`pointer/10.png`,
    `13.png`). **(a) Layer panel.** An unfinished card shows no count.
27. T41B: after Enter the color is not selected and typing appends (`keyboard/84.png`). **(a) Color
    box.**
28. T41B: Escape on a card's remove button does not close the editor (`keyboard/179.png`). **(a)
    Focus and keys.**
29. T41B: after Control+Z of a layer's color the key keeps "Color: Rule: email" at the starting
    color (`detours/18.png`). **(n)** Undo took back the color, not the line; the line holds the
    color in force and the key says so truthfully.
30. T41B: a right-click on a node offers nothing for color or similar nodes (`detours/33.png`).
    **(b)** As T38-6.

## At or over a line (T42)

1. T42A: a click into the color box does not select while the from box does (`pointer/15.png`,
   `16.png`). **(a) Color box.**
2. T42A: Escape in the from box keeps 25 (`pointer/20.png`). **(a) Number card.** Escape takes back
   what was typed, as in the color box.
3. T42A: after choosing hours with Enter, the from box has the caret after "2"; typing 20 gives 220
   (`keyboard/40.png`). **(a) Number card.** Focus put into a box selects its value.
4. T42A: with an unreadable bound, the count and drawing keep the last readable value
   (`keyboard/41.png`, `detours/09.png`). **(a) Number card.**
5. T42A: the error's example is always 10000, the other half's answer (`detours/16.png`). **(a)
   Number card.** The example comes from the column's own range.
6. T42A: a notice on every keystroke; "10 of 24" spoken mid-typing. **(a) Number card.**
7. T42A: Highest takes a count and its chip echoes it with no threshold (`detours/13.png`). **(b)**
   Whether readers expect "at least" (the first dry run's question 4).
8. T42A: find's hint and correction use backticks (`detours/18.png`, `20.png`). **(a) Find box.**
9. T42A: the inspector heading is "v20", not Julia Rossi (`detours/28.png`). **(b)** What names a
   node.
10. T42A: leaving a card with unreadable text drops it to the full range unsaid (`detours/27.png`).
    **(a) Number card.**
11. T42A: the collapsed Which nodes row has a group and a text both named "Which nodes"
    (`pointer/22.png`). **(a) Names and words.**
12. T42A: the pilot's report file could not be written. **(n)** Study tool; the findings are here.
13. T42B: Escape in the from box keeps the 5 and paints 16; the color box and to box behave
    otherwise (`pointer/27.png`, `28.png`, `22.png`, `detours/27.png`). **(a) Number card.** As row 2.
14. T42B: "$10,000" raised six notices, "5000" three (`detours/20.png`, `26.png`). **(a) Number
    card.** As row 6.
15. T42B: the message says "digits only" but "10,000" is taken (`detours/20.png`). **(a) Number
    card.** The message asks for what the box takes.
16. T42B: the no-match hint teaches `` =donations > `125000` `` (`detours/06.png`). **(a) Find box.**
17. T42B: "Select its matches" does not say how many (`detours/07.png`). **(a) Find box.**
18. T42B: Highest's "of all nodes" wraps onto two cramped lines (`detours/23.png`). **(a) Number
    card.**
19. T42B: the inspector header is "s15", not Zoning Board (`detours/28.png`, `29.png`). **(b)** As
    row 9.
20. T42B: "Add a layer or a folder" shows the arrow cursor. **(n)** Decided arrow cursor.
21. T42B: 11 stops from Layer 1 to Add a condition. **(n)** F6.
22. T42B: Done comes after Add a condition in the card's Tab order. **(n)** Screen order; Enter in a
    box also closes the card.
23. T42B: the match combobox and the heading share "donations". **(a) Names and words.**
24. T42B: "donations from" names both the box and a slider thumb; a click by that name lands on an
    unnamed div (`pointer/13.png`, `14.png`). **(a) Number card.** Each thumb has its own name.

## Bigger for more (T43)

1. T43A: the folded non-numeric columns read "5 values"; Show why says a name column "Holds groups"
   (`pointer/07.png`, `detours/17.png`, `keyboard/60.png`). **(a) Names and words.** Five
   attributes; text whose values all differ is text.
2. T43A: the size range is "Paints from / to"; "Clamp outliers" (`pointer/14.png`). **(a) Names and
   words** for painting words on a size; **(b)** for "Clamp outliers", a concept readers have not
   seen.
3. T43A: "Paints to" and "Node size" are comboboxes to a screen reader (`pointer/15.png`,
   `keyboard/55.png`). **(a) Number card.** Number boxes are spin buttons.
4. T43A: after Escape, the chip's tooltip sits over the Shape dropdown (`pointer/17.png`). **(a)
   Shared controls.**
5. T43A: in 3D, 52 and 48 draw at nearly the same size (`pointer/08.png`). **(n)** Perspective; the
   2D view exists.
6. T43A: link and toolbar buttons show the arrow cursor (`pointer/06.png`, `10.png`). **(n)**
   Decided arrow cursor.
7. T43A: Everything's Node tab opens on "Edges: 4 styles" (`pointer/05.png`). **(a) Layer panel.**
   The Node tab starts with nodes.
8. T43A: the unanswered consent notice leaves when a graph opens (`detours/06.png`). **(n)**
   Decided.
9. T43A: "hours" in find hints nothing about sizing; the summary's mean takes no click and shows no
   highest (`detours/07-09.png`). **(b)** Where "size by" is found and what a summary leads to.
10. T43A: Size on a selection's Style tab makes a layer "Rule: hours" unsaid; a disabled "Style
    nodes" box with three lines sits above (`detours/12.png`). **(a) Layer panel.**
11. T43A: Shape + Size on one node makes a one-node layer that stays after Escape; the node's tab
    hides the size it inherits (`detours/23-26.png`). **(a) Layer panel** for the leftover layer;
    **(b)** for showing what a node inherits.
12. T43A: Escape in the attribute inspector also clears the selection and drops to Graph
    (`detours/30-31.png`). **(a) Focus and keys.** One key, one act.
13. T43A: a right-click on a node inside a 24-node selection acts on the selection
    (`detours/20.png`). **(n)** Decided 2026-10-17: a right-click inside the selection keeps it.
14. T43A: disabled Undo and Redo take Tab stops (`keyboard/09-10.png`). **(a) Focus and keys.**
15. T43A: Enter on Everything keeps focus in the tree; 16 Tabs to the Size link
    (`keyboard/41-56.png`). **(n)** Tree convention; F6.
16. T43A: binding size says nothing (`keyboard/62.png`). **(a) Spoken messages.**
17. T43A: "Which nodes 24 of 24 All 24 nodes Shape" reads as one line; Shape is not a heading
    (`keyboard/63.png`). **(a) Names and words.** Section titles are headings.
18. T43A: after Load focus goes to the rail's "Graph" (`keyboard/19.png`). **(a) Focus and keys.**
19. T43B: the size key reads "Size: donations, 0 to 250,000" when 3 hand-picked nodes are sized
    (`detours/28.png`). **(a) Key.** An entry for a layer that paints some nodes says which.
20. T43B: Escape on the Size chip with 3 selected clears the selection and leaves the layer
    (`detours/29-30.png`). **(a) Focus and keys.** As row 12.
21. T43B: Show why says id, name and email "Hold groups" (`detours/26.png`). **(a) Names and
    words.** As row 1.
22. T43B: the size popover's options do not carry their reason or range (`keyboard/50.png`). **(a)
    Names and words.**
23. T43B: every highlighted option is "selected", disabled ones and the folded row too
    (`keyboard/47-49.png`). **(a) Names and words.** Selected only for the value in force.
24. T43B: an attribute's menu in the Data place cannot size or color by it (`detours/55.png`).
    **(b)** Where "style by this" lives.
25. T43B: the link button's focus tooltip covers the Shape box and "+" (`keyboard/42.png`,
    `detours/21.png`). **(a) Shared controls.**
26. T43B: Escape in the table does nothing (`keyboard/92.png`). **(n)** The table is a docked panel,
    not a layer Escape closes; Shift+T and F6 leave it.
27. T43B: Tab from the popover's find box closes it, so its Close button is not reached by Tab
    (`keyboard/42.png`). **(n)** Decided 2026-10-17: Tab leaving a pop-out closes it; Escape closes
    it from the keyboard.
28. T43B: Background's Reset is a bare dash at the default (`detours/07-08.png`). **(a) Shared
    controls** for its place; **(n)** for its presence (drawn disabled at the default, decided
    2026-10-17).
29. T43B: the email breaks mid-word (`pointer/09.png`). **(a) Inspector and table.**

## Names on the drawing (T44)

1. T44A: a clicked find box keeps focus after Enter so "f" types into it; reached by "/", Enter
   moves focus to the inspector (`detours/26.png`, `27.png`, `keyboard/30.png`). **(a) Find box.**
   One Enter, however focus came.
2. T44A: Escape in an empty find box does nothing (`detours/28-29.png`, `keyboard/34.png`). **(a)
   Find box.**
3. T44A: Text + > Label on a selected node makes a one-node layer "Cosette" unsaid
   (`detours/13.png`). **(a) Layer panel.**
4. T44A: the label source box is squeezed to its text in a node layer and a node's inspector
   (`detours/13.png`, `26.png`). **(a) Layer panel.**
5. T44A: Escape in a new Label line's picker removes the line unsaid (`detours/16-17.png`). **(a)
   Layer panel.** As T41-1.
6. T44A: the Graph inspector's Labels section only tunes overlap (`detours/06.png`). **(b)** Where
   labels are put on.
7. T44A: "Show all labels" draws names over each other (`pointer/13.png`). **(n)** That is what it
   does; hiding overlaps is the default.
8. T44A: Main menu's name and tooltip differ (`pointer/14.png`, `detours/02.png`). **(n)** The
   tooltip adds what the menu holds.
9. T44A: "No thanks" comes after the samples (`keyboard/08-14.png`). **(n)** As T38-9.
10. T44A: the label Size box reads "Size, not set, 48" in italics; "Scene" is unexplained
    (`keyboard/44.png`, `pointer/24.png`). **(a) Names and words.** "Default 48" and the unit named.
11. T44B: names are about 7 px and overlap at the default framing (`success/09.png`). **(n)** An open
    owner decision.
12. T44B: ties and the selection ring are drawn over label text (`success/11.png`,
    `keyboard/49.png`). **(a) Drawing.** Labels draw above both.
13. T44B: find and the inspector title a person "v16" (`detours/13-14.png`, `keyboard/48.png`).
    **(b)** What names a node.
14. T44B: Text + > Label on a person makes a "v16" layer; nothing points to Everything
    (`detours/18.png`). **(a) Layer panel** for the notice; **(b)** for where labeling everyone
    lives.
15. T44B: the label picker opens over the canvas, on the node (`detours/17.png`). **(n)** A pop-out
    opens upward from its field (decided 2026-10-13) and may cover the canvas.
16. T44B: in the one-node layer, "name" spills past its squeezed source button (`detours/18.png`).
    **(a) Layer panel.** As row 4.
17. T44B: the Labels section has only overlap switches, and turning one off shows nothing
    (`detours/09-10.png`). **(b)** As row 6; **(n)** for the switch, with no labels drawn there is
    nothing to hide.
18. T44B: Background's Reset sits alone under its box (`detours/09.png`, `11.png`). **(a) Shared
    controls.**
19. T44B: the read-the-file page's column boxes look like dropdowns but open nothing
    (`detours/06-07.png`). **(a) Shared controls.** A select that cannot change looks it and says why.
20. T44B: Tab in the label picker's search closes it (`success/17.png`). **(n)** Decided: Tab leaves
    a pop-out; arrows move into its list.
21. T44B: the Label settings tooltip covers "Show all labels" (`success/18.png`). **(a) Shared
    controls.**
22. T44B: the label Size box is "Size, not set, 48" (`success/20.png`). **(a) Names and words.** As
    row 10.
23. T44B: Label settings shows Verdana while labels draw serif (`success/19.png`). **(n)** An open
    owner decision (the default label font's fallback).
24. T44B: "Show all labels" brings hidden names back over others (`detours/30.png`). **(n)** As row 7.
25. T44B: three outward wheel turns barely move the view (`success/25.png`). **(a) Drawing.** Zoom
    out as fast as in.
26. T44B: 18 Tabs from Everything to Add to node text (`keyboard/24-41.png`). **(n)** F6.
27. T44B: the consent notice is last in the Tab order (`keyboard/10-13.png`). **(n)** As T38-9.
28. T44B: after Load, "Graph" then "Graph volunteers.graphml" (`keyboard/16-17.png`). **(a) Focus and
    keys.** As T38-10.
29. T44B: "24 labels, 4 hidden" is never spoken (`keyboard/45.png`). **(a) Spoken messages.**

## Ties apart from the people (T45)

1. T45A: find's Enter takes Agnes to Bruno and empties; "kind is family (8)" is last, below the fold
   (`detours/18.png`, `19.png`). **(b)** As T38-14 and T40-2.
2. T45A: a tie's menu offers no "ties like it" (`detours/23.png`). **(b)** As T38-6.
3. T45A: a right-click on a cell of the table's Edges tab does nothing (`detours/36.png`). **(b)** As
   T38-6.
4. T45A: an edge column typed in a Node tab condition gives only "Nothing found" (`detours/32.png`).
   **(a) Lists.** Say it is a tie attribute, on the Edge tab.
5. T45A: color by attribute on Everything recolors every tie; after Remove edge color, focus is on
   Width's remove button (`detours/08.png`, `16.png`). **(n)** for the recolor, Everything holds every
   tie; **(a) Focus and keys** for the focus, which goes to the section's "+".
6. T45A: "New layer for family" copies Everything's line pattern and motion, and the key gains a
   line nobody set (`detours/11.png`). **(a) Layer panel.** It copies only the value it is for.
7. T45A: opening the table shrinks the canvas and leaves nodes under it and the toolbar
   (`detours/34.png`). **(a) Inspector and table.** The app tells the element the free area
   (`setViewInsets`).
8. T45A: after Escape clears a selection, the focus ring is on Style while Values is selected
   (`detours/22.png`). **(a) Focus and keys.**
9. T45A: Width relabels a "Node and edge layer" as "Edge layer"; a "New layer for family" marks Node
   "not styled" and greys "Style edges" (`pointer/13.png`, `detours/11.png`). **(a) Layer panel.**
   One presentation for what a layer styles.
10. T45A: the yes/no column "close" has the text icon in Color by (`detours/07.png`). **(a) Lists.**
11. T45A: width 24 is only a little thicker than 8 (`pointer/14.png`). **(n)** The edge width unit is
    an open owner item.
12. T45B: the condition's from box gets focus with the caret after "1"; typing 5 gives 15
    (`pointer/08.png`, `detours/21.png`, `keyboard/33-34.png`). **(a) Number card.** As T42-3.
13. T45B: width 24 is barely thicker; selected ties draw far thicker (`pointer/14.png`, `17.png`,
    `detours/15.png`, `16.png`). **(n)** As row 11; the selection's emphasis is decided.
14. T45B: one Control+Z after Fill + Color blue leaves a Fill Color line at the starting purple and a
    key line (`detours/33.png`). **(n)** Adding the line and choosing blue are two acts, two undo
    steps; what remains is truthful. The answer key grades the drawing.
15. T45B: a collapsed "Which nodes" needs a second click to open the picker (`detours/23-24.png`,
    `28-29.png`). **(a) Layer panel.** One click opens it.
16. T45B: "All 254 edges" on Everything looks like a hint and does nothing (`detours/05-06.png`).
    **(a) Layer panel.** Plain text that says why the base layer holds all.
17. T45B: after Enter the color is unselected; typing appends ("0000FFre") (`keyboard/42.png`). **(a)
    Color box.**
18. T45B: a right-click on a tie by eye landed on empty canvas (`detours/34.png`). **(a) Drawing.** A
    tie is hit within a few pixels of its line.
19. T45B: the consent notice's buttons follow the samples (`keyboard/02-13.png`). **(n)** As T38-9.

## Clusters found by the program, one in red (T46)

1. T46A: no session started, as no browser slot came free. **(n)** Study run; T46A is piloted on the
   next build.
2. T46B: the node inspector is titled "74" for Nebraska; focus lands on heading "74"
   (`pointer/10.png`, `detours/11.png`, `keyboard/27.png`). **(b)** What names a node.
3. T46B: the "Color: Louvain" key covers nodes near the left and looks clickable but is not
   (`pointer/07.png`, `detours/06.png`). **(a) Key** for covering nodes; **(b)** for what a click on
   an entry should do.
4. T46B: the folder shows the Layer token in its chip, Color box and source table (`pointer/12.png`,
   `detours/16.png`). **(b)** The token is the decided folder design, a round 1 question; its spoken
   form is fixed (T47-3).
5. T46B: the color box selects only on its first click (`pointer/18.png`, `keyboard/39.png`). **(a)
   Color box.**
6. T46B: Escape closing "Color from each layer" puts focus on Undo, so Enter would undo
   (`detours/20.png`). **(a) Focus and keys.** Focus returns to what opened the table.
7. T46B: opening Group 4 from "Why this look" does not show it in the tree (`detours/08.png`,
   `14.png`). **(a) Inspector and table.** The tree opens to and marks the row shown.
8. T46B: the folder caret is a few pixels wide; a click on the name does not expand
   (`pointer/12.png`, `13.png`). **(a) Inspector and table** for the hit area; **(n)** for the name,
   which selects (the decided convention).
9. T46B: red FF0000 sits beside Group 5's crimson (`pointer/17.png`). **(n)** The reader's color.
10. T46B: committing a color says nothing (`keyboard/38.png`). **(a) Spoken messages.**
11. T46B: disabled Redo is a Tab stop (`keyboard/30.png`). **(a) Focus and keys.**

## Every cluster at once, colors kept (T47)

1. T47A: the first click on a Node shape option does nothing until the pointer has moved
   (`pointer/15-18.png`, `detours/30.png`, `36.png`). **(a) Shared controls.**
2. T47A: the toolbar's one Tab stop is Legend; Analyze is three arrows away (`keys/46-58.png`). **(a)
   Focus and keys.**
3. T47A: the folder chip shows the Layer token, and a screen reader hears its guillemets
   (`pointer/08.png`, `keys/93.png`). **(b)** for the token; **(a) Names and words** for the spoken
   name.
4. T47A: the Shape section is a group named "Shape Shape" (`pointer/11.png`). **(a) Names and words.**
5. T47A: "Edge not styled" on the tab and "Edges: not styled" under it (`pointer/08.png`,
   `detours/26.png`). **(a) Names and words.** Said once.
6. T47A: find's no-match hint is `` =shared_chapters > `16` `` (`detours/06.png`). **(a) Find box.**
7. T47A: the shape list covers its own field and the header (`pointer/12.png`, `detours/29.png`).
   **(a) Shared controls.**
8. T47A: the folder Color line's link button gives all 6 layers one color and looks like the Shape
   line's (`detours/23.png`). **(b)** Part of the bulk design under study.
9. T47A: options and icon buttons show the arrow cursor (`pointer/17.png`, `detours/23.png`,
   `24.png`). **(n)** Decided arrow cursor.
10. T47A: a selected node's glow hides its new shape (`detours/18.png`, `37.png`). **(n)** The
    selection's emphasis is decided; clearing the selection shows the shape.
11. T47A: a stray dash under Background color (`detours/37.png`). **(a) Shared controls.**
12. T47A: the disabled "Style nodes" box carries three lines (`detours/26.png`). **(a) Layer panel.**
    The reason goes in its tooltip.
13. T47A: the Louvain option is read "Louvain, Start here" (`keys/60.png`). **(a) Names and words.**
    The badge is a description.
14. T47B: a click or tap on a shape tile is swallowed until the pointer moves; a touch tap never
    lands (`pointer/14-17.png`, `detours/23.png`, `31.png`). **(a) Shared controls.** As row 1.
15. T47B: the color key covers part of the drawing, then scrolls and hides Groups 9 and 10 with no
    keyboard stop (`pointer/07.png`, `17.png`, `keyboard/76.png`). **(a) Key.**
16. T47B: a team's inspector and its one-node layer are "0", not BrighamYoung (`detours/08.png`,
    `12.png`). **(b)** What names a node.
17. T47B: Shape from a node's tab makes a layer unsaid and a key line "Shape: 0 Icosphere"
    (`detours/12.png`). **(a) Layer panel** for the notice; **(n)** for the key line, which is true.
18. T47B: find's hint is `` =id > `57` `` (`detours/14.png`). **(a) Find box.**
19. T47B: the folder chip reads with the Layer token and a screen reader hears it
    (`pointer/08.png`, `detours/27.png`). **(b)** for the token; **(a) Names and words** for the
    spoken name.
20. T47B: "More layers than colors: Extend the palette" with 19 colors for 10 groups; the No value
    select on the window's bottom edge (`detours/18.png`). **(a) Names and words** for the false
    message; **(a) Shared controls** for the placement.
21. T47B: the Color field's name and tooltip differ; after Escape its tooltip covers Text and Fill
    (`detours/20.png`). **(a) Names and words; Shared controls.**
22. T47B: the Analyze popover jumps as typing shrinks its list (`pointer/04.png`, `05.png`). **(a)
    Lists.** It keeps its place.
23. T47B: Tab enters the toolbar at Legend; Left from Analyze wraps to Quick actions. **(a) Focus
    and keys** for the entry; **(n)** for the wrap.
24. T47B: Shape is read as value "Icosphere" with no sign it is the default. **(a) Names and words.**
25. T47B: "Louvain, Start here". **(a) Names and words.** As row 13.

## Cluster colors on only some people (T48)

1. T48A: the key covers a node (`pointer/08.png`, `13.png`). **(a) Key.**
2. T48A: the folder's chip, card and name show the Layer token (`pointer/09.png`, `10.png`,
   `keyboard/76.png`). **(b)** for the token; **(a) Names and words** for the spoken name.
3. T48A: after the condition, the key lists Groups 1 to 3 as if every member kept its color
   (`pointer/13.png`). **(a) Key.** As T43-19.
4. T48A: the trained card counts the whole file on a layer that paints 5 (`detours/31.png`,
   `37.png`). **(b)** Whether a card's count is read as the layer's (round 1 question).
5. T48A: a click on Everything's "Which nodes" does nothing (`detours/24.png`). **(a) Layer panel.**
   As T45-16.
6. T48A: the find route's selection cannot keep cluster colors; Escape in find leaves the 15
   selected (`detours/11.png`, `13.png`). **(b)** for the route; **(a) Find box** for Escape.
7. T48A: a Filters step keeps 15 and hides 9 (`detours/20.png`). **(n)** A filter hides what it
   leaves out; the answer key grades the look.
8. T48A: "Collapse Louvain" stays over Group 1 after the click (`detours/26.png`). **(a) Shared
   controls.** A tooltip closes on a click.
9. T48A: a right-clicked node's inspector is "v15" (`detours/14.png`). **(b)** What names a node.
10. T48A: the toolbar's only stop is Legend, "pressed" before a key exists; Left wraps
    (`keyboard/46-51.png`). **(a) Focus and keys** and **(a) Key**; **(n)** for the wrap.
11. T48A: Tab never reaches the cards' remove buttons (`keyboard/79-81.png`, `90-92.png`). **(a)
    Focus and keys.**
12. T48A: "15 of 24 nodes" is spoken twice (`keyboard/89.png`). **(a) Spoken messages.**
13. T48A: disabled Undo and Redo are Tab stops; Undo's tooltip covers the panel header
    (`keyboard/35.png`). **(a) Focus and keys; Shared controls.**
14. T48A: after Run nothing points to the new Louvain folder (`pointer/08.png`, `keyboard/57.png`).
    **(b)** Where a run's result is shown (the first dry run's call).
15. T48B: on Group 1 the on_record card reads 12 while the layer matches 4 (`detours/18.png`). **(b)**
    As row 4.
16. T48B: Filters keeps 12 and hides 12 (`detours/26.png`). **(n)** As row 7.
17. T48B: Everything's "Which nodes / All 24 nodes" does nothing on click (`detours/09.png`,
    `11.png`). **(a) Layer panel.**
18. T48B: "Covered by ... on 2 4 of 24" breaks the count across lines (`detours/08.png`). **(a) Names
    and words.**
19. T48B: "Yes" in find finds nothing; the hint uses backticks (`detours/31.png`). **(a) Find box.**
20. T48B: after find selects 12 nothing offers the others; a second Escape leaves the selection
    (`detours/33.png`, `36.png`). **(b)** for the others; **(a) Find box** for Escape.
21. T48B: the node inspector's title is "s03" (`detours/37.png`). **(b)** As row 9.
22. T48B: the context menu opens over the toolbar (`detours/37.png`). **(n)** Menus open at the
    pointer.
23. T48B: the attribute list reads "Louvain (has a card)" (`pointer/11.png`, `keyboard/78.png`).
    **(a) Names and words.** Say "already a condition".
24. T48B: after Run the inspector stays on Graph (`pointer/08.png`). **(b)** As row 14.
25. T48B: the toolbar is entered at Legend (`keyboard/24.png`, `33-35.png`). **(a) Focus and keys.**
26. T48B: "No thanks" is the 12th stop (`keyboard/13.png`). **(n)** As T38-9.
27. T48B: 11 stops from the folder row to Which nodes (`keyboard/50-60.png`). **(n)** F6.
28. T48B: guillemets read aloud; after Done the name drops the 12 (`keyboard/60.png`, `87.png`).
    **(a) Names and words.**
29. T48B: attribute options read without their counts (`keyboard/73-80.png`). **(a) Names and
    words.**
30. T48B: "Graph" names the rail button and the inspector heading (`detours/28.png`). **(n)** A
    heading and the button that opens its place share the place's name; it is not two controls.
31. T48B: "12 of 24 nodes" spoken twice (`keyboard/81.png`). **(a) Spoken messages.**

## Put it back (T49)

1. T49A: Control+Z right after committing a color is ignored (`path/08.png`, `09.png`,
   `keyboard/65.png`). **(a) Color box.**
2. T49A: removing the Color line looks like the start while the style tree differs
   (`detours/12.png`). **(n)** The answer key grades the drawing for T49; nothing on screen is false.
3. T49A: the color error overlaps the box, label and link and Escape does not clear it
   (`detours/16.png`, `17.png`). **(a) Color box.**
4. T49A: a second click in the focused box appends (`detours/16.png`). **(a) Color box.**
5. T49A: swatches have only a hex tooltip, nothing marks the start color, and the red swatch leaves
   the row after the pick (`detours/07.png`, `09.png`). **(a) Color box.**
6. T49A: no menu offers a way back to the starting look (`detours/03.png`, `05.png`). **(b)** Whether
   "put it back" needs a command of its own.
7. T49A: Enter on a color says nothing, while undo and redo are spoken (`keyboard/64.png`). **(a)
   Spoken messages.**
8. T49A: 20 Tabs to the color box and 27 back to Undo (`keyboard/42-63.png`, `68-95.png`). **(n)**
   F6.
9. T49A: Undo and the swatches show the arrow cursor (`path/07.png`, `detours/08.png`). **(n)**
   Decided arrow cursor.
10. T49B: Control+Z in the box after Enter does nothing (`detours/03-06.png`). **(a) Color box.**
11. T49B: picking the start color from the first swatch draws the same screen with a different tree
    (`detours/11.png`). **(n)** As row 2.
12. T49B: removing the Color line: the screen and the tree disagree (`detours/16.png`). **(n)** As
    row 2.
13. T49B: after Remove node color, focus jumps to Effects "+" (`detours/16.png`). **(a) Focus and
    keys.** To the section's own "+".
14. T49B: the disabled Undo gives no reason on hover (`path/09.png`). **(a) Shared controls.**
15. T49B: Delete is disabled on Everything with no reason, while Pin gives one (`detours/27.png`,
    `29.png`). **(a) Names and words.**
16. T49B: hiding Everything blanks the drawing, and Control+Z steps back through Show and Hide
    (`detours/31.png`, `33.png`). **(n)** Hiding a layer hides what it draws; visibility is an
    undoable act, as in Figma.
17. T49B: 20 Tabs to the color box, 28 back to Undo. **(n)** F6.
18. T49B: swatches are named only by hex (`detours/10.png`). **(a) Color box.**
19. T49B: no focus loss and no duplicate names on the keyboard walk (`keyboard/84.png`). **(n)** No
    defect.

## What a colleague's color picks out (T50)

1. T50A: Enter on a member in Values drops focus on "Resize inspector" and the next Tab wraps to
   Main menu (`s3-keyboard/33.png`, `34.png`). **(a) Focus and keys.**
2. T50A: the layer's color is only "FFA500" to a screen reader (`s3-keyboard/21.png`). **(a) Color
   box.** The box's name carries a color word.
3. T50A: the key "Color: Poster" is a dead end (`s2-detours/04.png`, `05.png`). **(b)** What a click
   on a key entry should do.
4. T50A: "orange" in find answers with a tie column's rule in backticks (`s2-detours/09.png`). **(a)
   Find box.**
5. T50A: opening the rule puts focus in the Mlle text box (`s1-success/15.png`,
   `s3-keyboard/22.png`). **(n)** Focus goes where the next keystroke belongs; Enter, Escape and
   Done leave it as it was.
6. T50A: Values members and find results are ids (`s1-success/05.png`, `s2-detours/12.png`). **(b)**
   What names a node.
7. T50A: neither hover nor the node menu says why a dot is colored (`s2-detours/06.png`, `07.png`).
   **(b)** Where "why this look" is found.
8. T50A: the "Which nodes" chip has the arrow pointer and no tooltip (`s1-success/14.png`). **(a)
   Layer panel.** A tooltip names what it opens.
9. T50A: the picker's box is "name: text", its menu "name"; opening it says neither card nor count
   (`s3-keyboard/22.png`, `25.png`). **(a) Names and words.**
10. T50A: the usage-data notice leaves unanswered when a project opens (`s2-detours/03.png`). **(n)**
    Decided.
11. T50B: the key "Color: Thank-you cards" is inert (`detours/04.png`, `05.png`). **(b)** As row 3.
12. T50B: collapsed chips show each condition's own count beside "6 of 24" (`pointer/04.png`). **(b)**
    Whether a card's count is read as the layer's.
13. T50B: Values > Members lists ids (`pointer/08.png`, `keyboard/70.png`). **(b)** As row 6.
14. T50B: expanding Which nodes to read it puts focus in "hours from" (`pointer/05.png`,
    `keyboard/47.png`). **(n)** As row 5.
15. T50B: hover and the node menu explain nothing (`detours/06.png`, `07.png`). **(b)** As row 7.
16. T50B: find has no color word and the table no color column (`detours/11.png`, `14.png`). **(b)**
    Whether layers or looks are searchable.
17. T50B: Tab from the layer row skips its pin, lock and eye; 11 Tabs to the rule
    (`keyboard/36-46.png`). **(n)** A tree is one Tab stop (decided 2026-10-13); F6.
18. T50B: New from data drops the usage-data card (`detours/02.png`). **(n)** Decided.
19. T50B: the pilot's report file could not be written. **(n)** Study tool; the findings are here.

## Each kind its own color (T51)

1. T51A: the color-by list starts with "id" active and read "selected"; one Enter colors by id
   (`keyboard/85.png`, `pointer/07.png`). **(a) Lists** for an active option before any choice;
   **(b)** for whether a column whose values all differ belongs in the list.
2. T51A: once bound, the link button becomes "Stop varying node color by data" and Enter removes the
   binding (`pointer/12.png`, `07.png`). **(n)** One place binds and unbinds, as Figma's detach; it is
   spoken ("now blue") and undoable.
3. T51A: after Control+O and after Load, focus is on the rail's "Graph". **(a) Focus and keys.**
4. T51A: disabled Undo and Redo are Tab stops on the read-the-file page. **(a) Focus and keys.**
5. T51A: the canvas toolbar is not reached between the canvas and the inspector after Load. **(a)
   Focus and keys.** Every other walk met it there; the order must hold after Load too.
6. T51A: the color squares under Color are not focusable (`keyboard/99.png`). **(n)** They summarize;
   the "Color by role" dialog lists every value and is reached by keyboard.
7. T51A: each "Color by role" row reads every word twice. **(a) Names and words.**
8. T51A: "What is collected" is read as a DisclosureTriangle. **(n)** As T39-23.
9. T51A: the dialog's Reset buttons are a disabled minus (`pointer/11.png`). **(n)** One Clear glyph
   (decided 2026-10-13); disabled at the default (decided 2026-10-17).
10. T51A: the key covers a node; the id key covers much more (`pointer/08.png`, `keyboard/85.png`).
    **(a) Key.**
11. T51A: the link button shows the arrow cursor. **(n)** Decided arrow cursor.
12. T51A: after Escape a click appends ("008000blue") (`detours/09.png`, `10.png`). **(a) Color box.**
13. T51A: the error squeezes the Fill row, the tooltip overlaps it, and it stays after focus leaves
    (`detours/10.png`, `11.png`). **(a) Color box.**
14. T51A: "board" and Enter selects only v01 (`detours/12.png`). **(b)** What Enter in find takes.
15. T51A: find rows are ids (`detours/11.png`). **(b)** What names a node.
16. T51A: the key names hand-made layers and says nothing of nodes left at the start color
    (`detours/27.png`). **(b)** A new layer's default name, and whether the base color is a key line.
17. T51A: a selection's Fill Color makes a "3 nodes" layer of ids, and nothing says it will not
    follow the data (`detours/17-18.png`). **(b)** As the first dry run's T51-3.
18. T51A: the Data place's role offers no color-by (`detours/31-32.png`). **(b)** As T43-24.
19. T51A: a node's menu offers no coloring; the right-click replaced the 3-node selection
    (`detours/28.png`). **(b)** for coloring there; **(n)** for the selection, a right-click outside
    it selects what it hits (decided 2026-10-13).
20. T51A: "trained" has the text icon in Color by; "id" there is "Node id" in the condition list
    (`pointer/07.png`, `detours/22.png`, `30.png`). **(a) Lists.**
21. T51A: the selection's rings stay through making an unrelated layer (`detours/20-27.png`). **(n)**
    A selection lasts until it is cleared.
22. T51B: a hand-made "Agencies" layer draws every agency red while the key still offers kind's green
    for them, unmarked (`detours/32.png`, `34.png`). **(a) Key.** An entry wholly covered by a layer
    above is marked so.
23. T51B: in browse mode the key names no color; the Fill line says "teal" for a green
    (`keyboard/83.png`). **(a) Key** for the missing color words; **(n)** for "teal", the color
    namer's word for 009E73.
24. T51B: a plain color on Everything has no key line (`detours/07.png`, `20.png`). **(b)** Whether
    the base color is a key line.
25. T51B: find rows are ids (`detours/21.png`). **(b)** As row 15.
26. T51B: a second click put the caret mid-text: "0080blue00" (`detours/09.png`). **(a) Color box.**
27. T51B: with the error shown, the label and link drop 40 px and the tooltip covers the error
    (`detours/09.png`). **(a) Color box.**
28. T51B: the error stays on screen after focus leaves (`detours/11.png`, `12.png`). **(a) Color box.**
29. T51B: after Done the focus ring is on Effects "+" (`detours/17.png`). **(a) Focus and keys.**
    After Done, focus returns to the Which nodes chip.
30. T51B: the condition list says "Node id" under Structure, the color list "id" under Data
    (`detours/14.png`, `pointer/07.png`). **(a) Lists.**
31. T51B: the context menu opens over the clicked node (`detours/23.png`). **(n)** Menus open at the
    pointer.
32. T51B: a two-group key grows over a node (`detours/32.png`). **(a) Key.**
33. T51B: "Everything" names both the layer row and a button in "Why this look" (`detours/26.png`).
    **(a) Names and words.** The link says it opens the layer.
34. T51B: the "Color by kind" rows read redundantly (`keyboard/61.png`). **(a) Names and words.**
35. T51B: applying the binding says nothing (`keyboard/58.png`). **(a) Spoken messages.**
36. T51B: "Open project or file... Ctrl+O" carries its shortcut in its name (`keyboard/05.png`).
    **(a) Names and words.** Shortcuts stay out of names (decided 2026-10-13).
37. T51B: Tab in "Find an attribute" closes the popover (`keyboard/54.png`). **(n)** As T44-20.

## Open questions this dry run hands to round 1

The (b) items gather on the same questions as the first dry run, and add two:

1. **What names a node.** Ids again on every task with a name column: find, the inspector, layer
   names, Values members, hand-picked cards.
2. **Where the color of everything lives**, and whether the key's lines and a hover lead anywhere.
3. **What Enter in find takes**, and whether find should reach "everyone like this", the others, or
   the missing.
4. **Whether a card's count is read as the layer's** (T48, T50B), and whether Highest is read as a
   threshold (T42A).
5. **Whether a keyboard participant finds F6** where the pilots walked 8 to 20 Tabs.
6. **The words readers use for a missing value** ("missing", "no value") and whether they find
   presence in a card's match menu.
