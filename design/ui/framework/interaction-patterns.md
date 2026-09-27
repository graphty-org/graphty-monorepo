# Interaction patterns

**Job.** Say how things behave: patterns that span components, surfaces and the canvas, the modes,
keyboard operation of the canvas, and the command catalogue. This is the control layer. **Not
here:** which surface a pattern appears on (`information-architecture.md`), a task's step sequence
(`task-flows.md`), key chords (`graphty/src/components/shell/bindings.ts`), component-level
behaviour (the compact-mantine stories). **Owner:** interaction designer. **Ceiling:** 50 KB.
**Validated by:** each pattern owned by graphty-element is exercised on a bare embed.

**Status: stub.** It holds what moved out of the conceptual model and the studio's starting
positions. Each pattern is to be written with Trigger, Behaviour, Feedback, Undo, Exceptions,
Owner, Figma source or departure, and Inherits. The earlier round's 27 patterns
(`design/ui/object-first-ux/interaction-patterns.md`, Part 3) and its review checklist (Part 4) are
inputs to carry in.

## Received from the conceptual model

Read in `research/archive/conceptual-model-long-form.md` under the section named.

- **Selection and object selection** (5.1). Selection is transient. Selecting a set, path or item
  as one thing targets the object untruncated; Enter selects its members; Shift+Enter returns to
  the object; Esc clears to the graph's inspector; a canvas click selects the element, never a set.
  Selection is published graphty-element state, because a headset, an assistant, the command
  palette and a third-party page must see the same thing. Undo restores the selection each step
  was taken with. Owner: Element.
- **Queries end as selections** (5.1). Find and Select same value produce a selection, or an object
  selection when the cap would truncate it; the selection keeps no memory of how it was made.
- **Select neighbors and the working set** (`conceptual-model.md` 4.4). Select neighbors grows the
  selection by k hops in the search graph and is not undoable; what it finds beyond a working set
  is offered, not added. Filter to neighbors and Include found nodes grow the working set as
  undoable steps, and the new nodes are placed near their neighbors. A Find hit that a data step
  excludes names the step and offers to include it, which edits that step. The kind of a filter
  step follows the command that made it; there is no toggle.
- **Previous selection** (`conceptual-model.md` 2, known risk). Selection is outside undo, so undo
  right after Select neighbors reverses the previous project change, often the Filter to selection
  that made the working set. Previous selection, a graphty-element command, restores the selection
  held before the last selection change, and repeats back through a short list. The undo label
  names the project change it reverses, so undo never looks like it reverses a selection. Owner:
  Element.
- **Keeping** (2.4, 8). Create set (Ctrl+G) always makes a fixed set, selected and put into rename;
  Save as rule set sits where a rule is on screen (a histogram band, a value's menu, a Find query, a
  filter step).
- **First and incremental placement** (5.5). Never-placed nodes are placed by a layout run implied
  by Open or the view-mode command; elements entering through a command are placed near their
  placed neighbors inside that command's undo step; pins hold.
- **Note markers** (6.2). Drawn by default; Shift+C hides them all; the toggle is working state and
  no saved view captures it.
- **The command catalogue** (8, "What each verb does"). The verb table is the seed of the catalogue:
  operation, command name, undo-label template, where it can be invoked, Owner. It stays
  provisional until the undo design merges.

## Starting positions from the studio

- **Apply recipe** opens one binding step shaped like Figma's missing-fonts dialog: one row per
  unresolved attribute or catalogue entry, a picker on each, nothing guessed. Confirmation is asked
  only for weight roles and mismatched measurement levels. One undo reverses the whole apply.
- **A suppressed automatic paint** shows one line on the run, "Colour is set by <layer>. Apply
  anyway", and nothing else. It waits on the owner's answer to `one-way-doors.md` 26.
- **Filter steps** get a checkbox and a funnel section icon, never the eye; the eye belongs only to
  style-layer rows, where it means "layer off" as on Figma's fill rows. A first-click test with
  Figma-trained and Gephi-trained analysts decides the final form (`research/study-schedule.md`).
- **"New network from selection"** is a command-palette alias of Filter to selection, with one line
  saying why, so Cytoscape users find it.
- **Algorithm and layout options** are rendered only from the catalogue entry's option schema,
  never hand-built. A missing grouping or hint is a graphty-element change, not an app workaround.
- **Data and styles side by side** are linked views, not a third panel: the table and the canvas
  share one selection (brushing and linking), a column that a style layer reads shows that layer's
  swatch or ramp in its header, and an element's inspector says which layer paints each channel
  ("why is this node red?").

## Received from the information architecture

Moved out of `information-architecture.md` when it was cut down to structure. Read the full text
in `research/archive/information-architecture-long-form.md` under the section named. Each item is
to be rewritten as a pattern (Trigger, Behaviour, Feedback, Undo, Exceptions, Owner, Figma source).

- **A count is a route** (rule 4). Clicking a count opens the table on what it counts and keeps the
  selection; Shift+click adds the counted elements to the selection (Figma's meaning of Shift);
  "Select" in the count's menu replaces the selection. A degree opens the Edges tab on incident
  edges; a neighbour count opens the Nodes tab on distinct neighbours; a histogram bar or series
  point is a count. The number is the route; the rest of the row opens the reading's editor.
- **List rows follow Figma's Pages and Layers rows** (3). Commands on the context menu (also
  Shift+F10 and the Menu key); double-click or Ctrl+R renames; hover shows only the row's own
  toggle and outlines what the row stands for; no visible "..." button. Selecting from a row never
  moves the camera; Shift+2 frames the selection.
- **Rail keys** (2). Graph Alt+1, Results Alt+2, Notes Alt+3. Find (Ctrl+F) temporarily replaces
  the left panel's list, as Figma's Find does.
- **Running from the catalogue** (3). A click runs with defaults on the chip's scope and opens the
  editor, as Figma's "+" adds first and configures after. A row that needs an argument, or costs
  "a few minutes" or more, opens unrun with a Run button; Enter runs. Ctrl+click selects several
  rows; Run shows their combined cost, runs those that need nothing, and leaves the rest unrun
  with their editors open. A row whose algorithm has run goes to its result.
- **Notes** (3). Clicking a note selects its targets and keeps the inspector visible; double-click
  or Enter opens the Note editor beside it, as does a canvas marker or a note in any Notes
  section. Writing is one step: the Note tool (C), where a click on empty canvas notes the graph,
  or Add note in an object's overflow, the graph's name-row menu or a result editor's menu.
- **The editor popover** (2, 4). One open at a time, with one nested picker. Opened from an
  inspector or chip row it sits left of the inspector aligned to that row; from a left-panel row,
  right of the panel; from a menu or the palette, docked left of the inspector. The result editor
  stays open while the selection changes from inside it or the table; a canvas click or Esc closes
  it.
- **Esc and modes** (4). Esc returns the inspector to the graph. Version history and the
  comparison surface change the inspector until Done; Esc leaves neither.
- **Minimize UI** (2). Ctrl+Shift+\ collapses both panels into floating pills, as in Figma.
- **Autosave** (2). No Save command and no unsaved-changes prompt; Ctrl+S shows when the project
  was last saved and when a copy was last downloaded.
- **Delete never asks** (2). Undo covers it, as in Figma. Dependents become Detached and keep
  resolving through the deleted object's kept record; a notice counts them and offers Undo.
  Selection is not an undo entry.
- **The floating toolbar** (2). Select (V) with a flyout of Lasso (Q) and Hand (H); Space is a
  temporary Hand; a drag on empty canvas draws a box. Path (P), Note (C), the palette (Ctrl+K),
  and the view-mode control (2D, 3D, VR, AR). The secondary bar appears only while a tool is armed;
  the Path tool's bar takes From and To (a click, a typed name, a set or a group; To equal to From
  finds cycles), one Options control (shortest; k shortest; all paths up to N hops; weight and
  role; direction) and Run.
- **Finishing a query selects its first finding** (4), as Figma selects what a tool just drew.
- **Keeping is a verb from one family** (rule 9): Create set, Save as rule set, Save comparison,
  Create path, Save view. A transient reading appears where it was asked.
- **The legend is a route** (9). Clicking an entry adds a Filter to step on that value;
  Shift+click adds or removes the value in the same step.
- **Re-seeding a pipeline** (9). A neighbourhood or path step names its start nodes; its menu
  offers Use selection as start, then Re-run all from the notice.
- **Result editor runs** (4). Changing a row and pressing Run adds a run; the Run line says what
  stays on the earlier run; after the run, Carry over to new run moves matched group names, notes,
  group attributes and layers in one undoable step.
- **Scrubbing the time slider** (8.2) edits its live Window step and records no undo entry.
- **The paste rule** (11). Pasted text that parses as a graph loads as one. A single column of ids
  on the empty canvas loads as nodes, and the notice offers Connect to data source with the list
  filled in when a source accepts ids; Connect from a pasted-id graph is Replace data. On a loaded
  graph a single column of ids is a one-column Join. Pasted into Find, a list selects what it
  names.
- **A file dropped on a loaded graph** (11) offers add data, add as another graph, replace data
  and join at the drop point.
- **Appearance rows** (4). Clicking opens the style-layer picker over the whole stack, with Add
  style layer, the Looks and Override; each picker row has Edit. An overridden row has Reset; the
  type row's overflow has Reset all changes, Figma's two grains of reset.

## Sources

- `research/archive/conceptual-model-long-form.md` sections 2.4, 5.1, 5.3, 5.5, 6.2, 8
- `design/ui/object-first-ux/interaction-patterns.md`
- `design/ui/figma/flows.md`; `research/figma.md` 4.6
- `.worktrees/element-undo/design/undo/undo-design.md` 4.1, 8
