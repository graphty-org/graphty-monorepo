# Feature fit 5: styling

Where every styling capability of graphty-element and the graphty app lands in the object-first
model of `design/ui/object-first-ux/object-model.md`. The area is: channels, style layers,
selectors, label styles, palettes, legends, declutter, and how layers map to an object's Fill and
to precedence. The capabilities come from the two inventories,
`design/ui/object-first-ux/inventory/element-capabilities.md` (sections 5, 5.1, 6, and the styling
rows of 2, 7 and 11) and `design/ui/object-first-ux/inventory/app-today-and-personas.md` (the
Style panel, the legend, the label defaults, the style-layer inspector), plus the open issues and
the designloom capabilities that name a styling requirement.

Nothing here changes code. Element API names written `session.xxx` are members of the session
API in `graphty-element/src/session/`; issue numbers are open issues in
graphty-org/graphty-monorepo.

## 0. Terms

The object model's terms (Object, Element, Member, Tree, Inspector, Fill, Channel, Precedence,
Scope, Mask, Focus, State, Row, Section, Paint row) are defined in
`design/ui/object-first-ux/object-model.md` section 0 and are used unchanged. The styling terms
this file adds:

- **Layer**: the element's unit of appearance, `LayerSpec` in
  `graphty-element/src/catalog/types.ts`: a selector (which elements), a target (node or edge),
  and either fixed values (`set`) or bindings (`encode`). Layers form a stack; a layer later in
  `session.styles.list()` paints over one earlier. In this model a reader never sees a layer:
  every layer is some object's Fill.
- **Selector**: the part of a layer that says which elements it paints. The element has four:
  an expression (`degree > 10`), a presence test (`has` a result field), an explicit id list,
  and everything.
- **Encoding** (a **bound** channel): a channel whose value is computed from a data column or a
  result field through a scale and, for colours, a palette. A Measure's or Grouping's Fill is an
  encoding. `session.styles.encode()` writes one for a run.
- **Highlight**: a layer that paints the members of a set one fixed look ("these ones", not "this
  much"). `session.styles.highlight()` writes one for a run whose result is a path or a set. A
  Set's Fill is a highlight.
- **Scale**: how a value becomes a position on a ramp or a size: linear, log, sqrt, quantile,
  bins, ordinal (one colour per value), and so on (`session.catalog.scales()`).
- **Palette**: a named list of colours. Sequential (a ramp, low to high), diverging (two ramps
  meeting at a midpoint), categorical (one colour per group), highlight (a pair: chosen and
  muted). `session.catalog.palettes()`.
- **Domain**: the value range the scale reads against, normally the measured min and max.
  **Clamp**: cutting the domain at percentiles so outliers do not flatten the ramp.
  **Missing**: what an element with no value is painted.
- **Overflow**: what a categorical colour encoding does when there are more groups than colours:
  paint the largest N and the rest grey ("other"), cycle node shapes ("shape"), or keep inventing
  colours ("extend").
- **Legend**: the picture's key: one block per bound channel, with swatches or a ramp and the
  **departures** (sentences about what the encoding did that the picture does not show, such as
  "clamped at p2 and p98"). `session.styles.legend()` computes it; nothing draws it (#292).
- **Explain**: `session.styles.explain({node})`: which layer won each channel of one element,
  and whether the channel is editable there.
- **Style document** (template): the whole user stack as a portable file
  (`session.styles.toDocument()` / `applyTemplate()`). A **theme** (`ThemeDescriptor`) is a
  named style document the element ships. A **preset** is the designloom word for the same idea.
- **Label budget**: the rule for which nodes carry a label at all (none, all, the top N by a
  measure). The app adds one layer on load, "Top degree labels" (`graphty/src/components/shell/
  defaults/styleDescriptors.ts`).
- **Declutter**: everything that keeps the picture readable at scale: the label budget, label
  wrapping and truncation, label overlap avoidance, dimming what is not of interest.
- **Halo**: the element's own selection ring (gold) and hover outline. Element-owned layers
  (`LayerSource` reason `selection`, `hover`, `default`, `notes`), locked, never in the tree.

Fit words: **natural** (the capability lands in one obvious home with no new concept),
**awkward** (it lands, but a rule or a control has to bend; the note says which), **no fit**
(the capability, as it exists or is specified, contradicts the model; the note says what
replaces it).

The last column answers three yes/no questions in one cell: does using it change **precedence**
(the paint order), **state** (the object's current / computing / stale state), or the **tree**
(adds, removes, moves or nests a row).

## 1. The one mapping everything below follows

| Element concept | Object-first concept |
|---|---|
| The style stack, bottom first | The tree, read bottom to top, with each parent's own Fill just below its children (object-model 6.2) |
| One layer | One paint row of one object's Fill (a Fill with node and edge channels is two layers, one per half; the reader sees one Fill) |
| Layer order, `session.styles.move` | Dragging a row in the tree |
| `enabled: false` | The eye (this object stops painting) |
| `locked` (element source) | The Dataset's "Default look" rows, drawn with a lock; the halo layers, not shown |
| Selector `has` a result field | The implicit selector of a Measure's or Grouping's Fill: paint exactly the members |
| Selector expression / ids | A Set's definition (rule or fixed), not a Fill control |
| Selector everything | The Dataset's own Fill (new, section 2.2) |
| `encode()` | A Measure's or Grouping's Fill rows |
| `highlight()` | A Set's or Group's Fill rows |
| `source.by == "run"` | The object's Made by section |
| `legend()` | The legend overlay (L) |
| `explain()` | The node inspector's Look section and the "Covered by X on N of M" line |
| Style document | Share > Export look; file menu > Apply look; the project file (#301) |

Everything a reader can paint is an object. The consequence for the app: the Style panel, the
Layers list, the layer editor, "Change encoding", "Add a style layer" and "Reset styles to
defaults" cease to exist as surfaces. Their capabilities are re-homed row by row below.

## 2. The table

### 2.1 Channels (what a Fill can write)

The element has 40 channels (`Channel` in `graphty-element/src/catalog/types.ts`). A Fill's "+"
opens the channel list under plain names; the grouping below is how the list is organised, so a
reader sees twelve entries rather than forty.

| Capability | Status | Home | Fit | Element API (gap) | Precedence / state / tree |
|---|---|---|---|---|---|
| `node.color`, `node.opacity` | shipped | Fill > Colour row (chit, hex, opacity field) on any object; the Dataset's Default look shows the element's locked value | natural | `set` / `encode` on the layer | no / repaint only / no |
| `node.size` | shipped | Fill > Size row: a number on a Set; Range [min] [max] on a Measure | natural | same | no / repaint / no |
| `node.shape` (25 meshes) | shipped | Fill > Shape row: a select of the 25 with a glyph each; on a Grouping, Channel [Shape v] paints one shape per group (the designloom "6 shapes" requirement is a subset) | natural | `encode` with an ordinal scale onto `node.shape`; the legend swatch's `paints` field already carries a shape | no / repaint / no |
| `node.outline`, `node.glow`, `node.glowStrength`, `node.wireframe`, `node.flat` | shipped | Fill > Outline row (width, colour) and Fill > Glow row (strength); wireframe and flat are checkboxes inside the Shape row's popover, because they are ways of drawing the shape | natural | `set` | no / repaint / no |
| `node.label`, `node.labelStyle` | shipped | Fill > Label row: the text source (an attribute, a member value such as a path's hop order, or fixed text) and a "style" button opening the label-style popover (section 2.4) | natural | `set` / `encode` with `passthrough` | no / repaint / no |
| `node.tooltip`, `node.tooltipStyle` | shipped (hover only) | Fill > Tooltip row on any object; and Dataset > Canvas > Tooltip [attribute v] for the whole graph | natural | `set` / `encode` | no / repaint / no |
| `node.marker` (image, icon, note marker) | proposed #295 | Fill > Marker row (an icon or image URL, or "by attribute"); Dataset > Canvas > Notes switch uses the same channel for note markers | natural once the channel renders | gap: #295, the channel is `renderable: false` | no / repaint / no |
| `edge.color`, `edge.opacity`, `edge.width` | shipped | Fill > Edge colour, Edge width rows; on a Set of nodes they paint the set's inside edges | natural for edge sets and edge measures; awkward for a node set (note A1) | `set` / `encode` on an edge-target layer; gap A1: a selector for "edges between the members of a scope" | no / repaint / no |
| `edge.style`, `edge.patternCount` | shipped | Fill > Edge style row: a select of the nine patterns with a repeat count in its popover | natural | `set`; a Grouping of edges can bind it (ordinal) | no / repaint / no |
| `edge.curvature` | shipped | Fill > Edge style popover ("Curve" field); Dataset > Canvas > Edges row for the whole graph | natural | `set` | no / repaint / no |
| `edge.arrowHead`, `edge.arrowTail` and their size, colour, opacity, text, text style (12 channels) | shipped | Fill > Arrows row: head and tail selects with a popover for size, colour, opacity and end text; Dataset > Canvas > Arrows [switch] for "show direction" | natural; the twelve channels are one row with a popover | `set` | no / repaint / no |
| `edge.animationSpeed` | shipped | Fill > Animation row (edge flow speed); the same row on a Path set is the designloom "animate along path" | natural | `set` | no / repaint / no |
| `edge.label`, `edge.labelStyle` | shipped | Fill > Label row on an edge object; Dataset > Canvas > Edge labels [attribute v] | natural | `set` / `encode` | no / repaint / no |
| edge tooltip | withdrawn (edges unpickable) | none | no fit today; returns with edge picking (#319) as a Tooltip row on edge objects | gap: #319 | none |

### 2.2 The stack: layers, selectors, order, visibility

| Capability | Status | Home | Fit | Element API (gap) | Precedence / state / tree |
|---|---|---|---|---|---|
| List / get layers | shipped | Nowhere: the tree is the list. No reader-facing layer list exists | natural | `session.styles.list()` feeds the tree order; the objects API (object-model section 11) owns the order | no / no / it is the tree |
| Add a layer over "everything" (the app's "+ Add a style layer", #380) | shipped in the element, broken in the app | Two homes by intent. To paint some elements: Filter tool > Create, then the Set's Fill. To paint everything: the Dataset's Fill section (new): the locked Default look rows plus a "+" that adds an editable channel for the whole graph | natural; the empty-layer defect disappears because a Fill row always writes a channel | `session.styles.add` with `{match: "everything"}` at the bottom of the user stack, source `user`; no gap | Dataset Fill sits below every object (a parent's Fill is under its children) / repaint / no row for it |
| Add a layer with an expression selector (the app's "Which nodes" field, #383) | shipped (selectors compile in the style engine) | Filter > By rule creates a Set whose Definition is the rule; its Fill is the paint. The rule field shows plain names (`session.results.term()`), never `results.degree_0bkz...` | natural | `{match: "expression"}` today for a rule Set's Fill; the standalone query engine (#149) for Select and count. Gap: the objects API must write the layer's selector from the Set's definition so the two cannot drift | new row / current or computing / adds a Set |
| Add a layer over an id list | shipped | Ctrl+G (promote the selection) or "Colour this node..." makes a fixed Set; its Fill is the layer | natural | `{match: "ids"}` | new row / current / adds a Set |
| Update a layer (the app's style-layer inspector) | shipped | The Fill section of the object; a paint row commits on Enter, Tab or blur | natural | `session.styles.update(id, patch)`; every edit is a `Run`, so a repaint over a large graph shows progress on the object's row | no / computing while the repaint runs / no |
| Remove a layer | shipped | The minus on a paint row removes one channel; deleting the object removes all its layers | natural | `session.styles.remove`; the objects API removes by object | no / no / delete removes a row |
| Move a layer (drag-reorder in the Layers list) | shipped | Drag a row in the tree; Ctrl+] and Ctrl+[ | natural | `session.styles.move(id, before)`; the objects API keeps parent-below-children (object-model 6.2) | yes / no / moves a row |
| Enable / disable (`enabled`) | shipped (no control in the app, #167) | The eye on the row and in the inspector header | natural | `update(id, {enabled})` on every layer of the object | yes (a hidden object does not paint) / no / no |
| `removeBySource` | shipped | Not on screen: Close dataset and "Delete" use it | natural | as is | n/a |
| Validate a spec before adding | shipped | Inline: a paint row or rule field that would be refused shows the error under the row, from `validate()`'s errors with positions | natural | `session.styles.validate(spec)` (synchronous) | none |
| Layer kinds (base, encoding, highlight, custom) | shipped | The tree icon: Set (highlight), Measure and Grouping (encoding), Dataset (base). "custom" has no object of its own | natural; "custom" folds into Set | none | none |
| Layer source (element, run, user, template, plugin) | shipped | Made by on every object ("Louvain, 34 nodes..." for a run; "You" for a user Fill; "Template X" for an applied look; "Plugin Y") | natural | `Layer.source` | none |
| `userData` on a layer | shipped | Not on screen | natural | as is; the objects API may keep per-object UI state here until #301 | none |
| Group a run's layers under one parent (#171) | proposed (app) | Subsumed: one run is one object; a Grouping's Groups are its children; a Fill with node and edge channels is one object. The issue's open questions (delete parent, drag a child out, inheritance) are answered by object-model 6.1 and 4.5 | natural; the issue closes as designed-away | the objects API | n/a |
| Layer rows: chip, count, eye, delete (#167) | proposed (app) | Every tree row has the chip, the count, the eye and the lock; delete is in the overflow | natural | the objects API's member count; layer match count is the object's member count | n/a |
| "Change encoding" opening the run's layer (#324) | proposed (app) | Gone: the run is the object; selecting its row shows its Fill | natural | none | n/a |
| Reset styles to defaults | shipped (app) | Gone as a global verb. Per object: overflow > "Reset Fill" restores the tool's default Fill. The Dataset's own Fill rows have a minus each | natural | `session.styles.update` | no / repaint / no |
| Style change event, problem event | shipped | The row's computing state during a repaint; a refused element paint is a red dot on the object with the message in its header | natural | `session.on("style:changed")`, `("style:problem")` | no / yes / no |
| `settled()` | shipped | Not on screen (exports and captures await it) | natural | as is | none |
| Undo of a style edit | consumer's (design 9.3) | Ctrl+Z; one step per Fill edit, reorder, eye | natural | every write returns a `Run`; the app keeps the inverse (the journal, #145, later) | restores / no / restores |
| Batching edits above the large-graph threshold ("Apply" button, spec 5 Style tier 2) | proposed (spec) | Not needed as a control: an edit is a `Run`, the row shows "Restyling 38%" with Cancel; a second edit while one runs is queued | natural | the run queue's `replace` policy so a rapid second edit cancels the first | no / computing / no |

### 2.3 Encodings: measures, groupings, scales, palettes

| Capability | Status | Home | Fit | Element API (gap) | Precedence / state / tree |
|---|---|---|---|---|---|
| Encode a run's field onto a channel | shipped | A Measure's Fill: Channel [Colour v], Scale, Palette, Domain, Missing; "+" adds a second channel (Size). A Grouping's Fill: Channel, Palette as one chip per group, Other | natural | `session.styles.encode({run, field, channel, ...})`; replaces in place, so re-encoding edits the same layer | no / repaint / no |
| Choose the field (HITS hub vs authority, degree in vs out) | shipped | Measure > Values > Field [value v] row; the Fill follows the field | natural | `encode({field})` | no / repaint / no |
| Encode a data attribute (colour by conference, #190) | shipped in the element, no app UI | Dataset > Attributes > "..." > Colour by / Size by / Shape by / Group by, each creating a Measure (numeric) or Grouping (category) object whose Definition is the attribute and whose Fill is the encoding | natural; this is the Tableau shelf drop | `encode: {by: "data.value", ...}` on a `has` selector; gap: `encode()` takes only a run, so the objects API needs the same one-call verb for an attribute (`encodeAttribute`, small) | new row / current (an attribute encoding is never stale unless data changes) / adds a Measure or Grouping |
| Highlight a run's set (path, MST, cut) | shipped | A Set's Fill: Colour, Edge colour, Edge width by default | natural for the paint; **no fit** for the element's exclusivity rule (note A2) | `session.styles.highlight()`; gap A2: drop or make opt-in "every highlight layer is removed first" | new row at the top / current / adds a Set |
| Auto-apply: a run paints on first completion | shipped | The tool hands back an object that already has a Fill; nothing else changes | natural for "paints once"; **no fit** for "an authored layer wins, so the suggestion is dropped" (note A3) | gap A3: the suggestion must pick a channel no visible object above writes, and still paint if none is free | new row / current / adds a row |
| Auto-apply: a batch paints once, coalesced per channel | shipped | Rank > Several... creates one Measure per tick; only the top one paints Colour; the others get Size, then no Fill (a chip that reads "no fill") | awkward (note A4) | the coalescing rule must become "each object gets the next free channel, then none" | rows at the top / current / adds N rows |
| `{style: false}` on a run | shipped | Not on screen; the assistant and recipes use it | natural | as is | n/a |
| Scales (9) | shipped | Measure > Fill > Scale [Even steps v], plain names from the catalogue; the scale's own options (bins, exponent, midpoint) appear as rows under it when chosen | natural | `session.catalog.scales()`, `scalesForDomain()` | no / repaint / no |
| Palettes (18) and colour-blind flags | shipped | Fill > Palette: a ramp swatch (sequential, diverging) or chips (categorical) that opens a picker grouped by kind, colour-blind-safe marked, capacity shown for categorical | natural | `session.catalog.palettes()`, `palettesOfKind()` | no / repaint / no |
| Custom palette plugin | shipped | Appears in the picker; a saved look carries its descriptor | natural | `registerPalette`; `toDocument()` carries non-built-in palettes | none |
| Domain, clamp, range, reverse, midpoint, bins, exponent | shipped | Measure > Fill rows: Domain [min] [max] with Reset; "Clamp outliers" checkbox (p2, p98) with the departure sentence under it; Reverse checkbox; Midpoint (diverging only); Range on Size; scale options | natural | binding fields; the legend's `departures` supply the sentence | no / repaint / no |
| Missing value | shipped | Fill > Missing [chit] (the gene workflow's "grey for missing") | natural | `missing: {value}` | no / repaint / no |
| Diverging palette centred on zero (log fold change) | shipped | Palette picker > Diverging; Midpoint [0] row appears | natural | `midpoint` | no / repaint / no |
| Overflow "other" (largest N groups, rest grey) | shipped | Grouping > Groups > "Show the largest [8 v], rest as Other"; Fill > Other [chit] | natural | `overflow: "other"`; gap: the legend block must publish the Other colour (#201) | no / repaint / no |
| Overflow "shape" (cycle shapes past the palette) | shipped | Grouping > Fill: a second Channel row [Shape v] bound to the same field. The element's policy writes shape from the colour layer; the reader sees two rows | awkward (note A5) | `overflow: "shape"` writes two channels in one layer; the Fill section must show it as two rows and edit it as one | no / repaint / no |
| Overflow "extend" | shipped | Grouping > Groups > "Show the largest [All v]" | natural | `overflow: "extend"` | no / repaint / no |
| `map` (explicit value to colour) and per-value overrides | shipped (`map`), spec'd (per-row overrides) | A Group's Fill override (object-model 4.5): the child layer above the Grouping | natural | the override is a layer scoped to one group: `{match: "expression"}` on the group field today, `{match: "scope"}` later. `map` stays as the file form the objects API may write | yes (child above parent) / no / no new row (Groups already exist) |
| Combining colour and size, colour and shape on the same nodes | designloom requirement | Two paint rows on one Measure or Grouping ("+"), or two objects | natural | two layers under one object | no / repaint / no |
| A Set's default colour | shipped (blue-highlight for every set) | The tool assigns the next unused highlight palette (blue, green, orange) so three paths are told apart; the chip shows it | awkward (note A6) | gap A6: `highlight()` always uses `blue-highlight`; the objects API cycles | no / no / no |
| Suggested encoding that avoids channels already written above | proposed (object-model section 11) | The default Fill of a new Measure | natural | gap: new element behaviour (small) | no / no / no |
| Resolve a bound channel to a fixed value (`resolveToStatic`) | shipped | Not on the everyday screen (note A7). The reader's equivalents: "Colour this node..." (a one-node Set), or Values > "+" > Top N set with its own Colour | no fit as a control; kept as API | `session.styles.resolveToStatic` | n/a |
| Explain an element's look | shipped | Node inspector > Look: one row per painted channel, "Colour from Communities", clickable to the object; "Covered by X on N of M" under a covered object's Fill | natural | `session.styles.explain`; gap: coverage counts over a set (object-model section 11, small) | none |
| Results as attributes (origin `result`) | shipped | The data table columns; Dataset > Attributes hides `result` columns (they are objects already) | natural | `AttributeDescriptor.origin` | none |

### 2.4 Labels and declutter

| Capability | Status | Home | Fit | Element API (gap) | Precedence / state / tree |
|---|---|---|---|---|---|
| Label text from an attribute | shipped | Dataset > Canvas > Labels [attribute v] (the source) beside the budget; Attributes > "..." > Label by | natural | `node.label` bound with `passthrough`, on the Dataset's Fill | no / repaint / no |
| The label budget (none, all, top N by a Measure; the app's "Top degree labels") | shipped in the app (it runs degree on load and adds a layer) | Dataset > Canvas > Labels [Top 6 by Connections v]: none, all, or top N by any Measure in the tree. With no Measure the list offers only none and all | awkward (note A8): a Dataset-level Fill that links to an object | gap A8: a selector `{match: "scope", scope: {top: {run, field, n}}}` (the set-vocabulary unification); today the app writes an expression over a result path | no / stale if the Measure is re-run or deleted (falls back to none) / no |
| Label visibility: selected only, above a size threshold (designloom) | designloom requirement | The same Labels select gains "Selected" (the element's selection layer writes the label) and "Nodes larger than [n]" (a rule over the painted size) | awkward for "larger than": the rule reads a painted value, not a data value (note A9) | gap A9: a selector over a painted channel does not exist; "Selected" is the element's own selection layer | no / no / no |
| Rich text label style (font, size, weight, colour, gradient, outline, shadow, background, border) | shipped | The label-style popover opened from any Fill's Label row and from Dataset > Canvas > Labels' gear; a 240 px popover with a Text group, a Background group and a Placement group | natural | `node.labelStyle` (`LabelStyle` in `graphty-element/src/catalog/label-style.ts`) | no / repaint / no |
| Placement (attach position, offset) | shipped | Label-style popover > Placement | natural | `attachPosition`, `attachOffset` | no / repaint / no |
| Billboarding | shipped (config) | Settings > Canvas ("Labels face the camera"); not a Fill | natural as a setting | `billboardMode` | none |
| Depth fade | shipped | Label-style popover > Placement ("Fade with distance") | natural | `depthFadeEnabled`, near, far | no / repaint / no |
| Badges (count, dot, icon, progress...) | shipped | Label-style popover > Badge [none v] | natural | `LabelBadge` | no / repaint / no |
| Label animation (pulse, bounce, glow...) | shipped | Fill > Animation row (nodes: the label animation; edges: flow speed) | natural | `LabelAnimation` | no / repaint / no |
| Text on arrow heads and tails | shipped | Fill > Arrows popover > "Text at head / tail" | natural | `edge.arrowHeadText` etc. | no / repaint / no |
| Wrap to a width, line cap (#294) | proposed | Label-style popover > Text > "Wrap at [n] characters, [m] lines" | natural once shipped | gap: #294 | no / repaint / no |
| Truncate with ellipsis, full label on hover (designloom) | proposed | Same popover ("Cut at [15] characters"); the tooltip channel shows the full text on hover | natural once shipped | gap: a `maxCharacters` on `LabelStyle` (small); tooltip exists | no / repaint / no |
| Label overlap avoidance (#5) | proposed | Dataset > Canvas > Labels gear > "Avoid overlaps" switch. A global rendering policy, not an object's property | natural as a setting | gap: #5 (element rendering) | none |
| Edge label at midpoint, truncation | shipped / proposed | Dataset > Canvas > Edge labels; the same popover | natural | `edge.label`; truncation as above | no / repaint / no |
| Hover: highlight the node and its neighbours, dim the rest (designloom `hover-highlight`) | partial (a hover event; no element hover layer) | Element-owned and transient: Settings > Canvas > "Highlight neighbours on hover" with a depth (1 or 2) and a "dim the rest" switch. Not a Fill, not an object | natural as a setting; the two-way hover link (row to canvas) is the element's hover layer | gap: the hover layer (`LayerSource.reason "hover"`, designloom `hover-highlight`, object-model section 11) | none (the hover layer sits above every object, like the selection halo) |
| Dim everything a set did not select (designloom `path-highlighting` "dim non-path to 30%") | reader's choice by rule (root `CLAUDE.md`, Algorithm Styles) | An overflow verb on any Set: "Dim the rest", which creates a linked Set "Not in Path: 1 -> 34" (Everything minus the set) with Opacity 0.3 on nodes and 0.2 on edges, inserted immediately below the set | natural, and it stays an object the reader can see, move and delete (note A10) | Combine with a `not` operation over the "everything" scope (the set-vocabulary unification) | yes (a new row below the set) / current / adds a Set |
| Number path nodes 1, 2, 3; hop distance labels (designloom) | shipped data (the path's `order` field) | A Path set's Fill > Label row bound to "Hop order" (a member value) | natural | `encode` `node.label` by `results.<run>.order` with `passthrough` | no / repaint / no |
| Several paths at once with distinct colours and a path legend (designloom) | contradicted by the element's exclusive highlight | Several Path objects in the tree, each with the next highlight colour; the legend lists each as a highlight block | natural once A2 and A6 land | gaps A2, A6 | rows / current / adds Sets |
| Selection halo style (`el.selectionStyle`) | shipped | Settings > Canvas > Selection colour. Not a Fill: the selection is not an object | natural as a setting | `el.selectionStyle` | none |

### 2.5 Legend

| Capability | Status | Home | Fit | Element API (gap) | Precedence / state / tree |
|---|---|---|---|---|---|
| Legend model (blocks, swatches, domain, palette, departures) | shipped as data | The legend overlay (L), bottom right: one block per visible Measure or Grouping in precedence order (top of the tree first), plus one small block per visible Set (its chip and name). Covered blocks are omitted, as the element already reports | natural | `session.styles.legend()`; the app reverses the bottom-first list | none |
| Draw the legend on the canvas (#292) | proposed (the app draws its own) | The same overlay, drawn by the element once #292 lands; the app's `Legend.tsx` is deleted then | natural | gap: #292 | none |
| Legend in the exported picture (#292) | proposed | Dataset > Export > Image gear > "Legend in picture" | natural | gap: #292 (`legend: true` on capture) | none |
| Group numbering mismatch (#381), Other swatch colour (#201) | open defects | Dissolved by construction: the legend's categorical rows ARE the Group rows (same name, same chip, same order), so there is one numbering and one colour source. The Other row's colour comes from the block | natural | gap: the legend block must publish the overflow colour and the group's display name (#191, #201) | none |
| Click a legend swatch to select that category; Shift-click to add to a filter (designloom) | proposed | Click selects the Group row (its members take the halo). Shift-click extends the row selection; Focus on the multi-selection then needs a Combine first (one mask at a time) | awkward (note A11) | the objects API `focus` over a union | click: no change; Focus: the mask |
| Legend position (drag to a corner), collapse to an icon | designloom | The overlay's own header: a collapse chevron and a corner menu; remembered per viewer | natural | none | none |
| Departures (clamp, sampling, coverage) | shipped | In the legend block under the ramp, and in the object's Made by as caveats | natural | `LegendBlock.departures`, `run.caveats` | none |
| Legend limited to 12 rows, "and N more" | shipped | The block scrolls after 8 rows (screens.md screen 4) and prints "and N more" | natural | `overflow.hidden` | none |

### 2.6 Canvas-wide look: background, theme, presets, documents

| Capability | Status | Home | Fit | Element API (gap) | Precedence / state / tree |
|---|---|---|---|---|---|
| Background colour, skybox | shipped | Dataset > Canvas > Background [chit] with a popover for an image | natural | `el.background` | none |
| Background follows light / dark theme (#291) | proposed | Background [Auto v] as the default | natural | gap: #291 | none |
| Themes (`session.catalog.themes()`, #331) | proposed | Dataset > Canvas > Look [Default v]: the element's named looks and the reader's saved ones | awkward (note A12): a theme is a whole style document, and a document is a stack of layers with selectors, which the tree has no rows for | gap: #331, and a decision on what a look may contain (A12) | see A12 |
| Style presets: Default, Presentation, Print, Dark, Colorblind safe, High contrast (designloom `style-presets`; the app's Styles section) | proposed | The same Look select; "Save current as look..."; each look is a document that changes the Dataset's Fill, the default palettes and the label size, never an object's own rows | awkward, same as A12 | same | none when restricted as A12 says |
| Save / apply a style document (`toDocument`, `applyTemplate`) | shipped | Share > Export look (JSON); file menu > Apply look...; the project file (#301) carries it whole | awkward for Apply on a populated tree (A12); natural for Export | `session.styles.toDocument()`, `applyTemplate()`; `TemplateReport.unbound` lists layers that bind to nothing | Apply may add rows (A12) |
| Export the stack (Export style JSON) | shipped | Share > Export look | natural | `toDocument()` | none |
| Import style (JSON) | shipped | file menu > Apply look... | as Apply above | `applyTemplate()` | as above |
| "Preview a preset on hover" (designloom) | designloom | Not offered: the model never paints on hover (Figma applies on click); undo is the preview | no fit; deliberately dropped | none | none |
| Render settings, GraphEffects (motion blur, depth of field) | shipped, loosely typed | Settings > Canvas; never a Fill | natural as settings | `el.setRenderSettings` | none |
| Edge bundling, tapered edges, parallel-edge fanning, self-loop arcs (designloom `visual-encoding-edges`) | proposed, no element work | Bundling and fanning are arrangements of edges, not per-element values: Dataset > Arrangement if ever built. Tapered edges and self-loop drawing are rendering options: Settings > Canvas | no fit as a Fill (note A13); natural elsewhere | gap: none of the four exists in the element | none |
| Hide edges entirely (designloom) | designloom | Dataset > Fill > Edge opacity 0 (honest: the edges are still there); or Focus | natural | `set` on the Dataset's edge layer | no / repaint / no |
| Show arrowheads on directed data by default | shipped (element default) | Dataset > Canvas > Arrows [switch], defaulting from the data's direction | natural | the Dataset Fill's `edge.arrowHead` | no / repaint / no |
| Style on load (`algorithmsOnLoad` plus auto style) | shipped (element config) | Not on the everyday screen; a recipe (file menu > Run a recipe) is the reader's version | natural | as is | rows appear as the recipe's objects |
| Sample hint "Try colouring by conference" (#190) | removed from the app | The sample's hint link runs Attributes > Colour by on load, creating the Grouping row | natural | as Colour by | adds a Grouping |

### 2.7 Multi-object and node-level painting

| Capability | Status | Home | Fit | Element API (gap) | Precedence / state / tree |
|---|---|---|---|---|---|
| Edit several objects' Fill at once ("Mixed") | new | Tree multi-select > Fill (object-model 4.6) | natural | `update` on each | no / repaint / no |
| Paint one node (the three-click colour change) | new | Node inspector > Look > "Colour this node..." creates a one-node fixed Set | natural | `{match: "ids"}` | new row at the top / current / adds a Set |
| Paint a marquee selection | new | Several elements > "Colour these..." (4.9) or Ctrl+G then Fill | natural | `session.selection.promote` then a layer | adds a Set |
| Which object painted this node | new | Node inspector > Look, clickable | natural | `explain()` | none |
| Lock an object (Fill not editable, still paints) | new | The lock on the row | natural | the objects API; the element's `locked` is for element layers only, so the app-facing lock lives on the object | no / no / no |

## 3. Notes on the awkward ones and the ones that do not fit

**A1. A node Set painting its inside edges.** A Set of nodes has "Inside edges 18" in its Members
section and a reader expects "Edge colour" on that Set to paint them. The element's selectors
name nodes or edges, never "edges whose both ends are in this set"; `session.selection.apply`
has `edgesBetween` but a layer selector does not. Fix: the scope-based selector proposed in
object-model section 11 (`{match: "scope", scope}`) resolves an edge target as the induced
edges of a node scope. Until then a node Set's Fill offers node channels only, and the "+"
explains why edge channels are missing.

**A2. Exclusive highlights (no fit).** `session.styles.highlight()` removes every other highlight
layer before adding its own, on the reasoning that "a second route replaces the first"
(`graphty-element/src/session/styles/StylesApi.ts`, "A HIGHLIGHT IS EXCLUSIVE"). In the tree
two paths are two objects and both paint; the designloom `path-highlighting` requirement asks for
up to five at once. The rule contradicts the model and must go, or become an option the tool
passes (`exclusive: false`) that the objects API always passes. Not a capability lost; a rule
retired.

**A3. "An authored layer wins" (no fit).** The auto-apply policy
(`graphty-element/src/session/styles/autoApply.ts`) drops a run's suggested Fill when a user
layer already writes that channel. In the model a new object goes to the top of the tree and
wins by position; suppressing its paint would make a new Measure appear with no Fill and no
explanation. The replacement is the rule the model already asks for (section 6.2 and section
11): the suggestion picks the first channel no visible object above it writes (Colour, then Size,
then Outline); when none is free it paints Colour anyway and the covered object's Fill says
"Covered by X on N of M". Hidden objects and the Dataset's Fill never block a suggestion.

**A4. Batch coalescing.** Rank > Several... starts a batch, and the element paints one layer per
channel for the whole batch, keeping the one that would land on top. Under A3 the natural
outcome is: the first Measure gets Colour, the second Size, the third Outline, the rest no Fill
(a "no fill" chip, one click from "+"). Awkward only in that a reader who ticks six boxes gets
three painted and three not; the chips make that visible, and the alternative (six colour layers,
five invisible) is what the element's rule exists to prevent.

**A5. Overflow "shape".** The element writes the shape from the same layer as the colour so the
two are added and removed together. The Fill section shows a Grouping's colour and shape as two
rows; the minus on the shape row must set `overflow` back to "other" rather than remove a layer.
A small mapping rule in the objects API; no element change.

**A6. Every Set is blue.** `highlight()` paints every chosen set the first colour of
`blue-highlight`. Two paths, a neighbourhood and a Top 10 would all be one blue and the tree's
chips would not tell them apart. The objects API assigns the next unused highlight palette
(blue, green, orange, then the categorical palette's colours) at creation, and the reader can
change it. Small element change: `HighlightSpec.set` already accepts the colour; the choice
moves to the objects API.

**A7. Resolve to static.** `resolveToStatic(id, channel)` turns a Measure's colour ramp into one
fixed colour on that layer. In the model a Measure's Fill is a scale by definition; a fixed
colour on a Measure would make it a Set with 34 members and no meaning. The reader's intents it
served are covered elsewhere: "make this node red" is "Colour this node..."; "make the top ten
red" is Values > "+" > Top N set. The verb stays in the API for consumers and the assistant; no
control offers it.

**A8. The label budget links a Dataset row to an object.** "Labels: Top 6 by Connections" is a
Dataset-level Fill (a label layer at the bottom of the stack) whose selector reads a Measure in
the tree. That is the model's "linked object" idea applied to the root: if the Measure is re-run
the budget follows; if it is deleted the row falls back to "None" and says so (a frozen-style
note in the Canvas section). The selector it needs is the `top` filter from the set-vocabulary
unification (object-model section 11); today the app writes an expression over the run's result
path, which works but shows the run id if surfaced. Also different from today: the app no
longer runs degree on load to have a Measure to label by, so a fresh dataset labels nothing
until a Measure exists (screens.md screen 2). The Labels select offers "All" for the reader who
wants labels at once.

**A9. "Label nodes larger than N".** A rule over a painted size is a rule over the output of
another layer, which the element's selectors cannot express (they read data and results, not
paint). Offer "Top N by [the Measure that drives Size]" instead, which is what the reader means.
No element work; a wording choice in the Labels select.

**A10. "Dim the rest" as an object.** The root `CLAUDE.md` forbids an algorithm from dimming what
it did not select, and the element's derivation honours that. The reader still wants it (the
designloom path and hover requirements say 30 percent). Making it an object ("Not in Path", a
Combination of Everything minus the Path, with an Opacity Fill) keeps every rule: it is the
reader's choice, it is visible in the tree, it can be moved, hidden or deleted, and it re-runs
when the path does (a linked object goes stale with its input). It needs the `not` Combination
over the "everything" scope, which the set-vocabulary unification provides. The one cost: a row
the reader did not name; the verb names it for them.

**A11. Legend shift-click to build a filter.** Figma has no filter to build from a legend, and
the model has one mask. A single click selecting the Group row is natural. Shift-click extending
the row selection is natural. "Focus on these three groups" then needs a Combine (Union) first,
because Focus takes one object. Proposal: the tree multi-selection's overflow offers "Focus on
these", which creates the Union set and focuses on it in one step. Two objects appear from one
gesture, which the model otherwise avoids; acceptable because both are visible and undoable in
one Ctrl+Z.

**A12. Themes, presets and style documents on a populated tree.** A style document is a stack of
layers with selectors. Applied to an empty session it is a look; applied over a tree it would
add layers that belong to no object, which the model forbids ("a reader never sees a layer that
is not on an object"). Two choices, and the recommendation is the first:

1. Restrict what a **look** may contain to things that have a home without a row: the Dataset's
   Fill (match-everything layers: node and edge defaults, label style, arrows, background),
   the default palette per kind (sequential, categorical, diverging, highlight), and the
   default Size range. Applying a look rewrites those and touches no object. "Presentation" is
   then "bigger labels, bigger nodes, thicker edges"; "Print" is a greyscale categorical palette
   and pattern edge styles; "Colorblind safe" swaps the default palettes; "Dark" sets the
   background. Every designloom preset in the list fits this restriction. `ThemeDescriptor`
   (#331) keeps its `document` field but the objects API validates that every layer is
   match-everything before applying it as a look.
2. Keep full documents, and on Apply turn each non-everything layer into a Set (its selector
   becomes the Set's rule) placed at the top of the tree. Honest and visible, but a "preset"
   that adds four rows is not what a reader pressing "Presentation" expects.

Export is natural either way: Share > Export look writes the Dataset's Fill and the palette
defaults (choice 1) or the whole stack (choice 2, which is also what the project file #301
must carry, objects included). This is the one item in this area that touches a one-way door
(the saved format), so it is flagged rather than decided here.

**A13. Edge bundling and tapered edges (no fit as Fill).** Bundling routes many edges along
shared curves; it is a property of the whole drawing, like a layout, not a value per edge.
Tapering is a way of drawing every directed edge. Neither is a channel and neither should be an
object. If built, bundling is a row in Dataset > Arrangement ("Bundle edges [strength]") and
tapering a Settings > Canvas switch. Neither exists in the element today.

**Retired without replacement.** "Preview a preset on hover" (paint on hover is against the
model; undo is the preview). The app's Style panel, Layers list, layer editor, "Change
encoding", "Add a style layer", "Reset styles to defaults" and the Styles section (each re-homed
above). Issue #171 (layer groups) and #324 (Change encoding) close as designed-away; #380, #383,
#167, #201 and #381 are fixed by construction rather than by a patch.

## 4. What the element must grow for this area

Collected from the table, smallest first. Items already in object-model section 11 are marked.

| Gap | Size | Where it is needed | Listed in object-model 11 |
|---|---|---|---|
| `highlight()` exclusivity becomes optional, off for the objects API (A2) | small | every second Set | no |
| Auto-apply picks a free channel instead of dropping the suggestion (A3) | small | every new Measure | yes ("suggested encoding that avoids channels") |
| Highlight colour cycles per set (A6) | small | every Set | no |
| `encodeAttribute` (or `encode` accepting a data path) | small | Attributes > Colour by / Size by / Group by (#190) | no |
| Legend block publishes the Other colour and group display names (#201, #191) | small | the legend, Group rows | #191 yes |
| Coverage counts from `explain` over a set | small | "Covered by X on N of M" | yes |
| `maxCharacters` on `LabelStyle`; wrap (#294) | small | label-style popover | no |
| Layer selector by scope, including induced edges (A1) | small to medium | Set Fills, node sets' edges | yes (without the edge half) |
| `top` and `not` in the set vocabulary (A8, A10) | medium | label budget, "Dim the rest" | yes |
| Hover layer as an element-owned layer | medium | the two-way hover link | yes |
| On-canvas legend and legend in captures (#292) | medium | the overlay, Export | yes |
| Theme-aware background (#291); `catalog.themes()` restricted to looks (#331, A12) | medium | Dataset > Canvas | no |
| Label overlap avoidance (#5) | large | Labels gear | no |
| `node.marker` rendering (#295) | medium | Fill > Marker, note markers | yes |
| Edge picking (#319) for edge tooltips and edge objects from the canvas | medium | edge Fills | yes |

Nothing in this area asks the app to compute a colour, count a match, build a legend, or copy a
palette. Every picker reads a catalogue; every paint is a layer on an object; every explanation
is `explain()` or a legend block.
