# Interaction pattern entries

**Job.** The pattern library: the patterns that recur across objects, one entry each, targeting
(section 4), modes and tools (section 5), acting (section 6), time (section 7) and recovery (section
8), then the keyboard and assistive-technology rules (section 9), whose one home is here. Sections
are numbered 4 to 9 because they continue `interaction-patterns.md`, the grammar, which holds the
rules every entry inherits (the outcome test, the behavior map and the grammars, sections 1 to 3).
Read that document first; every citation names its file. **Not here:** everything its "Not here" names, and the
grammars themselves, which are stated once there. **Owner:** interaction designer. **Ceiling:** the
README's table. **Validated by:** each entry's "Validated by" field, and the studies in
`research/study-schedule.md`, "Interaction-pattern studies". Every entry uses the entry form of
`interaction-patterns.md` 1.3.

**graphty-element** owns every graph capability, including selection, undo, the canvas tools and
the command definitions; the **graphty app** is only the window around it. "Owner: element" means
a page that embeds the element gets the behavior without writing it; an **Element need** line names
the `element-needs.md` row an entry waits on.

## 4. Targeting

### 4.1 Select

- **Use when:** the analyst points at what the next command should act on.
- **Why:** one selection shared by every surface means a command never has to ask what it acts on.
- **Trigger:** a click, a box, the Lasso, a list or table row, Find.
- **Behavior:** per `interaction-patterns.md` 3.1. Hover links both ways, is drawn on the next frame and is never kept: a row puts the hover mark on its
  elements on the canvas and a canvas element puts the hover background on its row (forms:
  `canvas-drawing.md` 6 and A5). Hover never selects. The table and the canvas share one
  selection (brushing and linking), and an open dock follows it. Create path from several
  selected nodes takes them in the order they were selected.
- **Feedback:** the selection mark on the canvas (`canvas-drawing.md` 6); the inspector title
  (the selection-count slot, or the object's name); the canvas focus target's accessible name
  carries the count, as Figma's does. Zoom to selection cuts instantly by default, as Figma's does,
  so a reader who selects repeatedly never waits; whether 3D needs a short eased move to keep
  orientation is a study (`interaction-patterns.md` 10.3). Reduced motion always cuts.
- **Undo:** not a step.
- **Exceptions:** over the selection cap (`scale-levels.md`), the selection holds every id and is
  drawn as one mark around the whole with the count stated; it is never truncated and never
  turned into an invented object (`decided-doors.md`, "Selection over the cap"). Over the drawing limit (`scale-levels.md`), selection works unchanged and
  the table and Find lead, because the canvas does not draw everything.
- **Owner:** element. **Outcome:** Selection.
- **Grammar:** `interaction-patterns.md` 3.1.
- **Figma:** a copy, except that double-click does not drill (a node has no single parent);
  double-click is rename on rows and nothing on the canvas (a ledger row, `figma-crosswalk.md` 4.3).
- **Inherits:** `Tree`, `DataTable` selection.
- **Element need:** `element-needs.md`, "A selection over the cap holds every id".
- **Validated by:** the modifier-error task (`interaction-patterns.md` 10.3); it fails when modifier errors on the canvas
  differ between prior-tool groups by more than `research/study-schedule.md` allows.

### 4.2 Enter to members, Shift+Enter to the object

- **Use when:** the analyst has a set, path or item and wants to act on what is inside it, or the
  reverse.
- **Why:** a set as a whole and its members are both legitimate targets; one key moves between
  them without a menu.
- **Trigger:** Enter with a set, path or item selected and no canvas walk active; Shift+Enter with
  its members selected after entering from it. Enter on a focused set, path or item row does what
  a click does and selects it; a second Enter goes to its members (`interaction-patterns.md`
  section 2, note [a]).
- **Behavior:** Enter replaces the selection with the object's members; Shift+Enter restores the
  object the analyst entered from, whether the object was selected on the canvas or from its row;
  with nothing to go back to it does nothing, and the polite region says why. Enter inside a walk selects the focused node instead (`interaction-patterns.md` 3.6; here, 9.2); the
  first press of a neighbor-walk key after entering starts the walk on the first member.
- **Feedback:** the inspector switches between the object and the selection-count slot.
- **Undo:** not a step.
- **Exceptions:** members over the cap follow 4.1.
- **Owner:** element. **Outcome:** Selection.
- **Grammar:** `interaction-patterns.md` 3.1, 3.6.
- **Figma:** Enter selects children and Shift+Enter the parent (`../figma/flows.md` 3); set, path and item
  play Figma's container. Departure: a node belongs to many sets, so Shift+Enter returns only to
  where the analyst entered from, never to "the" parent.
- **Inherits:** n/a: canvas and list keyboard, no component.
- **Validated by:** a cognitive walkthrough of "is a set selected, or its members?", which fails
  when the analyst cannot say which is selected from the inspector alone; the keyboard audit
  script (`interaction-patterns.md` 10.3).

### 4.3 A number, a legend entry or a bar selects what it stands for

- **Use when:** the analyst sees a figure and asks "which ones?".
- **Why:** a count is a question about elements; answering it with a selection puts every surface
  (canvas, table, inspector) on the answer at once.
- **Trigger:** a click on a count, a legend entry, a histogram bar, a series point, a pair row, a
  candidate edge.
- **Behavior:** click selects the elements it stands for; Shift+click toggles them (`interaction-patterns.md` 3.1). Show in table,
  Filter to and Filter out are separate commands in its context menu (6.7); Filter to on several
  legend entries makes one step. A candidate edge, a suggestion and not an edge in the data,
  selects its two nodes.
- **Feedback:** as 4.1. Clicking never re-scopes the numbers on screen.
- **Undo:** not a step; the Filter verbs are steps.
- **Exceptions:** an overflow link is not a count of a result. "N more" opens the table on the
  object's members, keeping the selection; "N differ" opens it on the selection with the differing
  columns first (`information-architecture.md` 8.1, "The table's scope").
- **Owner:** element for the selection; app for Show in table. **Outcome:** Selection.
- **Grammar:** `interaction-patterns.md` 3.1.
- **Figma:** the Selection colors section's target icon selects every layer using a color
  (`research/figma.md` 4, Selection colors), the same move as a legend entry selecting what it
  stands for.
- **Inherits:** the legend swatch and `DataTable` cells; n/a for canvas marks.
- **Validated by:** a first-click test on a neighbor count with the dock closed for every
  participant, because an open dock makes selecting and opening the table look the same; it fails
  when first clicks reaching the counted nodes on either surface fall below the first-click bar
  (`research/study-schedule.md`).
  **This rule is provisional and is stated only here**; every other document cites this entry. The
  alternative under test, that a count opens the table on what it counts, is in
  `research/interaction-patterns-rejected.md`.

### 4.4 Previous selection

- **Use when:** a hard-built selection was lost to a stray click or Esc.
- **Why:** selection is outside undo, so the undo chord would reverse the last Command instead
  (often the Filter to that built the working set); a 2-hop neighborhood from a hub is not cheap to
  rebuild.
- **Trigger:** Edit > Previous selection, Quick actions and its chord. The selection-cleared
  announcement names the chord, because that is the moment of loss; a live region cannot hold a
  control (9.4). There is no row on the inspector: at rest the inspector
  describes the graph, and a row after every selection change is loud chrome for a rare event.
- **Behavior:** restores the selection held before the last selection change. **One slot, not a
  history** (`glossary.md`): pressing it again swaps back, as `cd -` does in a shell. Consecutive
  presses of Select neighbors count as one selection change (4.6), so the slot keeps the seed.
- **Feedback:** as 4.1.
- **Undo:** not a step.
- **Exceptions:** n/a: the slot holds ids, whatever the size.
- **Owner:** element. **Outcome:** Selection.
- **Grammar:** `interaction-patterns.md` 3.1, 3.6.
- **Figma:** none; Photoshop's Select > Reselect is the precedent.
- **Inherits:** n/a: a command.
- **Element need:** `element-needs.md`, "Previous selection: restore the selection before the last change".
- **Validated by:** a moderated task: build a 2-hop selection, press Esc, recover; it fails when
  analysts reach for the undo chord first and lose the Filter to that built their working set.
  If one participant in five or more does, a Previous selection row is added to the resting
  inspector until the next selection change.

### 4.5 Paste and drop

- **Use when:** the analyst brings data, a list of ids, a style or a recipe in from outside.
- **Why:** the same file can mean several things on a loaded graph, so the choice is explicit; on
  an empty graph there is only one sensible reading.
- **Trigger:** paste on the canvas, paste into Find, or a file dropped on the canvas.
- **Behavior:** graphty-element reads the profile first (`element-needs.md`, "Reading a file's profile (project, recipe, style, data) before opening it"):
  - **A single column with no header and no edge columns is ids.** On an empty graph it loads as
    nodes, because there is nothing to select. On a loaded graph it selects what it names, and the
    notice offers Add as nodes for ids not found. Pasted into Find it always selects.
  - **Anything else goes to the importer.** On an empty graph it opens straight away when the
    element's inference settles every column, drops no row, reads every weight and no size notice
    or near-symmetric reciprocity applies, as Figma's Missing Fonts appears only when something is
    unresolved; otherwise it passes the load step (placed on every data door,
    `information-architecture.md` 6). On a
    loaded graph, pasted text and a dropped file alike show the drop target (`visual-language.md` A1), then a choice step
    (`interaction-patterns.md` 3.4) by profile: **data**: Add data, Add as another graph, Replace data, Join; **style**:
    Apply style file on top... (the default), Replace style stack; **recipe**: Apply, Use as this project's
    overview; **a list file of named sets**: Load set collection...; **project**: Open, Add as
    another graph. Each row commits its own result, and nothing commits until one is chosen. One
    copied style layer pasted applies on top with no step (`interaction-patterns.md` 3.1).
- **Feedback:** the drop target; the load step; the ids-not-found slot.
- **Undo:** the chosen load is one step; a selecting paste is not a step.
- **Exceptions:** load size limits follow `scale-levels.md`.
- **Owner:** element for parsing, profiles and applying; app for the drop target and drawing the
  choice step. **Outcome:** Selection for ids on a loaded graph; otherwise a choice step, then a
  Command.
- **Grammar:** `interaction-patterns.md` 3.1, 3.4 (a choice step).
- **Figma:** paste lands content where it is pasted. Departure: ids carry no values to place, so
  on a loaded graph the reading that changes nothing (select) wins.
- **Inherits:** the compact-mantine drop zone and dialog.
- **Validated by:** a walkthrough of "Gene list to interaction network" (empty graph) and of a
  style file dropped on a loaded graph; it fails when the analyst cannot predict, before choosing,
  whether their data or their style stack will change.

### 4.6 Grow the selection

- **Use when:** the analyst asks "what is connected to this?" or "what else is like this?", the
  central move of path, hub, fraud-ring and exploration work.
- **Why:** growing from what is already selected keeps the analyst's context; replacing it would
  lose the seed.
- **Trigger:** Select neighbors and Select same value, from the context menu and Quick actions;
  Select neighbors also by its chord.
- **Behavior:** adds to the selection. **Select neighbors is one command with a direction
  argument** (In, Out or All; `graph-conventions.md` 2, default All), shown as a submenu
  in the context menu and as one palette entry per direction on a directed graph; its chord runs
  "all". Each press grows one more hop from the current selection. On a selected set, path or item
  it grows from the object's members, and the result is an element selection. Select same value
  adds every element sharing the chosen attribute's value. Both read the filtered graph unless the
  command states the full graph (6.9), so nothing a filter step leaves out is added silently.
- **Feedback:** the selection mark. The exact count is on the command before it acts: the split
  button's hop field and the menu item show it on hover and on focus, because counting ids is cheap
  next to drawing them (`state-matrix.md` 4.4); the chord, which has no hover, announces the count
  in the selection-count slot after it acts.
- **Undo:** not a step. Consecutive presses are one selection change, so Previous selection (4.4)
  returns to the seed; Create set before expanding keeps it for good.
- **Exceptions:** over the cap, as 4.1.
- **Owner:** element. **Outcome:** Selection.
- **Grammar:** `interaction-patterns.md` 3.1.
- **Figma:** Select all with matches layers by a property, which is Select same value; Select
  neighbors has no counterpart and is a verb on the selection (`figma-crosswalk.md`).
- **Inherits:** n/a: a command.
- **Validated by:** walkthroughs of "Path investigation" and "Hub investigation"; they fail when
  the analyst cannot follow money in one direction on a directed graph without a filter step.

### 4.7 From a painted value to its layer and its datum

- **Use when:** the analyst looks at one element and asks "why is it this color, which layer won,
  and what value drove it?", or looks at a layer and asks "what does this paint?". This is how data
  and styles are read at the same time.
- **Why:** style layers overlap and the top wins per channel, so the stack alone cannot answer
  either question; the answer has to come from the painted value.
- **Trigger:** a bound value row in the inspector; a legend entry; hover, focus or the Select
  painted icon on a style-layer row (on touch, a tap on the icon, since touch has no hover).
- **Behavior:**
  - **Value to layer and datum.** Each bound channel row names the winning layer and the attribute
    value that drove it. Activating the layer name opens that layer's editor, whose header carries
    the layer's eye and Move up and Move down, so the layer can be switched off or moved without
    deselecting the element.
  - **Layer to elements.** Hovering a layer row puts the hover mark on what it paints; Select
    painted selects it (the row's primary command, `interaction-patterns.md` section 2). A layer whose selector matches everything shows no hover
    mark.
  - **Linked surfaces.** The table and the canvas share one selection (4.1), so a value read in the
    table is seen in its encoding on the canvas without switching anything.
- **Feedback:** the bound row; the hover mark; the focused layer row.
- **Undo:** not a step.
- **Exceptions:** over the cap or the drawing limit, hover shows the count on the row instead of
  marks.
- **Owner:** element resolves the winning layer and what a layer paints; app draws the rows.
  **Outcome:** Selection for Select painted; Chrome for focusing the row.
- **Grammar:** `interaction-patterns.md` 3.1, 3.2.
- **Figma:** Selection colors' target icon, and a bound property row naming its style or variable.
- **Inherits:** `FieldRow` with `VariablePill`.
- **Element need:** `element-needs.md`, "Reads for the inspector and the table".
- **Validated by:** a task after stacking three algorithm styles, "why is this node orange?",
  timed; it fails when analysts open stack rows one by one instead of reading the bound row.

### 4.8 Step through findings

- **Use when:** a search or a run returns many findings (matches, anomalies, alternative paths,
  groups) and the analyst triages them one at a time.
- **Why:** triage means looking at each finding in turn on the canvas; a list that only moves
  focus would need a second key per finding.
- **Trigger:** the arrows in a list of selection-type rows (a result's item tab, Find hits, a
  query's findings); Next finding and Previous finding, by their chords, while the canvas has focus.
- **Behavior:** in those lists **the selection follows focus**: each arrow press selects the next
  finding. Next finding and Previous finding step the same list from the canvas, starting from the
  finding that is selected. Each step brings the finding into view with the smallest pan
  (`interaction-patterns.md` 3.1); a plain click on a row does not. Other lists (layers, steps,
  results) move focus only, because selecting there would run or repaint.
- **Feedback:** as 4.1; the walk-position slot names the finding's place in the list.
- **Undo:** not a step.
- **Exceptions:** over the drawing limit, a finding outside what is drawn is still selected and
  counted (4.1).
- **Owner:** element for the commands and the finding order; app for the lists. **Outcome:**
  Selection.
- **Grammar:** `interaction-patterns.md` 3.1.
- **Figma:** Find's next and previous match, which select each hit and zoom to it (`../figma/flows.md` 7);
  graphty pans only as far as the hit needs.
- **Inherits:** `Tree`, `DataTable` row keyboard.
- **Validated by:** a triage task over 40 anomalies; it fails when analysts click each row with the
  pointer after trying the arrows.

### 4.9 Compare two states side by side

- **Use when:** the analyst compares two states of a graph (disease against control, this time
  window against the previous one, two algorithms' results, a case against a known typology) and
  must find one element in both.
- **Why:** a comparison is read by matching; two independent selections would make the analyst
  find each element twice.
- **Trigger:** Compare with... (`output-homes.md` 3); any selecting gesture on either side.
- **Behavior:** the two sides show **one selection, matched by element id**, as the canvas and the
  table share one (`interaction-patterns.md` 3.1, "Linked views"); an id present on one side only
  counts as not drawn on the other. Hover links across the sides. Each side is its own canvas focus
  target with its own walk; the region-cycle chord moves between the sides, and the walk ends when
  focus leaves a side (`interaction-patterns.md` 3.8). The difference list's rows are content rows:
  activating one selects its elements (`interaction-patterns.md` 3.1). The inspector's place is
  taken by the surface, whose header names both states; Done is the only exit
  (`interaction-patterns.md` 3.6).
- **Feedback:** the selection mark on both sides; the not-drawn slot for an id missing on one side.
- **Undo:** selecting is not a step; Save comparison is one.
- **Exceptions:** both sides share one drawing budget and one scale domain (`state-matrix.md` 4.6).
- **Owner:** element for matching, the linked selection and each side's walk (`element-needs.md`,
  "Readings and the drawing budget per side of a comparison"); app for the surface and Done.
  **Outcome:** Selection; opening and leaving the surface is a View.
- **Grammar:** `interaction-patterns.md` 3.1, 3.6.
- **Figma:** branch review shows two versions of one file; graphty links the selection across them,
  which Figma does not, because the analyst's question is where one element sits in both.
- **Inherits:** the compact-mantine `shell` split and `DataTable` for the difference list.
- **Element need:** the row cited under Owner; the entry is not built until it lands.
- **Validated by:** the disease-against-control task: select a gene on one side and say where it
  sits on the other; it fails when analysts search the second side by hand.

---

## 5. Modes and tools

**A mode is any state that changes what the next click or key does** (Raskin, *The Humane
Interface*). Each has an entry, an indicator, one exit, an Esc behavior and an owner. For the
canvas modes, the Entry, Exit and Esc cells restate edges of `interaction-patterns.md` 3.8's canvas
chart; where the two disagree, the chart wins and this table is corrected.

| Mode | Entry | Indicator | Exit | Esc | Owner |
|---|---|---|---|---|---|
| Select (rest) | the select tool key; the end of any tool | Select tool face | -- | rung 3: deselects | element |
| Lasso | the lasso tool key | tool face, cursor | the select tool key, Esc | rung 2 | element |
| Hand | the hand tool key | tool face, cursor | the select tool key, Esc | rung 2 | element |
| Temporary Hand | Space held with a drag; released with no drag, Space does its focused region's job (`interaction-patterns.md` 3.1) | cursor | releasing Space | -- | element |
| Path tool | the path tool key | armed tool and its secondary bar | Run finishes, Esc, the select tool key | rung 2 | element; the app draws the bar |
| Note tool | the note tool key | armed tool, cursor | Esc, the select tool key | rung 2 | element |
| Canvas walk | a neighbor-walk key on the canvas (Shift with an arrow), or Enter there with elements or nothing selected (9.2); never focus arriving, never a pointer | the focused node's focus ring; entry is announced with its exit key | Esc, Tab (which always leaves the canvas), a pointer click (which does not re-enter it), focus leaving the canvas | rung 2 | element |
| Time-slider playback | Play | the Play control shows Pause | Pause, or Esc on the canvas or the time slider; the undo chord (back to the window before Play, nothing pushed) | pauses and commits where it lands, as Pause (`interaction-patterns.md` 3.6) | element |
| Text edit, rename | double-click, the rename chord | an input in place | Enter commits | the field reverts | the component |
| Version history, comparison | a menu or row command | the inspector is replaced; Done | Done | moves focus to Done | element, surfaced by the app |
| Read-only, an old version | a click or Enter on a data version row | stated once where the project name lives | Edit current version, Done | moves focus to Done | element, surfaced by the app |
| VR, AR | view-mode control | the device session | Exit, or the device's session end | as the device does | element |

**Pointer on the canvas, Figma's map, because it follows the browser's event model.** A browser
delivers a trackpad two-finger drag as a plain `wheel` event and a pinch as `wheel` with `ctrlKey`
set, so a mouse wheel and a two-finger drag cannot be told apart by anything but a guess. So: with
the Select tool, a left drag on empty canvas draws a box; **a plain wheel event pans** (a mouse
wheel, a two-finger drag), in 3D it orbits; **a wheel event with Ctrl or Mod zooms toward the
pointer**, a pinch among them; Space+drag, the Hand tool and a middle drag pan. In 3D a **right
drag past the 4 px threshold, or Alt and a left drag, orbits**, the second being the trackpad and
one-button route, the convention of Maya and Unity; a right press released without travel opens
the context menu (6.7). In 2D a right drag does nothing. A reader preference, **Scroll wheel
zooms**, in Preferences, gives a mouse user a plain wheel that zooms, as Figma's "Use scroll wheel
zoom" does (off by default). Alt with a two-finger drag waits on a test on a real Mac trackpad in
three browsers (`element-needs.md`, "The canvas input map"). On touch, in 2D one finger pans; in 3D one finger orbits and two fingers pan; two
fingers pinch to zoom, and a long press opens the context menu. Pinch and orbit have
single-pointer alternatives (WCAG 2.5.1): the zoom menu's Zoom in and Zoom out, and the view
menu's camera steps. The one difference from Figma, the 3D orbit, is `figma-crosswalk.md` 4.3.

**The Note tool stays armed** until Esc or the select tool key, as Figma's comment mode does,
because annotating a finding usually means several notes in a row. While it is armed, a click on an
element targets it, Shift+click adds targets, a click on empty canvas targets the graph, and typing
starts once the first target is chosen.

**The Path tool extends a selected path.** Armed with a path selected, it continues from the path's
last node, or with Shift from its first, and each added step appends to the same path as one undo
step ("Extend Layering route"), so tracing money, an attack or a pathway hop by hop never starts
over. The order grows at the ends and is never shuffled (`conceptual-model.md` 4.2).

**Touch and no hover.** A tap on a layer row's Select painted icon replaces hover-marking; a long
press on a node opens the context menu with the node's label as its header, so the label is
readable without hover; the cost band word shows on the row itself. Hover-marking from a legend
entry has no touch form, which is acceptable because a tap on the entry selects what it stands for
(4.3) and shows the same elements.

**Tool sequence.** Arm (the secondary bar appears); read (the bar states the scope and the cost
before anything runs); act (a canvas click or Run); hand back; return to Select. **A run started
from an armed tool hands back its selection** (a query selects its first finding, the Path tool
the path itself, whose members are one Enter away, 4.2), because the analyst is waiting on it, as Figma selects a shape it just drew. On an empty
result the tool stays armed and the bar offers the one change that would widen the search.

**Quasimodes are preferred.** Space for Hand cannot be forgotten because it lasts only while held.

**Not modes.** The time window narrows like a filter step and shows on the filter chip, but
moving it never drops selected ids (`interaction-patterns.md` 3.1). Minimize UI is
Chrome; Note markers is a View toggle (`interaction-patterns.md` 1.1): never a step, never captured by a saved view.
2D and 3D are a layout setting, so switching is an undoable Command. **Stepping through views** in
the view menu's Views submenu is Apply view, a Command with no mode, so a stray Esc cannot take
the analyst out of anything.

---

## 6. Acting

### 6.1 Add with defaults, configure after

- **Use when:** the analyst creates anything: a set, a layer, a filter step, a result, a view.
- **Why:** most additions are right with defaults; asking first would cost every addition a
  dialog.
- **Trigger:** a section's "+" (activated on click, pointer up, so a press dragged off cancels, WCAG
  2.5.2; a departure from Figma's pointer-down add buttons that `principles.md` 0 records), a
  catalog row, the group chord, Duplicate, Save view.
- **Behavior:** the object is added at once. A new set or path becomes the selection; a new
  result, layer, step or view is focused. Its editor opens when it has settings (a Chrome side
  effect). **Ordered sequences append at the end**, because position is their meaning (filter
  steps, a recipe's steps; a departure, `principles.md`). **Style layers go on top**, which is
  directly below Overrides (`conceptual-model.md` 5.1), because on top means "wins". The
  group chord makes a fixed set and puts its name into rename. A catalog row follows `interaction-patterns.md` 3.3;
  hovering or focusing it shows its description and cost (6.7), and its (i) opens the description,
  so reading an algorithm never needs a click that runs it. Mod+click focuses several catalog rows without running them; Run shows their combined
  cost (`interaction-patterns.md` 3.1). Nodes a command brings in are placed near their placed neighbors inside that command's
  step; pins hold.
- **Feedback:** the new row; a notice only if the row's panel is closed.
- **Undo:** one step; an accidental run is one press of the undo chord (the cancel form).
- **Exceptions:** adding does not change with size; the run it starts does (`interaction-patterns.md` 3.3). **A note** is
  added only when its first text is committed, and Esc on an empty note leaves nothing and no undo
  entry, as Figma's comment composer creates nothing until Enter posts it (`../figma/flows.md` 11).
- **Owner:** element. **Outcome:** Command, with the editor opening as Chrome.
- **Grammar:** `interaction-patterns.md` 3.3, 3.4.
- **Figma:** Effects "+" adds then configures (`../figma/flows.md` 6).
- **Inherits:** `SplitButton`, `Tree`.
- **Validated by:** a click-count comparison on the weekly centrality-and-communities route; it
  fails when adding with defaults takes more clicks than a configure-first dialog would.

### 6.2 Edit in the inspector and one popover

- **Use when:** the analyst changes a setting of anything already made.
- **Why:** one editor at a time keeps the canvas visible and the edited object unambiguous.
- **Trigger:** focusing a field, a scrub, a row that opens an editor.
- **Behavior:** commit per `interaction-patterns.md` 3.2, applied per `interaction-patterns.md` 3.3. **One editor popover at a time, with at most one
  nested picker**; opening another replaces it; closing returns focus to its trigger (`interaction-patterns.md` 3.6). The
  result editor stays open while the selection changes from inside it or from the table.
  **Algorithm and layout options are rendered only from the catalog entry's option schema**,
  never hand-built; a missing grouping or hint is a graphty-element change. How many controls show,
  and in what tiers, is `options-and-encodings.md` 3 and 9.
  **An automatic layer is read-only** (a run's suggested layers; a Look writes none): its rows show
  their values, and the layer offers **Edit a copy**, which puts an analyst layer with the same
  rows in its place (`figma-crosswalk.md` 1, Instance). The run's layer is then suppressed
  because an authored layer writes its channels (`glossary.md`, suppressed), so a re-run never
  overwrites the analyst's edit.
- **Feedback:** the canvas repaints for live edits; the Run line shows held ones.
- **Undo:** one step per commit or gesture.
- **Exceptions:** n/a: the editor does not change with size; what a commit costs does (`interaction-patterns.md` 3.3).
- **Owner:** element for the command; app for which popover is open. **Outcome:** Command.
- **Grammar:** `interaction-patterns.md` 3.2, 3.3.
- **Figma:** one overlay at a time (`../figma/flows.md` 1 rule 2). Departure: meaning-bearing fields keep text
  (`interaction-patterns.md` 3.2).
- **Inherits:** `Popout`, `FieldRow`, `useNumberField`, `useScrub`, `ComboInput`.
- **Validated by:** a keyboard-only walkthrough tuning three options of one result in a row; it
  fails when focus leaves the popover between fields or an abandoned value runs.

### 6.3 Drag

- **Use when:** the analyst moves a node, reorders a list, or brings a file in.
- **Why:** direct manipulation is the fastest route for spatial and order changes.
- **Trigger:** a pointer drag past a 4 px threshold, as Figma's, so a click never drags.
- **Behavior:**
  - **A node on the canvas:** one step that graphty-element opens itself; with `pinOnDrag` the
    drop pins the node; where the layout settles after the drop is captured into the same step.
    The undo chord during a drag ends the drag (undo design 5.3). A drag while a layout settles
    pins the node and the layout flows around it.
  - **A list row:** Figma's drop zones (top quarter before, middle into where rows nest, bottom
    quarter after), with the insertion line drawn at depth. Reordering style layers and filter
    steps is one step, because order changes meaning. On the style stack a drop always resolves to
    a flat stack index: nothing nests, so "into" is off; dragging several focused layers moves
    them as one step.
  - **A file:** 4.5.
- **Feedback:** the node follows the pointer; the insertion line.
- **Undo:** one step.
- **Exceptions:** while a list is filtered, reorder is disabled (6.8).
- **Owner:** element for node drags and reorders; app for list drop feedback. **Outcome:**
  Command.
- **Grammar:** `interaction-patterns.md` 3.4, 3.6.
- **Figma:** layers-panel drag (`../figma/flows.md` 7). The inspector's Position row replaces nudging (9.2).
- **Inherits:** `Tree`'s `onMove`, drag and Alt+Arrow (`tree/Tree.tsx`; `interface-specification.md`
  2.2); `useScrub`.
- **Validated by:** the WCAG 2.5.7 audit of the alternatives below.

Single-pointer alternatives (WCAG 2.5.7):

| Drag | Alternative |
|---|---|
| reorder a style layer, filter step or view | Move up / Move down (6.7) |
| Lasso | click, box, Find |
| scrub a value | the typed field |
| move a node | the Position row in the inspector, whose fields pin the node at the typed value; **missing until `element-needs.md`, "Set a node's position and pin it", lands**, a known WCAG 2.5.7 gap recorded in `interface-templates.md` 10, with no interim because any interim would need a new element command |
| pan and orbit the camera | the element's pan and orbit step controls, and the camera fields of a view |

### 6.4 Delete

- **Use when:** the analyst no longer wants an object.
- **Why:** undo makes a question unnecessary (`interaction-patterns.md` 3.4).
- **Trigger:** Delete or Backspace, acting on what has focus: the focused rows, else the canvas
  selection, and nothing on a heading, button or chip (`interaction-patterns.md` 3.6); Delete in
  the context menu.
- **Behavior:** removes at once. What Delete does to each subject (elements, a set or path whose
  members stay, an item it refuses) is `interaction-patterns.md` 3.6's table. Dependents become detached and keep resolving through the deleted
  object's kept record (`conceptual-model.md` 7.2; 7.2 here).
- **Feedback:** the row disappears. A notice with Undo appears only when dependents were detached
  (they changed out of sight) or the deleted row was out of sight, the same test as undo (`interaction-patterns.md` 3.4);
  Figma shows none (`figma-crosswalk.md` 4.2). **Remove**, Delete with elements selected, changes
  the data: its notice appears when it removes elements that are not drawn, and states the count
  removed, with Undo; each result it sent out of date carries that on its own row
  (`principles.md` conflict ledger).
  Over the selection cap, the exact count is resolved before it commits, as the neighborhood
  commands do (`state-matrix.md` 4.4).
- **Undo:** one step.
- **Exceptions:** n/a: deleting one object costs the same at every size.
- **Owner:** element. **Outcome:** Command.
- **Grammar:** `interaction-patterns.md` 3.4, 3.5.
- **Figma:** the layers panel's Delete, which never asks.
- **Inherits:** `Tree` row keyboard.
- **Validated by:** a walkthrough of deleting a set that a style layer reads; it fails when the
  analyst cannot say which layer lost its set.

### 6.5 The row toggle

- **Use when:** the analyst wants to see the graph without one layer or one filter step, and get
  it back.
- **Why:** switching off is cheaper and safer than deleting and re-creating.
- **Trigger:** a click on a style layer's eye or a filter step's checkbox; a press dragged down the
  column sweeps each row it crosses, as Figma's eye column does, shown as a preview while the
  pointer is down and committed on pointer up, and leaving the column or Esc before release cancels
  it (up-reversal, so it meets WCAG 2.5.2 with no exception); the hide chord toggles the eye of the
  focused row (9.3).
- **Behavior:** the eye means **this row's effect is off, kept**, and appears only on rows that
  draw something themselves: a style layer, a set's or group's hull, and a found path's casing.
  Hidden elements carry no eye, which on a row named Hidden would read backwards; they are shown
  again by Show all on the not-drawn line (6.9). A set row with no hull
  drawn has no eye, and the eye on a hull never touches the members, which are only ever filtered
  or hidden by Hide on canvas. A filter step's checkbox turns the step off. This is the one statement of
  which rows carry an eye; other documents cite it.
- **Feedback:** the repaint.
- **Undo:** one step per sweep.
- **Exceptions:** n/a.
- **Owner:** element. **Outcome:** Command.
- **Grammar:** `interaction-patterns.md` 3.3, 3.4.
- **Figma:** the eye column on fill rows. Departures: the filter step's checkbox (`interaction-patterns.md` section 2, note [h]); the sweep commits on pointer up, where Figma's toggles on pointer down (WCAG 2.5.2).
- **Inherits:** `ToggleIconButton`, `CompactCheckboxIcon`.
- **Validated by:** the eye-versus-checkbox first-click tasks (`research/study-schedule.md`).

### 6.6 Bind a property to an attribute

- **Use when:** the analyst wants a channel (color, size, label, width) to follow data instead of a
  constant. This is how the large number of style controls is managed: every channel row is either
  a literal or bound, through one gesture.
- **Why:** binding keeps the encoding live as data changes, and one gesture on every channel row
  replaces a separate mapping editor per channel.
- **Trigger:** the section header's four-dot "Apply styles and variables" picker, whose second
  group lists the fitting attributes and results, or a number row's in-field "Apply variable"
  button, as Figma's (`options-and-encodings.md` 4); on any channel row of a style layer, and on a
  kept set's or path's Appearance channel row, which writes that object's one set-scoped layer
  (`interaction-patterns.md` 3.2), so repeated choices never grow the stack (`task-flows.md` 5.1);
  an offered group or found path first takes its explicit keep, **Create set to style** (3.2 there);
  and on an element selection's Appearance row, Figma's most habitual move, where the picker's first
  choice is labeled "Create set and color by Degree", so the set it makes is named before it is
  made, one element command and one undo step, the new set entering rename; the picker's lower group offers "Color by Degree (all nodes)", a graph-wide layer, and
  says so. A binding never goes into Overrides, which holds constants only.
- **Behavior:** opens a picker of attributes grouped by origin (data, computed, authored); an
  attribute not yet computed shows its cost. Choosing binds the channel; the encoding kind follows
  the attribute's measurement level. What the bound pill shows, what activating it opens and what
  **Fix at <value>** keeps are `options-and-encodings.md` 4; it lives in the layer editor. Across
  several focused layer rows, differing bindings show Mixed, and binding writes every row in one
  step.
- **Feedback:** the row changes from a literal to a bound pill; the canvas and legend repaint.
- **Undo:** one step per bind, change or Fix at.
- **Exceptions:** an attribute past the unique-value cap is offered as a label, never a color
  (`options-and-encodings.md`).
- **Owner:** element. **Outcome:** Command.
- **Grammar:** `interaction-patterns.md` 3.2.
- **Figma:** the same entries, the four-dot picker and the in-field button. Departures: a bound
  row keeps a settings button for its scale, and Fix at must choose one value among many and names
  it (`figma-crosswalk.md` 4.2).
- **Inherits:** `FieldRow`, `VariablePill`, `ComboInput`.
- **Validated by:** a task binding node size to degree and then fixing it; it fails when analysts
  cannot predict the value Fix at will keep before pressing it.

### 6.7 Context menu, overflow and tooltips

- **Use when:** the analyst wants the commands for one thing without hunting a menu bar.
- **Why:** one list per object, reached by pointer and keyboard alike, makes every command
  discoverable where its target is.
- **Trigger:** a secondary click (on the 3D canvas, a right press released within the 4 px
  threshold; past it, the drag orbits, 5); the row's overflow button; Shift+F10 or the Menu key.
- **Behavior:** the context menu and the overflow button hold **the same commands in the same
  order**: the row's primary command first, then commands grouped by kind, destructive commands
  last. Move up and Move down appear on every reorderable row. **Tooltips** show a control's name,
  and for a costly command its band, on pointer hover and on keyboard focus alike.
- **Feedback:** the menu, focused on its first item.
- **Undo:** n/a: the menu is Chrome; each command it runs follows its own entry.
- **Exceptions:** n/a.
- **Owner:** element publishes each object's commands and their order (`interaction-patterns.md` 10.1); app draws the menu.
  **Outcome:** Chrome.
- **Grammar:** `interaction-patterns.md` 3.6, 3.7.
- **Figma:** right-click menus on the canvas and rows. Departure: Figma ignores Shift+F10 and the
  Menu key; graphty honors them for keyboard users.
- **Inherits:** the compact-mantine menu and tooltip.
- **Validated by:** a consistency inspection comparing each object's context menu with its
  overflow and with the row's primary command (`interaction-patterns.md` section 2); it fails on any difference in order.

### 6.8 Many rows: bulk operations, filtering and folding

- **Use when:** a list grows long: a heavy session carries 14 to 19 style layers, and imported
  recipes more (`state-matrix.md` 7).
- **Why:** acting on rows one at a time does not scale, and a long stack hides the layer that
  matters.
- **Trigger:** Shift+click and Mod+click on rows (a row multi-focus, `interaction-patterns.md` 3.1); Find in the left panel;
  the catalog's search.
- **Behavior:**
  - **Bulk.** With several rows focused, the eye, Delete, and Move up / Move down apply to all of
    them as one undo step; on Catalog rows, Run starts each under the cost rule
    (`interaction-patterns.md` 3.3). On set, path and item rows, Select members selects the union (`interaction-patterns.md` 3.1).
  - **Search only where Figma has it, with two listed exceptions.** The left panel's object list
    has Find, and the Results catalog has search, Family and Source, as Figma's Tools panel does;
    both are there at every length, so no count makes a control appear. Lists inside the inspector
    (the style stack, filter steps) have no search field, as Figma's Fill list has none. The two
    exceptions, each a row of `figma-crosswalk.md` 4: the Attributes section carries a filter field
    past its cap, because its length comes from the data; and the Notes panel's field, which is
    Find limited to notes. "Which layer paints this?" is answered from the value: Appearance names
    each channel's winning layer (4.7).
  - **The count cut, the one collapse.** Sources interleave by time (the analyst's layers and the
    runs' land in turn directly below Overrides), so a fold by source seldom forms and cannot cap a
    long stack. At rest the stack shows Overrides when used, its top layers and Base style, and the
    rest behind one "N more" row, as Figma collapses Selection colors: Enter or a click expands it
    in place in the inspector's one scroll and moves focus to the first row it reveals, and Esc
    inside the expanded rows collapses it and returns focus to "N more". It **never reorders the
    stack**, so precedence reads top to bottom; each row names its source (`LayerSource`) as a
    word. Its caps are `interface-specification.md` 4.1a's, and what changes at 20, 60 and 200
    layers is `state-matrix.md` 7's. This answers the owner's question about a large number of
    layers, together with finding a layer from a painted value (4.7), which must also work by
    keyboard from the inspector's Appearance row and the table cell.
  - **While Find narrows the object list, reorder is disabled**, drag and Move alike, with the
    reason in the tooltip, because hidden rows sit between the visible ones and no drop position is
    unambiguous.
- **Feedback:** the rows; a notice counting what a bulk Delete removed.
- **Undo:** one step per bulk command.
- **Exceptions:** list thresholds are `state-matrix.md` 7.
- **Owner:** element for bulk commands; app for Find, search and the count cut.
  **Outcome:** Command for bulk; Chrome for search and the cut.
- **Grammar:** `interaction-patterns.md` 3.1, 3.2.
- **Figma:** multi-select in the layers panel; a group's disclosure row. Named folders of layers
  are rejected (`research/interaction-patterns-rejected.md`), because a hand folder suggests a precedence only the stack order decides.
- **Inherits:** `Tree`, the compact-mantine search input on the two searchable lists.
- **Validated by:** a task on a 19-layer stack: find and hide the layer painting one node, from
  the node's Appearance, with a keyboard arm; it fails when analysts scroll the whole stack instead
  of starting from the painted value.

### 6.9 Narrow, grow and hide

- **Use when:** the analyst wants later numbers to describe only part of the graph ("just this
  component", "this account's neighborhood"), or wants part of the graph out of the drawing while
  every number still counts it. This is the owner's question about two kinds of filter; the model's
  answer is `conceptual-model.md` 4.4.
- **Why:** narrowing and hiding look alike and do opposite things to every number, so each has its
  own verb, named by its consequence, and Quick actions never sends "hide" to a verb that re-scopes.
- **Trigger:** Filter to and Filter out on the selection, a set, a legend entry, a histogram band,
  a column value or a count; Filter to neighbors and Add selection to step on the selection or on a
  hit outside the filtered graph; Hide on canvas and Show on canvas on the selection, a set or a
  legend entry, and the hide chord on an element selection (9.3); a search's Scope field.
- **Behavior:**
  - **Narrow.** Filter to and Filter out add one filter step at the end of the list (6.1). Nothing
    that is filtered out is drawn or counted: the canvas drops it, the table and every count read the
    filtered graph, and Find still lists it, marked with the step that leaves it out.
  - **Grow.** Add selection to step, and Filter to neighbors (the same command with the neighbors
    as operand), edit the newest Filter to step in place, reading the graph as it stood before that
    step, so the neighbors and hits they add are reachable. Each addition is listed on the step,
    labeled by its command. The next alert starts with Delete step and Filter to, two ordinary
    commands and two undo steps.
  - **Search scope.** A search (Select neighbors, the Path tool, Shortest path from...) states its scope
    in its bar before it runs, **Filtered graph** by default. When an endpoint lies outside the
    filtered graph the bar offers Full graph; a search that finds nothing inside ends in a result
    that says so and offers Search full graph; a found path that leaves the filtered graph is
    marked where it leaves.
  - **Turn off.** A step's checkbox turns it off and keeps it; the chip's count follows at once.
  - **Hide.** Hide on canvas turns off whether the selected elements are drawn, a state outside
    the style stack (`conceptual-model.md` 5.1), so no layer's opacity brings them back. Each graph
    keeps one list of hidden elements, counted on the canvas legend's not-drawn line ("40 nodes, 112
    edges hidden") with **Select** and **Show all**, never in the style stack, whose order means
    precedence; each Hide on canvas adds to it as one undo step, so the stack never grows. Hidden elements cannot be picked on the canvas, and stay in every count, row
    and run. An edge with a hidden end is not drawn and cannot be picked; hiding only an edge leaves
    its ends drawn. **Show on canvas**, on a selection made from the table, Find or the line's Select, draws
    those elements again as one undo step; Show all draws them all. A selected hidden element shows
    the hollow selected-and-hidden form (`canvas-drawing.md` 6), and its type row says it is
    hidden. What is drawn is the filtered graph minus the hidden elements, so hiding everything
    outside a region (Find or the table, then Hide others) narrows the view at any size without
    narrowing the analysis; a Show that would pass the drawing limit is refused by the element with
    its reason and a filter step offered (`state-matrix.md` 4.1).
- **Feedback:** the filter chip's count ("Filtered: 2,140 of 5,310 nodes") and the table's scope
  line, both from the element; the not-drawn line's hidden count; the search bar's scope.
- **Undo:** one step per filter-step change and per Hide on canvas or Show on canvas; turning a step
  off is one step.
- **Exceptions:** past the node drawing limit nothing is drawn until a filter step narrows the
  scope (`state-matrix.md` 4.2); the count before commit follows `state-matrix.md` 4.4.
- **Owner:** element for the steps, scopes, counts and the visibility state (`one-way-doors.md` 86, whether an element is drawn); app for the
  chip and the bar. **Outcome:** Command.
- **Grammar:** `interaction-patterns.md` 3.1, 3.4.
- **Figma:** the layers-panel filter narrows a list, and a layer's visibility, separate from its
  opacity, hides it from the canvas with the same chord. Departure: a filter step changes what is
  computed (`figma-crosswalk.md` 4.2).
- **Inherits:** `Tree` rows with a checkbox in `actions`; the filter chip (missing,
  `interface-specification.md` 7.3).
- **Element need:** `element-needs.md`, "Ordered filter steps" and "Whether an element is drawn";
  Hide on canvas is not offered until the second lands.
- **Validated by:** the teach-back task on whether a path search can leave the boundary
  (`research/study-schedule.md`, "Model teach-back", task 4); a first-click task, "hide these 40 nodes; what does
  the node count say now?", which fails when fewer than four of five answer "unchanged"; and
  "bring back the 40 nodes you hid", pointer and keyboard arms, 80% bar, whose fallback is a count
  row in the graph's Statistics.

### 6.10 Bring a recipe or style in

- **Use when:** the analyst starts from a shared analysis, replaces the overview, or applies a
  colleague's style, without their data.
- **Why:** a recipe has no correct default binding on data it was not written for, so the choice
  is shown whole before anything changes, and applying it is one step to take back.
- **Trigger:** Replace on the Overview row; Apply recipe...; Apply style file on top...; Replace
  style stack with style file...; a recipe or style file dropped or pasted (4.5).
- **Behavior:** a picker lists the recipes available (`information-architecture.md` 3), the
  element's registered ones first, then recently opened files. Choosing one shows what it carries
  before it is applied: style layers, runs with their cost bands, overview readings, set slots and
  the attributes it needs. The binding step then matches attributes by name and level and offers a
  picker for the rest; Apply is the only commit. Replace on the overview row changes only the
  overview readings, so it paints nothing. A part that cannot bind is left out and listed in the
  step's report, with Re-map columns beside it, never in a toast alone. The runs a recipe declares
  queue under the cost rule.
- **Feedback:** the preview; the binding step's report; the added layers marked on their rows.
- **Undo:** one step for the whole application ("Apply recipe Flow overview"); undoing it removes
  its layers and its results whose first runs have not finished (`interaction-patterns.md` 3.4).
- **Exceptions:** a recipe naming a source contacts nothing until the step names the host and the
  analyst confirms (`files-and-recipes.md` 1).
- **Owner:** element for the list, the matching and the report; app for drawing the picker and the
  step. **Outcome:** a choice step, then a Command.
- **Grammar:** `interaction-patterns.md` 3.2, 3.3, 3.4, 3.6. Esc in the binding step goes back to
  the picker; Esc in the picker closes it with no change and returns focus to its trigger.
- **Figma:** the library picker and Missing Fonts' choice step.
- **Inherits:** `Modal`, `Combobox`, `FieldRow`.
- **Element need:** `element-needs.md`, "Files, notes, recipes and history"; the list is
  `element-needs.md`, "Registered recipes, Looks and samples".
- **Validated by:** a task applying a colleague's recipe to one's own data; it fails when the
  analyst cannot say, before Apply, which of their attributes each part will read.

### 6.11 Export and file writes

- **Use when:** the analyst takes something out: a figure, a table, graph data, a recipe, a style,
  the project, or a findings report (the evidence file when scoped to the current filter step).
- **Why:** an export is a copy outside the project, so it never needs undo, and the one real risk,
  overwriting a file, is the browser's save picker's question already.
- **Trigger:** Export... and every "Export as <format>" command.
- **Behavior:** one dialog picks the profile and its scope; parts combine only where the file
  format allows (`files-and-recipes.md` 1). Results that are out of date are written with their
  out-of-date marker and the dialog says so in one line; unmeasured values are written empty with
  the no-value marker. The dialog asks nothing about either.
- **Feedback:** the polite region names the file and what was out of date ("Exported network.csv;
  3 results out of date").
- **Undo:** not a step.
- **Exceptions:** n/a.
- **Owner:** element for writing and the markers; app for the dialog. **Outcome:** n/a, an output
  outside the project (`interaction-patterns.md` 1.1).
- **Grammar:** `interaction-patterns.md` 3.5, 3.6: focus returns to the trigger.
- **Figma:** the Export section and its "+" rows.
- **Inherits:** `Modal`, `SegmentedControl`.
- **Element need:** `element-needs.md`, "Files, notes, recipes and history".
- **Validated by:** a task exporting a ranked table with one result out of date; it fails when the
  analyst cannot find, in the file, which values are out of date.

---

## 7. Time

### 7.1 Long-running work

- **Use when:** a run, a load or a layout takes longer than the live line.
- **Why:** an analyst keeps working while a minutes-long computation runs; blocking would waste
  the wait.
- **Trigger:** a run started from the catalog, the Run line, or a recipe; which of them start at
  once and which arrive unrun is the cost rule (`interaction-patterns.md` 3.3).
- **Behavior:** runs never block editing. The result's row appears at once with its state and
  Cancel; the result editor's header repeats the state while that editor is open, and the one
  running notice, a persistent toast with progress and Cancel, carries the earliest run's progress
  (`interaction-patterns.md` 3.5), so the state is on screen while the Results panel is closed. **For a result, the old
  picture stays until the new one is ready**; a layout instead re-settles visibly (`interaction-patterns.md` 3.3).
  A run scoped to the selection reads the selection at its start. Queueing is graphty-element's
  policy (`principles.md`). **A catalog or background run selects nothing and moves nothing when
  it finishes**; a run from an armed tool hands back (5). A result's options stay editable while it
  runs; a held edit waits for Run (`interaction-patterns.md` 3.3). A table sort keeps the old order until the new one lands.
- **A preview that commits where it lands.** A layout settling and time-slider playback are both
  in-flight preview, a View that pushes no steps: only where the preview comes to rest is a step.
  A layout's resting positions are captured into the step that started it. Playback moves the
  window continuously; **Pause** commits the window where it lands as one step, so undo returns to
  the window before Play; **Esc pauses in the same way**, so the analyst keeps the moment they
  stopped on (`interaction-patterns.md` 3.6). A scrub of the slider is one coalesced step
  (`interaction-patterns.md` 3.2). The selection keeps its ids across windows; members outside the
  window count as not drawn (`interaction-patterns.md` 3.1). Windows too large to redraw per frame
  play at the rate the drawing allows; scale readings during playback follow `state-matrix.md` 4.5.
- **Feedback:** row state; the running notice; the finished-or-failed announcement (9.4); for
  playback, the window readout and the status chip.
- **Undo:** Cancel discards a run and leaves no step. The undo chord undoes the command that
  started a pending run, which cancels it; Redo restores the result unrun, Run its primary command, focus unmoved (`interaction-patterns.md` 3.4, 3.6).
- **Exceptions:** the gate's refusals (`element-contract.md` 3; presented as 8.1).
- **Owner:** element. **Outcome:** Command for runs and Pause; View while a preview moves.
- **Grammar:** `interaction-patterns.md` 3.3, 3.4, 3.5.
- **Figma:** the plugin toast with Cancel. Departure: runs queue, so rows carry state.
- **Inherits:** `ButtonSpinner`, `ActionRow`, `Toast`.
- **Validated by:** a moderated test: start a run of over a minute, make an unrelated style change,
  ask for it to be undone; it fails on any accidental cancel. Blocked until the undo work merges.
  A walkthrough of "Network evolution analysis" (play, Esc, play, Pause, undo, undo) fails when the
  analyst cannot predict which window each key leaves.

### 7.2 Freshness

- **Use when:** anything computed from inputs (a result, a rule set, a path, a comparison, a style
  layer's selector, a filter step, a note's quoted value) may no longer match them.
- **Why:** a computed value that silently goes stale misstates what it describes (`principles.md`
  1); one pattern for every such object means one thing to learn.
- **Trigger:** a change to an input; a deletion or merge of a target; a missing capability.
- **Behavior:** the object's row carries its freshness state and **one recovery verb**, and only
  one; the states, their screen words and their verbs are `glossary.md` 10, the one list. Nothing
  that referred to a lost target is deleted silently: a detached reference keeps resolving through
  the kept record until Restore.

  A failed run is a run status, not a freshness state; its row shows Failed with Re-run (8.1).

  **Review out of date**, offered wherever an out-of-date mark shows and in Quick actions, lists
  every out-of-date object with its band, as Figma's library "Updates available" lists what changed
  before Update all. Its **Re-run all** shows the combined band first and follows `interaction-patterns.md` 3.3's several-rows
  rule (a row of "a few minutes" or more stays unrun). It is one undo step, because the analyst gave
  one command; the undo chord cancels its pending runs as one. The per-row Re-run stays.
- **Feedback:** the row's state mark (`principles.md`, the closed marks), and the same mark
  wherever the value is read.
- **Undo:** each recovery is one step.
- **Exceptions:** n/a: freshness is derived on read at every size.
- **Owner:** element derives freshness; app draws the marks. **Outcome:** Command for recoveries.
- **Grammar:** `interaction-patterns.md` 3.3, 3.5.
- **Figma:** a library's "Updates available" review is out of date, and a disconnected library
  keeps rendering its last state, which is detached. Cannot re-run and unresolvable have no
  counterpart, because Figma's values are authored.
- **Inherits:** `ActionRow`'s `state` slot.
- **Validated by:** a walkthrough: change a weight attribute, then bring every out-of-date object
  current; it fails when the analyst re-runs rows one at a time or misses one.

---

## 8. Recovery

### 8.1 Errors at the smallest scope

- **Use when:** anything fails.
- **Why:** an error shown far from its cause is not read, and a modal error blocks unrelated work.
- **Trigger:** a failure in input, a run, a load, the renderer or the GPU.
- **Behavior:** the error shows at the smallest scope that holds it: the field (`interaction-patterns.md` 3.2); the commit
  button, disabled with its reason; the object's failed state; the tool's bar; the load step; a
  status chip; a canvas card only when rendering itself is lost (the not-drawn line past the drawing
  limit is a line, not a card, `state-matrix.md` 4.2), offering Restart viewer, which
  restarts graphty-element's renderer on the session held in memory: losing the GPU does not lose
  the element's model, so no unsaved change is lost (element need, `element-needs.md`). Until
  the element can, and always while the project is Not saved, the card offers Download project
  file first and states that a restart returns to the last save. Each error fills the error slot (what happened,
  its code, one recovery) and throws away nothing that was valid. There is no modal error. **A GPU
  failure** never finishes on the CPU by itself (repository rule); the failed row's one verb is
  Re-run, carrying its band, and its label names the path it will take before the click: "Re-run"
  once the element has reattached the GPU, "Re-run on CPU" otherwise, one command either way
  (`glossary.md` 9) (`state-matrix.md` 3.3, Acceleration path). **Load errors** appear where the load started, and nothing in the project
  changes.
- **Feedback:** the error slot at that scope; the assertive announcement (9.4).
- **Undo:** n/a: a failure writes nothing.
- **Exceptions:** n/a.
- **Owner:** element for the error and its code; app for where it is drawn. **Outcome:** n/a: a
  failure is feedback, not an effect.
- **Grammar:** `interaction-patterns.md` 3.2, 3.5.
- **Figma:** bad input silently reverts. Departure: meaning-bearing fields keep text (`interaction-patterns.md` 3.2).
- **Inherits:** the `FieldRow` error slot and the compact-mantine alert.
- **Validated by:** a heuristic inspection of every error code's scope; it fails on any error
  drawn at a wider scope than the one that holds it.

## 9. Keyboard and assistive technology

### 9.1 Focus regions

The region-cycle chord and its reverse cycle Figma's measured regions in its order: the rail and
left panel, the right sidebar, the toolbar, **the bottom dock (graphty's addition)**, Help, the
canvas (`design/ui/figma/accessibility/README.md` 1.1). Tab moves only inside a region, except on
the canvas, which Tab leaves (`interaction-patterns.md` 3.6; here, 9.2). The rail and the toolbar are each one Tab stop with a
roving focus moved by the arrows. List rows are a WAI-ARIA tree, grid or listbox
(`interface-templates.md` 9), a departure from Figma's role-less rows. **A row selection** (several
rows chosen together while the canvas selection stays as it was; `glossary.md` 6) is exposed the
standard way, `aria-multiselectable` on the list and `aria-selected` on each row in it, so a screen
reader says "selected", the platform's word; inventing a state (`aria-checked` would promise
checkboxes) costs its users more. **So the two are told apart by ear**, the canvas selection's
announcement always ends "on canvas" ("12 nodes selected on canvas"). Its states: a click sets the
anchor; Shift+click or Shift+arrow extends from the anchor; Mod+click toggles one row; Esc
collapses it to the focused row; a click on the canvas leaves it. A screen-reader task, "what is
selected?", tests it (the need is a compact-mantine `Tree` multi-select). Focus never enters
a collapsed section. While the comparison surface is open its two sides are regions in that
order after the canvas; the not-drawn line, when it shows, is a region after the canvas. **Focus
is never obscured** (WCAG 2.4.11): the focused control scrolls clear of the toolbar, the dock and
any popover, and the toast never covers the focused row.

### 9.2 Walking the canvas

The canvas holds a focus target with `role="application"`, as Figma's does. The walk's states and
edges are 3.8's.

- **The walk has its own keys; the plain arrows stay on the camera.** The **neighbor-walk keys** are
  Shift with an arrow in the element's default keymap. The plain arrows keep orbiting (3D) and
  panning (2D), as they did before the walk existed, so nothing a current reader knows changes (`decided-doors.md`, "The focused node and its event").
  Shift with an arrow is reserved by no browser, operating system or screen reader in an
  application region, where Alt with Left or Right is Back and Forward on Windows and Linux, Mod
  with Left is Back on macOS, Ctrl with an arrow switches spaces on macOS, and letters and the
  bracket keys belong to the tools, the camera and the member walk. It is not a single-character
  key, so the setting that turns single-key shortcuts off (WCAG 2.1.4) leaves the walk working,
  and it keeps the arrow as the direction a reader already tries. Its risk is that Shift with an
  arrow extends the focus in a list and the selection in the table; the keyboard-only studies
  test it (`research/study-schedule.md`, "Decisions the studies can reverse"). The camera ignores
  an arrow while Shift is held, so one press never both walks and moves the view.
- **Entry is always a deliberate key.** The first neighbor-walk key on the canvas starts the walk,
  and so does Enter when the selection is elements or empty. Focus arriving never starts it, and a pointer
  never does, so a mouse user's Esc deselects in one press and Tab on arrival leaves the canvas.
  With a set, path or item selected, Enter goes to members first (`interaction-pattern-entries.md`
  4.2), and the next neighbor-walk key starts the walk.
- **The entry node** is the first selected element in the selection's own order (path order, rank
  order, otherwise lowest id), the first member for an object selection, the current Find hit, or,
  with nothing selected, the drawn node of highest degree, ties broken by lowest id. **With no
  node drawn** (past the drawing limit, the canvas unsupported, or everything hidden) the first
  neighbor-walk key does not start the walk: the polite region says nothing is drawn and names Choose
  what to draw, which Enter on the canvas opens. It is the
  **anchor**. Entry is announced, and the announcement names both exits, Tab and Esc, and the
  member-walk keys (WCAG 2.1.2).
- **The neighbor-walk keys move focus to a neighbor of the focused node**, in the element's stable neighbor
  order, following the neighborhood direction convention (All by default; `graph-conventions.md`
  2), and the announcement says "out to" or "in from" on a directed graph. Screen direction changes
  with the 3D camera, so the order is not spatial. Each move fills the walk-position slot (position
  among the neighbors, and the node's label).
- **The inspector stays on the selection** (`interaction-patterns.md` 3.1). The walk-position slot and the announcement
  describe the focused node; **Enter selects it**, and the inspector follows. **Space, released
  with no drag, toggles it in or out of the selection** and the walk goes on, so a keyboard user builds a selection of several
  nodes. Nothing nudges: positions have no units, so moving a node by keyboard is Enter, then the
  inspector's Position row.
- **Back and home.** The walk-back key returns to the previous node; the walk-home key returns to
  the anchor. Both are roles in the element keymap (`decided-doors.md`, "The default keymap and tools"). The walk-back default
  must be a chord the browser does not reserve, or be consumed only while the walk is active,
  because Alt+Left is Back in Chrome and Firefox on Windows and Linux and would leave the page.
  Backspace is never "back", because it is a delete key on macOS; Delete and Backspace keep their
  one meaning (`interaction-patterns.md` 3.6) during the walk. Studies of screen-reader navigation over data structures found
  people get lost without a known way back (Zong et al. 2022; the TADA study of node-link diagrams).
- **The member-walk keys** (`]` and `[` in the element's default keymap, matched on the character
  typed so AltGr layouts work, and `{` and `}` never bound apart) move the focused node
  through the current selection, in its own order (path, rank, order of addition, else lowest id),
  so a node Space toggled in is reachable and one toggled out is skipped; they never change the
  selection. **Tab always leaves the canvas** and ends the walk, as WAI-ARIA expects of a composite
  widget, because after Enter on a 400-member set a Tab that stepped members would take hundreds of
  presses to leave. Figma's Tab steps siblings; this departure is `figma-crosswalk.md` 4.3's, and
  the screen-reader walk study can overturn it.
- **Exit.** Esc leaves the walk (rung 2); a later Esc deselects. A pointer click leaves it and does
  not re-enter it, and so does focus leaving the canvas (`interaction-patterns.md` 3.8).
- **Delete during the walk** acts only when the focused node is in the selection
  (`interaction-patterns.md` 3.6).

**Camera keys stay on the arrows and move off the tool keys.** The camera movement keys (the
element keymap names them) move and rotate the camera and act only while the canvas has focus,
which keeps them inside WCAG 2.1.4's focus exception and stops them firing from the table. The
plain arrows move the camera; Shift with an arrow walks.

**Element need:** `element-needs.md`, "The neighbor-walk keys, Shift with an arrow", and
`decided-doors.md`, "The focused node and its event".

### 9.3 Keys: platform, ownership and dispatch

- **Mod everywhere.** Every modifier chord is written Mod (Cmd on macOS, Ctrl elsewhere), as
  `bindings.ts` does. **Delete and Backspace act on what has focus**: the focused rows, else the
  canvas selection, and nothing on a heading, button or chip; what they do to each subject is
  3.6's table.
- **Who owns a key.** graphty-element owns the canvas tools (Select, Lasso, Hand, Path, Note), the
  canvas walk, its Esc rungs and the commands it defines, and ships a **default element keymap**
  for them that a host can rebind. The keymap is published behavior (`decided-doors.md`, "The default keymap and tools"). `bindings.ts` holds only the app's own chords (regions,
  panels, Quick actions) and the app's overrides of element keys.
- **Dispatch stages.** A key goes to the first owner below that consumes it, and to no other. The
  stages are lettered, so "rung" keeps its one meaning, the Esc ladder of 3.6:
  - **A. A pointer gesture in progress** (a drag, a marquee, a lasso, a scrub): Esc aborts it. The
    element reads this from its own interaction state; a host control's gesture is closed through
    the element's abort command (`element-needs.md`, "A gesture a host control drives").
  - **B. The focused field** (the component's revert): Esc reverts, Enter commits, the undo chords
    undo text while an edit is pending.
  - **C. The top-most overlay** (Esc rung 1): Esc closes it and focus returns as 3.6 says.
  - **D. While the canvas focus target has focus, graphty-element**: its tools, the walk, playback's
    Esc, undo, Delete, copy, and Esc rungs 2 and 3. The app sees only keys the element did not
    consume.
  - **E. Anywhere else, the element's opt-in dispatcher**, `attachKeymap(session, root)`, attached
    by the host to a root it chooses, applies 3.6's row for what has focus: for a chord in the
    element's published keymap it issues that element command by name, and a host's own chords
    (the app's chrome chords, through `useKeymap`) run as registered. The app holds no copy of the
    element's chords and never re-implements an element key (door 91, Where intent commands publish).

  **The element never listens on the document**, only on its own focus target, so two embeds on
  one page and a host that owns its keys are never surprised. A bare embed therefore gets Esc,
  undo and the tools while the canvas has focus, and a host that wants them from its own panels
  reads the keymap.
- **The walk never takes the plain arrows.** They stay on the camera, where readers already use
  them; the walk is on the neighbor-walk keys (9.2).
- **Tool keys fire whenever focus is not in a text-entry control or a type-ahead list**, as Figma's
  fire anywhere outside a text field. Trees and listboxes use type-ahead, so letters go to their
  rows; the table grid does not, so a tool key pressed after selecting rows in the table arms the
  tool. A setting turns single-key shortcuts off (WCAG 2.1.4).
- **Figma's chord where Figma's verb matches**: group (Create set, whose name opens in rename,
  a ledger row), ungroup (deletes the selected set and selects its members, where plain Delete
  leaves the selection empty; section 2, [i]), rename, duplicate (on object rows; with elements selected
  it does nothing and announces why, `conceptual-model.md` 7.1), copy (`interaction-patterns.md` 3.1), Quick actions, find, zoom to
  selection, Minimize UI, and hide. **The hide chord means what it means in Figma**: with a row
  focused it toggles that row's eye (`interaction-pattern-entries.md` 6.5), an app key because row
  focus is the app's; **on a set row, which has no eye, it always runs Hide on canvas on the
  members**, whether or not the set draws a hull, so one chord never means two things on one kind
  of row; with elements selected on the canvas it runs the element's Hide on canvas, or Show on
  canvas when every selected element is already hidden. It never leads to a verb that
  changes a number. **Figma's lock chord stays unbound**: Figma's lock stops a layer being
  selected, while Pin fixes a node's position, and one chord with two meanings would teach the
  wrong one (a ledger row, `figma-crosswalk.md` 4.3).
- **Shift+F10 and the Menu key open the context menu** (`interaction-pattern-entries.md` 6.7), where
  Figma's do nothing (a ledger row).
- **Quick actions lists every command with its chord**, so Quick actions is how chords are learned.

**Element need:** `element-needs.md`, "Esc rungs 2 and 3".

### 9.4 Announcements

One polite live region carries state changes: the selection count, the selection-cleared slot,
which names Previous selection's chord (a live region cannot hold a control), entering the walk
with its exit key and moving in it, a node toggled in the walk, a finding stepped to
(`interaction-pattern-entries.md` 4.8), a run finished or failed, the undo label after a press
(WCAG 4.1.3). An error that stops the analyst's own action, and a failed autosave, go to one
assertive region. A notice and its announcement are one utterance, spoken once: compact-mantine's
Toast sets `role=alert` on every message (its `figma-spec.md` 8.6), which would speak every notice
assertively and twice beside this region, so the fix is in the component (`role=status` by
default, `role=alert` for the two assertive cases), never an app override. Marks are announced by their spoken forms (`content-design.md` 6). Notices never
take focus. With reduced motion requested, the layout still settles (its movement is how data is
shown) but the camera does not animate.

---

## Sources

- `interaction-patterns.md`, whose rules these entries inherit; `research/interaction-patterns-rejected.md`
- `design/ui/figma/flows.md`; `research/figma.md`; the undo design
  (`.worktrees/element-undo/design/undo/undo-design.md`, branch `feat/element-undo`) sections 5.2, 5.3 and 8
- graphty-element on master: `src/session/selection/SelectionApi.ts`, `src/session/planning.ts`
- Decided doors cited: `decided-doors.md`, "Selection over the cap"; `decided-doors.md`, "The default keymap and tools"; `decided-doors.md`, "The focused node and its event"
