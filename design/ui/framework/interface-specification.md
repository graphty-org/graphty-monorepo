# Interface specification

**Job.** The skeleton of every surface graphty draws: which regions each template has, which of
compact-mantine's row types fill them, which sections appear in which order, which component does
which job, and whether that component exists or waits on graphty-element. Each template is written
as a difference from the Figma pattern it copies.
**Not here:** anything the README's "Where a sentence goes" assigns elsewhere, most often:
behavior, focus, Esc and modality (`interaction-patterns.md`, `interaction-pattern-entries.md`);
strings (`content-design.md`); caps, counts and what changes with graph size (`state-matrix.md`);
why a departure from Figma is forced (`figma-crosswalk.md` 4); element work (`element-needs.md`);
token and grid values (compact-mantine's `src/constants/panel.ts`); the app's current code and
build order (`implementation-mapping.md`).
**Owner:** Figma product designer. **Ceiling:** the README's table. **Validated by:** section 9.

**Checked against:** compact-mantine on the PR #409 branch at `a6b63bf6`, whose only source change
since `1b28bdd0` is the overlay theme (modal close names, no menu focus placeholder), leaving 7.1's
exports unchanged; graphty-element and the graphty app at the status line of
`implementation-mapping.md`; the Figma
study in `design/ui/figma/`.

**graphty-element** owns every graph capability; the **graphty app** only consumes it
(`CLAUDE.md`, "Architectural Principles"); **compact-mantine** is the app's component library,
rebuilt to match Figma's editor.

## 0. How to read this document

**The sentence test.** A sentence belongs here only if it names a region, a row type, a section,
an order, a component, or the element need that blocks a part. A sentence that says what happens,
what the words are, what exists in the model, why a departure is forced, or what changes with graph
size belongs to that document's owner, and this document points to it.

**Numbers.** Geometry is compact-mantine's `PANEL_GRID`; this document names its members
(`PANEL_GRID.DATA_PITCH`), never their values. The only numbers here are the app's own, in 1.3;
sizes on the diagram in 1.1 are annotations.

**The template card.** Every template in `interface-templates.md` fills every field; "none" means considered and
empty.

| Field | Content |
|---|---|
| Instantiates | the place or device in `information-architecture.md` 4 it draws |
| Figma source | the inventory entry in `design/ui/figma/components.md` (1 to 56) or the capture it copies; "documentation, not captured" where no capture exists, and the source is then on the capture backlog (section 9); "none" where Figma has no counterpart |
| Departures | one citation per row of `figma-crosswalk.md` 4 that the template draws, quoting the row's Figma column; the reason lives only there; a blocked part is named with the element need it waits on (7.4) |
| Regions and rows | top to bottom, each with its component; which element read fills a row and which command it issues is `implementation-mapping.md` 5's card table, under the card's name |
| Tab order | inside the template only; the cycle between regions is `interaction-pattern-entries.md` 9.1 |
| States | the `state-matrix.md` rows that apply, and whether the template draws data paint (`interface-templates.md` 0) |

**Status words.** **Exists**: exported by compact-mantine at the commit above. **Needs a
variant**: an export exists and needs a prop, mode or export. **Missing**: no export; a filed
issue, never a local control in the app. **Blocked**: waiting for a graphty-element read or
command, and absent until the pull request that lands it (7.4); the app never computes the missing
value itself.

## 1. The frame

### 1.1 Region map

```text
+----+----------------+---------------------------------------+----------------+
|rail| left panel     | canvas (graphty-element)              | header row 1   |
|    |  header:       |                                       | header row 2   |
|    |   name, chip   |   drawing, selection marks, tooltip,  |  (mode tab,    |
|    |  Graphs        |   note markers, minimap               |   zoom menu)   |
|    |  Sets and paths|                                       |----------------|
|    |  ==split====== |                                       | inspector      |
|    |  Styles        |      [notice]                         |  type row      |
|    |  Views         |      [secondary bar | actions]        |  sections ...  |
|    |  (or Find, or  |[legend,                               |                |
|    |   Results,     | not-drawn line] [ floating toolbar ]  |                |
|    |   Notes,       |                               [Help]  |                |
|    |   Assistant)   +---------------------------------------+                |
|    |                | time slider strip (when on)           |                |
|    |                | dock tabs: Nodes | Edges | item | ... |                |
|    |                | table                                 |                |
+----+----------------+---------------------------------------+----------------+
 ~56    ~240 (PANEL_GRID.WIDTH)                                 ~240 (PANEL_GRID.WIDTH)
 (annotation only: from compact-mantine; not normative)
```

Canvas, dock and inspector share the screen at once (`information-architecture.md` 8.1). Two modes
take over the frame: **Version history** replaces the inspector column, and the **comparison
surface** replaces the inspector column and splits the canvas (`interface-templates.md` 18); while either holds the
column, header row 2's tab slot names it. Above the toolbar, surfaces stack as secondary bar, then
notice; Quick actions replaces the secondary bar while open. **Corners, stated once here:** Help
sits bottom right, as Figma's does (`../figma/components.md` 15); the legend sits bottom left, above
the dock, with the not-drawn line as its last line, where no editor family opens, so the result
editor that changes a legend never covers the legend it changes. Its height cap is
`state-matrix.md` 7's; what it does when the left panel opens over the canvas at the narrow window
class, and how it and the toolbar share the bottom edge at 1366 by 768, are `state-matrix.md` 8's;
how much of the canvas all furniture together may cover is `visual-language.md` A6. No
occluded-region property is published to keep another corner.

### 1.2 Regions

`figma-crosswalk.md` owns which Figma object each graphty object maps to;
`information-architecture.md` 9 owns which place each lands in. This table records which
component draws each region. Its status is the worst status of the region's components and reads
(sections 3 and 7).

| Region | Figma region | Filled by | Components | Status |
|---|---|---|---|---|
| Rail | left rail | main menu, Graph, Assistant, Results, Notes | `NavRail`, `RailButton` | exists; Notes blocked (7.4) |
| Left panel header | file name and menu, with the Drafts line under the name, staying when the panel switches, as UI3's does | project name, chevron menu, Not saved and View only, Minimize UI; the filter chip in the Drafts line's slot (`interface-templates.md` 7), in view above every rail panel | `ActionRow`, Mantine `Menu`, filter chip | exists; the chip missing (7.3) |
| Graphs section | Pages | graph entries | `PageList`, `PageRow`, `InlineRename` | exists; several graphs blocked (7.4) |
| Sets and paths, Styles, Views | Layers (for sets and, in Layers' own slot, the style stack) and the Prototype tab's Flows (for views) | sets, paths, set collections; the style stack (`interface-templates.md` 9); saved views | `Tree`, rows at level 1; the Pages and Layers split handle | needs a variant (leading swatch, 7.2) |
| Find | the Find panel, opened from the Pages header | hits by kind (`interface-templates.md` 2a) | `SearchInput`, `ResultRow` | blocked (7.4) |
| Dock table | none (`figma-crosswalk.md` 1) | nodes and edges, not listed in the left panel (`interface-templates.md` 2) | `DataTable` | needs a variant; blocked (`interface-templates.md` 16) |
| Results panel | Tools, plus the project's results | results, runs, catalog entries | `SearchInput`, `ControlSection`, `ActionRow` | needs a variant; Compare with... blocked (7.4) |
| Header row 1 | Share and play | Export..., the one filled button | Mantine `Button` | exists |
| Header row 2 | the mode's tabs, then zoom | the mode tab while Version history or the comparison surface holds the column; the zoom and view menu | Mantine `Tabs`; `Menu` | exists |
| Inspector | right sidebar | the canvas selection's sections, or the graph's | `ControlSection`, the row types (2) | needs a variant; partly blocked (3, 7.4) |
| Canvas | canvas | drawing, outlines, tooltip, markers, minimap, legend, not-drawn line | graphty-element | blocked (`interface-templates.md` 13) |
| Floating toolbar | bottom toolbar, including its mode control | Select (Lasso and Hand in its flyout), Path, Note, Quick actions, view mode | `Toolbar`, `ToolGroup`, `ToolButton` with flyout | exists; Note blocked (7.4) |
| Secondary bar | contextual bar | the armed tool's options | `SecondaryToolbar` | exists |
| Quick actions | Actions panel | commands, catalog entries | `QuickActions` | exists |
| Bottom dock | none | time slider strip, tabs, table | `ResizeHandle`, Mantine `Tabs` (pills), `DataTable`, a time-window component | missing (7.3); blocked (`interface-templates.md` 16) |
| Help | help button, a second route to the main menu's Help | Shortcuts, Open sample, Documentation | `HelpButton`, `ShortcutSheet` | exists |
| Notice | toast | notices with Undo; the one running notice | `Toast`, `ToastProvider` | needs a variant |

### 1.3 Geometry the app owns

| Value | Rule | Reason |
|---|---|---|
| Panel widths | derived from `PANEL_GRID.WIDTH`; no literal in the app | one grid identity; the app's current constant is `implementation-mapping.md` 8's |
| Assistant panel | 280 px, Figma's Agents panel | it holds a conversation and no grid rows, so `PANEL_GRID` does not apply and no second grid identity is created |
| Bottom dock | default one third of the canvas column; minimum five table rows plus its tab strip, header and scope line (160 px left about three at 1366 by 768); resizable by `ResizeHandle` | a table needs about five rows to compare; the canvas keeps the majority. Its height past the drawing limit is `state-matrix.md` 4.2's |
| Comparison side | unmeasured; set by the two-view prototype (7.4) | no number is invented |
| Option-form labels | `FieldRow` `labelPosition="above"`, labels forced on: figma-spec's caption role over `PANEL_GRID.BODY`, or `PANEL_GRID.FIELD` when paired; a channel field is paired only once it has a short label | the widest measured labels fit `BODY`, not `FIELD` (`research/interface-checks.md`); a label is never truncated |
| Inspector at 280 px | not offered | the inspector holds grid rows, so a wider one is a second grid identity, a redesign; side-by-side readings fit the grid on `CompoundRow` (4.1) |

## 2. Rows

### 2.1 compact-mantine's closed set

compact-mantine publishes nine row types and two atoms, and states that the set is closed: every
row of a panel is one of them, and a row that fits none is panel furniture or a design error
(`src/components/rows/index.ts`). This document declares no row type of its own; a graphty row that
fits none is a compact-mantine issue.

| Row type (export) | Anatomy | graphty uses |
|---|---|---|
| `ActionRow` | label; one action or route | Used by; N more; N differ; Last import; the Overview row; Memberships at rest; Position; the Layout row's collapsed form; the graph's Attributes row; Selection colors at rest (7.2); a result or catalog entry |
| `MetricRow`, `SparklineRow`, `HistogramRow` | a reading; a one-pitch or two-pitch chart | Statistics headlines; the degree distribution; a result's summary readings; the time series; a load step's counts |
| `CompoundRow` | name plus value segments | side-by-side readings; a membership reading ("community 4 of 212") |
| `DataRow`, `DataRowHeader`, `RankChip` | name, value, rank | Attributes; Members; Memberships; a result's top and bottom items; path hops; a load issue |
| `FieldRow` (with `ControlGroup` for a legend) | one or two fields on the grid | a constant channel; an option value; Position; Background; an export setting; the Edges editor's Direction and Weight; the style row (7.2) |
| `PanelField` | a single spanning field | a name, a caption, an expression |
| `ProseBlock` (with `InfoCircle`) | text | a method caveat; a state line's detail; a small-graph caveat |
| `RampRow` (with `GradientEditor`) | a palette or scale | a bound channel's scale over its attribute |
| `ToggleRow`, `ToggleRowGroup` | a checkbox or switch | a boolean option; Labels on canvas and the other view toggles |
| `TrailingSlot`, `AdvancedButton` (atoms) | the trailing control | Run on the Layout row and in the result and layout editors' headers; Run layout; a group's advanced tier; Reset; Select painted; Replace on the Overview row; Copy as PNG; New seed on a seed |

Furniture, not rows: `ControlSection` (section header), `ControlSubGroup`, `ToggleWithContent`,
`SearchInput` in a header, and the type row (4.2, 7.3) with the sibling stepper ("12 of 40") on its
line 2. Lists use list components: `PageList` and `PageRow` for graphs; `Tree` for kept
objects, style layers and filter steps; `ActionRow` for results and catalog entries; `ResultRow`
only for hits in a list driven by a search field (Find, Quick actions, the Compare-with picker),
because it is a `role="option"` that never takes focus and can hold nothing interactive
(`tree/ResultRow.tsx`); `DataTable` for many elements.

### 2.2 Row roles

A row type says how a row is drawn; a **role** says which interaction pattern it follows: a grammar
of `interaction-patterns.md` 3, and entries of `interaction-pattern-entries.md`.

| Role | Drawn as | Grammar (`interaction-patterns.md`) | Entries (`interaction-pattern-entries.md`) |
|---|---|---|---|
| Page row | `PageRow` | 3.1 | 4.1, 6.3, 6.4 |
| Object row: set, path, view, note | `Tree` row | 3.1 | 4.1, 4.2, 6.3, 6.4 |
| Result row | `ActionRow` (`state`, `busy`, `actions`) | 3.1, 3.3 | 4.1, 4.2, 6.4 |
| Layer row: style layer, filter step | `Tree` row, reordered by `onMove`; activation opens its editor | 3.1 | 6.3, 6.5 |
| Property row: Layout, Rule, Scope, Created from, Endpoints, Edges, Position, Background | `ActionRow` or `FieldRow` with `TrailingSlot` | 3.2 | 6.2 |
| Field row | `FieldRow`, `PanelField`, `VariablePill` | 3.2 | 6.2 |
| Style row, the object's own | `FieldRow` style-row variant, writable (3.1) | 3.2 | 4.7, 6.2 |
| Style row, routed | `FieldRow` style-row variant, read-only, opening the painting layer's editor (3.1) | 3.2 | 4.7 |
| Reading row | `MetricRow`, `DataRow`, chart rows | -- | 4.3 |
| Catalog row | `ActionRow` with (i) | 3.3 | 6.1 |
| Find result | `ResultRow` in the `SearchInput` listbox | 3.1 | 4.1, 4.8 |
| N more, in a section | `ActionRow` with a `stateTitle` naming what is hidden ("56 more attributes") | -- | 4.3 |
| N more, in a list | a row of that list, because every child of a tree or grid is one of its rows | -- | 4.3 |

**Glyphs by meaning.** Which rows carry an eye is `interaction-pattern-entries.md` 6.5; a filter
step carries a checkbox in its row's leading slot; a boolean option is a `ToggleRow` checkbox.

### 2.3 A channel row has three states

A channel row is **unset** (absent, reached through its group header's "+"), **constant** (a
`FieldRow`), or **bound** (a `ControlGroup` row whose legend names the channel and then the
painting layer in secondary text, "Color -- Degree color", over a `VariablePill` with `swatch` that
names the attribute and shows the resolved value). The legend carries the layer because the pill's
fill row spans both grid fields and leaves no trailing room for it (`figma-crosswalk.md` 4.2, "A
bound field shows only its variable"); the height and target recount decides whether the extra
legend height is affordable (section 9). Which component draws each value kind is `interface-templates.md` 11.

## 3. Sections, defined once

Every inspector section is defined here once and reused by every kind of selection. A section
header is `ControlSection`. A section is **present**, **header only with "+"** (the empty-header
ink is compact-mantine's, figma-spec 9.2, as Figma's empty Effects and Export sections are drawn), or
**absent**. Caps at rest are 4.1a's.

The "Waits on" column names the read a section's status depends on; its full binding is
`implementation-mapping.md` 5's. The order is fixed as below: readings and attributes precede
Appearance (`figma-crosswalk.md` 4.2, "The right sidebar orders a selection's sections").

| Section | Rows | Waits on | Status |
|---|---|---|---|
| Type row | two lines: kind glyph and name; kind word, verbs, overflow (4.2) | the selection | missing (7.3) |
| Property rows | `ActionRow` or `FieldRow` with `TrailingSlot`; on the graph, the header carries the Look icon (4.1) | layout settings; the set's definition; the run record; a node's position | exists; Position, Look and a set's Layout blocked (7.4) |
| Statistics | `MetricRow`, `HistogramRow`, `SparklineRow`, then "N more"; a header `Menu` holding Over time... and, on a set, Compare with randomized baseline... (`output-homes.md` 3) | graph: `data.statistics()`; several elements: `selection.statistics()`; the degree distribution and any other scope: blocked | partly blocked |
| Attributes | `DataRow`, computed values first, a bound attribute's row with a chit of what it paints (`canvas-drawing.md` 7), a metric's row with its rank as a second line; a filter field in the header once expanded past its cap | `data.node(id)`, `data.edge(id)`; the graph's profile and completeness: `data.attributes()`; across a selection: blocked | partly blocked |
| Connections (one node) | two `ActionRow` counts, **N neighbors** and **N edges**, each split In, Out and All on a directed graph | a neighborhood count (`neighborsOf` is a selection target only) | blocked |
| Members | `DataRow`, or path hops; `RankChip` where ranked | `sets.get(id)`; an item's: its result (`results.path`, `results.term`) | exists |
| Memberships | one `ActionRow` with its count at rest, expanding in place to `DataRow`s or `CompoundRow`s | kept sets: `sets.containing(element)`; items: blocked | partly blocked |
| Appearance | style rows (3.1); on several elements, Figma's Selection colors; on a kept object, its own rows then routed rows (3.1) | `styles.explain(target)` | partly blocked |
| Notes | `Tree` rows; absent when no note targets the object, which is reached by the Note tool or Add note (`principles.md` 5); with nothing selected, the notes about the graph | notes targeting this object | blocked |
| Used by | one `ActionRow` | a set or path: `sets.usedBy(id)`; any other object: blocked | partly blocked |
| Export | header with "+" and a Copy as PNG `TrailingSlot`; one `FieldRow` export setting (scale, format) with an `AdvancedButton` (background, include legend, suffix) and remove; then an "Export <name>" secondary `Button` | `captureScreenshot()` | partly blocked |

**Path hops.** A path's Members section lists a node `DataRow`, then an inset edge `DataRow`
carrying the edge's label, or the attribute the path was weighted on, then the next node. The inset
is a `DataRow` variant (7.2). Full edge attributes are in the table's Edges tab scoped to the path.

**Where each mark is drawn.** Which mark a row shows first is `state-matrix.md` 2; the words are
`glossary.md` 10.

| Mark | Drawn |
|---|---|
| ~; at least, at most; not converged; first {N} | at the value or count |
| variant words ("(sampled)") | in the result's name |
| a precondition | at the value, and on the run control before a run |
| Filtered: | the filter chip |
| {channel} set by {layer} | the run's state line when its automatic layer was suppressed; a legend note |
| missing attribute | a recipe definition or a style row kept and switched off |
| {N} hidden; {N} incomplete; weight: unknown | the not-drawn line; the Attributes row; Statistics |
| {N} unmatched; {N} rows dropped | the Last import row, whenever non-zero |
| not drawn; canvas not available | where the element would be drawn; the canvas card |
| filtered out; 0 matches | a Find hit; Find's list |
| 0 in filtered graph | a search's result |
| merged into {name}; (removed) | a reference |
| Mixed; {N} differ | the inspector row whose targets differ |
| outside scope; not yet measured; no value; (none); Not computed | at the value |
| Not saved; View only | beside the project name |

**Statistics are readings**, never fields (`figma-crosswalk.md` 4.2, "The inspector shows only
editable values").

**Export** copies Figma's Export section (`header-and-modes/README.md` 5): a setting row of scale
and format, "..." Advanced, remove, and the export button below; one setting per object
(export settings stack, one row each, as Figma's do). Whether the setting is saved is
`conceptual-model.md` 5.3's. Copy as PNG sits on the header, where `output-homes.md` places it.

### 3.1 Appearance: which rows draw on which kind

Which Appearance rows write and which route is `interaction-patterns.md` 3.2's rule; this section
says only which rows draw.

- **One element: a style row per written channel.** A channel painted by a layer at a constant
  borrows the look of Figma's style row (`right-sidebar-selection/README.md` 391;
  `../figma/components.md` 31) and none of its behavior (`figma-crosswalk.md` 4.2, "A style row
  names a reusable style"): a chit reading `styles.explain(target).merged[channel]`, the painting
  layer's name, opening that layer's editor. A channel bound to an attribute is the bound
  row of 2.3, its pill drawn without `onDetach` (detach is in the layer editor). Where
  `ChannelExplanation.editable` is false, the row shows its `reason`.
- **Several elements: Figma's Selection colors**, in its collapsed form at rest: one `ActionRow`
  per channel with up to three chits and "+N" (`right-sidebar-selection/README.md` 506). Expanded,
  a channel with one shared value is one style row; a channel whose values differ is headed
  "Mixed", then, for a grouped channel (a constant or a categorical binding), one style row per
  distinct resolved value up to the Appearance cap of 4.1a, then an "N more"
  `ActionRow` opening the painting layer's editor, whose legend lists every value; for a channel
  bound to a continuous attribute, one row per painting layer showing its ramp. Each row carries
  the Select painted target icon as a `TrailingSlot`. This split is where a channel bound to a
  categorical attribute and one bound to a quantitative attribute look different.
- **A kept set or path: own row, then routed rows**, per channel. First the object's own
  row: a writable style row for the object's own layer, or its header only with "+" when that layer
  does not write the channel. Beneath it, read-only routed rows, one per other layer that paints
  members, in the Selection colors form above, each opening its layer's editor
  (`figma-crosswalk.md` 4.2, "Selection colors edits each paint in place"). **An offered group or
  found path** has no layer until it is kept, so its own row is the one control Create set to style
  or Create path to style (`interaction-patterns.md` 3.2), and its routed rows follow.
- **Several elements of both kinds:** the channels whose name exists for both kinds, derived from the channel
  descriptors (color, opacity, label and label style on master), each drawn as for several elements.
- **On elements, a commit on a row writes the Overrides layer** as one step
  (`interaction-patterns.md` 3.2); Override (4.2) reaches a channel that has no row.

**Blocked** (7.4): Selection colors on several elements (the resolved-value row); the target icon
(the painted row); the own row (the object's-own-layer row); Override (the Overrides row). The app never fakes
an override with an ordinary layer and an id selector.

## 4. The inspector

The inspector is one place whose sections are chosen by the canvas selection's kind, and by
nothing else, in one fixed order, as Figma's right sidebar rebuilds on every selection. **A
definition** (a result, style layer, filter step or saved view) is edited in its editor popover
(`interface-templates.md` 10), never inspected here; what opening one does is `interaction-pattern-entries.md` 6.1's.

Tables 4.0 to 4.2 are the one source of the selection kinds; the eight branches the tree test
scores are listed once, in 4.0.

### 4.0 Selection kinds

Which Figma object each kind is lives only in `figma-crosswalk.md` 2; the last column is the
Figma selection state the inspector copies.

| Kind | The inspector shows it when | Figma state copied |
|---|---|---|
| Nothing | nothing is selected; the inspector is the graph's | empty selection |
| One node | the selection is one node | one layer |
| One edge | the selection is one edge | one layer |
| Several elements | two or more elements, one kind or both, showing the sections they share | "N selected", Mixed values |
| Set (fixed or rule), Path (B) | one set or path, selected as a whole: kept, or offered by a run (a group, a found path) | one layer |

A selection never mixes elements and objects (`interaction-patterns.md` 3.1). The (B) kinds are
absent until the element's object selection lands (door 39, Selection as element state, and the cap; 7.4); until then a found path is kept
from its row's menu (`implementation-mapping.md` 7). **Focused rows are
not kinds**: several focused set, path or item rows leave the inspector on the canvas selection,
and their set operations are in the rows' shared context menu (Figma's Boolean operations split
button in that menu).

**Six kinds, provisional; this is the one statement of the count.** A group or a found path is a
Set or Path in its *offered* state, as a Figma instance is its component with named rows changed:
live from its run, announced by the element when it is lost (`conceptual-model.md` 1.3, 4.1). The
offered state differs from the kept object only where 4.1 and 4.2 mark it: its keep verb (Create
set or Create path) takes the first slot; it has no layer of its own, so its Appearance row is the
one control **Create set to style** or **Create path to style** (`interaction-patterns.md` 3.2);
its Attributes section shows the item's attributes, which a kept set does not have; a group has no
Rule row and no Add to set or Take out of set, because its members are its run's; and Used by is
blocked. Every other verb a kept set or path has, the offered one has too. A mixed selection is
Several elements, as Figma's "N selected".

**The eight scored branches**, the one list the tree test and `information-architecture.md` 4.1
use: Nothing, One node, One edge, Several elements, Set, Path, and the two offered states, a group
and a found path. The offered states are scored as branches of their own because a task's setup
names what is on screen, and inspected as Set and Path. The teach-back reverts the fold if two of
five analysts describe a group as something other than a set (`research/study-schedule.md`).

### 4.1 Which sections each kind shows

Marks: **x** present; **+** header only with "+"; **.** absent; a word names a variant; **B**
blocked: absent until its element need lands (7.4). A mark in parentheses applies to that set kind
only.

| Kind | Property rows | Statistics | Attributes | Connections | Members | Memberships | Appearance | Notes | Used by | Export |
|---|---|---|---|---|---|---|---|---|---|---|
| Nothing | Look (the header's icon) B, Background, Layout | graph, with the Attributes row | . | . | . | . | . | B | . | + |
| One node | Position B | . | x | B | . | x | style rows | B | . | + |
| One edge | Endpoints | . | x | . | . | x | style rows | B | . | + |
| Several elements | . | selection, edge attributes B | shared B | . | . | B | Selection colors B | B | . | + |
| Set | Layout B, Rule (rule set), Created from | B | . | . | x | . | own B, then routed | B | x | + |
| Path | Created from, Layout B | B | . | . | hops | . | own B, then routed | B | x | + |
| Set, offered (a group) | Created from, Layout B | B | item | . | x | . | Create set to style | B | B | + |
| Path, offered (a found path) | Created from, Layout B | B | item | . | hops | . | Create path to style | B | B | + |

Notes on the cells:

- **Nothing**: the Statistics section's first row is the Overview row ("Overview: General") with
  Replace as its `TrailingSlot` and, while a reading reads Not computed, Compute the overview in its
  menu (`files-and-recipes.md` 2); then the headline readings, the Last import
  row, the Edges row (direction and the weight role, opening the Edges editor), mark rows present
  only while non-zero, a Types row when a type role is declared, the Attributes row (one
  `ActionRow` counting the attributes and opening the table), and "N more". **Look** is not a row:
  it is Figma's Apply variable mode icon on the property section's header
  (`header-and-modes/README.md` 219; `left-sidebar/README.md` 952), opening a dark `Menu` of the
  Looks as checkbox items, the current Look named in its tooltip. **Background** is Figma's Page
  color row (`CompactColorInput`), writing `GraphStyle.background`, never a style layer; unset, the
  canvas is `canvas-drawing.md` 1's; a skybox background draws the row
  read-only, naming the skybox, with Reset. A **Glow strength** row follows Background only while a
  layer writes `node.glow` (`options-and-encodings.md` 3). There is no Name row, as Figma's page
  inspector has none: the graph is renamed on its `PageRow`, and Project info... is in the chevron
  menu (`interface-templates.md` 2). The Look is the project's and Background is this graph's (`conceptual-model.md` 1.1),
  labeled so once the project holds several graphs (`content-design.md`). The style stack is not
  here: it is the Styles list in the left panel (`interface-templates.md` 9). Notes lists the notes about the graph.
- **One node**: Position is one `ActionRow` reading the node's pinned or free state and opening
  the Position editor (`interface-templates.md` 10). Connections holds the two counts, which act as every count does
  (`interaction-pattern-entries.md` 4.3). Memberships is one row at rest, counting the kept sets
  that hold the node; item memberships are blocked (7.4, scoped reads).
- **Several elements**: Statistics reads `selection.statistics()`, whose attribute statistics
  cover nodes only (7.4, scoped reads). Attributes shows shared values and one "N differ" row
  opening the table on the selection with the differing columns first.
- **Set**: a fixed set and a rule set differ only where marked here and in 4.2. **Layout**, on a
  set, path, group or found path, is an `ActionRow` naming the graph's layout method with **Run layout** as its
  `TrailingSlot` (the command: `output-homes.md` 3); it is blocked on the layout scope (7.4).
- **Offered variants**: the sibling stepper sits on the type row's line 2 (4.2). Attributes shows
  the item's attributes (a group's name, Profile groups columns, per-scope values), which belong to
  its run (`conceptual-model.md` 4.3); its Statistics are its readings.

### 4.1a Caps at rest, and the targets they leave

Caps at rest for the sections 4.1 draws, and the targets they leave against `principles.md` 5 (at
most 24 outside Statistics). All are proposed: the first-click test of the one-node inspector at a
short window revises them.

| Cap | Value | Basis |
|---|---|---|
| Attributes rows before "N more" | 4: the attributes a style layer reads, then the label attribute, then file order; expanding "N more" stays expanded for that element kind for the session, so reading many elements one after another costs one click each | proposed, within principle 5's three or four rows; the test compares 4 with 6, with and without the kept expansion |
| Appearance rows before "N more" | 4 | proposed |
| Memberships at rest | one row with its count | proposed |
| A histogram popover's top items | 5 | proposed |
| A column header menu's entries above its submenus | 8 | proposed |
| Selection colors at rest | one row per channel, three chits and "+N" | Figma's collapsed form (`right-sidebar-selection/README.md` 506) |

**The one-node count**, the inspector column and header only (the chip is the left panel's). Export 1; the zoom menu 1 (no Undo button); the type
row's three verbs and overflow 4; Position 1; Attributes 4 and "N more" 1; Connections 2;
Memberships 1; Appearance 4 and "N more" 1; the Export header's "+" 1. Total 21 against 24;
Notes is absent until a note targets the node.
Without the caps, a typical node measured on the 32 px pitch was about 956 px tall with 29 targets.
Fixture `State/Inspector/OneNodeAtRest`.

**The resting count with nothing selected**: the header's Export and zoom menu 2; the property
section's Look icon, Background, and Layout with its Run 4; the Export header's "+" 1. Total 7
outside Statistics, whatever the length of the style stack, which is the left panel's (`interface-templates.md` 9); a
Notes section adds its rows once the graph has notes. Hidden elements add nothing here: they are
counted on the canvas's not-drawn line. Fixture `State/Inspector/NothingAtRest`.

### 4.2 Type-row verbs

The type row is panel furniture (7.3) in the form of Figma's page header
(`header-and-modes/README.md` 341) rather than its one-line selection row (`figma-crosswalk.md`
4.2, "A selection's type row is one line"): line 1, the kind glyph and the name at the panel's full
width less the overflow; line 2, the kind word and the columns below, then three verbs as
`ActionIcon`s with tooltips (`TooltipShortcut`; a `SplitButton` where a verb has variants), then the
overflow. The name truncates by `content-design.md`'s name rule. **Which commands a kind's type row
carries is `output-homes.md` 3's**; this table arranges them. **Promotion:** on a kept set or
path the first slot is Select members, the slot of Figma's Select matching layers; an offered
variant leads with its keep verb, because it is gone at the next run unless kept. The other slots follow the
`top-tasks.md` rank of the task each command serves: Select neighbors 4,
Filter to 6, Pin or Unpin 7, Create set and Add to set 9, Compare with... 10, Shortest path from...
and Create path 11. Destructive verbs and Add note (whose homes are the Note tool and the Notes
section) never take a slot.

| Kind | Line 1 | Line 2 | Verbs | Overflow |
|---|---|---|---|---|
| Nothing | the graph's name | Graph | -- | the graph's commands; Clear all overrides |
| One node | its label | Node; Pinned when pinned | Select neighbors (split: hops, direction, edge type, Filter to neighbors), Filter to, Pin or Unpin | Create set, Shortest path from..., Filter out, Hide on canvas or Show on canvas, Add note, Override, Remove |
| One edge | source -> target on a directed graph, A -- B on an undirected one; each end a link | Edge; the edge key when parallel edges exist | Select neighbors, Filter to, Create set | Filter out, Hide on canvas or Show on canvas, Add note, Override, Remove |
| Several elements | N selected | Nodes, Edges, or Nodes and edges when mixed (a mixed selection offers only Filter to and Create set, then Filter out, Hide on canvas or Show on canvas and Add note) | Select neighbors (split: hops, direction, edge type, Filter to neighbors), Filter to, Create set | Filter out, Add selection to step, Hide on canvas or Show on canvas, Create path, Merge nodes, Add note, Override, Remove |
| Set | its name | its size; Fixed set or Rule set | Select members, Filter to, Add to set (fixed set), Freeze as fixed set (rule set) | Take out of set (fixed set), Compare with..., Collapse or Expand, Hide on canvas or Show on canvas, Run layout, Extract as graph, Add note |
| Path | its name | its derived kind (Cycle, Simple path, Trail or Walk), endpoints, "N hops, distance D (weight attribute)" on a weighted path | Select members, Filter to, Create set | Extend path, Compare with..., Hide on canvas or Show on canvas, Run layout, Extract as graph, Add note |
| Set, offered (a group) | its name, or "Community 4" | Group; the sibling stepper | Create set, Select members, Filter to | Compare with..., Collapse or Expand, Hide on canvas or Show on canvas, Run layout, Extract as graph, Add note |
| Path, offered (a found path) | Found path | "N hops, distance D"; the sibling stepper | Create path, Select members, Filter to | Create set, Compare with..., Hide on canvas or Show on canvas, Run layout, Extract as graph, Add note |

Rename, Duplicate and Delete are on the object's row (`output-homes.md` 3), as in Figma's layers
panel. A rule set's rule is edited from its Rule property row. A definition's verbs are in its
editor's header and its row's context menu (`interface-templates.md` 10); the set operations are in the context menu of
focused set rows. Add note, Select painted, Override, Clear all overrides, Compare with..., and Hide
on canvas and Show on canvas are blocked (7.4). "Hide on canvas or Show on canvas" is one slot whose
label follows the selection, as "Pin or Unpin" does. Clear all overrides is the graph-wide reset
(`figma-crosswalk.md` 4.2, "Reset all changes resets one instance's overrides"); Reset on an
overridden style row is the fine reset. The order Create path takes its nodes in is
`interaction-pattern-entries.md` 4.1's.

### 4.3 Tab order

The type row (name, verbs, overflow); then each present section in the fixed order. Inside a
section: the header's toggle, icons and "+", then its rows, then "N more".

## 6. Objects by template

Where each object lives is `output-homes.md` 1 alone; this table names only the templates that draw
it. Why some objects are never inspected is `conceptual-model.md` 1.4's.

| Object | Row template | Inspected by | Edited through |
|---|---|---|---|
| Project | the left panel header (1.2) | never: its details are a dialog (`interface-templates.md` 20) | Project info dialog |
| Graph | `PageRow` | Nothing kind | `PageRow` rename; Layout and Edges editors (`interface-templates.md` 10) |
| Node, edge | `DataTable` row; Find hit (`interface-templates.md` 2a) | One node, One edge | Attributes rows; Position editor; Override (blocked) |
| Set (fixed, rule) | `Tree` row (the row form of `interface-templates.md` 9) | Set kind | rule editor (`interface-templates.md` 10); Add to set, Take out of set |
| Path | `Tree` row | Path kind | Rename; the Path tool (`interface-templates.md` 14) |
| Item (group, found path) | `DataTable` row in an item tab | Set or Path kind, offered state (4.0) | Rename (group name attribute) |
| Pair | `DataTable` row | never: Select selects its two nodes (Several elements) | -- |
| Set collection | `Tree` row expanding to its sets | never: its sets are inspected | context menu |
| Comparison | the comparison surface (`interface-templates.md` 18); once saved, a run row | the difference list | Save comparison |
| Attribute | column header; `DataRow` | histogram popover (`interface-templates.md` 12) | column header menu; Add attribute dialog |
| Data version | `ActionRow` (`interface-templates.md` 17) | import report | load step (`interface-templates.md` 20a) |
| Result, run | `ActionRow`; a run one disclosure down | result editor (`interface-templates.md` 10) | result editor |
| Filter step | `Tree` row (`interface-templates.md` 7) | rule editor | rule editor |
| Style layer | `Tree` row (`interface-templates.md` 9) | style-layer editor | style-layer editor |
| Look | a `Menu` from a section-header icon (4.1) | never: a value of the project | the Look menu |
| Layout settings | `ActionRow` (the Layout row) | Nothing kind | layout editor |
| Saved view | `Tree` row | view editor | view editor |
| Note | `Tree` row; canvas marker | the Notes section of its targets | note editor |
| Recipe | never listed: a file (`output-homes.md` 1) | recipe preview (`interface-templates.md` 20) | binding step (`interface-templates.md` 20) |
| Catalog entry | `ActionRow` | (i) popover (`interface-templates.md` 22) | -- |

An undo step is not an object: a label on Edit > Undo and the undo notice.

## 7. Component and element ledger

Checked at compact-mantine `a6b63bf6`. 7.1 is regenerated from `src/index.ts` against the
components named here (`implementation-mapping.md`), never kept by hand.

### 7.1 Exists, used by this document

Every component this document names that is not in 7.2 or 7.3 is exported at the commit above,
plus Mantine's themed `Menu`, `Modal`, `Tabs`, `SegmentedControl` (option forms only),
`RangeSlider`, `Button` and `Pill`. `Popout`'s header is drawn by `Popout.Panel` from
`PopoutHeaderConfig`; no `PopoutHeader` is exported.

### 7.2 Needs a variant (compact-mantine issues to file)

The list, each variant with the build slice that lands it, is `implementation-mapping.md` 10.1;
it is work to file, not a fact about a surface.

### 7.3 Missing: concepts with no component

The Slice column names a build slice by its number in `implementation-mapping.md` 9, where each is
named by what it delivers (0 open a node, 1 open and characterize, 4a rank, 8 the modes).

| Concept | Where it belongs | Needed by | Slice |
|---|---|---|---|
| `SchemaForm`: tiers, dense and sparse modes, the compact-mantine rows of `interface-templates.md` 11 and a `renderers` map for the app's (`implementation-mapping.md` 5) | compact-mantine, ported from `graphty/src/components/options/OptionsForm.tsx` | `interface-templates.md` 11 | 4a |
| Filter chip | compact-mantine; read-only ("Full graph", no menu) until filter steps exist | `interface-templates.md` 7 | 1 |
| Type row: two lines, the name at full width over the kind word, three verb slots and the overflow, with the sibling stepper ("12 of 40") on line 2 | compact-mantine, as panel furniture (Figma's page header) | 4.2 | 0 |
| Split canvas container | compact-mantine for the container; the second view is graphty-element's | `interface-templates.md` 18 | 8 |
| Time-window component: a draggable window, Play and Pause with speed, Step, an overflow menu | compact-mantine, new (Mantine's `RangeSlider` is not a compact-mantine export), ported from the app's current slider (`implementation-mapping.md` 8) | time slider strip (`interface-templates.md` 16) | 8 |

### 7.4 Element needs

A part marked blocked, and its command, are absent until the pull request that lands its element
need; there are no fallbacks (`implementation-mapping.md` 7). The one precondition is
single-pointer node positioning.
Cards cite a need by its row's opening words in `element-needs.md`.

## 9. Validation

- **Cognitive walkthrough** (Wharton, Rieman, Lewis and Polson), as Analyst Alex, the
  intermediate analyst (`design/designloom/personas/analyst-alex.yaml`): every step of every flow in
  `task-flows.md`, and every trigger in `interaction-patterns.md`, lands on a named card, row and
  component; one with no landing is a defect here, and a card with no pattern behind it is a
  defect there.
- **Routes over published APIs.** Every flow is walked with every blocked part absent at once; each
  flow must still reach its end over published element APIs, or its missing need must be scheduled
  in a slice (`implementation-mapping.md` 9), or be the one precondition.
- **Sentence test.** Every changed sentence is read by a person against section 0's test; one that
  states an effect, a word or a model fact fails and moves to its owner. A pattern match on verbs
  is not used, because it flags correct pointers.
- **Register match.** Every command in a 4.2 cell has that kind's type row among its starting
  places in `output-homes.md` 3, and every type-row starting place there appears in 4.2; checked by
  hand until the element's command list generates both (`implementation-mapping.md` 3.1).
- **Figma counterparts.** Every Figma object named here matches `figma-crosswalk.md` 1.
- **Heuristic evaluation** of each template card against Nielsen's ten heuristics and WCAG 2.2, on
  Storybook compositions of real components (`research/study-schedule.md`, "Walkthroughs").
- **Transitions.** Every selection transition in `interaction-patterns.md` 3.1 ends in a kind in
  4.0; a kind no transition reaches is a defect.
- **Mechanical checks** (`research/scripts/`): the outline's right-hand branches against 4.1 and
  4.2, and the kinds in both directions; no fallback pointer; every Departures quote a ledger row.
  The start screen, toolbar and header branches are compared with `interface-templates.md` 6, 14 and 19 by hand.
- **Coverage.** Each place and device in `information-architecture.md` 4 is named in one card's
  Instantiates field; every object in `conceptual-model.md`'s map has a row in section 6; every
  card has a row in `implementation-mapping.md` 5's card table.
- **States.** Each card's States field covers the `state-matrix.md` cells for its place.
- **Ledger.** 7.1 is regenerated from compact-mantine's `src/index.ts`; every "exists" resolves to
  an export and, once written, a story; regenerated when PR #409 merges.
- **Conformance review** of each card against its Figma capture. Every source marked
  "documentation, not captured" is on the capture backlog.
- **First-click tests** of layout, on Storybook compositions, each scored by
  `research/study-schedule.md`, "First-click scoring", and listed in its "First-click tasks, later". Pattern-level tests are
  `research/study-schedule.md`, "Interaction-pattern studies"'s.
- **Height and target recount** at `PANEL_GRID.WIDTH`, from real components in Storybook: the
  resting graph inspector and the one-node inspector against `principles.md` 5; the bound row's
  legend line against the layer name in a tooltip only (2.3); the two-line type row (4.2);
  Selection colors on a set whose categorical binding has hundreds of values (3.1); and the
  style-layer editor with a realistic layer (a selector, three bound channels, a scale, a legend)
  at 1366 by 768.
- **Annotations.** The sizes on the 1.1 diagram are checked against `PANEL_GRID` whenever
  compact-mantine changes; a mismatch fails, so the annotation never becomes a copy.
- **Screen-reader pass** (NVDA, VoiceOver) on the style-layer list once `Tree` has its treegrid
  mode (7.2), with twelve layers and an "N more" row: one Tab stop, and each eye announced with
  its layer's name and state.

## Sources

- compact-mantine at `a6b63bf6`: `src/index.ts`, `src/constants/panel.ts`,
  `src/components/rows/index.ts`, `ChartRow.tsx` 147, `tree/`, `popout/`, `overlays/Toast.tsx`,
  `DataTable/`, `design/figma-spec.md` 7 to 11
- graphty-element: `src/session/styles/`, `src/session/data.ts`, `src/session/selection/`,
  `src/catalog/types.ts`, `src/config/GraphStyle.ts`, `src/graphty-element.ts`
- graphty: `src/components/options/OptionsForm.tsx`; `src/components/shell/`
- `design/ui/figma/`: `../figma/components.md`; `../figma/flows.md`; the `right-sidebar-selection`,
  `header-and-modes`, `left-sidebar`, `bottom-toolbar` and `canvas-selection` captures, at the
  lines cited in the text
- `design/designloom/personas/`; this folder's documents named in the text
- Garrett, *The Elements of User Experience* (2011), ch. 6; Tidwell, Brewer and Valencia,
  *Designing Interfaces* (2020); Wharton, Rieman, Lewis and Polson, "The cognitive walkthrough
  method" (1994); Nielsen, "10 Usability Heuristics for User Interface Design" (1994, updated
  2020); W3C, WCAG 2.2, 1.1.1 and 2.5.7; WAI-ARIA Authoring Practices, listbox, tree view, treegrid
  and button patterns
