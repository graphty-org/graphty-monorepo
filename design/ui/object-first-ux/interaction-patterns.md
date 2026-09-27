# The graphty app's interaction patterns

This is the pattern library for the object-first graphty app: the reusable ways every screen
behaves. It says where a piece of content or an action goes, how a list is added to and removed
from, when something asks first and when it just happens, what goes in a menu and what goes in a
dialog. Each rule is written so that a reviewer can hold one screen against it and answer pass or
fail.

It sits beside `visual-language.md` in this folder. That document says how things LOOK (sizes,
type, colour, spacing, which compact-mantine component draws which part). This one says how they
BEHAVE and where they LIVE. Where the two touch (menus, popovers, disclosure, the keyboard),
`visual-language.md` owns the measurements and the component names, and this document owns the
decision of which surface to use and what happens when the reader acts. They do not repeat each
other; a rule here that needs a size points at `visual-language.md`.

Why it exists. The earlier rounds of this design (`round-2/revision.md`,
`round-3/revision-round-3.md`, `round-4/revision-round-4.md`) decided WHERE each capability
lives, one capability at a time. Nobody wrote down the rules those decisions had in common, so
each area re-decided them: one screen confirms a delete and the next shows an undo notice, one
empty list has a "+" and the next has a sentence, one set of options is a popover and the next is
a dialog. Part 5 lists every such place in the current mocks. The patterns here are those
common rules, made explicit so the next screen is drawn right the first time.

Sources, and which wins:

- The object model: `object-model.md`, as amended by the three rounds. Round 4 wins over round 3,
  round 3 over round 2, round 2 over `object-model.md`.
- The analysis of why the current app is hard to use: `analysis.md` section 4 (the restraint
  rules) and `/home/apowers/Projects/graphty-monorepo/tmp/ux-review/graphty-vs-figma-ux.md` (the
  comparison with Figma, and the corrected model in which the objects are what the reader makes
  from the data).
- How Figma actually behaves, measured: `/home/apowers/Projects/graphty-monorepo/design/ui/figma/`
  (`flows.md` for behaviour over time, `components.md` for every part, the area READMEs for
  detail). Cited below as "Figma flows" or "Figma components" with a section number.
- The mocks: `mocks/v2/screen-<n>.png` (102 screens, drawn before round 4), cited as "screen n".
  Screens 103 to 114 are specified in `round-4/revision-round-4.md` section 9.1 and not yet drawn.

Where this document settles a question the earlier documents left open or answered two ways, the
rule says **(decided here)** and gives the reason. Every such decision is a two-way door: undoing
it is an edit to this file and to the mocks. None of them touches graphty-element's published API
or a file format.

---

## 0. Words used here

- **Object**: a row of the object tree. Something the reader made from the data (a Set, a
  Measure, a Grouping and its Groups), or the data itself (the Dataset, the root row). Part 1.2
  lists the kinds.
- **Element**: one node or one edge of the graph. Elements are the material the objects are made
  from. An element can be clicked and read, but it is not an object.
- **Tree**: the Objects panel's nested list of objects. Its order is the paint order: an object
  higher in the tree wins where two objects paint the same element.
- **Rail**: the column of icon buttons at the window's far left (Objects, Data, Styles, Views,
  AI, then Settings and Help at its foot). **Left panel**: the 240 px panel the active rail
  button shows.
- **Inspector**: the 240 px right panel. It shows the properties of whatever is selected, or of
  the Dataset when nothing is.
- **Tab**: one of the three or four pill tabs at the top of the inspector (for a Set: Define,
  Members, Style, Record). **Section**: a titled block of rows inside a tab or a panel, with a
  40 px header.
- **Row**: one 32 px line of a panel, holding one thing.
- **Toolbar**: the floating bar at the bottom centre of the canvas. **Tool**: a toolbar button
  that creates an object. **Arm**: pressing a tool turns it blue and waits for the reader; it
  does not run yet. **Secondary bar**: the smaller bar above the toolbar while a tool is armed,
  holding what will run, on what, at what cost, and the button that runs it. **Flyout**: the dark
  menu behind a tool's chevron that lists its variants.
- **Popover**: a light 240 px floating panel of settings, opened from a button and anchored
  beside it (Figma's "light popover"). **Menu**: a dark list of verbs or choices that drops from
  a button or opens at the pointer. **Dialog** (or **modal**): a centred panel that takes the
  keyboard until it is answered. **Toast**: a small dark message above the toolbar that goes
  away by itself. **Dock**: the drawer under the canvas (Table, History). **Status bar**: the
  24 px strip across the bottom of the window.
- **Overlay**: any of popover, menu, dialog, tooltip, toast, command palette: something drawn
  over the frame rather than in it.
- **Commit**: the moment an edit takes effect (Enter, Tab, leaving the field, a click on a menu
  row). **Revert**: throwing away an edit that was not committed.
- **Undo step**: one entry in the session's history; Ctrl+Z reverses exactly one.
- **Stale**: an object whose inputs changed after it ran; it keeps its old values, marked, until
  re-run. **Computing, waiting, failed, frozen**: the other states an object can be in
  (`object-model.md` section 5).
- **Focus** (capital F): the verb that shows only one Set's members and scopes every tool to
  them. Not to be confused with **keyboard focus**, which is always written in full.
- **App-authored text**: words the app wrote (hints, explanations), as opposed to the reader's
  own words (object names, notes) and the data's (labels, values).
- **Home**: the one place a capability's controls are drawn. **Shortcut** (in the sense of a
  door): any other way in, such as a key, a menu row or a command-palette row, which opens that
  home rather than drawing a second copy of its controls.

---

# Part 1. The model

## 1.1 Object-first, as rules

"Object-first" means the reader points at a thing and then acts on it, rather than first choosing
an activity ("Analyze", "Style") and then looking for the thing inside it. Figma works this way;
the current graphty app does not (its left side is six activities). The rules below are what
object-first means for graphty. Every pattern in Part 3 is one of them applied to a particular
job.

1. **Everything the reader makes is an object in the tree.** A group of communities, a ranking by
   betweenness, a path between two nodes, a filtered set: each is one row, with a name, a kind, a
   count, a state and a look. If the reader made it and it has members or values, it is a row.
   If it has neither (a note, a single number such as the diameter, a table of likely missing
   links), it is not a row: it lives inside the object it is about (Part 1.2).
2. **Nodes and edges are material, not objects.** They are read and selected, never styled one by
   one. Styling one node creates a one-node Set, which is an object ("Style this node...",
   screen 93).
3. **Select, then act.** Almost every action starts from a selection: a tree row, a node, a
   marquee of nodes. The verbs on offer are the ones that apply to what is selected: in the
   inspector, in the "..." menu, in the right-click menu, and first in the command palette.
4. **The inspector edits the selection, and nothing else.** It has one meaning: "the selected
   thing, or the Dataset when nothing is selected". It is never replaced by a tool's form, an
   export sheet or an activity panel. What the reader can change about the selected thing is
   changed there, in place.
5. **Creation is a tool that hands back an object.** The one place the reader starts from a verb
   is creating, because nothing can be selected before it exists. A tool arms, shows what it will
   do, runs on Run or on a canvas pick, and hands back a new row, selected, with the tool back on
   Select. The object is then edited like any other (Part 3.12).
6. **Appearance is a property of the object.** An object's look is its Style tab, next to its
   definition and members. It is stored as a graphty-element style layer, but no reader ever sees
   a layer list: the tree is the layer order, and the Styles panel's paint order is the same list
   seen by paint.
7. **Nothing acts unasked.** Loading a file draws the graph and stops. The app does not run an
   algorithm, switch a panel, open a card or show a suggestion because something happened. The
   only things that change by themselves are progress (a run the reader started), the
   consequences the reader's own edit has on cheap objects (they re-run at once), and a limit
   graphty-element enforces to protect the machine (drawing over the render ceiling turns on
   performance mode), which is shown as state in the status bar and can be turned off.
8. **One home per capability.** Each capability's controls are drawn in exactly one place. Other
   ways in are shortcuts that open that place.

## 1.2 The object kinds

| Kind     | What it is                                                                                                                   | Where it lives                                                               | Made by                                                                          | Its inspector tabs              |
| -------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------- |
| Dataset  | the loaded data: nodes, edges, columns, positions; the root row                                                              | the tree's root; its data in the Data panel, its picture in the Styles panel | a load                                                                           | Overview, Layout                |
| Set      | a named collection of nodes or edges: a filter, a path, a neighbourhood, a hand-picked selection, a combination, a Top N cut | a tree row                                                                   | Filter, Path, Structure tools; Ctrl+G on a selection; Combine; a Measure's Top N | Define, Members, Style, Record  |
| Measure  | one value per element: a centrality, a score, a numeric column in use                                                        | a tree row                                                                   | Rank tool; a column's "Colour by" or "Size by"                                   | Values, Define, Style, Record   |
| Grouping | one label per element, which is also a family of Groups: communities, components                                             | a tree row with Group children                                               | Groups tool; a column's "Group by"                                               | Groups, Define, Style, Record   |
| Group    | one label of a Grouping                                                                                                      | a child row of its Grouping                                                  | its Grouping only                                                                | Members, Style, Define, Record  |
| View     | a saved camera, view mode and what is showing                                                                                | the Views panel (not the tree)                                               | Views "+"                                                                        | one page: Camera, Mode, Showing |

Things that are deliberately not objects, and where each lives instead:

| Thing                                         | Lives in                                                                           | Why not a row                                                        |
| --------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| a node or an edge                             | the canvas, the table; its own inspector (About, Attributes, Links)                | material; there are thousands                                        |
| a note                                        | the Notes section of what it is about; markers on the canvas                       | no members, nothing to paint                                         |
| a finding (a single number, a table of pairs) | the Findings rows of the object it was computed on; the table's Findings tab       | no members, nothing to paint                                         |
| a column of the data                          | the Data panel's Attributes; it becomes a Measure or Grouping only when used       | a wide file would flood the tree                                     |
| the layout                                    | the Dataset's Layout tab, mirrored by a status chip                                | one is in force; it has no members                                   |
| a look (whole-graph style)                    | the Styles panel                                                                   | it paints everything, so it belongs to the picture, not to an object |
| the selection                                 | nothing; Ctrl+G turns it into a Set                                                | transient                                                            |
| a suggestion ("Find groups (G)")              | nowhere at rest; the toolbar tooltips and the command palette carry the same verbs | a row that is a verb breaks "every row is a thing"                   |
| a search result                               | Find's result list, until "Make a set" turns it into a Set                         | it does not exist until the reader keeps it                          |

**(decided here)** The three suggestion rows that `object-model.md` decision 17 put under the
Dataset root after a load are dropped. They are the only tree rows that are verbs, so they fail
the panel test below, and the toolbar is already the visible door to the same three tools.
Undoing this is an edit.

## 1.3 The test: what object is this panel about?

Every panel, tab, popover and dialog must answer one question in one noun: **what object is this
about?** If the answer is an activity ("styling", "analysis") rather than a thing, the surface is
task-first and is wrong. If the answer changes depending on what the reader touched last, the
surface has two meanings and is wrong.

| Surface       | Is about                                                           | Passes because                                                                    |
| ------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| Objects panel | the objects that exist                                             | a list of things                                                                  |
| Data panel    | the Dataset's data (its sources, columns, roles)                   | one object's data, full height                                                    |
| Styles panel  | the picture as a whole (the look, the paint order, labels, legend) | the one whole-graph surface; every row either is whole-graph or selects an object |
| Views panel   | the saved Views                                                    | a list of things                                                                  |
| AI panel      | the conversation, and the objects it made                          | each "Made:" row is an object and selects it; the panel never edits one           |
| Inspector     | the selection, or the Dataset                                      | one meaning, always                                                               |
| A popover     | the one row or object that opened it                               | anchored to its trigger                                                           |
| A dialog      | the session or the data as a whole                                 | never one object's property (Part 2)                                              |
| Secondary bar | the object about to be made                                        | exists only while a tool is armed                                                 |
| Status bar    | the session's state right now                                      | never an event, never an object's property                                        |

A reviewer applies it like this: cover the surface's title, read its rows, and name the object.
If two rows are about two different objects (neither of them the selection), the surface fails.

## 1.4 Where a new verb goes

A new capability finds its home by answering these in order and stopping at the first yes.

```
Does it CREATE a new object from the data?
  yes -> a tool (or a variant in a tool's flyout); it hands back a tree row       Part 3.12
Does it CHANGE one object's property (its definition, look, name)?
  yes -> a row in that object's inspector tab; if it does not fit a row,
         an icon button on the row that opens a popover                           Part 3.9, 3.10
Does it DO SOMETHING TO one object (duplicate, re-run, focus, export, delete)?
  yes -> that object's "..." menu, the same list on right-click                    Part 3.6
Does it read or change the WHOLE DATA (open, import, join, remove data)?
  yes -> the Data panel or the file menu; a dialog if it needs a file, a
         destination, or cannot be undone                                          Part 2, 3.24
Does it change the WHOLE PICTURE (look, labels, legend, background)?
  yes -> the Styles panel                                                          Part 3.23
Is it a PREFERENCE about the app, not about this data?
  yes -> Settings                                                                  Part 3.23
Is it about the CAMERA or presenting?
  yes -> the Views panel, the framing menu, the view-mode button
Otherwise it is probably one of the above in disguise; do not add a new surface.
```

Every verb also gets a row in the command palette (Ctrl+K), which is a shortcut, never a home.

---

# Part 2. Surfaces

## 2.1 The decision table

One line per surface. "Opens" and "Closes" are what the reader does; "Nests" is whether another
overlay may open from it; "Keyboard focus" is where focus goes when it opens and when it closes.
Component names are compact-mantine's, as `visual-language.md` section 7.1 lists them.

| Surface                                          | For                                                                                                                                                                                                                                                                                                                                                                                                                                               | Never for                                                                                                                                                       | Opens                                                                  | Closes                                                             | Nests                                                                                                                                                                     | Keyboard focus                                                                      | Component                                                          |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **Inline in a row**                              | reading a value; editing one property of the selection; toggles (eye, lock, pin); a "-" to remove the row                                                                                                                                                                                                                                                                                                                                         | anything needing more than one control; prose                                                                                                                   | always there                                                           | --                                                                 | a row control may open a menu (a select) or a popover (a chit, a gear)                                                                                                    | stays on the control; Enter commits                                                 | `PanelField`, `CompactColorInput`, `ToggleIconButton`, `ActionRow` |
| **Inspector tab / section**                      | the properties of the selection, grouped by job (Define, Members, Style, Record)                                                                                                                                                                                                                                                                                                                                                                  | anything about another object; a tool's form; an export sheet; whole-session actions                                                                            | selecting something                                                    | selecting something else                                           | --                                                                                                                                                                        | --                                                                                  | `Tabs`, `ControlSection`, `FieldRow`                               |
| **Popover** (light, anchored beside its trigger) | settings of ONE row or object that do not fit a row: a colour picker, a rule builder, a layout engine's options, one column operation, the settings of one export; an armed tool's parameters (above the secondary bar)                                                                                                                                                                                                                           | anything that commits a whole-session change; confirmations; a list the reader browses; results and charts; a second popover                                    | a click on an icon button, a chit, a "+" that needs a choice, a "gear" | Escape, its close button, a click outside, opening another overlay | no: opening another popover replaces it; a select inside it opens its list box, which is not a second popover; it may open the browser's file picker, never an app dialog | into its first field (a colour picker focuses itself); back to the trigger on close | `Popout`, `AdvancedButton`                                         |
| **Dropdown menu** (dark, from a button)          | choosing a verb or a value from a short list: the file menu, a tool's flyout, the Export menu, the view-mode menu, a "+" that must pick a kind, the matches under a field that autocompletes                                                                                                                                                                                                                                                      | forms, fields, sliders, checkboxes, sentences, two-line rows, a "..." button inside a row                                                                       | a click on its trigger                                                 | choosing a row, Escape, a click outside                            | submenus only (one level, opened by hover or Right arrow)                                                                                                                 | the first row (keyboard) or stays with the pointer; back to the trigger             | `Menu`                                                             |
| **Context menu** (right-click)                   | the same verbs as the "..." of the thing under the pointer, plus the select and route verbs that need a pointer                                                                                                                                                                                                                                                                                                                                   | anything not also reachable elsewhere; settings                                                                                                                 | right-click, Shift+F10, the Menu key                                   | as a dropdown menu                                                 | submenus only                                                                                                                                                             | the first row; back to the canvas                                                   | `ContextMenu`                                                      |
| **Select list box**                              | choosing one value for a field                                                                                                                                                                                                                                                                                                                                                                                                                    | verbs                                                                                                                                                           | the select's chevron, Ctrl+Down                                        | choosing, Escape                                                   | no                                                                                                                                                                        | the selected option; back to the field                                              | `Select`, `StyleSelect`                                            |
| **Command palette**                              | finding and running any verb by name; finding an object or a node; asking the assistant                                                                                                                                                                                                                                                                                                                                                           | being the only door to anything; holding settings; staying open while the reader works (that is Find)                                                           | Ctrl+K, the Actions button                                             | running a row, Escape, a click outside                             | no                                                                                                                                                                        | its search field; back to the canvas                                                | `QuickActions`                                                     |
| **Find**                                         | stepping through objects, nodes and values that match a query while working                                                                                                                                                                                                                                                                                                                                                                       | running commands                                                                                                                                                | Ctrl+F, the magnifier in the Objects header                            | Escape (restores the tree)                                         | no                                                                                                                                                                        | its field                                                                           | `SearchInput`, `ResultRow`                                         |
| **Dock** (Table, History)                        | wide or long content: the data table, the history, rejected rows after a load, tables of findings, charts (over time, a scatter plot of two Measures)                                                                                                                                                                                                                                                                                             | settings; one object's properties                                                                                                                               | its tab on the handle, Shift+T, the "See all in table" rows            | its tab again, Escape from inside                                  | a column menu, a cell editor                                                                                                                                              | the first row; back to the canvas                                                   | `DataTable`, `Tabs`                                                |
| **Rail panel**                                   | a full-height list the reader manages: Objects, Data, Styles, Views, AI                                                                                                                                                                                                                                                                                                                                                                           | a form for one object (that is the inspector)                                                                                                                   | its rail button, Alt+1 to Alt+5                                        | another rail button; the active one again closes it                | popovers docked to its right edge; menus                                                                                                                                  | into the panel (a search field if it has one)                                       | `NavRail`, `RailButton`                                            |
| **Secondary bar**                                | an armed tool's sentence: variant, scope, count, cost, one commit verb, cancel; the instruction for any canvas pick in progress, whatever started it (a tool, the Layout tab's Root field, a node's "Connect to...")                                                                                                                                                                                                                              | anything when no tool is armed and no pick is waiting (Find, a keyboard readout, a status); parameters beyond one or two selects (those go in its gear popover) | arming a tool; starting a pick                                         | the tool finishing, the pick made, Escape, its "x"                 | its gear opens the tool's parameters popover; the pair is one surface                                                                                                     | stays on the canvas; Enter runs                                                     | `SecondaryToolbar`                                                 |
| **Mode bar** (the time transport)                | the controls of a mode the reader turned on and that lasts while they work: play, step, the window slider                                                                                                                                                                                                                                                                                                                                         | settings (its gear popover holds them); results and charts (the dock)                                                                                           | the mode's button (Time)                                               | the same button, its "x"                                           | its gear popover                                                                                                                                                          | stays on the canvas                                                                 | composed                                                           |
| **Modal dialog**                                 | an action on the whole session or its data that needs a file or a destination, changes the data, or cannot be undone; app Settings                                                                                                                                                                                                                                                                                                                | editing one object; a tool's parameters; a field error; confirming anything undo can reverse                                                                    | a command ending in "..." that the rule below allows                   | Cancel, its close button, Escape; the commit button                | a file picker (the browser's); never another dialog or popover                                                                                                            | its first field, trapped; back to what opened it                                    | `Modal`, `ModalFooter`                                             |
| **Toast**                                        | a one-line report of something that just happened out of the reader's line of sight, with at most one action (Undo, Show, Redo)                                                                                                                                                                                                                                                                                                                   | errors that need a decision; state that persists; anything the reader is already looking at; a second toast                                                     | the event                                                              | by itself after 3 or 6 s; its action; a newer toast replaces it    | no                                                                                                                                                                        | never takes focus                                                                   | `Toast` via `useToast`                                             |
| **Status bar**                                   | persistent state of the session that must stay visible whatever is selected: counts, what is showing, the layout's state, work in progress, stale count, non-fatal errors, the selection count                                                                                                                                                                                                                                                    | one-off events (toasts), object properties, prose, the armed tool's name or its pick instruction, the zoom (the framing pill is its home)                       | always there                                                           | --                                                                 | a chip may open a small popover above it (error details)                                                                                                                  | --                                                                                  | composed from `Button` (subtle) and text                           |
| **Tooltip**                                      | the name and key of a control; the reason a control is disabled; the full text of a truncated label                                                                                                                                                                                                                                                                                                                                               | instructions longer than one sentence; anything the reader must read to succeed                                                                                 | hover or keyboard focus, after the shared delay                        | leaving, a key, a click                                            | no                                                                                                                                                                        | never takes focus                                                                   | `Tooltip`, `TooltipShortcut`                                       |
| **Canvas overlay**                               | the toolbar; the legend and minimap when switched on; note markers (a note's text shows on hover or when the note is selected); feedback for something the reader is doing right now (a file dragged over: the outline and one line naming what the drop will do; the export frame while export settings are open; a path's rubber-band line; the pane names while two panes compare); the first load's progress card; the fatal "view lost" card | hints, suggestion cards, banners, results, charts, floating panels, the ways to load a file                                                                     | switched on by the reader, or the reader's own gesture                 | switched off; the gesture ends                                     | no                                                                                                                                                                        | --                                                                                  | --                                                                 |
| **Full-screen mode** (Present, VR)               | presenting the picture with the chrome hidden                                                                                                                                                                                                                                                                                                                                                                                                     | editing                                                                                                                                                         | a menu row or key                                                      | Escape, a visible Exit                                             | no                                                                                                                                                                        | the canvas                                                                          | --                                                                 |

## 2.2 The surface rules

These are the rules the table implies, stated so they can be checked one at a time.

1. **One overlay at a time.** Opening a menu, popover, list box, palette or dialog closes
   whatever overlay was open (Figma flows 1). The only pairs allowed together: a secondary bar
   and its own parameters popover (one tool surface); a select's list box over the popover or
   dialog that holds the select; a menu's submenu; a tooltip over anything. A flyout row's
   parameters button closes the flyout and opens the tool's parameters popover above the
   secondary bar; the two are never drawn open together.
2. **Escape closes the top-most thing only.** One press, one rung (Part 3.20 gives the ladder).
3. **A dialog is allowed only when at least one of these is true**: the action needs a file or a
   place to keep the session (Open..., Import..., Join a table..., Save project as...); it
   changes the data under every object (Remove from data..., Merge..., Import options... that
   reloads); it cannot be undone
   (closing with unsaved work, replacing the data); it deletes more than the reader pointed at (a
   delete with children); or it is the app's Settings. Everything that edits one object is inline
   or a popover beside the inspector. A dialog never shows a field error, never asks for a tool's
   parameters, and never asks "are you sure" about something Ctrl+Z reverses and that touches only
   what the reader pointed at. (Removing data and deleting an object with children do ask, and
   are undoable: they ask because the loss reaches beyond what was pointed at, Part 3.3.) One
   dialog does one job: the same job is never done by two different dialogs (opening a second
   graph is the Import dialog's Into choice, not a dialog of its own).
4. **A popover edits one thing.** Its title names the row or object that opened it ("Bridges",
   "Label style", "Colour"). It has at most one commit button, and none when its fields commit on
   their own (a colour picker, a label style). **A tool's parameters popover has no commit
   button and repeats nothing the secondary bar shows** (variant, scope, count, cost): the bar
   owns the one commit, so Run or Create is drawn once **(decided here**: round 2 pass 3 had the
   bar's button dim while the popover carried its own; two buttons for one action is the
   duplication this document exists to remove). Its rows are the same rows, drawn by the same
   component, as the new object's Define tab, so the reader meets each parameter once.
5. **A menu holds verbs or values, one line each.** No fields, switches, checkboxes, sliders or
   sentences in a menu. A group may carry a one-line noun heading ("Recent", "For reuse"). A row
   that cannot run is disabled with its reason in a tooltip, not removed and not explained in the
   menu. A cost or a count may sit at the row's right in secondary ink ("about 2 s", "12
   nodes"); the key column holds only keys.
6. **The inspector's meaning never changes.** No tool, export or activity takes its place (rule 4
   of Part 1.1).
7. **Nothing appears over the canvas unasked.** No banners, hint cards, "did you know" or
   suggestion cards, no floating result panels. The legend and minimap appear only when switched
   on; the other allowed overlays are the ones the table lists, each tied to something the reader
   is doing right now.
8. **The status bar holds state, the toast holds events.** If it is still true in ten seconds it
   is state (status bar); if it happened once it is an event (toast). **(decided here**: earlier
   documents put "Deleted X [Undo]" and "Edited value [Undo]" in the status bar's computing slot.
   One surface per kind of message is easier to learn and to check; Figma uses its toast for the
   same messages.)
9. **Doors that open a surface say so.** A command that opens a dialog or asks for more input ends
   in "..." (Part 3.22); a control that opens a popover shows its open state while the popover is
   up (`visual-language.md` section 7.2).
10. **Every export's settings are a popover, not a sheet or a dialog** **(decided here**: round 3
    made the Export sheet replace the inspector while open, so the canvas stayed live for framing.
    A popover docked beside the inspector keeps the canvas just as live, keeps the inspector's one
    meaning, and is how Figma exports. A modal dialog is wrong for image and video because it
    would freeze the camera the reader is framing with, and the other exports follow the same
    pattern so that writing a file is learned once. This includes Export styles... and Export
    recipe..., which round 4 specifies as dialogs for screens 110 and 112.) The browser's own save
    picker is the file step.

## 2.3 Popover or dialog or inline: the quick test

```
Does the change affect only the selected object (or one row of it)?
  yes -> Does it fit in one 24 px control?
           yes -> INLINE in the row
           no  -> POPOVER from an icon button on that row
  no  -> Does it need a file, change the data under every object,
         or lose work that undo cannot bring back?
           yes -> DIALOG
           no  -> Is it a verb with no settings?
                    yes -> a MENU row (and a key)
                    no  -> it belongs to a panel (Data, Styles, Views) as rows,
                           with a popover for the part that does not fit
```

---

# Part 3. Patterns

Each pattern has: the problem it solves; the rule; its anatomy in ASCII; the variants; do and
don't; the compact-mantine component; and the mock screens that show it (or break it: Part 5 has
the breaks). Screen numbers refer to `mocks/v2/`.

## 3.1 Empty collection

**Problem.** A panel that draws shelves before the reader owns anything to put on them is noise,
and a sentence explaining the empty shelf is app-authored text at rest. The current app shows
seven empty sections after a load.

**Rule.**

- An empty collection is its section header with a "+" and nothing else: no "No notes yet", no
  ghost row, no placeholder, no illustration.
- Clicking the "+" or the empty header's title adds an item at once with a sensible default (a
  Colour paint row in the next palette colour, an empty note with its text field focused).
- When the kind of item must be chosen first (a paint row's channel, a Findings computation), the
  "+" opens a short dark menu of kinds; choosing one adds the item and, if it has settings, opens
  its popover. Never a dialog, never a wizard.
- An empty header's title is drawn in secondary ink until hovered (`visual-language.md` section
  8, M2); a section with nothing in it and nothing the reader could add is omitted entirely.
- A "+" always adds to the collection it heads. A verb that makes something elsewhere ("Make a set
  from the top 10") is a row of the "..." menu or a button under the list, not the header's "+".
- The one exception is a whole panel with nothing in it at all: it shows one empty-state heading,
  at most one sentence, and the actions that fill it (`visual-language.md` W15). Before anything
  is loaded this is the Data panel, which holds the ways in (Open a file..., From a URL...,
  Paste..., From a source..., Open sample, and the Recent list); it is the rail's default panel on
  a fresh session (round 4, section 2.4). The Objects panel then shows only its header, and the
  canvas shows nothing but the drop outline when a file is dragged over it. No welcome card floats
  on the canvas and no verbs are listed as tree rows **(decided here**, completing round 4's move of
  the ways in to the Data panel: the round-3 Welcome card on the canvas became a second home for
  them).

**Anatomy.**

```
+--------------------------------------------+
| Notes                                  [+] |   40 px header, title in secondary ink
+--------------------------------------------+   nothing below it
```

After "+":

```
| Notes                                  [+] |
| [ Type a note...                       ]   |   the new note, its field focused
```

**Variants.** "+" that adds directly (Notes, Style's Nodes and Edges, Rules, a new empty column
named "column 1" in rename); "+" that opens a menu of kinds (Style's "+" when the channel must be
chosen; Findings "+": the computations that land there; the Attributes "+": New column from a
formula..., Add attributes from a file..., where a row that needs a file opens its dialog). An
empty whole panel (above).

**Do.** Let the "+" do the obvious thing and let undo be the safety net.
**Don't.** Write "Nothing here yet. Click + to add a note."; draw an empty table; draw a disabled
section for a feature that does not exist yet; open a dialog to create an empty item.

**Component.** `ControlSection` with its trailing "+" `ActionIcon`.

**Screens.** 2 (Findings and Notes as bare headers), 3 (Nodes and Edges headers with "+").

## 3.2 Add

**Problem.** An added item that appears somewhere unpredictable, or that the reader must then
find and select, makes adding feel like a search.

**Rule.**

- A new item appears at the TOP of its list (Figma flows 6), selected, and, if it has a name,
  with its name ready to rename. Two exceptions: an object derived from another (a Top N cut, a
  Combination) appears immediately above its first input (`object-model.md` section 2.4); and an
  item of an ordered sequence (a rule line joined by AND or OR, a slot of a pattern, a step of a
  recipe) is added at the END, because its position is its meaning.
- A new object made by a tool is selected and the inspector opens on the tab that answers "what
  did I get" (Members for a Set, Values for a Measure, Groups for a Grouping).
- Adding is one undo step and asks nothing.
- If the new item is off screen (the Objects panel is not open), the rail's Objects button gets
  its notification dot (round 4, section 2.7); no toast.

**Anatomy.**

```
Objects                       [find] [...]
v Karate Club
    Path: 1 -> 34        4 edges  [=]      <- new, top of the root's children, selected
    Degree > 8           5 nodes  [ ]
    Communities          4 groups [#]
```

**Variants.** A tool's result (Part 3.12); a section "+" (Part 3.1); Ctrl+G on a selection (a Set
named "Selection 3", its name in rename); Duplicate (the copy directly above the original, named
"Bridges copy").

**Do.** Put the new row where the eye already is. **Don't.** Append to the bottom of a long list;
open the new item's settings in a dialog; show a toast saying it was added.

**Component.** `Tree` (insertion and selection), `InlineRename`.

**Screens.** 3, 8 (new objects at the top), 100 (objects made in VR marked new).

## 3.3 Remove

**Problem.** A remove that always asks trains the reader to press OK without reading; a remove
that never asks loses data the reader did not mean to lose.

**Rule.**

- **A part of an object** (a paint row, a rule line, a join, a member of a hand-made Set) is
  removed with the "-" at the end of its row. At once, no question.
- **An object** is removed with Delete (keyboard focus on the tree or the inspector) or the last
  row of its "..." menu, "Delete...". A leaf object is removed at once, and a toast says
  "Deleted <name> [Undo]".
- **Ask first only when** at least one is true: the loss cannot be undone; the removal reaches
  beyond what the reader pointed at (an object with children; linked objects that will freeze);
  or it removes DATA (nodes, edges, columns) rather than something the reader made, because data
  removal changes every object that reads it and a reader pressing Delete on the canvas may have
  meant "hide". The question follows Part 3.16.
- A Group cannot be deleted (its Grouping owns it); its menu offers Hide in Delete's place. The
  Dataset cannot be deleted; Close dataset... is its removal, in the file menu.
- A locked object's Delete is disabled with the tooltip "Unlock to delete".

**Anatomy.**

```
paint row:   Colour  [#][D55E00 ][100%]  (eye) (-)       <- "-" removes the row at once
object:      right-click row -> ... | Delete...   Del    <- last row, danger colour
toast:       ( Deleted Top 10 by Bridges   [Undo] )      <- above the toolbar
```

**Variants.** Delete with children (a 320 px dialog, screen 44); remove from data (a dialog,
screen 40); several objects ("Delete 3 objects..." asks only if any has children).

**Do.** Make the undo visible (the toast) whenever nothing asked. **Don't.** Confirm a leaf delete;
use "OK" on a confirmation; hide Delete in the middle of a menu; put the undo report in the status
bar.

**Component.** `ActionIcon` ("-"), `Menu` danger row, `Modal` 320 with a danger `Button`, `Toast`.

**Screens.** 44 (the menu and the one delete that confirms), 40 (remove from data), 3 (paint row
"-").

## 3.4 Reorder

**Problem.** Tree order is paint order, so reordering is a styling action; a reorder that cannot
be seen before it lands, or that can silently change what an object was computed on, is
dangerous.

**Rule.**

- Drag a row; after 4 px of movement it follows the pointer; a 2 px insertion line shows where it
  will land, at the depth it will land. The canvas previews the new paint order while dragging.
  Drop commits one undo step; Escape cancels.
- A row moves only within its parent. Over any other parent no line is drawn and the pointer
  shows "not allowed" (moving out would change the object's scope, `object-model.md` 6.1).
- From the keyboard: Ctrl+] and Ctrl+[ move the selected object up and down within its parent;
  the same two rows sit in its "..." menu.
- The Styles panel's paint-order list is the same order: dragging there moves the row in the
  tree.

**Anatomy.**

```
v Karate Club
    Path: 1 -> 34
  ============================   <- 2 px line at the insertion depth
    Degree > 8
  [ Communities (dragged) ]      <- follows the pointer at 50 percent
```

**Do.** Preview on the canvas. **Don't.** Offer a "Move to..." dialog; allow a drop into another
parent.

**Component.** `Tree` drag and drop (drop zones in `visual-language.md` section 10.6).

**Screens.** 102 (drag with the insertion line), 106 (paint order, to be drawn).

## 3.5 Rename

**Problem.** A name edited in a dialog or in a form field far from where the name is shown breaks
direct manipulation.

**Rule.**

- Double-click the name, or press F2 with the row selected: the name becomes a text field in
  place (in the tree row, or in the inspector header if started there), with the text selected.
- Enter or a click elsewhere commits; Escape cancels; an empty name reverts to the old one.
- Names need not be unique. A locked object's name does not open (tooltip "Unlock to rename").
- Rename is the first row of every "..." menu, with F2 at its right.
- Everything with a reader-given name renames the same way: objects, Groups, Views, datasets,
  columns, looks, saved styles.

**Anatomy.**

```
    [Degree > 8|           ]  5 nodes     <- in place, text selected
```

**Do.** Rename where the name is. **Don't.** Open a "Rename" dialog; put a "Name" field on a
Define tab for an existing object; use Ctrl+R (the browser's reload).

**Component.** `InlineRename` (built into `Tree` and `PageList`).

**Screens.** 102 (rename in place), 44 (Rename in the menu).

## 3.6 Overflow menu and right-click

**Problem.** When each kind of object has its own order of verbs, the reader cannot build a habit;
when right-click and "..." differ, two doors disagree.

**Rule.**

- Every object has a "..." at the right of its inspector header (and on hover in its tree row).
  It opens a dark menu with the verbs that apply to that object, **in this fixed order**, groups
  separated by a divider, omitting rows that do not apply to the kind:

    ```
    Rename                 F2
    Duplicate              Ctrl+D
    Re-run                         (reads "Run (about 4 min)" when waiting, "Cancel run" when computing)
    ---------------------------
    (the kind's own verbs: Arrange only these..., Collapse groups, Show over time...,
     Compare with..., Make a set from the top 10 -- only on the kinds they apply to)
    ---------------------------
    Focus on this
    Select members
    Zoom to selection      Shift+2
    Show in table
    ---------------------------
    Move up                Ctrl+]
    Move down              Ctrl+[
    ---------------------------
    Export...
    ---------------------------
    Delete...              Del      (danger; last; "Hide" in its place on a Group)
    ```

- Right-click on a tree row opens exactly the same list. Right-click on the canvas opens the list
  for the thing under the pointer, with the select and route verbs that need a pointer added AT
  THE TOP (Select neighbours, Path from here...), then that same order.
- A menu holds only verbs. A row that cannot run now is disabled with the reason as its tooltip.
- Every other thing with a menu uses the same frame of groups, in the same order: its edit verbs
  (rename, duplicate), its own verbs, the select and navigate verbs (Zoom to selection, Follow, Show in
  table), copy verbs, Export..., the destructive verb last. A node: Select neighbours, Select
  connected part, Path from here, Path to here | Zoom to selection, Follow, Pin | Note..., Style this
  node..., Add to set > | Show what breaks if removed, Expand from server | Copy id, Copy as JSON
  | Remove from data... . A View: Rename, Duplicate | Present from here | Export image... |
  Delete... . The Dataset: Rename | Add data..., Reload, Re-run all stale, Import options... | Show
  in table | Export... | Close dataset... . One kind has one list, drawn the same on every screen;
  a row that does not apply to this instance is disabled with its reason, not dropped.
- The "..." button's tooltip is "More", not a list of what is inside.

**Anatomy.** As above; each row a verb, the key right-aligned.

**Variants.** Several rows selected: Combine >, Hide all, Lock all, "Delete 3 objects...". The
Dataset row: Rename, Add data..., Import options..., Show in table, Export..., Close dataset....

**Do.** Keep the order even when a kind has only three rows. **Don't.** Put settings, switches or
explanations in the menu; put Delete anywhere but last; give the right-click menu rows the "..."
lacks, other than the pointer verbs.

**Component.** `Menu` (dark), `ContextMenu`.

**Screens.** 44 (the object menu), 49 (right-click on a node, a selection, a row, empty canvas).

## 3.7 Visibility and lock

**Problem.** A tree whose every row carries two icons at rest is noisy; one whose hidden state
cannot be seen at rest lies.

**Rule.**

- On a tree row, the lock and the eye appear when the pointer is over the row and stay visible
  when they are on (a hidden row keeps its closed eye and dims to tertiary ink; a locked row keeps
  its lock). They fire on pointer-down, so a drag down the column toggles many rows.
- The eye means exactly one thing: this object stops painting. Its members stay on the canvas,
  painted by whatever is below. To show only an object's members, the verb is Focus, not the eye.
  The eye's tooltip says so: "Hide this object's paint. To hide everything else, use Focus".
- A locked object cannot be renamed, re-run, moved, edited or deleted, and its members are skipped
  by clicks on the canvas; it still paints.
- The inspector header carries the same eye and lock, always visible, for the selected object.
  They are the same two toggles as the tree row's, not a second home. The eye and lock never
  appear on something that is not an object: hand-hidden nodes are a mask shown in the status bar
  ("3 hidden [Show all]"), not a row with an eye; an inherited paint row carries a link glyph
  ("from Communities"), never the lock.
- Paint rows (one channel of a Style) show their eye and "-" at all times (Figma's paint rows).
- Ctrl+Shift+H hides, Ctrl+Shift+L locks the selected objects. No toast.

**Anatomy.**

```
rest:     Degree > 8                5 nodes  [ ]
hover:    Degree > 8                5 nodes  [ ]  (lock)(eye)
hidden:   Degree > 8 (dimmed)       5 nodes  [ ]        (eye-off)
```

**Do.** Keep the two toggles in the same slots on every row. **Don't.** Use the eye to mean "show
only this"; put visibility in a menu only.

**Component.** `ToggleIconButton` inside `Tree` rows.

**Screens.** 3 (Group 2's row and header), 57 (Focus, the separate verb).

## 3.8 Disclosure

**Problem.** Showing everything makes every tab long; hiding things behind a bare chevron makes
the reader open it to learn anything.

**Rule.**

- A section collapses only where its content is optional to the common task. A collapsed
  section's header carries a one-line summary in secondary ink that answers the common question
  ("Parameters weighted, both directions"; "Caveats 2"; "Look Colour from Conference").
- A long list shows a fixed number of rows, then one row that says how many remain: "and 3 more"
  (expands in place) or "See all 23 in table" (opens the dock). Member lists cap at 5, notes and
  findings at 2 or 3, attributes at 10 or 12 (round 2, section 2.4).
- Nothing expands by itself. Expanding is not an undo step.
- Disclosure is for rows that are READ often and edited rarely. Settings that are edited rarely
  are advanced settings, which open in a popover (Part 3.9), not in a fold-away.

**Anatomy.**

```
> Caveats                         2        <- collapsed: title and summary
v Caveats
    sampled 2,000 of 50,000
    computed on 2019-01 to 2019-12
  Members
    node 1   ...  (5 rows)
    and 7 more                              <- expands in place
    See all 12 in table                     <- opens the dock
```

**Do.** Put the answer in the collapsed header. **Don't.** Use a disclosure to hide settings
(use a popover); collapse a section the reader needs every time; scroll a tab past its budget.

**Component.** `ControlSection` with its gutter caret.

**Screens.** 2 (Import report, one line with a caret), 73 (Record's Parameters and Caveats).

## 3.9 Advanced settings

**Problem.** Rarely used settings folded inside a panel push the common ones down and change the
panel's height under the pointer.

**Rule.**

- Settings the reader rarely changes (an algorithm's tolerance and iterations, a layout engine's
  pace, a label's background and placement, image export's quality) open in a popover from a
  24 px icon button (a gear, compact-mantine's `AdvancedButton`) at the right end of the row they
  qualify. The popover docks beside the panel, top-aligned to the row (Figma flows 5).
- Never an in-panel fold-away ("Advanced" disclosure with fields inside it), never a dialog. This
  rule is about panels and popovers. Inside a dialog, which is already a one-off surface, optional
  choices may fold under one "Options" disclosure (the Import dialog's parsing options).
- The popover's title names what it qualifies ("Bridges", "Label style"). Its fields commit on
  their own; it has no Apply button. Its commit button, if any, is the one verb of the tool that
  opened it (a Run in a tool's parameters popover).

**Anatomy.**

```
                     +-------------------------+ +----------------------+
                     | Label style         (x) | | Labels [Top 6 v] [*] |  <- gear, open state
                     |  Text      [ 11   ]     | | Edge labels [none v] |
                     |  Background [#] [80%]   | |                      |
                     |  Placement [Above v]    | |    (inspector)       |
                     +-------------------------+ +----------------------+
```

**Do.** One gear per row that has advanced settings. **Don't.** Add an "Advanced" section of
fields that unfolds in the panel; open a dialog for "Options".

**Component.** `AdvancedButton` + `Popout`.

**Screens.** 4 (the Bridges parameters popover), 88 (label style).

## 3.10 Editing values

**Problem.** Fields that apply on every keystroke run expensive work half-typed; fields that need
an Apply button feel like forms, not properties.

**Rule.**

- **Commit** on Enter, Tab or leaving the field. Enter keeps keyboard focus in the field; Tab
  commits and moves to the next control (`visual-language.md` section 10.7). **Revert** on
  Escape. Nothing applies while typing.
- **No Apply, Save, OK or Done button** for a property in the inspector or a panel, and no edit
  mode that must be entered and left. A popover's fields commit the same way. A text area (a
  note, a formula) commits on leaving it or on Ctrl+Enter, because Enter makes a new line.
- **Lists inside an object edit in place**: adding a member of a hand-made Set is "Add to set >"
  on the current element selection; removing one is the "-" on its member row, at once, with an
  undo toast. There is no "Edit members" mode.
- **Numbers scrub**: dragging the field's label slot changes the value; release is one undo step.
  Up and Down step by 1, with Shift by 10, committing at once. A field may take an expression
  ("40\*2"), evaluated on commit.
- **Units** sit inside the field after the number ("80 ms", "240 px", "100%"); typing a number
  without a unit keeps the field's unit.
- **Several selected** objects with different values show "Mixed" in the field; typing a value
  sets it on all of them (one undo step).
- **Consequences follow the cost rule**: committing a parameter re-runs the object at once when the
  element estimates under one second; otherwise the object turns stale with Re-run and the
  estimate (Part 3.14). The field says which with one word, "Live" or "Re-run on Enter", only on
  the Define tab.
- **Choice fields**: two to six options shown at once are a segmented control; more are a select;
  on/off is a switch in a row or a toggle icon for eye, lock and pin.
- **Invalid input** follows Part 3.15.

**Anatomy.**

```
Damping  [0.85   ]   Iterations [100   ]
          ^ drag the label to scrub; Enter commits; Esc reverts
Colour   [#][Mixed   ][100%]  (eye) (-)
```

**Do.** Let the value be the control. **Don't.** Show an Apply button; use steppers; commit on
every keystroke for an expensive object; write units in the label ("Width (px)").

**Component.** `NumberInput` / `PanelField kind="number"`, `Select`, `SegmentedControl`, `Switch`,
`CompactColorInput`.

**Screens.** 4 (parameters), 90 (domain and palette), 93 (one node's colour).

## 3.11 Selection and hover

**Problem.** A graph has two kinds of selectable thing, objects and elements, and several ways to
select (click, box, rule, relation). If each way behaves differently the reader never trusts what
is selected.

**Rule.**

- **Two selections, one inspector.** The object selection (tree rows) and the element selection
  (nodes and edges, shared with the canvas, the table and a headset). The inspector shows
  whichever changed last, always: selecting nodes on the canvas while an object is shown switches
  the inspector to the nodes, and no screen shows an object's inspector beside a canvas selection
  that is not its members. Picking a Set or Group row also selects its members (the gold halo);
  picking a Measure, Grouping, View or the Dataset clears the element selection.
- **The status bar's "N selected" counts elements**, so it reads "11 selected" when a Group of
  eleven is picked and nothing when a Measure is. It never counts objects.
- **One modifier grammar everywhere**: plain click replaces; Shift adds (on the canvas) or selects
  a range (in a list); Ctrl toggles one; Alt subtracts (on the canvas). A drag on empty canvas
  with Select draws a box.
- **Rule-based and relational selection are verbs, not modes**: Select in the Filter bar makes a
  transient selection from a rule; "Select neighbours" and "Select connected part" select by
  relation; a Measure's ranked rows select a node. Any selection becomes a Set with Ctrl+G.
- **Hover links both ways and is instant**: hovering a tree row, a paint-order row, a "Made:" row
  or a History row outlines its members on the canvas; hovering a node gives the rows of the
  objects containing it the hover fill. Hover never changes the selection, the inspector or the
  camera.
- Selecting on the canvas expands the tree to the objects containing the selection and scrolls
  the first into view (when the Objects panel is open); their rows take the paler "contains the
  selection" tint.
- Escape clears: first the element selection, then the object selection (Part 3.20).
- Selection is never an undo step.

**Anatomy.**

```
canvas: node 1 clicked (gold halo)
tree:   Communities                   <- paler tint: contains the selection
          Group 2                     <- paler tint
        Path: 1 -> 34                 <- paler tint
inspector: Node / 1 / About ...
```

**Do.** Show the count of what is selected in the status bar. **Don't.** Invent a selection mode;
make Shift mean different things in two lists; select on hover.

**Component.** `Tree` (selection, multi-selection), graphty-element's selection and hover layer.

**Screens.** 3 (a Group selected, its members haloed), 55 (box selection and the several-elements
inspector), 58 (keyboard).

## 3.12 Creation tools

**Problem.** A tool that runs on the first click is a command in a tool's clothing: the reader
never sees the scope or the cost before it runs. A tool that asks in a dialog is not a tool.

**Rule.** Every creation tool follows one sequence:

1. **Arm.** Clicking the tool or pressing its key turns it blue and opens the secondary bar. A
   click on a flyout row arms that variant (and makes it the tool's face).
2. **Read.** The bar says the variant, the scope ("What is showing" or a Focused Set), the count,
   the cost, and holds one commit verb and a close "x". The commit verb is Run for tools that
   compute and Create for tools that pick or filter; a tool that can also make a transient
   selection carries Select beside it as a secondary button, and "Create and focus" is the second
   row of Create's split button (round 4, section 3.5). A tool that needs a canvas pick says what
   to pick ("Pick the start node") and nothing else. The status bar does not repeat any of it.
3. **Act.** Run (or Enter), or the canvas pick(s). Parameters beyond the variant and scope live in
   the bar's gear popover; nothing asks in a dialog.
4. **Hand back.** The new object appears at once at the top of the tree (or under the Focused
   Set), selected, in the computing state if it takes time (Part 3.13); the inspector shows it on
   its "what did I get" tab.
5. **Return.** The tool snaps back to Select; the secondary bar closes.

Escape at any step before Act cancels and returns to Select. A tool that finds nothing says so in
the bar, offers the one change that would widen the search, adds nothing to the tree, and stays
armed (screen 48).

**Anatomy.**

```
            [Bridges v][What is showing v] 115 nodes, about 2 s  [*] [Run] [x]   <- secondary bar
[>v] | [F v][P v][G v][R v][S v] | [T][#] | [2D v]                              <- Rank armed (blue)
```

**Variants.** Tools with no pick (Groups, Rank, Structure, most Filters): Run. Tools with picks
(Path: two clicks; Filter > Around a node: one): the picks commit. Filter by values, range and
rule: the parameters popover opens with the bar because its fields are the tool; the bar keeps
Select and Create.

**Do.** Print scope and cost before anything runs. **Don't.** Run on the first click of the tool
button; open a dialog for parameters; leave the tool armed after the object appears (except after
an empty result); repeat the bar's sentence in the status bar.

**Component.** `Toolbar`, `ToolButton`, `Menu` (flyout), `SecondaryToolbar`, `Popout`.

**Screens.** 4 (Rank armed, flyout and popover), 5 (Path), 48 (nothing found), 59 to 64 (Filter
variants).

## 3.13 Long-running work

**Problem.** Work that takes seconds or minutes must stay visible and cancellable while the
reader does something else, without a blocking dialog.

**Rule.**

- The object's row appears at once. Each state shows in exactly these places:

| State                        | Tree row                                               | Inspector                                                       | Status bar                                                    | Canvas                           |
| ---------------------------- | ------------------------------------------------------ | --------------------------------------------------------------- | ------------------------------------------------------------- | -------------------------------- |
| computing                    | a progress ring with the percent in place of the count | header summary "Computing 42% [Cancel]"                         | one chip "Computing Bridges 42%" (or "3 running") with Cancel | the old picture; nothing flashes |
| waiting (over the cost gate) | a hollow circle; "not run, about 4 min"                | first rows of Define: [Run (about 4 min)] [Approximate instead] | nothing                                                       | nothing                          |
| done                         | the count                                              | the "what did I get" tab if still selected                      | the chip disappears                                           | the new paint                    |

- **The cost gate decides, not the reader's patience.** Work the element estimates as too long to
  start unasked is created waiting, never started and never asked about in a dialog.
- **Cancel** is on the row's inspector header and the status chip; cancelling leaves the object
  waiting (or removes it, if it was just created: undo of the creation cancels too).
- **Loads** follow the same rule: the Dataset row computes, with progress and Cancel in the same
  places. The first load of a session, when there is no Dataset row yet, is the one blocking
  progress: one card on the empty canvas with the file name, a bar and Cancel, and one status
  chip without its own Cancel.
- **A mode's own work** (the layout settling, a video being written) shows in the place the reader
  started it and in one status chip; never twice on one surface.
- **A toast only when the reader moved away**: when a run finishes while its object is not
  selected and the Objects panel is not open, a toast "Bridges finished [Show]" and the Objects
  rail dot. Otherwise nothing: the row itself is the feedback.

**Do.** Keep the old picture until the new one is ready. **Don't.** Block with a progress dialog;
show progress in two chips; start a long run because a panel opened.

**Component.** `Loader`, `Progress`, `Tree` state glyphs.

**Screens.** 5 (computing beside waiting), 28 (a load in progress).

## 3.14 Stale and failed

**Problem.** An object whose inputs changed, or whose run threw, must say so without hiding the
picture and without a dialog.

**Rule.**

- Every non-current state has a glyph on the tree row and a word plus the one recovery action at
  the top of the inspector. Each state's glyph has its own shape, not only its own colour (a dot
  and a ring differ by more than hue), and its tooltip is the state word ("Stale: ran on 34
  nodes, now 40"), so the row never needs a word that would truncate the name.
- **A tree row never holds an action button.** Run, Re-run and Retry live at the top of the
  inspector and in the object's "..." and right-click menus. The row carries the state only.

| State   | Tree row                                       | Inspector, first rows                                                                                            | Status bar                                                                                                     |
| ------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| waiting | hollow circle; "not run" in place of the count | [Run (about 4 min)] [Approximate instead]                                                                        | nothing                                                                                                        |
| stale   | amber dot; name at 50 percent; old count       | "Stale: ran on 34 nodes, now 40" and [Re-run (about 3 s)]                                                        | "3 stale [Re-run all]" only when two or more                                                                   |
| failed  | red triangle                                   | the cause in one sentence with its code, [Retry] focused; for a GPU error also [Retry on the CPU (about 40 min)] | nothing when the object is visible in the tree; "Bridges failed [Show]" only while the Objects panel is closed |
| frozen  | grey snowflake                                 | "Frozen: 'Degree > 10' was deleted. Members kept as a fixed list."                                               | nothing                                                                                                        |

- A stale object keeps painting its old values. A mask (Focus, a time window) never makes
  anything stale.
- A failed or waiting object's inspector opens on Define, where the recovery is.
- Nothing falls back to the CPU by itself: the CPU retry is a button with its cost.

**Do.** Put the action next to the reason. **Don't.** Blank the picture; show a dialog for a
failure; mark stale by colour alone.

**Component.** `Tree` state glyphs, `Button` (secondary) for Re-run and Retry.

**Screens.** 45 (failed), 46 (stale after new data).

## 3.15 Errors and validation

**Problem.** Errors shown far from their cause, or in a modal the reader must dismiss before
fixing, turn a typo into an interruption.

**Rule.** An error is shown where its cause is, at the smallest scope that holds it:

| Scope                                                | Where                                                              | How                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| one field                                            | the field                                                          | a red outline; a simple field (number, hex) reverts to its last good value on commit; a field whose text is worth keeping (an expression, a formula, a URL) keeps the text and shows one line under the field in danger ink: "Unknown column 'degre' (did you mean degree?)" **(decided here**: Figma and compact-mantine revert silently, which would throw away a typed rule; a line under the field is the smallest honest message) |
| a form's commit                                      | the commit button                                                  | disabled with the reason as its tooltip ("Select two or more nodes")                                                                                                                                                                                                                                                                                                                                                                   |
| one object's run                                     | the object                                                         | the failed state (Part 3.14)                                                                                                                                                                                                                                                                                                                                                                                                           |
| a tool's result                                      | the secondary bar                                                  | the empty-result sentence (screen 48)                                                                                                                                                                                                                                                                                                                                                                                                  |
| a load or an import                                  | the place the load started (the Import dialog, the Data panel row) | one sentence, the code in brackets, what to do as a button; nothing is changed                                                                                                                                                                                                                                                                                                                                                         |
| non-fatal, session-wide (a background image, a font) | a status-bar chip "Error: background image failed [Details]"       | Details opens a small popover above the chip                                                                                                                                                                                                                                                                                                                                                                                           |
| fatal for the picture (graphics context lost)        | a card on the blank canvas                                         | the one canvas card allowed; tree and inspector keep working                                                                                                                                                                                                                                                                                                                                                                           |

- An error sentence: what happened, the code in brackets, then the action as a button
  (`visual-language.md` W16). Details behind "Copy details".
- **Never a modal for a field error**, never an alert that must be dismissed before fixing, never
  a toast for an error that needs a decision (a duplicate name that reverted may be a toast, as in
  Figma, because it needs none).

**Do.** Validate on commit; keep the reader's text. **Don't.** Validate on every keystroke with red
text; open a dialog saying "Invalid value"; report an error only in the console.

**Component.** `PanelField` / `TextInput` invalid state, `Tooltip`, status-bar chip.

**Screens.** 27 (a load that fails), 45 (failed run), 47 (view lost, non-fatal chip), 61 (rule
errors inline).

## 3.16 Confirmations versus undo

**Problem.** Every question the app asks costs attention and teaches the reader to click through;
every silent loss costs trust.

**Rule.**

- **Default: do it, and make undo visible.** Every change is one undo step. When the change removed
  or replaced something the reader might not have meant to, a toast reports it with [Undo].
- **Ask only** in the cases Part 3.3 lists: loss that undo cannot reverse (closing or replacing
  with unsaved work, an export overwriting a file), a removal reaching beyond what was pointed at
  (children, frozen links), or a change to the data itself.
- **A confirmation is a 320 px dialog** whose title is the question naming the object ("Delete
  'Degree > 10'?"), whose body lists what will be lost or changed, counted, and says whether
  Ctrl+Z brings it back, and whose buttons are [Cancel] and a button that repeats the verb and
  count ("Delete 3 objects", "Remove 3 nodes", "Close without saving"). Never "OK" or "Yes". The
  destructive button is the danger variant; Enter presses it only when it is the dialog's
  default; Escape cancels.
- **Never a "Don't ask again" checkbox**: if a question can be skipped forever it should not be
  asked (the undo toast is enough).

**Anatomy.**

```
+------------------------------------------+
| Delete 'Degree > 10'?                (x) |
|                                          |
| The 2 objects inside it go too:          |
| Communities, Bridges.                    |
| 'Hubs in Group 1' is frozen, not deleted.|
| Ctrl+Z brings all three back.            |
+------------------------------------------+
|                  [Cancel] [Delete 3 objects] |
+------------------------------------------+
```

**Do.** Count the loss. **Don't.** Ask "Are you sure?"; confirm a leaf delete; confirm an undoable
style change.

**Component.** `Modal` (320) with `ModalFooter`, danger `Button`; `Toast` with an action.

**Screens.** 44 (the delete that confirms), 17 (unsaved work), 40 (remove data).

## 3.17 Toasts

**Problem.** Without a rule, toasts multiply into a notification centre, or events leak into the
status bar and panels as permanent text.

**Rule.** A toast is a one-line report of something that just happened, and:

- **May be a toast**: a result of the reader's own action that happened out of their line of
  sight or removed something ("Deleted Top 10 by Bridges [Undo]", "Edited value of
  BrighamYoung: 7 -> 9 [Undo]", "Added node Coach [Undo]", "Undone: found groups [Redo]" only
  when the undone change is not on screen, "Exported karate.png", "Image copied", "Saved
  karate-club.graphty" on a first save, "Bridges finished [Show]" when the reader has moved
  away, "Added 2 objects in VR [Show]"); a silent revert that the reader should know about
  ("Names must be unique; kept 'Group 2'"); a session restored after a reload ("Restored your
  session from 14:32 [Undo]", where Undo starts empty).
- **May not be a toast**: an error that needs a decision (failed state, dialog), a state that
  persists (status bar), the result of an action the reader is looking at (the row appearing is
  the feedback), a hint or a tip, undo and redo of a visible change (the change is the feedback;
  Figma gives undo no toast), hiding and locking.
- One toast at a time; a new one replaces the old. At most one action button. About 3 s for under
  20 characters, about 6 s for longer; a toast with an action stays until acted on or replaced.
  It never takes keyboard focus; it is announced (`role=alert`).
- It sits centred above the toolbar (16 px), never over a panel.

**Do.** Offer Undo on removals. **Don't.** Toast "Saved successfully"; stack toasts; put two
buttons on one; use a toast for a failure the reader must fix.

**Component.** `Toast` via `useToast`.

**Screens.** 43 (the undo notice), 110 (export styles, to be drawn).

## 3.18 Status bar

**Problem.** A strip that shows everything that happened becomes a log nobody reads, and repeats
what the panels already say.

**Rule.** The status bar shows the session's state right now, in this order from left to right,
and nothing else:

| Order | Item                                                                                            | Present when                           | Its action                                                 |
| ----- | ----------------------------------------------------------------------------------------------- | -------------------------------------- | ---------------------------------------------------------- |
| 1     | counts: "34 nodes 78 edges", or "412 of 1,204 nodes" while something is hidden                  | always                                 | the time glyph opens time mode when there is a time column |
| 2     | what is showing: "Focused on Degree > 10: 6 of 34 [Exit]", a time window, "3 hidden [Show all]" | a mask is on                           | Exit / Show all                                            |
| 3     | the layout: "Spread out: settling 62% [pause]" or "settled"                                     | always (it is live)                    | pause, resume                                              |
| 4     | work in progress: one chip, "Computing Bridges 42% [Cancel]" or "3 running"                     | something runs                         | Cancel                                                     |
| 5     | stale: "3 stale [Re-run all]"                                                                   | two or more stale                      | Re-run all                                                 |
| 6     | a non-fatal error: "Error: ... [Details]"                                                       | an error is unacknowledged             | Details                                                    |
| 7     | the selection: "11 selected" (elements, Part 3.11)                                              | elements are selected                  | --                                                         |
| 8     | the keyboard walk: "Node 34: 17 neighbours"                                                     | the canvas is walked from the keyboard | --                                                         |

- **It mirrors live state; it does not repeat.** Items 1 to 6 may show the same fact the
  inspector shows for the selected object, because they must stay visible whatever is selected;
  that is their job. Nothing else may repeat: never the armed tool's name or variant ("Rank:
  Bridges"), never a pick instruction, never a count or window already in a mode bar on screen,
  never the selected object's name or prose.
- **It holds no zoom readout.** The framing pill at the top of the inspector is the zoom's home
  and shows it **(decided here**: every v2 screen shows the zoom twice).
- It is never where a one-off event is reported: that is a toast (Part 2.2 rule 8).
- An item that does not fit collapses to its glyph with a tooltip, lowest priority first; counts
  never collapse (round 2 decision F4).

**Do.** Keep live state reachable while another object is selected. **Don't.** Write "Rank:
Bridges" while Rank is armed (the tool is blue); report "Image copied" here; add a chip for
something that has a row already.

**Component.** composed from subtle `Button` chips and text (`visual-language.md` section 7.1).

**Screens.** 3 (counts, layout, selection), 57 (Focus), 30 (drawn over the ceiling).

## 3.19 Tooltips

**Problem.** Icon-only controls are guesswork without a name; tooltips that repeat a visible label
add a second copy of every word.

**Rule.**

- **Every icon-only control has a tooltip**: its name, and its key if it has one ("Rank R"). A
  toolbar tool's tooltip adds one sentence ("give every node a value, such as how central it
  is"), because the tooltip is its label.
- **A control with a visible label has no tooltip** unless it adds something the label does not:
  a key, the reason it is disabled, or the full text of a truncated label. Text is never said
  twice.
- **A disabled control that the reader might expect to work** has a tooltip giving the reason
  and, where there is one, the fix ("12,400 nodes showing; VR takes up to 10,000. Focus on a
  smaller set").
- A tooltip is one line, two at most. Anything longer belongs behind a "?" (the reading row's
  explanation popover) or in Help.
- A tree row's tooltip is the technical name of its object ("Betweenness centrality") when the
  row shows the plain name ("Bridges").
- Timing is `visual-language.md` section 8 (M3).

**Do.** Put the key in every tooltip that has one. **Don't.** Explain how to use the app in a
tooltip; tooltip a button whose label says the same.

**Component.** `Tooltip`, `TooltipShortcut`, one app-wide `Tooltip.Group`.

**Screens.** 11 (the toolbar reference), 113 (a disabled VR row with its reason, to be drawn).

## 3.20 Keyboard

**Problem.** Keys that mean different things in different places, and shortcuts nobody can
discover, make the keyboard useless to all but the author.

**Rule.**

- **The Escape ladder**: each press does exactly one of these, the first that applies: cancel a
  pick or a drag in progress; close the top-most overlay; leave a field (reverting it); disarm a
  tool; clear the element selection; clear the object selection; stop following a node; exit
  Focus. Escape never exits Present or VR without a visible Exit also being there, and never
  deletes, runs or saves anything.
- **Enter** commits the focused field, runs the armed tool, activates the focused menu row or
  button, and presses a dialog's default button (never a destructive default unless the dialog
  exists to confirm that one action).
- **Tab** moves between controls within a region, in reading order (top to bottom, left to right);
  the rail, the toolbar, tab strips and trees are one Tab stop each with arrows inside. F6 and
  Shift+F6 move between regions (tree, canvas, inspector, dock, toolbar).
- **On the canvas, Tab steps through the parts of the selected object**: a Set's members, a
  path's hops, a pattern's matches, a route of several. Shift+Tab steps back.
- **Every shortcut is shown where its command is**: in the command's tooltip and right-aligned in
  every menu row that runs it, and in the Keyboard shortcuts sheet. Never inside a button's or a
  row's label ("Make a set (Ctrl+G)", "Find groups (G)", "Legend (L)" are wrong). A key that exists is listed in the Keyboard shortcuts sheet and the
  command palette; a key that is not listed there does not exist. The one key set is in
  `round-3/navigate-select.md`, "The key set, settled", with round 4's additions (Alt+1 to Alt+5
  for the rail, T, the Actions key Ctrl+K).
- **Single-letter keys** (tools, L, M, 5) act only when keyboard focus is on the canvas or the
  tree, never while typing in a field.
- Everything the pointer can do, the keyboard can do, including right-click (Shift+F10) and
  reordering (Ctrl+[ / Ctrl+]).

**Do.** Show the key in the menu. **Don't.** Invent a key that clashes with the browser (Ctrl+R,
Ctrl+Shift+I); make Escape do two things at once.

**Component.** `Kbd`, `ShortcutSheet`, `TooltipShortcut`.

**Screens.** 58 (keyboard on the canvas), 11 (the key on every tool).

## 3.21 Counts and numbers

**Problem.** The same count written five ways (the mocks once did) reads as five different things.

**Rule.** `visual-language.md` section 9.3 has the exact spellings; the behaviour rules are:

- A count is never abbreviated or truncated ("12k" is not allowed); thousands take a comma.
- A pair is "34 nodes 78 edges"; a part of a whole is "412 of 1,204 nodes"; a tree row carries
  one count and the root none.
- A value in a row has three significant figures; the full value is in the table and the value's
  tooltip.
- An estimate says "about" ("about 4 min"); "~" is reserved for the one mark of an approximate
  result before a tree row's count.
- Numbers that change while the reader watches (progress, settling) update in place without
  moving the text around them (tabular figures).
- Singular and plural agree ("1 node").

**Screens.** 3 (tree counts), 69 (a Measure's values).

## 3.22 Naming commands

**Problem.** Commands named as nouns, in title case, or with an ellipsis that means nothing,
cannot be scanned.

**Rule.**

- A command (button, menu row, palette row) is a verb phrase, verb first, sentence case: "Add
  data...", "Export styles...", "Focus on this", "Re-run".
- It ends in "..." exactly when it asks for more before acting (opens a dialog, a file picker, a
  popover of required choices, or a confirmation): "Delete..." when it may ask, "Delete" when it
  never does.
- Panels, sections and tabs are nouns: "Roles", "Style", "Record".
- One word per concept across the app (`visual-language.md` W3). A few that were used two ways and
  are settled: **Style** (an object's look; not "Fill" or "Look"), **Look** (the whole graph's
  base style only), **Views** (saved Views only; camera presets are framings), **Hide** (the eye:
  stop painting) versus **Focus** (show only this), **Delete** (an object) versus **Remove from
  data** (nodes, edges, columns), **Export** (write a file) versus **Copy** (to the clipboard).
- A plain name first, the technical name after it in secondary ink, only in flyouts and the
  palette ("Bridges Betweenness centrality").

**Screens.** 16 (the file menu), 44 (the object menu), 95 (the Export menu).

## 3.23 Where settings live

**Problem.** A setting found in the wrong place is a setting not found (the owner could not find
Export styles).

**Rule.** A setting lives with the thing it changes:

| It changes                                 | It lives in                                                        | Examples                                                              |
| ------------------------------------------ | ------------------------------------------------------------------ | --------------------------------------------------------------------- |
| one object                                 | that object's inspector (a tab, or a popover from one of its rows) | an algorithm's damping; a Set's colour; a Grouping's palette          |
| the data (for every object)                | the Data panel, or the Dataset's inspector                         | column roles; import rules; joins                                     |
| the picture as a whole                     | the Styles panel                                                   | the look, background, default node and edge, labels, legend, tooltips |
| the camera and presenting                  | the Views panel and the framing menu                               | saved views, compare, present                                         |
| the arrangement of nodes                   | the Dataset's Layout tab                                           | layout, pinning, dimensions                                           |
| the app, on this device, for every dataset | Settings (rail foot, Ctrl+,)                                       | theme, contrast, keys, the assistant's provider, storage, autosave    |

- An object's property is never in Settings or in a dialog. A preference about the app is never in
  a panel about the data.
- A setting has one home; the command palette and a key may open it (Part 3.26).
- Settings is one dialog; with more than four sections it has a list of sections at its left
  (Figma's large modal) rather than folding sections **(decided here**: folding sections in a
  dialog is the in-panel fold-away Part 3.9 forbids, and a list lets Ctrl+K open Settings at the
  right section).

**Screens.** 13 (Settings), 87 to 89 (the whole-picture settings), 104 and 106 (the Data and
Styles panels, to be drawn).

## 3.24 Import, export and files

**Problem.** Each way in or out designed separately gives the reader several dialogs for one job.

**Rule.**

- **One Import dialog** for every way data comes in: a file, a URL, pasted text, a source, a drop,
  Ctrl+O, Add data... . It asks Into (Replace, Add to current graph, Add attributes, Open beside)
  only when a graph is open. It is the one guided flow allowed, because the choices must be made
  before anything exists.
- **A dropped file** outlines the drop area with one line saying what the drop will do ("Import
  data", "Import styles", "Run a recipe") and does nothing until dropped.
- **Export** is the header button for everything that writes the whole picture or session: its
  menu lists every file the app writes, in two groups (the picture and the data; for reuse:
  styles, recipe, views). Each row opens that export's settings as a popover beside the inspector
  (Part 2.2 rule 10). One object's export is one row in its Record tab.
- **A file reader lives where its effect lives**: styles are imported in the Styles panel, a
  recipe is run from the file menu, data is imported from the Data panel and the file menu.
  Every writer is also under Export.
- Exporting is not an undo step. Copying to the clipboard is a toast ("Image copied").

**Screens.** 14 (the Import dialog), 26 (Into), 101 (a drop), 95 to 98 (export), 110 to 112
(styles and recipes, to be drawn).

## 3.25 Saving and dirty state

**Problem.** A reader who cannot see whether their work is saved either saves compulsively or
loses it.

**Rule.**

- Unsaved work shows as a dot after the dataset name in the file header. Nothing else (no
  "Unsaved" word, no banner).
- Save project is Ctrl+S; the first save asks for a name and place (a dialog), later saves do not
  ask and show no toast (the dot disappearing is the feedback).
- Autosave keeps the session in the browser; restoring it after a reload happens without asking
  and says so once, in the status bar's counts slot for a few seconds with [Start empty], then
  goes (round 3, screen 19).
- **Only loss asks**: opening another file, closing the dataset or replacing the data while there
  is unsaved work opens one dialog listing what would be lost, counted, with [Cancel], [Close
  without saving] and [Save and close]. With no unsaved work, no question.

**Screens.** 16 (the dot and the file menu), 17 (save changes before replacing), 18, 19.

## 3.26 One home per capability

**Problem.** The current app offers most things in three or four places, each slightly different,
so the reader cannot learn where anything is.

**Rule.**

- Each capability's controls are drawn in exactly one place: its home. Part 1.4 decides where.
- Any other way in is a shortcut: a key, a menu row, a palette row, a link row ("Columns and roles
    > "), a toast's [Show]. A shortcut OPENS the home (and selects the object, or opens the tab);
    > it never draws a second copy of the home's controls.
- Two places that look like one capability are allowed only when they are two capabilities with
  different scope: Export (the whole picture) and an object's Record > Export (that object).
- A mirror that shows state is not a second home when it only reads and links back: the status
  bar's layout chip mirrors the Layout tab and its pause is the same command.

**Do.** Ask, for each control on a screen, "where is its home?" and expect one answer. **Don't.**
Put a Layout select in the status bar and another in a panel; put Present in the file menu and
the Views panel.

**Screens.** 16 (the file menu after round 4), 103 (the rail, to be drawn).

## 3.27 Words at rest

**Problem.** The largest single source of noise in the current app, and in the v2 mocks, is the
app explaining itself: sentences under rows, notes in popovers, design notes that leaked from the
specs into the drawn UI.

**Rule.**

- At rest, a panel carries its title, section headers, row labels, the reader's names, the data's
  values, and at most ONE sentence, which is about the data (the reading row: "34 nodes joined by
  78 edges in one connected part"). Nothing else: no "how this works", no "Enter keeps; Escape
  reverts", no "the tool snaps back to Select", no filler rows ("Covered by nothing", "Caveats
  none", "none in this file").
- A row that has nothing to say is omitted, not filled.
- Explanations live on request: a tooltip, the "?" at the end of the reading row, Help.
- A dialog may carry one short line per choice and one line naming the consequence of its commit
  ("3 objects re-run; Bridges turns stale"), because a dialog is where the reader decides.
- One kind of standing sentence is allowed because the reader is owed it: what data leaves the
  browser (the AI panel's line above its composer).
- Never an issue number, a screen number or a "not yet" in the UI.

**Do.** Put the explanation behind a "?". **Don't.** Write the spec into the screen.

**Screens.** 2 (the one reading row), and Part 5 for the many breaks.

---

# Part 4. The review checklist

Each check is pass or fail for one screen (a mock or the built app). They check behaviour and
placement; `visual-language.md` section 12 checks measurements. A screen passes when every check
that applies to it passes. The pattern each check comes from is in brackets. Part 5 cites these
numbers.

**The model**

1. Every row in the Objects panel is an object the reader made, or the Dataset. No row is a verb
   (a suggestion, a way to load), a note, a finding, a search result, a column, a layout or a
   style layer. [1.2]
2. Nothing on the screen styles a single node or edge except through an object (a one-node Set).
   [1.1]
3. Every panel, tab, popover and dialog can be named by one object or "the session", and no two
   of its rows are about two different objects that are not the selection. [1.3]
4. The inspector shows the selection, or the Dataset when nothing is selected; nothing else has
   taken its place, and it does not show an object while the canvas holds a different element
   selection. [1.1, 3.11]
5. After a load or any event the reader did not cause, no algorithm has run, no panel has
   switched, no disclosure has opened and nothing has appeared over the canvas. [1.1]

**Surfaces**

6. At most one overlay is open (menu, popover, list box, palette, dialog), except the allowed
   pairs (a secondary bar with its own popover; a list box over its popover or dialog; a
   submenu). A flyout and a popover are never open together. [2.2]
7. Every dialog on screen meets the dialog rule: it needs a file or destination, changes the data,
   cannot be undone, deletes more than was pointed at, or is Settings; and no other dialog does
   the same job. [2.2]
8. No dialog edits one object's property, asks for a tool's parameters, or reports a field error.
   [2.2]
9. Every popover is anchored beside the control that opened it and edits one row or object; it
   has at most one commit button, and none if it is a tool's parameters popover. [2.2, 3.9]
10. No popover opens another popover or an app dialog, and no popover holds results, charts or a
    list to browse. [2.2]
11. Every menu row is a verb or a value on one line; no menu holds a field, a checkbox, a switch,
    a "..." button or a sentence; a group heading is a noun. [2.2, 3.6]
12. The status bar holds only the items of Part 3.18, in that order; it shows no zoom, no armed
    tool's name, no pick instruction and nothing already said by a mode bar on screen. [3.18]
13. Every one-off event report ("Deleted X", "Saved", "Copied", "Restored") is a toast, not a
    status-bar item or a panel row; at most one toast is visible; it has at most one action.
    [3.17]
14. Nothing floats over the canvas except the toolbar, the legend and minimap when switched on,
    note markers, feedback for the gesture in progress, the first load's progress card and the
    fatal view card. [2.2]
15. The secondary bar appears only while a tool is armed or a canvas pick is waiting. [2.1]

**Collections and objects**

16. Every empty section is its header with a "+" and nothing else; a section with nothing to
    show and nothing to add is omitted. [3.1]
17. A "+" adds to the collection it heads, at once or through a short dark menu of kinds; it
    never opens a dialog for a simple add. [3.1]
18. A newly added item is at the top of its list (directly above its input for a derived object;
    at the end of an ordered sequence) and is selected. [3.2]
19. Parts of an object (paint rows, rule lines, members of a hand-made Set) are removed with a
    "-" on their row, at once. [3.3]
20. Deleting a leaf object does not ask; a toast with Undo reports it. [3.3, 3.16]
21. Every confirmation names what is lost, counted, says whether Ctrl+Z reverses it, and has a
    button that repeats the verb and count (never "OK", "Yes" or a bare verb). [3.16]
22. Names are edited in place (double-click, F2); there is no rename dialog, no "Rename..." with
    an ellipsis and no Name field for an existing object. [3.5]
23. Every object's "..." menu and right-click menu list the same rows, in the order of Part 3.6,
    with Delete last; one kind has one list on every screen; the "..." tooltip is "More". [3.6]
24. Tree rows show the eye and lock only on hover or when on; the eye and lock appear only on
    objects; the eye never means "show only". [3.7]
25. Reordering is drag with an insertion line, within the parent only. [3.4]

**Editing**

26. No inspector or panel property has an Apply, Save, OK or Done button, and there is no edit
    mode; fields commit on Enter, Tab or blur and revert on Escape. [3.10]
27. Several selected objects with different values show "Mixed". [3.10]
28. Advanced settings open in a popover from a gear on their row; no panel or popover has a
    fold-away section of fields. [3.9]
29. Every collapsed section's header carries a summary; every capped list ends in "and N more" or
    "See all N in table", worded exactly so. [3.8]
30. A field error is shown at the field; no field error is shown in a dialog or only in a toast.
    [3.15]
31. A disabled control that could be expected to work has a tooltip with the reason. [3.15,
    3.19]

**Tools and state**

32. A tool shown armed has a secondary bar stating variant, scope, count and cost with one commit
    verb (plus Select where the tool can select instead) and a close; nothing has run yet;
    its parameters popover, if open, repeats none of that. [3.12]
33. After a tool finishes, its object is at the top of the tree, selected, and the toolbar is
    back on Select. [3.12]
34. No tool parameter is asked for in a dialog; picks happen on the canvas. [3.12]
35. A computing object shows progress in its row, in its inspector header with Cancel, and in one
    status chip; no progress or Cancel is drawn twice on one surface; there is no blocking
    progress card after the first load. [3.13]
36. Every stale, failed, waiting or frozen object has its own glyph shape on its row with the
    state word as its tooltip and, when selected, its reason and one recovery action at the top
    of the inspector. [3.14]
37. No tree row holds an action button (Run, Re-run, Retry). [3.14]

**Words, keys and help**

38. Every icon-only control has a tooltip with its name (and key); no tooltip repeats a visible
    label. [3.19]
39. Every menu row with a key shows it right-aligned; every tooltip of a control with a key shows
    it; no key is written inside a label. [3.20]
40. Commands are verb first, sentence case, and end in "..." exactly when they ask for more. [3.22]
41. No two labels on the screen, or on two screens, use two words for one concept, and no word is
    used for two concepts (Style / Fill / Look, Hide / Focus, Delete / Remove from data, Open /
    Import, a Path called a Set). [3.22]
42. Every count follows the count grammar; no count is abbreviated; estimates say "about". [3.21]
43. At rest, no app-authored sentence other than one reading about the data; no filler row, no
    hint, no "coming soon", no issue or screen number. [3.27]

**Homes and files**

44. For every control on the screen, the UX documents name one home, and this screen is it or
    this control only opens it. [3.26]
45. Every setting on the screen is on the surface Part 3.23 assigns to what it changes. [3.23]
46. Every way data comes in opens the one Import dialog; every file the app writes is also under
    Export; export settings are a popover beside the inspector. [3.24]
47. Unsaved work shows as a dot after the dataset name; a question about unsaved work appears
    only when work would be lost. [3.25]
48. At most one filled accent button per surface. [`visual-language.md` K1]

---

# Part 5. Current violations in the v2 mocks

This is every place a screen in `mocks/v2/` breaks a check of Part 4, with the fix. It is the work
list for making the mocks consistent. The mocks are generated (`README.md` in this folder says
how), so each fix is a change to that screen's spec in
`/home/apowers/Projects/graphty-monorepo/tmp/object-first/gen/screens/screen-<n>.mjs`, or, where
the same break is on many screens, to the shared renderer.

Not listed: the frame changes round 4 already schedules for every screen (the rail, the icon-only
toolbar, the Views list leaving the tree, the Assistant leaving the dock, the "?" leaving the
status bar, the Dataset losing its Canvas and Data tabs). The screens are being regenerated in the
round-4 frame, so some PNGs already show the rail and some do not; the breaks below are about
behaviour and placement and hold in either frame. Measurement and colour breaks are
`visual-language.md` section 13's.

## 5.1 The breaks that repeat across screens

Fixing these eighteen fixes most of the per-screen list in 5.2. They are ordered by how much they
damage the model.

| #   | What goes wrong                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Screens                                                                                                                                              | Check  | Fix                                                                                                                                                                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | The Export sheet replaces the inspector, so the right panel stops meaning "the selection" while exporting                                                                                                                                                                                                                                                                                                                                                                                                                 | 95, 96, 97, 98                                                                                                                                       | 4, 46  | Export settings become a popover docked beside the inspector, opened from each Export menu row; the inspector keeps the selection; the canvas keeps the export frame      |
| 2   | One-off events are reported in the status bar ("Saved ...", "Restored your session ...", "Edited value ... [Undo]", "Added node Coach [Undo]", "Undone: ... [Redo]", "Deleted ... [Undo]", "Image copied to the clipboard", "Back from VR: 2 objects added", "Load cancelled")                                                                                                                                                                                                                                            | 18, 19, 28, 39, 42, 43, 44, 95, 100                                                                                                                  | 13     | A toast above the toolbar with at most one action; nothing in the status bar                                                                                              |
| 3   | The app explains itself at rest: sentences under rows, notes in popovers and dialogs, design notes and screen or issue numbers leaked from the specs ("screen 30", "join, screen 37", "#192", "The tool snaps back to Select"), and filler rows ("Covered by nothing", "Caveats none", "none in this file", "Colour not set")                                                                                                                                                                                             | 3, 5, 8, 12, 15, 17, 26, 28, 29, 30, 39, 40, 45, 46, 47, 51, 52, 53, 55, 56, 57, 59, 60, 62, 65, 68, 74, 75, 79, 84, 85, 86, 91, 93, 94, 95, 96, 102 | 43     | Delete the sentence; if it is needed, move it behind the reading row's "?" or into a tooltip; omit empty rows                                                             |
| 4   | Menus hold sentences, fields and buttons: prose rows ("Replaces Karate Club; asks to save first", "A look sets defaults, never an object's Style"), a checkbox and a segmented control inside tool flyouts, "..." buttons inside flyout rows, costs in the key column                                                                                                                                                                                                                                                     | 11, 16, 51, 69, 73, 74, 76, 83, 87, 92, 96, 97, 100                                                                                                  | 11     | One line per row, verbs or values only; a one-line noun heading at most; settings move to the secondary bar or its popover; costs sit at the row's right in secondary ink |
| 5   | Two overlays open at once: a tool's flyout with its parameters popover, and an autocomplete list with a popover                                                                                                                                                                                                                                                                                                                                                                                                           | 4, 61, 74                                                                                                                                            | 6      | The flyout closes when its row's parameters button is pressed; the popover opens above the secondary bar; draw the second overlay as an inset                             |
| 6   | A tool's commit is drawn twice: the parameters popover has its own Run or Create while the secondary bar has one too; the popover repeats the bar's scope, count and cost; the bar holds up to three commit verbs                                                                                                                                                                                                                                                                                                         | 4, 11, 59, 60, 61, 62, 64, 74                                                                                                                        | 9, 32  | The bar alone holds the commit (Run, or Select plus a Create split button); the popover holds only parameters the bar does not show, with no footer button                |
| 7   | Objects that are not current carry an action button in the tree row ("Run (4 min)"), or only a coloured dot with no distinct shape or tooltip                                                                                                                                                                                                                                                                                                                                                                             | 5, 19, 32, 42, 45, 46, 82                                                                                                                            | 36, 37 | A distinct glyph per state with the state word as tooltip; Run, Re-run and Retry at the top of the inspector and in the "..." menu                                        |
| 8   | The tree and the Objects panel hold things that are not objects: suggestion rows ("Find groups (G)"), the four ways to load as rows, a Find result drawn as a Set that does not exist yet                                                                                                                                                                                                                                                                                                                                 | 1, 2, 20, 28, 29, 31, 33, 50                                                                                                                         | 1      | Remove the suggestion rows; the ways in live in the Data panel's empty state; a Find result is a result row until "Make a set"                                            |
| 9   | Things float on the canvas that have a home elsewhere: the Welcome card, the scatter plot, the "Without node 1" preview card, a note drawn as a permanent callout, the keyboard readout                                                                                                                                                                                                                                                                                                                                   | 1, 27, 58, 70, 77, 81                                                                                                                                | 14     | Welcome content in the Data panel; the plot as a dock tab; the removal preview in the node inspector's section; note text on hover; the readout in the status bar         |
| 10  | The inspector does not show the selection: the Dataset's Layout tab while nodes are selected, or an object's inspector while other nodes are selected on the canvas                                                                                                                                                                                                                                                                                                                                                       | 68, 70, 85, 86                                                                                                                                       | 4      | Show the selection; start "Arrange only these" from the selection's inspector and keep its rows there; add members through "Add to set >" on the node selection           |
| 11  | The "..." and right-click menus differ from kind to kind and from screen to screen: missing Rename, Duplicate, Export or Delete; Delete not last; kind-specific verbs in random places; the node menu 9 rows on one screen and 6 on another; the "..." tooltip lists the contents                                                                                                                                                                                                                                         | 3, 16, 32, 33, 34, 44, 49, 53, 54, 72, 77, 80, 85                                                                                                    | 23     | The fixed order of Part 3.6, one list per kind drawn identically everywhere; tooltip "More"                                                                               |
| 12  | Advanced settings fold away inside a panel or a popover ("Advanced 1 option >", "Quality" disclosure, a "Changes per month" chart unfolding in the Time popover), and Settings folds its sections                                                                                                                                                                                                                                                                                                                         | 5, 10, 13, 60, 79, 95                                                                                                                                | 28, 10 | A gear on the row opening a popover; charts to the dock; Settings as a list of sections at the dialog's left                                                              |
| 13  | Edit modes with a Done button, and removals that wait for Done: editing a hand-made Set's members, editing a note                                                                                                                                                                                                                                                                                                                                                                                                         | 68, 81                                                                                                                                               | 26, 19 | No mode: "-" removes a member at once with an undo toast; "Add to set >" adds; a note commits on leaving its text area or Ctrl+Enter                                      |
| 14  | The status bar repeats what is on screen: the armed tool's name ("Rank: Bridges", "Filter: By values"), a pick instruction ("Layout: pick the root"), the time window already in the transport bar, the find count, the drag target; and every screen shows the zoom twice                                                                                                                                                                                                                                                | all; notably 4, 10, 48, 50, 57, 59, 61, 62, 63, 64, 67, 74, 75, 79, 80, 84, 102                                                                      | 12     | Drop those items; the zoom lives only in the framing pill                                                                                                                 |
| 15  | The same job is drawn on two different surfaces: opening a second graph (its own dialog on 21, the Import dialog's Into on 23 and 26); changing direction (its own dialog on 15, the Import dialog on 14); choice lists as light titled popovers with prose (67, 71, 75) instead of dark menus; pattern search as a tree Set (63) and as a Finding (76); results over time in three places (10, 79, 80); saved styles as one row (93) and a section (94); Focus on two objects offered (65) and ruled out (57)            | 10, 14, 15, 21, 23, 26, 57, 63, 65, 67, 71, 75, 76, 79, 80, 93, 94                                                                                   | 7, 44  | One surface per job, as each row of 5.2 says                                                                                                                              |
| 16  | Keys written inside labels ("Find groups (G)", "Make a set (Ctrl+G)", "Legend (L)", "Select (Enter)", "Neighbours (E)", "Exit (Esc)")                                                                                                                                                                                                                                                                                                                                                                                     | 2, 20, 33, 40, 41, 50, 52, 55, 64, 99                                                                                                                | 39     | The key in the tooltip and right-aligned in menu rows only                                                                                                                |
| 17  | One concept, several names: Open / Import; "Open beside to compare" / "Open as a second graph..." / "A second graph"; "Make a set" / "Make a Set" / "Make a set from these" / "Keep as set"; a Path called "Set" in the inspector; "Copy methods" / "Copy methods text"; "Export bundle..." / "Evidence bundle"; "Save project as..." / "Save as project..."; "Look" and "Default look"; "Canvas" as a Settings section and a Dataset tab; "See all N in table" / "Open all 6 in table" / "Open the group-by-group table" | 8, 13, 14, 16, 17, 19, 21, 26, 31, 55, 66, 70, 71, 72, 77, 78, 82, 85, 87, 95, 97, 102                                                               | 41, 29 | One word each, listed in Part 3.22; the rows of 5.2 name the choice                                                                                                       |
| 18  | Removing an item uses "x", a bare "Delete" button or a confirmation without a count                                                                                                                                                                                                                                                                                                                                                                                                                                       | 40, 61, 68, 81                                                                                                                                       | 19, 21 | "-" on the row, at once, with an undo toast; a confirmation button names verb and count ("Remove 3 nodes")                                                                |

## 5.2 Every break, screen by screen

Each row: the screen, what is wrong, the check it fails, and the fix.

### Screens 1 to 27

| Screen     | What is wrong                                                                                                                                                              | Check     | Fix                                                                                                           |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------- |
| 1          | An "Open a graph" card (drop zone, samples, Recent) floats on the canvas                                                                                                   | 14, 44    | Its content is the Data panel's empty state (round 4); the canvas stays empty until a file is dragged over it |
| 1          | The Objects section lists four verbs ("Open a file...", "Paste data...", "From a URL...", "From a database or service...") as rows                                         | 1, 16     | Objects shows only its header before a load; the four ways in are in the Data panel                           |
| 1          | The same ways in are drawn twice (the left panel and the card)                                                                                                             | 44        | One home, the Data panel                                                                                      |
| 2          | Suggestion rows "Find groups (G)", "Rank by connections (R)", "Find a path (P)" under the Dataset                                                                          | 1, 39, 43 | Remove them (Part 1.2)                                                                                        |
| 3          | "Covered by nothing" at the foot of the Style tab                                                                                                                          | 43        | Omit the row unless something covers the object                                                               |
| 3          | The "..." tooltip lists "Select members, Focus on this, Locate", not in the fixed order                                                                                    | 23        | Tooltip "More"; the menu in Part 3.6's order                                                                  |
| 3          | The inherited paint row "From Communities" carries a lock glyph                                                                                                            | 24        | A link glyph for inherited rows                                                                               |
| 4          | The Rank flyout and the Bridges parameters popover are open together                                                                                                       | 6         | The flyout closes; the popover opens above the secondary bar                                                  |
| 4          | The popover has its own Run and repeats "On what is showing, 115 nodes" and "About 2 s" from the bar                                                                       | 9, 32     | Remove the popover's Run and the repeated scope and cost                                                      |
| 4          | Status bar "Rank: Bridges" repeats the armed tool                                                                                                                          | 12        | Remove it                                                                                                     |
| 4          | Flyout row "Several... batch" is not a verb                                                                                                                                | 40        | "Run several..."                                                                                              |
| 5          | The waiting row carries a "Run (4 min)" button and truncates its name to "How far fro..."                                                                                  | 36, 37    | Hollow-circle glyph with "Waiting: about 4 min" as tooltip; Run in the inspector                              |
| 5          | "Advanced 1 option >" folds settings away in the Define tab                                                                                                                | 28        | A gear on the Define header opening a popover                                                                 |
| 5          | "Run (4 min)" drops "about"                                                                                                                                                | 42        | "Run (about 4 min)"                                                                                           |
| 7          | The overflow group is "Other" in the tree, "Other (4 more)" in the legend and "and 3 more" in the Style tab                                                                | 29, 41    | "Other (4 more)" in the tree and legend; the Style tab's cap reads "and 4 more"                               |
| 8          | The inspector's kind word is "Set" for an object the tree and legend call a Path                                                                                           | 41        | "Path"                                                                                                        |
| 8          | Prose at rest: "Shares 1 edge with Path: 1 -> 34; this path wins Colour, Width and Pattern on it"                                                                          | 43        | Remove; a covered channel is marked on its paint row                                                          |
| 9          | "label BrighamYoung" repeats the header's name                                                                                                                             | 43        | Omit the attribute used as the name                                                                           |
| 9          | Every row of the sorted data table carries a drag grip                                                                                                                     | 25        | No grips in the table                                                                                         |
| 9          | The dock header has two tab strips side by side (Table/History and Nodes/Edges)                                                                                            | 41        | Nodes/Edges as a segmented control in the table's own header                                                  |
| 10         | The window and counts show in the transport bar and again in the status bar                                                                                                | 12        | Status bar drops the window while the transport bar is up                                                     |
| 10         | The time attribute is set in the Time popover and in the Data tab                                                                                                          | 44        | One home (the Data panel's Time role); the popover shows it read-only                                         |
| 10         | The Time popover holds a "Changes" disclosure and an "Over time" "+" section (results inside a settings popover)                                                           | 10, 28    | Results and charts to the dock's Findings tab; the popover keeps settings                                     |
| 10         | Popover prose "cheap objects only; Communities (about 4 s) keeps its values"                                                                                               | 43        | Remove, or a tooltip on the switch                                                                            |
| 10         | Status "412 of 1,204" has no noun                                                                                                                                          | 42        | "412 of 1,204 nodes" (if the item stays)                                                                      |
| 11         | The Select flyout holds a checkbox with prose ("Front only in 3D, keep the nearest hit")                                                                                   | 11        | Move it to the Select tool's secondary bar                                                                    |
| 11         | The Filter flyout holds a Nodes / Edges segmented control                                                                                                                  | 11        | Target moves to the Filter secondary bar                                                                      |
| 11         | The Filter bar has Select, Create and Create and focus as three buttons; the Communities popover repeats Run                                                               | 32, 9     | [Select] [Create v] with "Create and focus" in the split; no Run in the popover                               |
| 11         | The bar text says Filter's popover opens by itself on arming                                                                                                               | 5         | Acceptable only because its fields are the tool; say so in round 4's reference, or open it from the gear      |
| 12         | "Covered by nothing" (dark twin of 3)                                                                                                                                      | 43        | As 3                                                                                                          |
| 13         | "Canvas" names a Settings section and a Dataset tab                                                                                                                        | 41        | Rename the Settings section "Display"                                                                         |
| 13         | Settings folds its sections, including "Advanced logging: warnings"                                                                                                        | 28        | A list of sections at the dialog's left (Part 3.23)                                                           |
| 13         | Notes beside selects list the options ("Auto, Off, Required")                                                                                                              | 43        | Remove; the select shows them                                                                                 |
| 14         | The same act is "Open a file..." (panel), "Open a graph" (card) and "Import email.csv" (dialog title); the fourth source is "A source" and "From a database or service..." | 41        | One verb (Open... in menus, Import as the dialog title) and one noun ("From a database...") everywhere        |
| 14         | Row notes "no nodes file", "names need a nodes file"                                                                                                                       | 43        | Keep one line naming the missing nodes file                                                                   |
| 15         | A separate "Change direction" dialog reloads the file, while the Import dialog already owns Direction                                                                      | 7, 44     | Open the Import dialog on this file with Direction focused and its Objects choice                             |
| 15         | Dialog prose "A re-run over the gate lands waiting, with its Run button in the row."                                                                                       | 43        | Remove                                                                                                        |
| 15         | With Remove chosen the button still reads "Reload"                                                                                                                         | 21        | "Reload and remove 3 objects"                                                                                 |
| 16         | The Open recent submenu has a prose heading "Replaces Karate Club; asks to save first"                                                                                     | 11        | Remove it                                                                                                     |
| 16         | The Dataset "..." tooltip lists its rows in a different order from 33 and 34                                                                                               | 23        | Tooltip "More"; the Dataset list of Part 3.6                                                                  |
| 16         | Recent times sit in the key column ("Mon 16:10"); screen 1 writes "project, Mon"                                                                                           | 11, 41    | The time at the row's right in secondary ink, one format                                                      |
| 17         | Prose "From the Dataset's "..." menu, or File > Close dataset." in the drawn UI                                                                                            | 43        | Remove (it belongs in the caption)                                                                            |
| 17         | The prompt is worded two ways ("Don't save / Save..." and "Close / Save first")                                                                                            | 21, 41    | [Cancel] [Close without saving] [Save and close] in both                                                      |
| 18         | "Saved karate-club.graphty 14:02" as a status notice                                                                                                                       | 13        | A toast on the first save; later saves only clear the dot                                                     |
| 18         | Save dialog carries three prose notes, one browser-specific                                                                                                                | 43        | One line per choice                                                                                           |
| 18         | The reopen-without-data inset has no Cancel                                                                                                                                | 21        | Add Cancel                                                                                                    |
| 19         | "Restored your session from 14:32 ... [Start empty] [Undo restore]" in the status bar, with two actions                                                                    | 13        | Toast "Restored your session from 14:32 [Undo]"                                                               |
| 19         | "2 need re-running" repeats the "2 stale" chip                                                                                                                             | 12        | Remove from the message                                                                                       |
| 19         | The stale row has only a dot; the waiting row has a "Run (2 s)" button                                                                                                     | 36, 37    | Glyphs with tooltips; Run and Re-run in the inspector                                                         |
| 19         | Recent inset ends with a paragraph about autosave                                                                                                                          | 43        | Remove                                                                                                        |
| 19         | "Save as project..." (here) and "Save project as..." (16); "Locate file..." and "Locate the file..." (18)                                                                  | 41        | "Save project as...", "Locate the file..."                                                                    |
| 20         | The suggestion rows are back in the tree                                                                                                                                   | 1         | Remove                                                                                                        |
| 20         | The Project row says "Not saved" but the header has no unsaved dot                                                                                                         | 47        | The dot, and no "Not saved" row                                                                               |
| 20         | Step 4 still reads "column not found" after a mapping was chosen                                                                                                           | 30        | "mapped to strength"                                                                                          |
| 20         | The Export recipe inset has no Cancel                                                                                                                                      | 21        | Add Cancel                                                                                                    |
| 21         | Opening a second graph has its own dialog ("Open normal.csv", Open as, Match by)                                                                                           | 7, 46     | The Import dialog with Into = "Open beside to compare" and its Match by row                                   |
| 21         | The counts 55 / 16 / 7 appear in the reading, in rows and in the legend                                                                                                    | 44        | The reading and the legend only                                                                               |
| 21         | "Both" and "in both"; status counts do not say they are the union                                                                                                          | 41, 42    | One word; "Union: 34 nodes 78 edges"                                                                          |
| 22         | Progress and Cancel in the dialog and again in a status chip                                                                                                               | 35        | The dialog only (a first load)                                                                                |
| 22         | Three explanatory lines about fetching and the preview                                                                                                                     | 43        | Remove; the disabled Load's tooltip says why                                                                  |
| 22         | Fetch stays active while fetching                                                                                                                                          | 35        | Fetch becomes Cancel while it runs                                                                            |
| 23         | Format help prose under the text area                                                                                                                                      | 43        | In the Format select's tooltip                                                                                |
| 23         | "Add 6 nodes" hides the 10 edges (26 says "Add 26 nodes and 62 edges")                                                                                                     | 21, 41    | "Add 6 nodes and 10 edges"                                                                                    |
| 23         | Row order differs from 14 and 26 (Format below the text)                                                                                                                   | 44        | Same order on every tab of the Import dialog                                                                  |
| 24         | Target and Time folded into a note instead of selects                                                                                                                      | 41        | One select per role, as on 14                                                                                 |
| 24, 25, 26 | No File / URL / Paste / From a database tab strip, which 14, 22 and 23 have                                                                                                | 41        | The same dialog frame on every Import screen                                                                  |
| 25         | "All 12 rows, and copy them >" leads to a second surface from inside the dialog                                                                                            | 10        | Show the rows in the dialog, scrollable, with Copy                                                            |
| 25         | Link text "Check the separator (opens Options)"                                                                                                                            | 40        | "Check the separator"                                                                                         |
| 26         | Screen numbers in the UI ("join, screen 37", "screen 21")                                                                                                                  | 43        | Remove                                                                                                        |
| 26         | Three prose notes on the Into choice                                                                                                                                       | 43        | The dry-run line and the result line only                                                                     |
| 26         | The second-graph option has four names across 16, 17, 21, 23 and 26                                                                                                        | 41        | "Open beside to compare" everywhere                                                                           |
| 27         | The load error lives in the floating Welcome card                                                                                                                          | 14        | In the Data panel, where the load started                                                                     |
| 27         | The status chip "Load failed ... [Details]" repeats the error on screen                                                                                                    | 12        | No chip while the error is shown in place                                                                     |
| 27         | "(Copy)" written as text after the code                                                                                                                                    | 38        | A copy icon button with the tooltip "Copy code"                                                               |

### Screens 28 to 52

| Screen     | What is wrong                                                                                                             | Check  | Fix                                                                                                 |
| ---------- | ------------------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------- |
| 28         | The loading card carries spec prose ("Nothing is drawn until the load finishes. Cancel returns to the Welcome sheet ...") | 43     | Name, bar, Cancel, "256 of 610 MB" only                                                             |
| 28         | Cancel is drawn in the card, the inspector and the status chip                                                            | 35     | Cancel in the card; the status chip without Cancel                                                  |
| 28         | "The tabs open when the load finishes."                                                                                   | 43     | Remove                                                                                              |
| 28         | The caption has "Load cancelled" reported in the status bar                                                               | 13     | A toast                                                                                             |
| 28, 29, 31 | The empty Objects panel lists the ways to load as rows                                                                    | 1      | As screen 1                                                                                         |
| 29         | A screen number in the dialog ("screen 30")                                                                               | 43     | "about 350,000, drawn 200,000 at a time"                                                            |
| 29         | "The largest connected part" is choosable while its note says it is still over the limit                                  | 31     | Disable the row with the reason as its tooltip                                                      |
| 29         | Prose about estimates and "Dataset > Overview says which subset..."                                                       | 43     | Remove; the estimates' tooltip says they are rough                                                  |
| 29         | The promised "Change..." for the loaded subset is not on screen 30's Overview                                             | 44     | Add "Loaded: everything, drawn 200,000 [Change...]" to 30, or drop the promise                      |
| 29         | The Load radio group is split by the Node id / Hops fields                                                                | 40     | One group; Node id and Hops indented under their option                                             |
| 30         | Prose about what is loaded and what performance mode does, restated by three rows                                         | 43     | The switch and its rows only                                                                        |
| 30         | "Change ceiling... (Settings > Performance)" puts a path in the label                                                     | 40     | "Change ceiling..." with the path in its tooltip                                                    |
| 31         | "Connected: Neo4j 5.18 ..." sits above the Test button as its label                                                       | 30     | The result under the button, where a failure shows                                                  |
| 31         | "this session only" and "or STRING" repeat the field note and the select                                                  | 43     | Remove                                                                                              |
| 31         | Three names for one source: "From a database or service...", "A source", "Import from a source"                           | 41     | One name                                                                                            |
| 31         | "38 of 40 names matched; 2 listed" does not say where                                                                     | 43     | "2 unmatched: FOO, BAR"                                                                             |
| 32         | "Reload" and "Retry" side by side do the same thing                                                                       | 44, 41 | Retry while failed; Reload otherwise                                                                |
| 32         | The failure is in the inspector and again as a status chip with its own Details                                           | 12, 44 | Inspector top and a glyph on the Dataset row; no chip                                               |
| 32         | The failed reload is not at the top of the inspector and the Dataset row has no mark                                      | 36     | Move it to the top; mark the row                                                                    |
| 32, 33, 34 | The Dataset "..." has different rows and orders                                                                           | 23     | The Dataset list of Part 3.6                                                                        |
| 33         | Suggestion rows in the tree                                                                                               | 1      | Remove                                                                                              |
| 33         | Rejected rows are listed in the inspector and in the dock; "Add fixed rows" is in both                                    | 44     | Inspector: "Rejected 2 [See in table]"; rows and Add fixed rows in the dock only                    |
| 33         | "Add fixed rows" is enabled with 0 ready                                                                                  | 31     | Disabled with the reason as tooltip                                                                 |
| 33         | Dock footer prose and "type a source in the cell"                                                                         | 43     | Remove                                                                                              |
| 34         | "Objects [Keep and re-run / Remove]" removes every object with no count on the commit                                     | 21     | The commit reads "Reload and remove 3 objects" when Remove is chosen                                |
| 34         | "Scale 1.0 x" (a picture property) sits among load rules                                                                  | 45     | Move to the Dataset's Layout tab                                                                    |
| 34         | "One undo step. Each kept edge's weight is the sum of its repeats."                                                       | 43     | Keep only the consequence line                                                                      |
| 35         | "Rename..." carries an ellipsis though it renames in place                                                                | 22, 40 | "Rename"                                                                                            |
| 35         | "Set as type" reloads the file with no ellipsis                                                                           | 40     | "Set as type..." opening the reload's options                                                       |
| 36         | "No object reads joined. After the change, Set as time lists it."                                                         | 43     | Remove                                                                                              |
| 37         | "New empty column..." implies a dialog for a simple add                                                                   | 17, 40 | "New empty column" adds "column 1" at the top, in rename                                            |
| 37         | The "Map identifiers" disclosure opened by itself                                                                         | 5      | Closed, with the summary "0 matched without it"                                                     |
| 37         | "Columns to add:" ends in a colon                                                                                         | 40     | "Columns to add"                                                                                    |
| 38         | The function list and the missing-input rule are printed under the field                                                  | 43     | In the completion list and its tooltip                                                              |
| 39         | "Enter keeps; Escape reverts." and "The same value is being edited in the table below ..."                                | 43     | Remove                                                                                              |
| 39         | "Edited value of BrighamYoung: 7 -> 9 [Undo]" in the status bar (inset)                                                   | 13     | A toast                                                                                             |
| 39         | Consequence prose "Conference re-ran (instant) ..." in the inspector                                                      | 43     | Remove; the canvas shows it                                                                         |
| 39         | "Revert" beside the undo toast reads as a second Undo                                                                     | 41     | "Restore file value"                                                                                |
| 40         | The confirmation's button is "Remove" with no count                                                                       | 21     | "Remove 3 nodes"                                                                                    |
| 40, 41     | Keys inside labels ("Make a set Ctrl+G", "Remove from data... Delete")                                                    | 39     | Keys in tooltips                                                                                    |
| 40, 41     | "3 nodes" in the header, "3 nodes 3 edges between them" in the summary, "3 selected" in the status                        | 43     | Summary "3 edges between them"                                                                      |
| 40         | "Re-run is in its row."                                                                                                   | 43     | Remove                                                                                              |
| 42         | Right-click > "Add node here..." opens a form card (Id, Label, club, Create)                                              | 17, 26 | Add the node at once with the next free id, selected, label in rename; club edited in the inspector |
| 42         | "Added node Coach [Undo]" in the status bar                                                                               | 13     | A toast                                                                                             |
| 42         | Undo drawn four times for two events (status, inspector row, inset row, inset line)                                       | 13, 44 | Undo in the toast only; the inspector row is state ("Made by hand, 14:20")                          |
| 42         | Stale rows show only an amber dot                                                                                         | 36     | Glyph with tooltip                                                                                  |
| 42         | "Placed where you clicked and pinned."                                                                                    | 43     | Remove                                                                                              |
| 43         | "Undone: Found groups, Renamed Group 3 [Redo]" in the status bar                                                          | 13     | A toast, only when the undone change is off screen                                                  |
| 43         | Dock footer prose with the keys and the discard warning at rest                                                           | 43     | Keys in tooltips; the warning only before a change would discard                                    |
| 44         | Export... sits in the Focus group; Move up and Move down are in the Export group's place                                  | 23     | Part 3.6's order: Move up / Move down, then Export..., then Delete...                               |
| 44         | The caption has the leaf delete reported in the status bar                                                                | 13, 20 | "Deleted Top 10 by Bridges [Undo]" as a toast                                                       |
| 45         | The failed row has only a red dot; the waiting row has "Run (4 min)" and a truncated name                                 | 36, 37 | Glyphs with tooltips; buttons in the inspector                                                      |
| 45         | Status chip "Bridges failed [Show]" while the row is in view                                                              | 12     | Only while the Objects panel is closed                                                              |
| 45         | Policy prose "A GPU run never finishes on the CPU by itself ..."                                                          | 43     | "Graphics card reset (E_DEVICE_LOST)" and the two buttons                                           |
| 46         | Stale rows show only an amber dot                                                                                         | 36     | Glyph with tooltip; Groups inherit without their own mark                                           |
| 46         | "Old values and paint are kept until the re-run."                                                                         | 43     | Remove                                                                                              |
| 47         | The view-lost card is drawn as a modal dialog (title bar, X, footer)                                                      | 14, 8  | A canvas card with Reload view and Copy diagnostics, no X                                           |
| 47         | Reload view is in the card and in the status chip                                                                         | 44     | The chip reads "View lost", no action                                                               |
| 47         | The card explains the causes in a paragraph                                                                               | 43     | "Your data and objects are kept."; causes in Details                                                |
| 47         | The error's Details popover holds "Choose another image..." and "Remove background", a copy of the Background row         | 44, 10 | One link "Open background settings" to the Styles panel's row                                       |
| 47, 51     | "Covered by nothing" on the Group's Style tab behind                                                                      | 43     | Remove                                                                                              |
| 48         | The variant "Path: Shortest route" and "2 picked" are in the status bar, not the bar                                      | 12, 32 | In the secondary bar                                                                                |
| 48         | Exit Focus in the inspector and in the status bar                                                                         | 44     | The status chip is the home; the inspector row is Focus's state only                                |
| 49         | The tree-row menu lacks Re-run and Export..., which 44's has                                                              | 23     | The same list as 44                                                                                 |
| 49         | The node right-click menu lacks rows the node "..." on 42 has                                                             | 23     | One node list; rows that do not apply are disabled with a reason                                    |
| 49         | "What breaks if removed" is not verb first                                                                                | 40     | "Show what breaks if removed"                                                                       |
| 49, 51     | "Save view..." has an ellipsis though it adds at once                                                                     | 40, 17 | "Save view": the view appears at the top, in rename                                                 |
| 49         | The tree-row menu is drawn open at full strength beside the node menu                                                     | 6      | Draw it as an inset tagged as a separate moment                                                     |
| 50         | Find's bar sits in the secondary bar's place with no tool armed                                                           | 15     | Find's actions under its field in the Objects panel                                                 |
| 50         | The "Values in" result is drawn as a selected Set row with a chip                                                         | 1      | A result row (search glyph, no chip) until "Make a set"                                             |
| 50         | The query is typed in Find and again in the table's search; the count shows three times                                   | 44, 12 | The table filters to Find's result with no field of its own; no status chip                         |
| 50         | Keys in labels: "Select (Enter)", "Make a set (Ctrl+G)", "Close (Esc)"                                                    | 39     | Keys in tooltips                                                                                    |
| 50         | "Objects none" for an empty result section                                                                                | 16     | Omit it                                                                                             |
| 51         | The framing menu's last row is prose about 2D                                                                             | 11     | Remove; in 2D the menu shows "Zoom to 100%"                                                         |
| 51, 49     | Shift+2 is "Zoom to selection" here and "Locate" on 49 (and in object menus and Members headers)                          | 41     | One name, "Zoom to selection", everywhere (Part 3.6)                                                |
| 52         | Inspector prose restating the minimap's 3D rule                                                                           | 43     | Remove; the disabled switch's tooltip says it                                                       |
| 52         | "Legend (L)", "Minimap (M)"                                                                                               | 39     | Keys in tooltips                                                                                    |
| 52         | "400%" in the pill, the minimap header and the status bar                                                                 | 12     | The pill only                                                                                       |

### Screens 53 to 77

| Screen     | What is wrong                                                                                                                      | Check     | Fix                                                                                                                                    |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 53         | The View inspector has "Export image from this view", a second home for export                                                     | 44        | A row "Export image..." in the View's "..." that opens the Export menu's image settings for this view                                  |
| 53         | A "What a view keeps" section with a six-line paragraph                                                                            | 43        | Remove; behind the "?"                                                                                                                 |
| 53         | The View "..." tooltip lists "Rename, Duplicate, Delete, Present from here", Delete not last                                       | 23        | The View list of Part 3.6                                                                                                              |
| 53, 54     | "Custom" and "Following BrighamYoung" in the pill and in the status bar                                                            | 12        | The pill only                                                                                                                          |
| 54, 77     | The node "..." has 9 rows on 54 and 6 on 77; 77's tooltip says "Style its group..." while its menu says "Style this node..."       | 23        | One node list, drawn the same                                                                                                          |
| 55         | Reading line "9 by box, 1 by Shift+click. Shift adds, Alt removes."                                                                | 43        | "10 nodes, 17 edges between them"                                                                                                      |
| 55         | "Make a set (Ctrl+G)"; Select verbs drawn as a table with keys                                                                     | 39        | Verbs as rows or buttons; keys in tooltips                                                                                             |
| 55         | "Add to [Degree > 8]" is a bare select with no verb                                                                                | 40        | "Add to set >" as a menu row with a submenu                                                                                            |
| 55         | "Hidden by hand" is drawn as a row with an eye and a lock                                                                          | 24, 1     | Hand-hidden nodes are a status-bar mask ("3 hidden [Show all]")                                                                        |
| 56         | An "Endpoints tab" section describes another tab in prose                                                                          | 43        | Remove; draw that tab in an inset                                                                                                      |
| 56         | Filler rows "weight none in this file", "All 0 attributes", an empty "Member of" header                                            | 16, 43    | Omit them                                                                                                                              |
| 56         | Table headers "source", "target", "id" are lower case beside "Conference"                                                          | 41        | Show the data's own column names as written, consistently                                                                              |
| 57         | Paragraph about replacing and combining Focus                                                                                      | 43        | Remove                                                                                                                                 |
| 57         | Status "Rank: Connections" repeats the bar                                                                                         | 12        | Remove                                                                                                                                 |
| 57         | "Edges 23" and "Inside 23" say the same number                                                                                     | 43        | Inside and Cut only                                                                                                                    |
| 57         | "Exit focus" is a filled button in the Members tab                                                                                 | 48        | A plain button; the status chip's Exit is the home                                                                                     |
| 58         | The keyboard walk's caption uses the secondary bar and floats on the canvas                                                        | 15, 14    | The readout in the status bar; the live region off screen                                                                              |
| 58         | "Keyboard: node 34" in the status bar repeats the caption                                                                          | 12        | One place (the status bar)                                                                                                             |
| 59         | The bar has Select, Create and Create and focus; the popover has its own filled Create                                             | 32, 9, 48 | [Select] [Create v] on the bar; no button in the popover                                                                               |
| 59         | The popover's X and the bar's x both cancel                                                                                        | 44        | The popover has no X while it is the tool's; the bar's x disarms                                                                       |
| 59         | Data-tab prose "A column's "..." > Filter by opens this same popover ..."                                                          | 43        | Remove                                                                                                                                 |
| 59, 67, 68 | "and 5 more (scroll)" inside a list that scrolls                                                                                   | 29        | Let it scroll with no row                                                                                                              |
| 59         | Inset text "The tool snaps back to Select; screen 60 ..."                                                                          | 43        | Move to the caption                                                                                                                    |
| 59         | Status "Filter: By values" repeats the bar                                                                                         | 12        | Remove                                                                                                                                 |
| 60         | "Create on a Measure waits on #192"; bar button "Create (not yet)"                                                                 | 43        | Draw the state after the work lands, or omit Create; never an issue number                                                             |
| 60         | "Drag across the histogram to set the band ..."                                                                                    | 43        | Tooltip on the histogram                                                                                                               |
| 60         | "Advanced none" folds settings in the Define tab                                                                                   | 28, 43    | A gear, and no "none"                                                                                                                  |
| 60, 61, 63 | "Live: an edit re-filters at once" (60), "Re-filters on Enter" (61), "Re-runs on Enter (about 20 ms)" (63) on the same kind of tab | 41, 43    | One word in secondary ink, "Live" or "Re-run on Enter", and no sentence                                                                |
| 61         | The Filter popover and the autocomplete list are open together                                                                     | 6         | Draw one as an inset                                                                                                                   |
| 61         | "Expression shows the same rule as text."                                                                                          | 43        | Remove                                                                                                                                 |
| 61, 68     | Rule lines and members are removed with "x"                                                                                        | 19        | "-"                                                                                                                                    |
| 61         | Bar and popover commits as on 59                                                                                                   | 32, 9     | As 59                                                                                                                                  |
| 61, 62     | Status "Filter: By rule", "Filter edges: By range"                                                                                 | 12        | Remove                                                                                                                                 |
| 62         | Data-tab prose about filtering edges                                                                                               | 43        | Remove                                                                                                                                 |
| 62         | Inset rows "Chip a line, not a ring" and "Its Style tab paints EDGES rows." are design notes                                       | 43        | Move to the caption; draw the real row                                                                                                 |
| 62         | Bar and popover commits as on 59                                                                                                   | 32, 9     | As 59                                                                                                                                  |
| 63         | Dock footer "Match 3 of 45: Tab and Shift+Tab step through the matches"; the count again in the status bar                         | 43, 12    | "Match 3 of 45" with Previous and Next; nothing in the status bar                                                                      |
| 63         | A node Set drawn with a line chip (a line means an edge Set, 62)                                                                   | 41        | A ring chip                                                                                                                            |
| 63, 76     | Pattern search is a tree Set here and a Finding on 76                                                                              | 44        | A Set (its matches are members); remove "Pattern..." from the Findings "+"                                                             |
| 64         | The Options popover repeats the bar's Steps, Edges and scope sentence, and has Select and a filled Create                          | 9, 32     | The popover keeps Direction and Keep edges; the commit on the bar only                                                                 |
| 64         | "Neighbours (E)" in the label                                                                                                      | 39        | Key in tooltip                                                                                                                         |
| 64         | Direction drawn disabled on undirected data                                                                                        | 16        | Omit it on undirected data                                                                                                             |
| 64         | Status "Neighbours of BrighamYoung" repeats the bar                                                                                | 12        | Remove                                                                                                                                 |
| 65         | Paragraph about the linked Set turning stale and frozen                                                                            | 43        | Remove                                                                                                                                 |
| 65         | Combine verbs drawn as a table with a selected-looking row and inline keys                                                         | 39        | Four buttons each with its result count; keys in tooltips                                                                              |
| 65, 57     | "Focus on these" on two objects contradicts 57 ("Combine them first")                                                              | 44        | Keep 57's rule: Focus takes one Set; remove the button                                                                                 |
| 65, 70     | "Hide all" and "Lock all" buttons repeat the header's eye and lock                                                                 | 44        | Remove the buttons                                                                                                                     |
| 65, 70     | "Delete (2)" and "Delete 2"                                                                                                        | 40, 41    | "Delete 2 objects..." in the "..." menu                                                                                                |
| 65         | Outline "Mixed" shown with a purple swatch                                                                                         | 27        | A neutral Mixed swatch                                                                                                                 |
| 65         | Status "2 objects" repeats the inspector title                                                                                     | 12        | Remove (the status counts elements only)                                                                                               |
| 66, 57     | The Members tab's Select / Focus / Locate row is first here and last on 57                                                         | 41        | First on every Members tab                                                                                                             |
| 66         | "Open all 6 in table"                                                                                                              | 29        | "See all 6 in table"                                                                                                                   |
| 66, 59, 60 | A new Set opens on Members (66) or Define (59, 60)                                                                                 | 33        | Members (Part 3.2)                                                                                                                     |
| 67         | The end-node matches are a light titled popover with prose                                                                         | 11, 43    | A dark list under the field, as on 61                                                                                                  |
| 67         | The bar has no commit verb                                                                                                         | 32        | "Create", disabled until To is set                                                                                                     |
| 67         | Inset text "Tab steps through the routes, as on screen 63"                                                                         | 43        | Move to the caption                                                                                                                    |
| 67         | Status "Path: All routes" repeats the bar                                                                                          | 12        | Remove                                                                                                                                 |
| 68         | An edit mode with "Editing ... Done"; removed members stay faded until Done                                                        | 26, 19    | No mode: "-" removes at once with an undo toast; "Add to set >" adds                                                                   |
| 68         | Undo paragraph and the reading "Made by hand from a selection ..."                                                                 | 43        | The reading reports the data ("12 teams")                                                                                              |
| 68         | The inspector shows the Set while three other nodes are selected                                                                   | 4         | The inspector shows the three nodes, with "Add to set >"                                                                               |
| 68         | Inset "The x shows only for a hand-made Set"                                                                                       | 43        | Move to the caption                                                                                                                    |
| 69         | The Top list's "+" makes a Set elsewhere                                                                                           | 17        | "Make a set from the top 10" as a button under the list and in the "..."                                                               |
| 69         | The "+" menu ends with the heading "Linked: re-runs when Influence does"                                                           | 11        | Remove                                                                                                                                 |
| 69         | "Field [score]" drawn disabled when there is one field                                                                             | 16        | Omit it                                                                                                                                |
| 70         | The scatter plot is a floating panel on the canvas with its own footer                                                             | 14        | A "Plot" tab in the dock                                                                                                               |
| 70         | "Combine into a score" (plot) and "Combine into a score..." (inspector)                                                            | 44, 40    | One home, the inspector, with "..."                                                                                                    |
| 70, 65     | Combine for Measures is drawn enabled with an explaining sentence here, and disabled with a reason on 65                           | 31, 43    | Disabled, with "Combine needs Sets or Groups" as tooltip                                                                               |
| 70, 75     | Tree rows show the unlocked lock at rest                                                                                           | 24        | On hover only                                                                                                                          |
| 70         | The inspector shows two Measures while four nodes are selected                                                                     | 4         | Show the selection that changed last                                                                                                   |
| 71         | "Names from" opens a light popover of links, a preview table and a note                                                            | 11, 43    | A dark menu of the choices; the tree is the preview                                                                                    |
| 71         | "0.42 a clear split" and the reading say it twice                                                                                  | 43        | The reading only                                                                                                                       |
| 71, 72     | "Between groups" is a link on 71 and a table with another link on 72                                                               | 41        | One form of the section                                                                                                                |
| 72         | "3 collapsed" three times (status, summary, row label)                                                                             | 12, 43    | The status chip and the summary                                                                                                        |
| 72         | The "..." tooltip lists kind verbs, no Rename first, no Delete last; "Collapse groups" vs "Collapse all"                           | 23, 41    | Part 3.6's order; "Collapse groups" everywhere                                                                                         |
| 73         | The Export select's menu ends with a description                                                                                   | 11        | Descriptions in each row's tooltip                                                                                                     |
| 73         | "Notes 0 +" puts a count on an empty section                                                                                       | 16        | "Notes" with "+"                                                                                                                       |
| 73, 75     | The Record's Export row has a button on 73 and none on 75                                                                          | 41        | Select plus Export button on every Record tab                                                                                          |
| 74         | The Rank flyout stays open with the "Rank several" popover beside it; flyout rows carry "..." buttons                              | 6, 11     | Choosing "Run several..." closes the flyout; the checklist opens above the bar                                                         |
| 74         | Popover note "3 chosen, about 4 s in all. The first paints ..."                                                                    | 43        | "3 chosen" in the bar's count, the cost beside it                                                                                      |
| 74         | The popover's primary "Create 3" and the bar's Run are two commits with two words                                                  | 9, 32     | Run on the bar only                                                                                                                    |
| 74         | The best sweep row uses the selected-row fill to mean "best"                                                                       | 41        | A glyph or strong value, not the selection tint                                                                                        |
| 74, 75     | Status "Rank: several", "Rank: Bridges"                                                                                            | 12        | Remove                                                                                                                                 |
| 75         | The scope list is a light titled popover with prose                                                                                | 11, 43    | A dark menu with rows and sizes                                                                                                        |
| 75         | Record note about edges between members; "Caveats none"                                                                            | 43        | "Scope: within Group 2, 11 nodes"; omit empty Caveats                                                                                  |
| 76         | The Findings "+" menu ends with a sentence; costs sit in the key column                                                            | 11        | Remove the sentence; costs at the row's right in secondary ink                                                                         |
| 76         | "Triangles 45 matches stale, Re-run" puts an action in a findings row                                                              | 37        | The state glyph; Re-run in the row's "..."                                                                                             |
| 77         | The "Without node 1" preview is a floating card with an X, prose and three buttons                                                 | 14, 43    | The node inspector's "What breaks if removed" section holds the result, Make a set and Remove from data...; the status chip keeps Exit |
| 77         | The same preview is stated in the card, the inspector and the status bar; "Close" repeats the X and Exit                           | 12, 44    | The inspector and one status chip                                                                                                      |
| 77         | "Keep as set"                                                                                                                      | 41        | "Make a set"                                                                                                                           |

### Screens 78 to 102

| Screen         | What is wrong                                                                                                    | Check      | Fix                                                                                   |
| -------------- | ---------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------- |
| 78             | "Combine takes Sets and Groups; these are Groupings" at rest                                                     | 43         | Omit Combine for Groupings, or disable it with that tooltip                           |
| 78             | "Make a set" here, "Make a Measure", "Make a Grouping" elsewhere                                                 | 41         | Kind names capitalised as nouns in every "Make a ..."                                 |
| 78, 80         | "Cameras [on] linked", "Colours [on] kept stable"                                                                | 40         | "Link cameras", "Keep colours"                                                        |
| 79             | The Time popover's first row is "Time attribute, window, mode, step: above"                                      | 43         | Remove                                                                                |
| 79             | The series over time is drawn in the popover, the Dataset's Findings and the dock                                | 44         | The dock's Findings tab is the home; the Findings row opens it                        |
| 79             | The Time popover unfolds a "Changes per month" chart with a lin/log toggle                                       | 10, 28     | The chart in the dock                                                                 |
| 79             | The Time popover covers the right end of the toolbar                                                             | 9          | Anchor it above the transport bar's gear                                              |
| 79             | "Biggest movers" as a table in the inspector and a column in the dock                                            | 44         | One line and "Make a Measure" in the inspector; the table in the dock                 |
| 79             | "2019-03 to 05" beside "2019-03 to 2019-05"; "Go to" and "Go to this time"                                       | 41, 42     | One date form; "Go to this time"                                                      |
| 79, 80         | The status mask repeats the transport bar                                                                        | 12         | Drop it while the transport bar is up                                                 |
| 79             | Only April is highlighted while the window is March to May                                                       | 41         | Highlight the whole window                                                            |
| 80             | The "Communities over time" popover has no visible trigger                                                       | 9          | A gear on the section header, pressed while open                                      |
| 80             | The Grouping's "..." lists kind verbs out of order                                                               | 23         | Part 3.6's order, kind verbs in their group                                           |
| 80, 79         | The over-time result has its own section here while Findings is empty; on 79 it is a Finding                     | 44         | A Findings row ("Over time: 12 steps, 5 events") on both                              |
| 80             | The popover's footer has Re-run and Open in table                                                                | 9          | Re-run in the "..."; Open in table as a link row                                      |
| 81             | Node 34's note is drawn as a permanent callout with a leader line                                                | 14         | A marker; the text on hover or when selected                                          |
| 81             | The note editor has "Done" (filled) and "Delete" buttons                                                         | 26, 19, 48 | Commit on leaving or Ctrl+Enter; "-" on the note row with an undo toast               |
| 81             | An orphaned note offers "Delete" as a plain button                                                               | 19         | "-" on its row                                                                        |
| 82             | The waiting row "How far..." has a "Run (4 min)" button                                                          | 37         | Glyph; Run in the inspector                                                           |
| 82             | The newest object is not selected                                                                                | 33         | Select it, or draw the reader's click on "Made:"                                      |
| 82             | Ask is drawn armed with no secondary bar                                                                         | 32         | Ask is not a tool (round 4 moves it to the AI rail item)                              |
| 82             | "The assistant needs a provider: ..." and "Opens Settings > Assistant"                                           | 43         | "Choose a provider..." with a tooltip                                                 |
| 82, 95         | "Copy methods" (82) and "Copy methods text" (95)                                                                 | 41         | "Copy methods text"                                                                   |
| 83             | The Layout menu's prose heading "34 nodes in one part: any layout is quick"                                      | 11         | Remove; the reason in the Recommended row's tooltip                                   |
| 83, 84, 85, 86 | Re-running the layout is "Re-run [Same seed] [New seed]" on 83 and 86, a single "Re-run" on 84 and 85            | 41         | One Re-run with a seed choice in its gear                                             |
| 84             | "Rows count the steps from the root. ..."                                                                        | 43         | Remove                                                                                |
| 84             | Root is editable in the focused field and in the pick bar at once                                                | 44         | Typing in the pick bar only                                                           |
| 84             | The caption's pick button on the Root row is not drawn                                                           | 38         | Draw it, pressed                                                                      |
| 84             | Status "Layout: pick the root" repeats the pick bar                                                              | 12         | Remove                                                                                |
| 85             | Group 2's row menu has no Rename, Duplicate, Export or Delete, and adds Hide and Lock (the eye and lock)         | 23         | Part 3.6's Group list, with "Arrange only these..." in the kind group                 |
| 85             | "11 selected" while the inspector shows the Dataset's Layout tab                                                 | 4          | Show the selection; the arrangement's rows in its inspector                           |
| 85             | "Only Group 2 moved; ... One undo step (Ctrl+Z) puts the eleven back."                                           | 43, 13     | Remove; a toast "Arranged Group 2 [Undo]"                                             |
| 85             | "Back to whole graph" repeats "Apply to [Group 2]"                                                               | 44         | Remove the button                                                                     |
| 85, 83, 84, 86 | "Apply to" is first on 85 and below Layout elsewhere                                                             | 41         | One row order                                                                         |
| 86             | "1 selected" (the dragged node) while the inspector shows the Dataset                                            | 4          | Node 12's inspector, Pin on                                                           |
| 86             | "A dragged node stays where it is dropped. ..."                                                                  | 43         | Remove                                                                                |
| 86             | Pinning has two homes: "Pinned 2 [Unpin all]" and the tree's "Pinned" Set                                        | 44         | The tree Set is the home; the Layout row links to it                                  |
| 87             | The Look menu ends with a sentence                                                                               | 11         | Remove                                                                                |
| 87             | "Look [Default]" and a section "Default look" use "look" for two things                                          | 41         | Rename the section "Defaults"                                                         |
| 87             | The Default look "+" has no clear job                                                                            | 17         | Remove it, or make it add a whole-graph channel with that tooltip                     |
| 87             | Switch caption "what the mask leaves out, at 15 percent"                                                         | 43, 42     | Tooltip; "15%"                                                                        |
| 88             | The label budget is chosen in the row and again in its popover                                                   | 44         | The row shows the choice; the popover holds only style                                |
| 89             | Hovering a node reveals the eye and lock on the rows that contain it                                             | 24         | Hover from the canvas gives the rows their hover fill only                            |
| 89, 92, 93     | Conferences are "0" to "11" in the legend and tree but "Mountain West" in the tooltip                            | 41         | One name per group everywhere                                                         |
| 90             | The Palette popover's rows with chevrons look like sub-panels; "Add palette..." opens more from a popover        | 10         | Expand in place; "Add palette..." in the Styles panel's library                       |
| 90             | "Diverging: two sides of a midpoint", "for groups, not numbers"                                                  | 43         | Group titles only; omit Categorical for numbers                                       |
| 90             | "Symmetric" and "Reverse" are checkboxes where single on/off rows are switches                                   | 41         | Switches                                                                              |
| 91             | "Colour not set" drawn as a paint row with eye and "-"                                                           | 16, 43     | Omit unset channels                                                                   |
| 91             | A time window is on but the transport bar is absent                                                              | 41         | Draw the transport bar                                                                |
| 92             | The Nodes "+" menu ends with a sentence listing the Edges channels                                               | 11         | Remove                                                                                |
| 92             | The collapsed Colour block's summary is "on"                                                                     | 29         | "by conference, 12 colours"                                                           |
| 93             | "Add a channel with Nodes +; click an inherited chit to override it here. ..."                                   | 43         | Remove                                                                                |
| 93             | Reading "One node, styled on its own; it paints above every other object."                                       | 43         | A reading about the data, or none                                                     |
| 93             | Two rows labelled "Colour" (override and inherited); the inherited ones carry a lock                             | 41, 24     | The inherited row reads "from Conference" with a link glyph                           |
| 93, 100        | Rows that are not selected carry the selected tint                                                               | 41         | Tint only the selected row; "new" as a badge only                                     |
| 94             | "Covered by nothing"                                                                                             | 43         | Remove                                                                                |
| 94, 93         | Saved styles are a section here and one row on 93; Reset is a button here and in the "..." per the spec          | 41, 44     | One form: a "Saved style" row with Apply and "Save this style..."; Reset in the "..." |
| 95, 96, 97, 98 | The Export sheet replaces the inspector                                                                          | 4, 46      | Export settings in a popover beside the inspector                                     |
| 95             | "Image copied to the clipboard" in the status bar                                                                | 13         | A toast                                                                               |
| 95             | Prose about Copy image and the browser's formats                                                                 | 43         | Remove; the key is on the menu row                                                    |
| 95             | "Quality" folds settings                                                                                         | 28         | A gear on the Format row                                                              |
| 95             | Two filled "Export" buttons (the header's menu and the sheet's commit)                                           | 48         | The popover's commit is the one primary while it is open, labelled "Export image"     |
| 96             | The Format menu ends with "The project file keeps everything: Ctrl+S"                                            | 11         | Remove                                                                                |
| 96             | "An object column is one value per node: ..."                                                                    | 43         | Tooltip on "Include object columns"                                                   |
| 96             | "about 6 KB" twice in one surface                                                                                | 43         | Once, beside the commit                                                               |
| 97             | The Format menu has a two-line description of the bundle                                                         | 11         | "Evidence bundle (ZIP)", detail in the tooltip                                        |
| 97             | "none yet" beside the Notes checkbox                                                                             | 43, 31     | Disable the checkbox with the reason as tooltip                                       |
| 97, 95         | "Evidence bundle" here and "Export bundle..." in the menu                                                        | 41         | "Export evidence bundle..." and "Evidence bundle"                                     |
| 98             | "Writing 30%" in the progress row and the footer, plus a status chip                                             | 35         | The progress row and one status chip                                                  |
| 99             | "Exit (Esc)" puts the key in the label                                                                           | 39         | "Exit", with Esc in its tooltip                                                       |
| 100            | "Back from VR: 2 objects added" in the status bar                                                                | 13         | Toast "Added 2 objects in VR [Show]"                                                  |
| 100            | The VR menu ends with a sentence about the 10,000 limit                                                          | 11         | Remove; the limit in the disabled row's tooltip                                       |
| 101            | The drop banner reads "Drop karate-2020.graphml to import it: you choose Replace, Add, Join or Open beside next" | 14, 43     | The outline and one line, "Import data"                                               |
| 102            | "The name is a label only: renaming changes nothing ... one undo step."                                          | 43         | Remove                                                                                |
| 102            | The inspector's kind is "Set Shortest route" for a Path row                                                      | 41         | "Path"                                                                                |
| 102            | Status "Drag: above Hubs in Group 1" repeats the insertion line                                                  | 12         | Remove                                                                                |
