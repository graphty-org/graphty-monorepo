# Tier 3: settled behaviors

Every dry-run triage reads this file and cites it. A pilot complaint against a behavior listed
here is classed "no change". Reversing one needs a new dated entry below it, with the reason and
the evidence; the old entry stays.

## Keyboard: what is a Tab stop

- **A disabled "+" is not a Tab stop** and keeps its reason on hover. (2026-10-18.) Five pilots
  tabbed through two dead stops on every styling task. A dimmed Undo stays reachable, because its
  state is worth reading. Earlier passes flipped this both ways.
- **A condition card's remove button is a Tab stop, in the order it is drawn**: in the card's
  header, before the card's values. (2026-10-18.) Pass 3 made it reachable; pass 4 found it after
  the values although it is drawn above them. Earlier passes flipped whether it was reachable.
- **The layer tree, the canvas toolbar and a grid are one Tab stop each**, entered at their first
  item, walked with the arrows. (2026-10-17.) F6 moves between regions for the long walks.
- **The usage-data notice is last in the start screen's Tab order.** (2026-10-17.)

## Escape

- **Escape on a node's inspector clears the selection**, as the canvas menu says. Escape in the
  table grid moves focus to the toolbar's Table button. (2026-10-18.) Earlier passes flipped what
  Escape does in the inspector.
- **Escape in a style field keeps focus in the field** everywhere. (2026-10-17.) Leaving the field
  left focus on the page.
- **A second Escape in an empty find box leaves the box and keeps the selection.** (2026-10-18.)
  Four pilots lost a selection they had just made when it cleared it.
- **Escape keeps edits in the picker and in a card; "Done" closes it.** (2026-10-16.) No cancel.

## Lists and cards

- **Tab in a list with letters typed and an option highlighted takes that option**; with nothing
  typed, Tab closes the list and takes nothing. (2026-10-18.) Two pilots lost a nearly made
  condition.
- **Opening an existing card changes nothing**: it opens with its suggestion list closed; typing or
  ArrowDown opens it. (2026-10-18.) A reader opening a colleague's rule rewrote it with two keys.

## Values and the key

- **An unset line takes the value it shows** when the reader presses Enter on it or types it.
  (2026-10-18.)
- **A "+" never changes the drawing**: its line starts at what the nodes draw now, or waits unset.
  (2026-10-18.)
- **A key lists only the values its layer's nodes hold**; the key and the drawing never disagree.
  (2026-10-18.)
- **The base layer Everything takes no condition.** (2026-10-17.) A condition on it removed every
  other node from the drawing in four pilots.

## Undo

- **Control+Y redoes**, beside Control+Shift+Z. (2026-10-18.)
- **No confirmation for an act that can be undone.** (2026-10-17.)

## Added 2026-10-19 (dry run before round 1, pass on build e3c5bca8e6)

Each entry below is new unless it says what it narrows, corrects or reverses.

### The drawing

- **The drawing moves only when the reader asks**: opening a graph, Frame (f), Reset view. A key
  that arrives or grows, a panel or the table opening, a filter step turned on or off, a layer
  added or removed, and Undo never re-frame it. The key floats over the canvas; Frame keeps clear
  of it. (2026-10-19.) REVERSES the team entry of 2026-10-18 in `owner-decisions.md` ("the key's
  room only while there is a key"), which framed the graph once when a key arrived over a drawn
  node: on this build the drawing jumped right and shrank on 16 walks across 15 tasks the moment
  the first color was set, and stayed off center after Undo. It restores the 2026-10-18 rule the
  pass 4 rows cited ("the drawing stays put; Frame is one key"). The earlier attempt, reserving
  the key's room whenever the key was on, opened every sample off center; both moved the view
  without the reader asking.

### Keyboard: what is a Tab stop

- **CORRECTION of "entered at their first item" (2026-10-17) for the layer tree**: the tree is
  entered at its focused row, else its selected row, else its resting row Everything, as the team
  entry "a tree's resting Tab stop" in `owner-decisions.md` (2026-10-18) set, following the
  WAI-ARIA tree pattern. The toolbar and a grid are still entered at their first item. Nothing
  changes in the build; the 2026-10-17 line carried the toolbar's rule over to the tree. Ten
  pilots on this pass reported the tree against the old wording.
- **A dimmed Undo and Redo are Tab stops** (restates 2026-10-18; the header still passes
  `skipWhileDisabled`, so it was never built).
- **Arrow keys in a list stop on a disabled option**, which reads as dimmed with its reason
  (WAI-ARIA listbox). Tab still skips a disabled "+".
- **Arrow keys stop at the edges of a tree or a grid**; nothing wraps to the next row or the top
  (WAI-ARIA tree and grid patterns).

### Focus

- **After a graph opens, focus goes to the inspector's heading**, which names the graph and its
  counts, and the heading draws a visible focus ring (WCAG 2.4.7). (r1-3 moved focus off the
  Hovered row; written here 2026-10-19.)
- **F6 answers the long Tab walks** (r1-2, 2026-10-17): Tab follows the screen's order and its
  8 to 20 stop walks are not defects. **F6 cycles five regions**: the top bar, the left panel (at
  its first control), the canvas, the canvas toolbar, the inspector. A resize handle is never a
  region. (2026-10-19.) Whether a keyboard participant finds F6 is for the sessions.
- **Enter on a layer row opens its inspector and keeps focus in the tree**; F6 goes to the
  inspector. (2026-10-19.) A tree's Enter does not move focus out of the tree.
- **Tab out of a box that writes moves to the next control**, in the panel as the write leaves
  it; the redraw after a write never pulls focus back into the box or up to the tabs.
  (2026-10-19.)
- **After a line is removed, focus goes to its own section's "+"**, never onto another line's
  remove button. (2026-10-19.)

### Escape

- **Escape on a just-added line or card that holds nothing takes it back**, says so, and puts
  focus on the "+" or "Add a condition" that added it. This narrows "Escape in a style field keeps
  focus in the field" (2026-10-17), which is about a field holding a value. (The pass 4 rows
  T45A-6 and T49B-14 decided it; written here 2026-10-19.)
- **Escape in a style field reverts what was typed and not committed, keeps focus, and says
  "Edit discarded; this stays X" on screen and to a screen reader**, the same way in every style
  box, inline or inside a popover, the color picker's hex box included. (2026-10-19.)
- **"Escape keeps edits in the picker and in a card" (2026-10-16) means the Which-nodes picker
  and its condition cards**: Escape in a card's text or number box keeps what was typed and keeps
  the picker open; only Done, a click on the canvas, or focus leaving closes it. (2026-10-19.)
- **Escape in the inspector** (settles the flip-flop of passes 3 and 4): on a node's or a
  selection's inspector it clears the selection from any control that is not a field; on a
  layer's inspector it leaves the selection alone. When the node was opened from a layer's member
  list, clearing it returns the inspector to that layer, with focus on that member's row.
  (2026-10-19.) Narrows 2026-10-18; does not reverse it.
- **Escape in a dialog closes it from any control in it** (WAI-ARIA dialog). (2026-10-19.)
- **Right-click selects what is under the pointer; Escape closes the menu only.** (r1-4 row
  T45B-16; written here 2026-10-19.)
- **Control+Z in a text box undoes its typing first** (the platform's behavior). (2026-10-19.)

### Lists and cards

- **With no condition yet, opening "Which nodes" opens the attribute list with focus in its
  search; "Add a condition" opens the list and never closes it.** (2026-10-19.) Settles a
  flip-flop: pass 4 opened the list and the first click on "Add a condition" closed it; the fix
  opened the picker with the list closed, so every pointer walk needed two clicks.
- **Picking any match ("Starts with", "Contains", "Between", "Highest", ...) puts focus in the
  card's value box.** (2026-10-19.) Typing after a match pick lost the letters.
- **A condition card's count** (settles the pass 1 / pass 2 flip-flop): a card with no value yet
  shows no count of its own; the layer's count beside "Which nodes" says what the layer paints.
  While the reader types, the count on screen follows each keystroke and is spoken once, when
  typing pauses. (2026-10-19.)
- **An unfinished card is dropped when its picker closes**, with a notice and no Undo (nothing
  was written). A click inside either side panel keeps the picker open; a click on the canvas
  closes it. Focus leaving the picker by Tab or Shift+Tab closes it and keeps its edits ("Tab
  closes a pop-out", 2026-10-17). (2026-10-19.)
- **A list that opens with nothing active takes nothing on Enter** until the reader types or
  arrows (team entry 2026-10-18, `owner-decisions.md`).
- **An open list, menu or popover covers what is under it while open.** (r1-3 and r1-4, kept;
  written here 2026-10-19.)
- **Enter in an analysis card's option box runs the analysis**, as a form's Enter does; a run is
  undoable. **Enter in a filter step's box commits the step** (r1-3). (2026-10-19.)

### Names and looks

- **A node is called by one name everywhere the app names it** -- the inspector's title, find
  rows, a layer made for one node, notices, the key, an edge's two ends -- and that name is the
  node label the element gives. (2026-10-19.) Which column becomes the label when a file has a
  name column and no label column stays a question for the sessions.
- **A control's tooltip and its accessible name say the same words** (state may be added to the
  name). (2026-10-19.)
- **The cursor stays an arrow over buttons** (compact-mantine `cursorType: "default"`, desktop and
  Figma convention; r1-1, 2026-10-17).
- **Icon buttons carry no visible text**; the tooltip and the name say what they do (Figma).
  (2026-10-17, kept.)
- **The start screen's "What is collected" stays a native disclosure.** The study tool prints
  Chromium's internal role (DisclosureTriangle); screen readers announce it as an expandable
  button. (2026-10-19.)
- **A table cell's own name is its value**; the screen reader speaks the row and column headers
  on a move, the study tool does not (r1-3, r1-4). (2026-10-19.)

### Commands

- **Control+A on the canvas selects every node**, and the canvas menu lists Select all.
  (2026-10-19.)
- **"New layer from selection" makes the layer at once**, selects it in the tree and opens its
  Style tab. (2026-10-19.) A command that changed nothing on screen read as broken on three
  walks.
- **Opening a file that is already open offers Replace first and Load beside it with its
  warning**, with no confirmation, because a load can be undone. (2026-10-19.)
- **Turning label decluttering on or off stays outside undo** until the owner answers (open item
  in `owner-decisions.md`, 2026-10-18).

## Added 2026-10-20 (owner decisions, on the build that includes golden, merge f9d8b44b9)

- **The camera glides to center a picked node, even one already on screen**, as golden does
  (graphty-element's `camera.pivotOnSelection`, from the owner's issue #2293): a pick from Find, a
  click or a shift-click makes the selection the point the camera turns about. (2026-10-20, the
  owner.) REVERSES the tier 3 rule that a pick already on screen leaves the camera alone. A pick is
  the reader asking, so this narrows "the drawing moves only when the reader asks" (2026-10-19)
  rather than breaking it. Reason: golden made this the app's behavior for every pick, and keeping
  the studio's exception would put a second camera rule in front of participants.
- **An algorithm's result is painted as ordinary style layers in its fixed result color**
  (vermilion `#D55E00`, chosen edges three times the default width), as golden does (commit
  c2757912e), not in the app's highlight color. (2026-10-20, the owner.) REVERSES the studio's own
  route color (`APP_HIGHLIGHT_COLOR`, which now colors only explicit highlights). Reason: as layers,
  algorithm pictures stack -- a route over a spanning tree keeps both -- where a highlight swept
  every other highlight away.

## Added 2026-10-20 (dry run on build 7d87760756)

Each entry is new; none reverses an earlier one.

- **A project opens with its look, whatever build saved it.** A style channel the element has
  renamed is read under its new name when a saved project names the old one (`node.haloSize`
  reads as `node.haloScale`), and the project's layers open with it. (2026-10-20.) Both T50
  projects, written by build e3c5bca8e6, opened on 7d87760756 with no layer at all: the golden
  merge renamed the channel, and one unknown channel made the element refuse the whole style
  part. Every project saved before the merge would lose its look the same way.
- **Opening a file over itself keeps the hand-picked layers.** Replace with the same file leaves
  a layer of picked nodes or ties painting the same ones. (2026-10-20.) On T45A, Control+O >
  Replace on neighbors.csv left the "8 edges" layer matching none: CSV ties have no file ids, and
  the reload issued new session ids.
- **A community run's groups have one name everywhere**: the table's cells say "Group 3" where the
  key, the layer tree and the table's own run tab say "Group 3", ranked by size. (2026-10-20.) The
  Nodes tab showed the run's raw values (Javert's row read 2 for Group 3), so a reader who painted
  the group the table named painted the wrong one.
- **A project file opens in place of the open work**; "Replace first and Load beside it"
  (2026-10-19) is for a data file, which can be added to the open graph. Opening a project asks
  only to discard unsaved changes. (2026-10-20.) A project cannot be added to a graph, so a
  Replace or Load page for it would offer a choice that does not exist (T50A, Control+O).

## Added 2026-10-20 (dry run pass 2 on build 6de5f95d12)

Each entry is new; none reverses an earlier one.

- **A layer made from a selection takes its conditions before it has a look.** "New layer from
  selection" makes a layer that paints nothing yet; editing its Which nodes (switching a match,
  adding a card) is written at once, as on a layer made by "+", and Done keeps every edit. The
  layer paints nothing until a look is set. (2026-10-20.) On T41 B the find-box layer "email: has
  a value" refused "Has no value" ("That rule could not be used for this layer"), Done dropped the
  edits without a word, and Fill red then painted the 15 with an email: the same stack the answer
  key counts on T41 A. Cause: graphty-element admits an empty one-kind row (team entry 2026-10-19,
  "a row of one kind may start empty") and then refuses its first selector write as a layer that
  paints nothing.
- **Undo across a file opened over itself redraws from the layers.** After Control+O > Replace and
  Undo of that open, every later Undo leaves the drawing as the remaining layers say: a look given
  by a layer that is removed or emptied leaves the drawing, and a look set afterwards on any layer
  is drawn on every node it reaches. (2026-10-20.) On T44 B a removed one-node layer's label stayed
  drawn and labeling Everything drew only that name while the tree painted 24; on volunteers.graphml
  an undone green stayed on v01 with no layer setting it.

## Added 2026-10-21 (dry run pass 3 on build 758b8e8081)

New; it narrows one entry and reverses none.

- **A held selection asks for nothing after the pick.** The camera glides when the reader picks
  (2026-10-20). A key that appears or grows, a look, a layer, a run or an Undo that lands while that
  selection is still held leaves the drawing where it is, exactly as with nothing selected; the
  camera keeps turning about the selection. (2026-10-21.) Narrows "The camera glides to center a
  picked node" (2026-10-20) where it met "The drawing moves only when the reader asks"
  (2026-10-19). On 758b8e8081 the first color or size of a layer made from a selection moved the
  drawing about 110 to 155 px right on 23 walk rows across 21 task halves, only while the
  selection was held, and left painted nodes off screen on the last screenshot of T38 B and T41 B.
  Cause: the element's follow of the held selection re-centers it in the area the key's new inset
  leaves free (`dry-run-r1-3.md`). A backlog fix, not a dry-run one: nothing drawn is wrong and Fit
  brings every node back.
