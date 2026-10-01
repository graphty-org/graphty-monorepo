# Round 4: the rail returns, the toolbar shrinks

This round changes the object-first design of the graphty app in answer to the owner's
round-4 feedback. The design it changes is:

- `../round-2/revision.md` (the frame, the inspector, the toolbar, the timeline),
- `../round-3/revision-round-3.md` (every key function drawn),
- `../round-2/decisions.md` (the choices those rest on),
- the 102 mocks in `../mocks/v2/`, drawn by the generator in
  `design/ui/object-first-ux/gen/`.

Where this file disagrees with those, this file wins. Nothing here changes code. Paths are under
`/home/apowers/Projects/graphty-monorepo/` unless they start with `../`, which means this
folder's parent (`design/ui/object-first-ux/`).

The app will be built with compact-mantine, which was rebuilt to match Figma's editor. Its
specification is `.worktrees/compact-mantine-figma/compact-mantine/design/figma-spec.md`. This
file names a compact-mantine component wherever one draws the part, so that the mocks and the
app use the same pieces. The Figma measurements behind every size here are in
`design/ui/figma/` (mainly `left-sidebar/README.md` for the rail and `bottom-toolbar/README.md`
for the toolbar and the Actions panel).

## 0. Words used here

- **Rail**: the 56 px column of icon buttons at the window's far left. Each button opens a
  different panel in the 240 px space beside it. This is Figma's "navigation rail" and
  compact-mantine's `NavRail` / `RailButton`.
- **Left panel**: the 240 px panel the rail's active button shows.
- **Object**: a row of the object tree: a Set, a Measure, a Grouping and its Groups, or the
  Dataset at the root (defined in `../round-2/revision.md` section 0).
- **Inspector**: the right panel. It always shows whatever is selected, or the Dataset when
  nothing is.
- **Dock**: the drawer under the canvas. Its strip of tabs stays visible as a 32 px handle when
  the drawer is closed.
- **Toolbar**: the floating bar at the bottom centre of the canvas.
- **Tool**: a toolbar button that creates an object. Pressing it **arms** it: it turns blue and
  the **secondary bar** (a second, smaller bar just above the toolbar) says what will run and
  holds the button that runs it.
- **Flyout**: the dark menu that opens from the small arrow (the **chevron**) beside a tool,
  listing the tool's variants. The variant a plain click uses is the tool's **face**.
- **Command palette**: the search-and-run panel opened by Ctrl+K. Figma calls it Actions;
  compact-mantine calls it `QuickActions`.
- **Time mode**: the state in which a time window hides whatever falls outside it and the
  **transport bar** (play, step, a slider with the window drawn as a band) sits under the canvas.
- **Style file**: a JSON file holding style layers, looks and palettes, with no data.
  **Look**: a named set of the whole-graph style settings (background, default node and edge
  appearance, labels). **Recipe**: a JSON file of the steps that built a session (loads, runs,
  filters, styles) without the data, which can be replayed on new data.
- **One-way door**: a choice that is expensive to undo once built, such as a published file
  format or API. Everything else here is a **two-way door**: an edit to these documents, or a
  change inside the app that no one outside it would notice.

## 1. The owner's points and the answers

| The owner asked | The answer, in one line | Section |
|---|---|---|
| Bring back the nav rail for managing data, styles, views and AI | A 56 px rail with Objects, Data, Styles, Views and AI, Settings and Help at its foot. Objects (the tree) is a peer item and the default. Data moves out of the Dataset's inspector, styles out of the Canvas tab, Views out of the top of the tree, and the assistant out of the dock | 2 |
| "Data should ..." (cut off) | Read, until the owner finishes the sentence, as: the Data panel manages the datasets and their sources, the columns and their roles, the import report and joins, with a door to the table. Recorded as an assumption | 2.4 |
| The bottom-centre toolbar is too complex: too many buttons, too many words | Eight controls, icons only, no labels under them: Select, Filter, Path, Groups, Rank, Structure, Actions and the view mode. Each has one dropdown at most. A ninth, Time, appears only when the data has a time column. Hand, Neighbours, Note and Ask leave the bar, and the secondary bar loses its lead-in phrases | 3 |
| 2D, 3D, AR, VR as one button that shows the current mode and expands to the others | Done. One 40 px button whose face reads "2D", "3D", "VR" or "AR". A click opens a menu of the others. The 5 key still flips between 2D and 3D without opening the menu | 3.4 |
| Do we still have the command palette? | Yes. It now has a visible door: an Actions button on the toolbar, as in Figma. It lists commands, objects, nodes and recent actions, and a sentence it cannot match becomes "Ask: ..." | 4 |
| How do we get to the timeline mode? | A Time button (a clock) appears on the toolbar whenever the data has a time column. Pressing it turns time mode on or off. The two old ways in stay, and the Data panel's Time role is a third | 5 |
| Where are Export styles, Export recipe and Load styles? | Style files live in the Styles panel's Files section: Import styles..., Export styles..., Save look.... Recipes sit in the file menu as a pair beside Save project: Run a recipe..., Export recipe.... The Export menu keeps a row for every file the app writes, and Ctrl+K finds all of them | 6 |

The owner's request for a document on the visual language (how the design looks, not only how
it behaves) is not answered here. This file is the behaviour and layout change only.

## 2. The rail

### 2.1 What changed since round 2 removed it

Round 2 decided "no rail" (`../round-2/decisions.md`, the frame decisions, first row;
`../round-2/revision.md` section 1.5) for four reasons. Each is weighed again here.

1. **"Only the tree is a panel; the other candidates are rows of the Dataset's inspector."**
   That was true while the Dataset's inspector could hold them. Rounds 2 and 3 then capped the
   inspector at 14 rows per tab and four tabs within 216 px. As a result, the Data tab (every
   column, the roles, the import report, joins) and the Canvas tab (look, labels, legend,
   background) became tight lists of rows with their verbs pushed into "..." menus. The owner
   could not find Export styles or Load styles at all. A rail panel is the full window height:
   about 25 rows at 1440 x 900, against 14 in a tab. The content outgrew the tab, so it moves.
2. **"Every rail item would be a second home."** This is handled by moving things, not copying
   them. The Data and Canvas tabs leave the Dataset's inspector. The Views list leaves the top
   of the Objects panel. The Assistant leaves the dock. Each capability still has one home.
3. **"A rail is the control that changes what the left panel means."** This is still true, and
   it is the cost of the change. It is paid for in two ways. The active rail button is tinted,
   so the reader always sees which panel is open. And the right panel's meaning never changes:
   it always shows the selection, whatever the rail shows.
4. **"56 px breaks the fit at a 1280 px window, because the toolbar was 725 px wide."** The
   toolbar is now 465 px (505 px with Time). At 1280 the canvas between rail, left panel and
   inspector is 1280 - 57 - 240 - 241 = 742 px, so the bar clears it by 138 px each side. At
   1440 the canvas is 902 px. The reason is gone.

What remains true from round 2: the data table and History still need the canvas's width, so
they stay in the dock. The one real loss is that the tree is hidden while another rail panel is
open. The two places that matters, and what fixes each, are in 2.7.

### 2.2 The frame, drawn

```
+----+------------------+------------------------------------------+------------------+
|    | Karate Club    v |                                          | Fit v   [Export] |
| Ob |------------------|                                          |------------------|
| je | OBJECTS [find].. |                                          | Group            |
| s  | v Karate Club    |                                          | Group 2   (o)(L) |
|----|   Degree > 8     |               CANVAS                     | 11 nodes ...     |
| Da |   Connections    |                                  [legend]| Members | Style  |
| ta |   v Communities  |                                          | Define | Record  |
|----|      Group 1     |                                          |------------------|
| St |      Group 2     |   [Bridges v][What is showing v] 34 nodes, 80 ms [gear][Run][x]
| yle|      ...         |  [>v] | [F v][P v][G v][R v][S v] | [T][#] | [3D v]      |
|----|                  |------------------------------------------|  rows of the tab |
| Vi |                  | Table | History   (the dock's handle)    |                  |
| ews|                  |                                          |                  |
|----|                  |                                          |                  |
| AI |                  |                                          |                  |
|    |                  |                                          |                  |
|gear|                  |                                          |                  |
| ?  |                  |                                          |                  |
+----+------------------+------------------------------------------+------------------+
| 34 nodes 78 edges   Spread out: settled [||]   11 selected                      100% |
+-----------------------------------------------------------------------------------------+
```

In the toolbar line, `[>v]` is Select and its chevron, the letters are the tool icons, `[T]` is
Time (present only with time data), `[#]` is Actions, and `[3D v]` is the view-mode button.

Measurements (Figma's, `design/ui/figma/left-sidebar/README.md` section 1; compact-mantine
`NavRail`, spec section 11.4):

- The rail is 56 px plus a 1 px right border, white, with 8 px padding at the top and 16 px at
  the bottom. It runs the full height between the top of the window and the status bar.
- A rail button is 56 x 56. Inside it a 32 x 32 icon pill (radius 5, 24 px icon) sits above a
  9 px label. The rail keeps its labels, because Figma does and because five text-free icons for
  abstract things ("Styles", "Views") are guesswork. The toolbar's no-words rule (section 3) is
  about the toolbar.
- The active button's pill is tinted blue (`--cm-bg-selected`, #e5f4ff) and its icon turns
  brand blue. There is no side bar or underline. Hovering a button shows a grey pill.
- Tooltips open to the right after 500 ms and show the name and the key ("Data  Alt+2").
- The foot holds two 32 x 32 icon buttons, Settings (gear) and Help ("?").
- The window is 57 (rail) + 240 (left panel) + canvas + 241 (inspector with its border). The
  mocks stay 1440 x 900.

The rail has no logo or main-menu button at its top. Figma has one there, but graphty's file
menu is already the dataset name and its chevron at the top of the left panel (round 2), and a
second menu button would be a second home for it.

### 2.3 The items, their keys, and why Objects is a rail item

| Rail item | Icon | Key | The panel |
|---|---|---|---|
| Objects | stacked layers | Alt+1 | the object tree with Find (2.3.1) |
| Data | database cylinder | Alt+2 | datasets, sources, columns and roles, import report, joins (2.4) |
| Styles | paint swatch | Alt+3 | look, paint order, labels, legend, the library, style files (2.5) |
| Views | camera | Alt+4 | saved views, camera, compare, present, minimap (2.6) |
| (separator) | | | |
| AI | sparkle | Alt+5, and backtick (focuses the composer) | the assistant's conversation (2.7) |
| foot: Settings | gear | Ctrl+, | opens the Settings dialog (screen 13); not a panel |
| foot: Help | "?" | Ctrl+/ opens Keyboard shortcuts | a dark menu: Help, Keyboard shortcuts, Open sample, What's new |

Keys follow Figma (Alt+1 for its File panel, Alt+2 for Assets). One known conflict: Firefox on
Linux uses Alt+1 to Alt+9 to switch browser tabs. Figma accepts that conflict, and so does this
design. The rail buttons are the visible alternative.

**Objects is a peer rail item, and the default.** The alternative was to keep the tree always
visible and have the rail open a second panel beside it. That rejected option is 480 px of
panels, leaving a 662 px canvas at 1440 and 502 px at 1280, which the toolbar barely fits. With
Objects as a rail item there is always exactly one left panel, the active pill always says which
one, and there is a one-key way back to the tree (Alt+1). Figma does the same: its layer tree is
the File rail item's panel, and the other rail items replace it.

**Clicking the active rail button closes the left panel** and gives its 240 px to the canvas.
Clicking any rail button reopens it. Present mode (Shift+\) hides the panels and the rail
together; outside Present the rail is always visible, so the way back is too. The left panel's width can be dragged
between 240 and 480 px (compact-mantine `ResizeHandle`). All rail panels share that one width,
so the AI panel's conversation can be widened and the change holds for the other panels.

**What the left header shows.** Every rail panel keeps the file header on top: the dataset
name, the unsaved dot and the file-menu chevron (round 2 section 1.3). Below it, each panel has
a 40 px title row holding the panel's name and at most two icon buttons ("+" and "..."), as the
Objects header does today.

#### 2.3.1 Objects (Alt+1)

The same as round 2's left panel, minus the Views list, which moves to the Views panel. The tree
gains the rows the Views list took up. The header keeps Find (Ctrl+F) and the "..." menu
(Suggestions). The name of the current View is still visible in the Views rail tooltip ("Views:
Hub close-up") and in the status bar's framing readout.

### 2.4 Data (Alt+2)

**ASSUMPTION the owner may correct.** The feedback reads "data should" and stops. This design
reads it as: the Data panel is where the reader manages what data is loaded and what each
column means. Concretely: the session's datasets and their sources, the columns with their
roles and completeness, the import report, joins, and a door to the table. If the sentence
meant something else, only this section and screens 104 and 105 change.

Everything in the Dataset inspector's Data tab moves here, along with the data verbs that were
in the file menu (Add data..., Open as a second graph...). The Dataset's inspector keeps two
tabs, Overview and Layout (2.8).

Rows, top to bottom (Email network, a CSV of emails with a `sent` date):

| Section | Row | What it does |
|---|---|---|
| title row | Data [+] [...] | "+" is Add data... (the Import dialog with Into = Add to current graph, screen 26). "..." holds Open beside to compare..., Import options..., Reload all |
| DATASETS | [csv glyph] Email network | the dataset's name (it renames in place, as in the tree) |
| | email.csv, CSV, loaded 10:42 | the source in secondary text. A URL shows its host and when it was last fetched; a database shows the server and "query" with an Edit query... link (screen 31) |
| | 1,204 nodes  5,830 edges | the counts, in the one count grammar (round 2, pass 3) |
| | hover buttons: Reload, "..." | Reload re-reads the source and keeps the objects (screen 15). "..." holds Replace... (the Import dialog with Into = Replace), Import options... (screen 34), Show source, Close dataset (asks first when there is unsaved work, screen 17) |
| | a second dataset row | when two graphs share the session (screen 21), each is its own row with the same buttons |
| ROLES | Id [from v] | the column whose values identify nodes. For an edge list, Source [from v] and Target [to v] |
| | Label [name v] | the column drawn as the node's label |
| | Weight [none v] | the edge column that algorithms use as a weight |
| | Time [sent v] | the time role. Setting it shows the Time button (section 5); "none" hides it |
| | Type [none v] | the column that says what kind of node or edge each is |
| | "Changing a role reloads and keeps your objects" | secondary text; the reload is screen 15's |
| ATTRIBUTES | two disclosures, ON NODES (3) and ON EDGES (5) | each column is one row: type glyph (text, number, date, category), name, role chip if it has one, completeness as a short bar and a percentage ("94%"), "..." |
| | a column row's "..." | the column menu of screen 35: colour by, size by, filter by, set as a role, change type (screen 36), fill missing, rename, remove |
| | a click on a column row | expands it in place: type, distinct values, missing count, and a small histogram or top-5 values |
| | ATTRIBUTES "+" | New column from a formula... (screen 38), Add attributes from a file... (the Import dialog with Into = Add attributes) |
| IMPORT REPORT | Read 5,842 rows, kept 5,830, 12 rejected | a single line; "See rejected rows" opens the table on its Rejected tab (screen 33) |
| | Rules: duplicates merged, self-loops kept | a click opens Import options (screen 34) |
| JOINS | contacts.csv on email: 1,180 of 1,204 matched | one row per join, with "..." (Edit join..., Remove join). A join with identifier mapping (screen 37) says which mapper it used |
| | + Join a table... | the join dialog of screen 37 |
| foot | [Open table  Shift+T] | opens the dock on its Table tab |

Before any data is loaded, the Data panel shows the four ways in from the Welcome sheet (Open a
file..., From a URL..., Paste..., From a source...) and Open sample. On a fresh session it is
the rail's default panel instead of Objects, because there are no objects yet (screen 1
changes).

### 2.5 Styles (Alt+3)

Everything in the Dataset's Canvas tab moves here, plus the style library and the style files,
which had no visible home.

| Section | Row | What it does |
|---|---|---|
| title row | Styles [+] [...] | "+" is Save current look...; "..." holds Reset every style (one undo step) |
| LOOK | Look [Default v] | Default, Presentation, Print, Colour-blind safe, High contrast, Dark, then the reader's saved looks. A look writes only whole-graph layers, so it never overwrites an object's Style (round 2 decision Y6) |
| | Background [swatch] | colour, gradient, or Image... (the skybox) |
| | Default node [chip], Default edge [chip] | each opens the default-look popover of screen 88 |
| PAINT ORDER | one row per object that paints, top wins | kind icon, name, the channels it holds as small words ("Colour, Size"), with a channel it has lost to a higher row struck through; eye. The last row is "Dataset defaults" (locked) |
| | a click on a row | selects that object; the inspector opens its Style tab |
| | drag a row | reorders. This is the tree's order, the same list viewed by paint, not a second order: moving a row here moves it in the tree |
| LABELS | Labels [Top 6 by Connections v] [gear] | the label budget; the gear opens the label-style popover (screen 88) |
| | Edge labels [none v]; Tooltip [Label and 3 attributes v] | as the Canvas tab had them (screen 89) |
| LEGEND | Legend [switch] (L) | shows or hides the legend card |
| | Position [Bottom right v]; Show Sets [switch] | where the card sits; whether Sets get blocks |
| CANVAS | Show hidden faintly [switch]; Note markers [switch] | as screen 87 |
| LIBRARY | Saved styles (3) >; Looks (2) >; Palettes (20) > | each opens a list popover: apply, rename, delete. A saved style is applied from the object's own Style tab (its foot, screen 94). The library is where it is managed |
| FILES | Import styles... | opens the file picker, then the import dialog of screen 94 |
| | Export styles... | the export dialog (section 6, screen 110) |
| | Save current look... | names the whole-graph layers as a look (section 6, screen 111) |

A dropped style file (on the canvas or the Styles panel) opens the same import dialog; the drop
outline says "Import styles" instead of "Import data" (screen 101's outline).

### 2.6 Views (Alt+4)

The Views list leaves the top of the Objects panel. The camera and presenting verbs join it.

| Section | Row | What it does |
|---|---|---|
| title row | Views [+] [...] | "+" is Save view (Ctrl+Alt+V). "..." holds Export views..., Import views... |
| VIEWS | Overview (written by graphty-element after the first fit), then the reader's views | as screen 53: click applies, double-click renames, drag reorders, a drift dot when the camera has moved. Selecting one opens the View inspector on the right (Camera, Mode, Showing, Export image from this view) |
| | Previous / Next (PgUp, PgDn) | two icon buttons in the section header |
| CAMERA | Framing [Fit v] | the framing menu of screen 51 (Fit, Selection, Top, Front, Side, Isometric, Reset view). It stays in the zoom pill at the right header too, because it belongs beside the canvas; this row is its label for a reader who looks here |
| | Follow [none] | shows which node is followed (screen 54) and stops following |
| | Minimap [switch] (M) | moved from the Canvas tab |
| COMPARE | Compare two objects... | picks two objects and splits the canvas (screen 78); Link cameras [switch] |
| PRESENT | Present from the start  (Shift+\\) | Present mode (screen 99), stepping through the views in order. The file menu loses Present |
| | Present from the selected view | |

### 2.7 AI (Alt+5 or backtick)

The Assistant tab leaves the dock and becomes this panel. Its contents are screen 82's: "Choose
a provider..." until one is set, then the conversation, one row per object the assistant made
("Made: Bridges (Betweenness)"), each command it ran as a collapsed row with "Copy as command",
the composer with a microphone, and the fixed line above the composer about what is sent to
the provider.

The cost: the tree is not visible while the AI panel is open. Round 2 wanted the tree beside the
assistant so the reader could see the new row appear. Two things replace that:

- **A "Made:" row is a link.** Hovering it outlines the object's members on the canvas, and
  clicking it selects the object, so the inspector shows it at once. The right panel is still
  there, which the round-2 argument did not count.
- **The Objects rail button gets a notification dot** (compact-mantine `Indicator`, 5 px brand
  blue) when objects were added while its panel was hidden. The dot clears when Objects is
  opened. The same dot appears when a run finishes while another panel is open.

History stays in the dock. Hovering a history row outlines what it touched on the canvas, which
does not need the tree.

### 2.8 What moves in the rest of the frame

| Round 2 / 3 had | Round 4 | Why |
|---|---|---|
| No rail (decision F1) | the rail of 2.2 | 2.1 |
| Views list above the tree | Views panel | 2.6 |
| Dataset inspector tabs: Overview, Layout, Canvas, Data | Overview, Layout. Overview gains two link rows, "Columns and roles >" and "Look and labels >", that open the Data and Styles panels | the Data and Canvas tabs moved to the rail. With two tabs, the four-tab width limit (decision I1) no longer applies to the Dataset |
| Dock tabs: Table, Assistant, History | Table, History | the Assistant is the AI panel |
| File menu: Open..., Open recent, Open sample, Add data..., Open as a second graph..., Save project, Save project as..., Close dataset, Run a recipe..., Import styles..., Present, Settings..., Keyboard shortcuts, Help | Open... (Ctrl+O), Open recent, Open sample; Save project (Ctrl+S), Save project as... (Ctrl+Shift+S), Close dataset; Run a recipe..., Export recipe... | the file menu keeps what acts on the session file and its steps. Add data and the second graph move to Data, Import styles to Styles, Present to Views, Settings and Help to the rail's foot. Each still has its key |
| "?" button at the right end of the status bar (decision F3) | the Help button at the rail's foot | the rail's foot is a fixed, visible place, which was the reason for the "?" |
| Toolbar 725 px with labels | section 3 | the owner's point |

## 3. The toolbar

### 3.1 Shape

Figma's measurements (`design/ui/figma/bottom-toolbar/README.md` sections 1 to 4) and
compact-mantine's `Toolbar`, `ToolGroup` and `ToolButton` (spec section 11.1 and 11.2):

- A 48 px bar: padding 8, 8 px between items, radius 13, white, the 200-level shadow, 12 px
  above whatever is under the canvas. It floats over the canvas centre and never shrinks. Below
  about 800 px of canvas it overlaps the panels, as Figma's does.
- A **tool button** is 32 x 32 with a 24 px icon and **no label**. A tool with variants has a
  16 x 32 chevron 1 px after it; the two halves have separate hover states. The armed tool is
  brand blue with a white icon.
- Full-height 1 px dividers split the groups.
- **The tooltip is the label.** Tooltips sit above the bar and show the name, a one-line
  sentence and the key: "Rank  R: give every node a value, such as how central it is". The
  chevron's tooltip names its menu ("Rank methods"). The toolbar's tooltips appear with no delay
  (round 2's rule) because they replace the labels; every other tooltip waits.

```
[Select v] | [Filter v][Path v][Groups v][Rank v][Structure v] | [Time][Actions] | [3D v]
    V          F         P        G        R         S             T    Ctrl+K     5
```

Widths: 8 + Select group 49 + divider + five tool groups at 49 with 8 px gaps (277) + divider +
Actions 32 + divider + mode button 40 + 8 = **465 px**. With Time: **505 px**. Figma's own bar
is 529 px.

**Visible controls: eight** (Select, Filter, Path, Groups, Rank, Structure, Actions, the view
mode), **nine when the data has a time column**. There are no words on the bar except the view
mode's two characters (3.4).

### 3.2 What each control is

| Control | Icon | Key | Dropdown | What it does |
|---|---|---|---|---|
| Select | arrow | V | Select, Lasso, Hand (H, or Space held) | click and box select as round 3. Hand moves into this group, as it sits in Figma's Move group |
| Filter | funnel | F | By values, By range, By connections, By rule, By id list, Largest connected part, Pattern, **Around a node (E)** | makes a Set. Neighbours becomes the "Around a node" row, keeping its key E and its secondary bar (screen 64), because what it makes is a Set of nodes picked by a rule, like every other row here |
| Path | two joined dots | P | as round 2 section 3.4 | an edge Set; flow rows land here |
| Groups | three circles | G | as round 2 | a Grouping |
| Rank | bar chart | R | as round 2 | a Measure |
| Structure | bridge | S | as round 2 | what the row's kind icon says |
| Time | clock | T | none; a menu only when there are several time columns | turns time mode on and off (section 5). Drawn only when the data has a time-typed column |
| Actions | a square of four dots with a plus (Figma's) | Ctrl+K | none | opens the command palette above the toolbar (section 4). Blue while the palette is open |
| View mode | the text "2D", "3D", "VR" or "AR" | 5 flips 2D and 3D | the mode menu (3.4) | switches the view mode |

The flyouts keep their rows exactly as round 2 section 3.4 and screen 11 list them: plain name,
technical name, cost, the kind icon of the object each makes, and "..." for the parameters
popover. A flyout is a menu, where words are the point. The owner's complaint was about the
bar.

### 3.3 Every button removed, and where it went

| Removed from the toolbar | Its home now | Also reachable by |
|---|---|---|
| Hand (its own button) | the Select dropdown's third row | H; Space held; the wheel and right-drag still pan and zoom |
| Neighbours (its own button) | the Filter dropdown, "Around a node" | E; right-click a node > "Select neighbours" (a selection, not a Set); double-click a node |
| Note | right-click on a node, edge, empty canvas or tree row > "Note..."; the "+" of Notes on the Dataset's Overview and every Record tab | N still arms the note tool; Ctrl+K "Add a note" |
| Ask | the AI rail item (2.7) | backtick; Ctrl+K's last row "Ask: <sentence>" |
| The four-segment 2D / 3D / VR / AR switch | one button with a menu (3.4) | 5 |
| The 8 px labels under every tool | the tooltips | Ctrl+K lists every tool and every flyout row under both names |
| Words in the secondary bar | trimmed (3.5) | |

Nothing is removed from the app; only its home moves.

### 3.4 The view-mode button

One 40 x 32 button at the bar's right end, after a divider. Its face is the current mode's
two-character name, "2D", "3D", "VR" or "AR", in 11 px strong text with a 5 x 3 caret. Those two
characters are the icon: no picture of a plane or a cube reads as quickly as "2D" and "3D" to
a reader who knows them.

A click opens a dark menu above the button (compact-mantine `Menu`, the flyout style):

| Row | Right side | Notes |
|---|---|---|
| 2D | 5 | check mark on the current mode |
| 3D | 5 | |
| VR | "Showing >" submenu: Everything, then each Set | drawn only when the browser supports VR. When it cannot start, the row is dimmed and its tooltip gives the reason and the fix ("12,400 nodes showing; VR takes up to 10,000. Focus on a smaller set"). The submenu is round 2's right-click "Enter VR showing [Set]", now findable |
| AR | "Showing >" | the same rules |

Picking VR or AR enters the headset at once, as before (screen 100). While in a headset the
face reads "VR" in brand blue and its menu's first row is "Exit VR". The status bar still reads
"VR [Exit]".

### 3.5 The secondary bar, trimmed

The secondary bar stays: it is the rule that nothing runs on the first click, and it shows
scope and cost before a run (round 2 decision T1). It loses the words the armed tool already
says, and its text buttons become icons:

| Round 2 | Round 4 |
|---|---|
| Rank by [Connections v] on what is showing, 115 nodes, instant [Options] [Run] Cancel | [Connections v] [What is showing v] 115 nodes, instant [gear] [Run] [x] |
| Find groups by [Communities v] on what is showing, 34 nodes, about 80 ms [Options] [Run] Cancel | [Communities v] [What is showing v] 34 nodes, about 80 ms [gear] [Run] [x] |
| Filter by values [Options] Matches 8 nodes [Select] [Create] [Create and focus] Cancel | [By values v] 8 of 34 nodes [gear] [Select] [Create v] [x]. "Create and focus" is the second row of the Create split button |
| Pick the start node ... Cancel | Pick the start node [x] |
| Within [1 v] steps, [All directions v], of node 1 [Create] Cancel | [1 step v] [All directions v] around node 1 [Create] [x] |

What stays is what the reader must read: the variant, the scope, the count, the cost, one verb,
and a pick instruction when the tool waits for a click. The gear opens the parameters popover
(round 2 section 3.5). It is compact-mantine's `SecondaryToolbar` (spec 11.3), 40 px, 8 px
above the toolbar.

## 4. The command palette

**Yes, it stays, and it gets a door you can see.** Round 2 left it as Ctrl+K only and never drew
it, so a reader who does not know the key never meets it.

**Doors.** The Actions button on the toolbar (3.2), Ctrl+K, and a row "Search commands...
Ctrl+K" at the top of the Help menu at the rail's foot. This follows Figma, whose Actions button
sits on the toolbar and opens the same panel as Ctrl+K
(`design/ui/figma/bottom-toolbar/README.md` section 8).

**Shape.** compact-mantine `QuickActions` (spec 11.9): 529 x 354, white, radius 13, 8 px above
the toolbar, centred on it. A search field (13 px text), scope pill tabs All | Commands |
Objects | Nodes, sections with grey headers, 32 px rows with an icon, a name and the key at the
right. The first row is highlighted on open; arrow keys move; Enter runs; Escape closes.

**What it lists.**

| Section | Before typing | While typing |
|---|---|---|
| Recent | the last five commands run, most recent first | hidden |
| For the selection | the selected object's verbs (for a Measure: Re-run, Focus on this, Cut into a Set, Show in table, Export...) | hidden |
| Commands | | every menu row, every flyout row under both its plain and technical names ("Bridges", "Betweenness centrality"), every key in the settled key set, every rail panel ("Go to Data  Alt+2"), and the file verbs (Import styles..., Export recipe...) |
| Objects | | tree rows by name. Enter selects the row and opens Objects |
| Nodes | | nodes by label or id (the element's text search, #149). Enter selects the node and frames it |
| Ask | | always the last row: "Ask: <what was typed>". Enter opens the AI panel with the sentence sent |

The command list is graphty-element's published command vocabulary (#337, "publish the command
vocabulary in the ./commands entry point"), so the palette never keeps its own copy of what the
element can do.

**How it relates to Find (Ctrl+F).** Two different jobs, kept apart:

- **Find** lives in the Objects panel's header and **stays open while you work**. Its results
  (objects, nodes, and values in attributes) are a list the reader steps through, and a value
  match can become a Set (screen 50).
- **The palette is for one action**: type, press Enter, and it closes.

They share one search. The palette's Objects and Nodes sections are Find's first two sections,
and the palette's last row under Nodes is "Show all in Find  Ctrl+F", which hands the query to
Find. Merging them into one surface was considered and rejected: a palette that stays open
would cover the toolbar and the canvas's lower half while the reader works through results.
This is reversible.

## 5. The timeline

**The way in you can see: a Time button on the toolbar.** It is a 32 px clock icon, key T,
placed before Actions. It is drawn only when graphty-element reports a time-typed column
(`session.catalog.timeAttributes()`, #333) or a time role is set. Otherwise it is absent, not
greyed, so a reader of static data never sees a control that cannot work. The first time it
appears in a session, it carries the notification dot for a few seconds; the status bar has
always had the time glyph for the same purpose.

| State | The button | The canvas |
|---|---|---|
| Off (data has a time column) | clock, not pressed. Tooltip: "Time  T: play the data over sent (2019-01 to 2019-12)" | everything drawn |
| Several time columns and no role | clock with a chevron. The menu lists them ("sent", "received") | |
| On | clock, pressed (brand blue) | time mode (below) |

**What pressing it does.** If no time role is set, it sets the role to the column (the same as
Data > Roles > Time) and sets a window over the full range, so nothing disappears at once. Then
it shows the transport bar. Pressing it again, or the transport bar's close "x", clears the
window and hides the bar. The role stays set, so the next press resumes where the reader was.

**What time mode changes.** All of this is round 2 section 6.1, unchanged:

- the 40 px transport bar under the canvas: window readout, step back, play, step forward, speed,
  the slider with the window as a band, counts showing, the gear, and close;
- the window is a mask: elements outside it are not drawn, their positions are kept, and nodes
  follow their edges;
- no object turns stale when the window moves; the legend and summary rows say "computed on
  2019-01 to 2019-12";
- the status bar's mask text mirrors the readout;
- the toolbar moves up 40 px to sit above the transport bar, as Figma's does in Motion mode.

**Every way in, now:** the Time button; the Dataset Overview's finding "Time column: sent
[Show over time]"; the Data panel's Roles > Time select; a column's "..." > Set as time; the
time glyph in the status bar's counts; Ctrl+K "Show over time". The button is the one that is
always visible.

A rail item for time was considered and rejected. Time has no list for a panel to hold (its
settings fit the gear popover), and a rail item that appears and disappears with the data would
move the rail buttons below it.

## 6. Styles and recipes as files

### 6.1 Where each lives

| Action | Home | Also | Key |
|---|---|---|---|
| Import styles... (the owner's "load style") | Styles panel > Files | drop a style file on the canvas; Ctrl+K | |
| Export styles... | Styles panel > Files | Export menu > Export styles...; Ctrl+K | |
| Save current look... | Styles panel title row "+", and Files | Ctrl+K | |
| Apply a look | Styles panel > Look select | Ctrl+K "Look: Print" | |
| Save a style (one object's Style, reusable) | the object's Style tab, foot: "Save this style..." (screen 94) | | |
| Apply a saved style | the object's Style tab, foot: Apply [v] | Styles panel > Library > Saved styles | |
| Export recipe... | file menu, beside Save project | Export menu > Export recipe...; History dock "..." > "Export these steps as a recipe..."; Ctrl+K | |
| Run a recipe... | file menu | drop a recipe file on the canvas; Ctrl+K | |

The rule behind this: **the reader of a file lives where the thing it changes lives**. Styles
change the look, so they are read in the Styles panel; a recipe rebuilds a session, so it is
read from the file menu. **Every file the app writes is also listed under Export**, because
"Export" is where a reader looks for any way to write a file. So the Export menu has two groups:
the picture and the data (image, copy image, video, data, report, bundle, copy methods text),
and "For reuse" (Export styles..., Export recipe..., Export views...). Round 3 had Export recipe
only under Export, Run a recipe only in the file menu, and Import styles in the file menu with
Export styles under Export. That split is why the owner could not find them.

### 6.2 What each file contains

| File | Extension | Holds | Does not hold |
|---|---|---|---|
| Style file | `.graphty-style.json` | graphty-element's style document (`toDocument` today): the layers in paint order with their selectors and values; the saved styles; looks; the palettes they use; legend settings. The export dialog chooses Everything, The look only, or Saved styles and palettes | data, objects, members, positions, views |
| Look | inside a style file, or in the library on this device | only whole-graph layers: background, default node and edge, labels and label style, tooltip | any layer tied to an object |
| Recipe | `.recipe.json` (round 3 decision 2) | the steps: loads with their import options and roles, data edits, each object's definition (tool, variant, parameters, scope), their Styles, and optionally the views | the data itself, results, positions |
| Project | `.graphty` (round 3 decision 1) | everything, with the data embedded or linked | |

On import, a style layer whose selector names a column the current data lacks is listed in the
dialog as "Will not match: 2 layers use 'club', which this data does not have"
(`session.styles.validate`). It is still imported, so it starts to match if the column appears
later.

Saved looks are kept in the project file and in a library in this browser, so a look saved in
one project is offered in the next. Storing it in the browser is a two-way door; the limit and a
"Remove" row live in Settings > Storage.

### 6.3 The flows

- **Export styles** (screen 110): Styles panel > Export styles... opens a dialog with What
  [Everything | The look only | Saved styles and palettes], a list of what will be written with
  counts ("7 layers, 1 look, 3 saved styles, 2 palettes"), File name, and [Export]. It
  downloads the file; a toast says "Exported karate-styles.graphty-style.json".
- **Import styles** (screen 94, now opened from the Styles panel): the dialog lists every item,
  its kind and what it fits; Import as [Add to mine | Replace all]; "Will not match" rows; name
  clashes. One undo step reverses the import.
- **Save a look** (screen 111): Styles > "+" opens a popover: Name, "Includes: background,
  default node and edge, labels" (read from the current whole-graph layers), Keep in [This
  project | This project and my library]. The look joins the Look select.
- **Export a recipe** (screen 112): file menu > Export recipe... opens a dialog listing the
  steps in order, each with a checkbox (a load, "Add column 'domain' from a formula",
  "Communities (Louvain), resolution 1.0", "Style: Communities colour"), with Include views
  [switch], Include data edits [switch], and "Checks on new data: needs columns from, to,
  sent". [Export] downloads the file.
- **Run a recipe**: unchanged (screen 20); its door is the file menu or a dropped file.

## 7. Decisions this round makes

| # | Decision | Reason | Reversible? |
|---|---|---|---|
| 1 | The rail comes back: Objects, Data, Styles, Views, AI; Settings and Help at its foot | the owner's request; 2.1 shows each round-2 objection met or accepted | two-way (a frame change inside the app) |
| 2 | Objects is a peer rail item and the default; the active item's click closes the panel | one left panel at a time; a visible "you are here"; a one-key way back | two-way |
| 3 | The Data and Canvas tabs leave the Dataset's inspector for the Data and Styles panels; the Views list leaves the Objects panel; the Assistant leaves the dock | one home per capability; a full-height panel instead of 14 rows | two-way |
| 4 | The Data panel's contents follow the assumed reading of "data should" | the sentence was cut off | two-way; the owner may correct it |
| 5 | The toolbar is icon-only, 32 px buttons on a 48 px bar, 465 px wide (505 with Time), eight controls | the owner's request and Figma's measurements. This supersedes round 2 decisions T3 and P11 (labels under icons) | two-way |
| 6 | Hand joins Select; Neighbours becomes Filter > Around a node; Note and Ask leave the bar | the fewest controls with no capability lost; each keeps its key | two-way |
| 7 | The view mode is one button with a menu; its face is the mode's two characters | the owner's request; the characters read faster than pictures | two-way |
| 8 | The secondary bar keeps the variant, scope, count, cost and one verb; Options and Cancel become icons | the owner's "too many words" | two-way |
| 9 | The palette's door is an Actions button on the toolbar; Find stays separate | Figma's pattern; Find must stay open, the palette must not | two-way |
| 10 | A Time button appears on the toolbar only when the data has a time column | a visible way in that never shows on static data | two-way |
| 11 | File readers live where their effect lives; every writer is also under Export | the owner could not find the style and recipe files | two-way |
| 12 | The style file is graphty-element's style document, with saved styles, looks and palettes added to it | one file for everything about appearance | **one-way once built**: it is a published file format. The owner should confirm before the element work starts, together with the project and recipe formats of round 3 |

## 8. graphty-element work this adds

Small, and in addition to `../round-2/revision.md` sections 8 and 9.3 and
`../round-3/revision-round-3.md` section 6:

- The paint-order rows need to know which object wins each channel. The objects API's coverage
  call (round 2, settled decision 1) must report it per channel.
- The Data panel's completeness bars need a missing-value count per column from
  `session.data.attributes()`.
- The style document gains saved styles, looks and palettes (decision 12), and import reports
  the layers that will not match.
- The recipe export takes a list of chosen steps.
- The palette reads the command vocabulary (#337) and the text search (#149).

No new app-side computation: every row above reads something graphty-element reports.

## 9. The screens

The generator (`design/ui/object-first-ux/gen/`) draws the rail, the new toolbar, the dock's two tabs and
the status bar without "?" in its shared frame code (`render.mjs` and `toolbar.mjs`). **Every
one of the 102 existing screens gets them automatically** on the next build, with Objects as
the active rail item unless a screen says otherwise.

### 9.1 New screens

| Screen | Shows |
|---|---|
| 103 | The round-4 frame on Karate Club in screen 3's state: the rail with Objects active, the tree without the Views list, the eight-control toolbar, the dock handle (Table, History). Insets: a rail tooltip ("Data  Alt+2"), and the Help menu open from the rail's foot |
| 104 | The Data panel on Email network: two sources (email.csv and a joined contacts.csv), Roles with Time set to sent, columns with completeness bars, the import report with 12 rejected, one join, Open table |
| 105 | The Data panel on a URL dataset whose column row is expanded (type, distinct values, histogram), and the dataset's "..." menu open (Replace..., Reload, Import options..., Show source, Close dataset) |
| 106 | The Styles panel on Karate Club after Communities and Connections: Look, the paint order with Colour struck on a covered row, Labels, Legend, Canvas, Library, Files |
| 107 | The Views panel with three views, the View inspector on the right, and the Compare and Present sections |
| 108 | The AI panel (screen 82's content) with the Objects rail button carrying its notification dot, and a "Made:" row hovered, outlining its members on the canvas |
| 109 | The command palette open from the Actions button: Recent and For the selection; an inset typed "bridg" showing Commands, Objects, Nodes and the Ask row |
| 110 | Export styles: the dialog opened from Styles > Files |
| 111 | Save current look, and the Look select listing the new look |
| 112 | Export recipe from the file menu: the list of steps with checkboxes and the checks on new data |
| 113 | The view-mode menu open in 3D, with VR dimmed and its reason in a tooltip, and the VR "Showing >" submenu in an inset |
| 114 | The Time button on Email network: off with its tooltip; an inset with several time columns and the chevron menu; pressing it leads to screen 10 |

### 9.2 Existing screens that change beyond the shared frame

| Screen | Change |
|---|---|
| 1 | the Data panel is the active rail item and shows the four ways in |
| 2 | the Dataset's inspector has two tabs, Overview and Layout, with the two link rows |
| 4, 5, 48, 59-64, 74, 75 | the trimmed secondary bar (3.5). Screen 64 arms Filter > Around a node |
| 9, 33, 43, 56, 76 | the dock has two tabs, Table and History |
| 10, 79, 80 | Time is pressed on the toolbar; the Data tab's Time row is gone (it is in the Data panel) |
| 11 | rewritten as the round-4 toolbar reference: the bar at 1440 and 1280, each tooltip, the flyouts with Select's Hand row and Filter's Around a node row, the mode menu, the Time and Actions buttons, and the trimmed secondary bar |
| 13 | opened from the rail's gear |
| 16 | the file menu's new rows (2.8); Open recent kept |
| 21, 24, 26, 31-38 | the rows that were on the Data tab are drawn in the Data panel (Data rail item active) |
| 50 | Find; the palette's "Show all in Find" hand-off is in its caption |
| 51, 52, 53, 54, 78, 99 | drawn with the Views panel active where the screen is about views, the minimap, compare or Present |
| 81 | the Note tool is armed by N or the right-click menu; no toolbar button |
| 82 | superseded by 108 |
| 87, 88, 89, 90-94 | the Canvas-tab rows are drawn in the Styles panel; 94's import dialog opens from Styles > Files |
| 95 | the Export menu's "For reuse" group |
| 100 | VR entered from the view-mode menu |
| 12 | re-derived from screen 3 in the dark theme |

Every other screen changes only through the shared frame.
