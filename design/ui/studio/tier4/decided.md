# Tier 4: settled behaviors

Every dry-run triage reads this file and cites it. A pilot complaint against a behavior listed
here is classed "no change". Reversing one needs a new dated entry below it, with the reason and
the evidence; the old entry stays.

## Owner rules for data UI (binding for every tier 4 decision)

- **Compact Figma controls; no sentence on screen where a control will do.** (Owner, 2026-10-20.)
- **The data table is view-only; configuration lives in the Data place.** (Owner, 2026-10-20.)
  Column kinds, roles and fixes are set in the Data place; the table may show them and point there.
- **Say "edges"** on screen, never "links" or "ties". (Owner, 2026-10-20.)
- **Export is a common act**, reached as easily as Save. (Owner, 2026-10-20.)
- **Every hotkey has a visible button that shows its key.** (Owner, 2026-10-25.)
- **Never remove or restyle an owner-approved surface** in a fix. (Owner, 2026-10-20.)
- **Follow Figma where Figma solved the problem; graphty's own model where graphty differs.**
- **Filters are flat condition cards, the Style panel's Which nodes / Which edges cards**: each with
  Select / Hide, an on box and its own "X of Y" count; order never matters; a Data source card is
  offered only when two or more sources are loaded. (Owner, 2026-10-29, option B;
  `design/data/filter-cards.md`, PR #4454.)
- **compact-mantine is locked to Figma.** A data fix that needs a compact-mantine change in look,
  tokens or Figma tests goes to `owner-decisions.md` under "for the owner", never into the code
  without the owner's `Figma-Approved` trailer. (Owner, 2026-10-23.)

## Carried over from tier 3 (`../tier3/decided.md`), still binding on these flows

The layer tree entry below was corrected on 2026-10-19 (tier 3): a tree is entered at its focused
row, else its selected row, else its resting row; the toolbar and a grid at their first item.

- **A disabled "+" is not a Tab stop** and keeps its reason on hover. (2026-10-18.) Five pilots
  tabbed through two dead stops on every styling task. A dimmed Undo stays reachable, because its
  state is worth reading. Earlier passes flipped this both ways.

- **A condition card's remove button is a Tab stop, in the order it is drawn**: in the card's
  header, before the card's values. (2026-10-18.) Pass 3 made it reachable; pass 4 found it after
  the values although it is drawn above them. Earlier passes flipped whether it was reachable.

- **The layer tree, the canvas toolbar and a grid are one Tab stop each**, entered at their first
  item, walked with the arrows. (2026-10-17.) F6 moves between regions for the long walks.

- **Escape keeps edits in the picker and in a card; "Done" closes it.** (2026-10-16.) No cancel.

- **Tab in a list with letters typed and an option highlighted takes that option**; with nothing
  typed, Tab closes the list and takes nothing. (2026-10-18.) Two pilots lost a nearly made
  condition.

- **Opening an existing card changes nothing**: it opens with its suggestion list closed; typing or
  ArrowDown opens it. (2026-10-18.) A reader opening a colleague's rule rewrote it with two keys.

- **No confirmation for an act that can be undone.** (2026-10-17.)

- **Control+Y redoes**, beside Control+Shift+Z. (2026-10-18.)

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

- **A dimmed Undo and Redo are Tab stops** (restates 2026-10-18; the header still passes
  `skipWhileDisabled`, so it was never built).

- **Arrow keys in a list stop on a disabled option**, which reads as dimmed with its reason
  (WAI-ARIA listbox). Tab still skips a disabled "+".

- **Arrow keys stop at the edges of a tree or a grid**; nothing wraps to the next row or the top
  (WAI-ARIA tree and grid patterns).

- **Tab out of a box that writes moves to the next control**, in the panel as the write leaves
  it; the redraw after a write never pulls focus back into the box or up to the tabs.
  (2026-10-19.)

- **Escape on a just-added line or card that holds nothing takes it back**, says so, and puts
  focus on the "+" or "Add a condition" that added it. This narrows "Escape in a style field keeps
  focus in the field" (2026-10-17), which is about a field holding a value. (The pass 4 rows
  T45A-6 and T49B-14 decided it; written here 2026-10-19.)

- **Escape in a dialog closes it from any control in it** (WAI-ARIA dialog). (2026-10-19.)

- **Control+Z in a text box undoes its typing first** (the platform's behavior). (2026-10-19.)

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

- **A control's tooltip and its accessible name say the same words** (state may be added to the
  name). (2026-10-19.)

- **The cursor stays an arrow over buttons** (compact-mantine `cursorType: "default"`, desktop and
  Figma convention; r1-1, 2026-10-17).

- **Icon buttons carry no visible text**; the tooltip and the name say what they do (Figma).
  (2026-10-17, kept.)

- **A table cell's own name is its value**; the screen reader speaks the row and column headers
  on a move, the study tool does not (r1-3, r1-4). (2026-10-19.)

- **Opening a file that is already open offers Replace first and Load beside it with its
  warning**, with no confirmation, because a load can be undone. (2026-10-19.)

- **A project file opens in place of the open work**; "Replace first and Load beside it"
  (2026-10-19) is for a data file, which can be added to the open graph. Opening a project asks
  only to discard unsaved changes. (2026-10-20.) A project cannot be added to a graph, so a
  Replace or Load page for it would offer a choice that does not exist (T50A, Control+O).

- **F6 answers the long Tab walks** (r1-2, 2026-10-17): Tab follows the screen's order and its
  8 to 20 stop walks are not defects. **F6 cycles five regions**: the top bar, the left panel (at
  its first control), the canvas, the canvas toolbar, the inspector. A resize handle is never a
  region. (2026-10-19.) Whether a keyboard participant finds F6 is for the sessions.
