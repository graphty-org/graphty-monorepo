# Unified style layers

How every node and edge in a graphty graph should get its look: one kind of style layer, one
stack, and values that layers read. It covers graphty-element (which owns layers, values and
drawing) and the graphty app (which owns the panels a reader uses to edit them).

**Status: the model is settled.** The owner has agreed the model in sections 1 to 8. What remains
is shipping it: the additive pieces can be built now, and the breaking changes in section 10 need
the owner's approval of the release that carries them and its timing, not of the model.

The short version: there is one kind of layer. Communities, degree gradients, paths, the
selection highlight, the base look and anything a reader adds by hand are all the same thing,
and differ only in which elements they paint and which values they read. No use case needs a
second kind of layer. Every case either fits a layer as defined below, or needs an extension that
every layer gets equally.

How to read this document:

- Sections 1 to 8 describe the target model, in the present tense. They are not a description of
  the code.
- Section 9 is the only description of today's code. "Today" anywhere in this document means
  graphty-element and graphty at commit `00a27ad9f` (2026-10-11), and every file:line citation is
  to that commit:
    - `element/` is `graphty-element/src/`
    - `app/` is `graphty/src/`

---

## The owner's rules

These are the owner's own words; the rest of the document follows from them.

- "who made a layer should never matter. things like reruns are just updating the underlying
  data that the layer is using to calculate styling. to any extent possible, all layers should be
  equal."
- "anything that an algorithm can set as a recommended style would also be able to be set
  manually by a user."
- Every layer offers the same styling options:
    - "groups of a community are just a color applied to a community id. but I could also make that
      a shape. or a glow. or anything else."
    - "degree is just calculated color set based on a field that is the result of an algorithm."
    - "everything is just a static color, shape, effect, etc."
    - "selected is just a static, color, shape, effect, etc."
    - "a path is a style applied to a set of edges or nodes. maybe we want to add some animation or
      something later to show the sequence"
- Metric styling is a setting on any property: "coloring by degree would just be a setting on the
  color of the layer, based on a calculated value. maybe there's a button that the user can click
  that creates a gradient across a continuous calculated value."
- Groups as layers: "it gives users control over individual groups."
- Selection as a layer: "it give users control over highlighting, which might be important in
  environments where highlighting is hard to see against specific backgrounds or nodes. the
  selected node(s) or edge(s) are just more calculated values. hover could just be another layer
  that gets added by default with another calculated value."
- Paths and sets get no special stacking rule: "if the user cares about what is showing up, they
  can drag and drop layers to be on top".

---

## 1. The model in one page

**A layer is a rule for which elements, times a setting for each property.**

- **Which elements** is a rule over values: everything, the elements where a value holds
  (`group == 3`, `onPath == true`, `is-selected`), named ids, the top N by a value, the members
  of a saved set. Nodes and edges are both elements, so one layer can paint a route's nodes and
  its edges together.
- **Each property** (color, size, shape, glow, outline, opacity, label, line style, arrows, and
  the rest of the catalog) is in one of three states:
    - **off**: the layer says nothing about it, and whatever is beneath shows through;
    - **fixed**: one value for every element the layer paints ("red", "size 2");
    - **derived**: a function of a value through a scale (color by `degree` through a gradient,
      shape by `group` through a shape scheme, label passed through from `name`).

**Layers stack, and the topmost writer wins,** per element and per property. A layer that sets
only glow leaves color to the layers beneath it. Beneath every layer is the floor: each
property's default value. The floor is not a layer and cannot be deleted.

**Every layer is equal. Who made a layer never changes what it does.** A layer an algorithm
suggested, one the reader built by hand, one the assistant wrote, one that came from a file and
one graphty-element provides by default all offer the same properties, the same "which elements"
rules, the same controls, and follow the same rules on re-run, removal, save and undo. Anything
an algorithm can set as a suggested style, a reader can set by hand, and back. Where a rule needs
to find "the layers of this result", it finds them by what they read, never by who wrote them.
No behavior in graphty-element or the app -- a rule, a panel, a legend key, a removal, a re-run,
an undo -- may branch on who made a layer or on a descriptive label such as a layer's kind. The
run name a legend shows comes from the value a layer reads.

**Values are the only thing that changes underneath a layer.** A re-run, a new selection, a
hover, a replaced dataset or a clock tick changes values; the layers stay as they are, and the
engine re-resolves only the elements whose values changed. A re-run is "new numbers in the
column the layer already reads", not "a new picture".

**Folders organize.** A folder groups rows in the stack: it has a name, an eye, a lock, and it
moves as one block. It writes no property of its own. The tree, read top to bottom, is the paint
order, so a folder's rows sit together in the stack. (A split parent, section 3, also shows in the
tree with children beneath it, but it is a layer, not a folder.)

**The ontology underneath.** In the owner's words: "everything: a set of nodes and edges";
"path: a sequence of nodes and edges"; "a grouping is just a set of a smaller number of
elements"; "a structure is just a set with a smaller number of elements". So "which elements" is
always a set, sometimes ordered, and nothing about styling a set depends on which algorithm
produced it. A grouping (communities, k-core shells, cut sides) is then read as many smaller sets
at once, which is what split by value (section 3) paints.

---

## 2. Values

A layer reads values; it never computes them. In the model, a layer can read:

| Value                                           | Examples                                                                              | Belongs to                                               |
| ----------------------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Data columns                                    | `name`, `age`, `department`, a color already in the file                              | the graph                                                |
| Algorithm results, per element                  | degree, PageRank, community id, on-path, path order, set membership, edge betweenness | the graph                                                |
| Facts graphty-element provides about an element | is-selected, is-hovered, the element's notes                                          | selection and hover belong to a view; notes to the graph |

Today is-selected and is-hovered do not exist (section 9). Today a layer reads a path in one of
three ways (element/session/styles/sources.ts:240-265). A path under `results.` must be exactly
`results.<run>.<field>`. A path under `graphty.` reads only the notes values. Any other path is
read as a data attribute, with or without the `data.` prefix, so a bare `age` reads the attribute
`age`. A path nothing can answer (a malformed `results.` path, an unknown `graphty.` path, an
empty key, a column no record has) reads as absent and never throws (sources.ts:22-26). A layer
can reach the selection only through a "members of the selection" rule
(element/session/styles/selector.ts:92; element/catalog/types.ts:1077-1085), and hover can be
reached by nothing.

How value paths are named is issue #2029: namespacing per-element values as
`<root>.<namespace>.<run or key>.<field>`, with the `graphty.*` root folded in and the root's name
still to choose, for owner review before anyone implements it. This document writes value names
in plain words, such as "is-selected" and "group", and does not decide their spelling.

### Value-side extensions

These change only where values come from and how long they live. None of them changes what a
layer is.

- **Label kind.** A value source declares whether its labels are arbitrary (community 3 is just a
  number the algorithm handed out) or meaningful ("Engineering" is a name). After a re-run, only
  arbitrary labels are matched to the previous run's labels, by member overlap, so anything
  attached to "community 3" follows the same members. Meaningful labels match by name.
- **Persistence and view scope.** Each value says where it lives. Data and results belong to the
  graph and are saved with it. Selection, hover, a playback clock and a time cursor belong to a
  view. Two canvases, an XR session or a collaborator's selection resolve the same stack
  separately, each with its own view values.
- **Live run inputs.** A run's input can follow the selection or hover ("distance from the hovered
  node"). The value source re-runs when the input changes and reports when its values are stale.
- **Time-indexed values.** A value can change over time and is read at the session's time
  cursor; a clock drives playback.
- **Derived elements.** Virtual edges (predicted links), group regions (a hull around a
  community) and meta-nodes (a collapsed group) are elements graphty-element derives. Once they
  exist, layers style them like any other element.

---

## 3. Layers

### Extensions every layer gets

Each of these changes the layer itself -- its rules, its bindings or the order layers resolve
in -- and every layer gets it equally.

1. **A combine mode on every property write.** Replace is the default. Numbers can also multiply
   or add; colors can mix, or set one part (hue, lightness, alpha); rings and glows can append.
   This is what lets a selection add a ring and 1.5 times the size over a community color without
   hiding it, and lets a selection ring and a path ring show at once.
2. **Pin to top or bottom,** for top-level rows only. A layer inside a folder takes its folder's
   place.
3. **Lock, on any layer or folder.** Protecting a row from edits is the reader's choice, not a
   consequence of who made it.
4. **Split by value** (below).
5. **List values.** A value may be a list, with an optional role per item. Rules gain "contains"
   and "any"; a binding states how a list becomes one input: count, first, min, max, or the item
   for a key. This covers overlapping communities (a node in two groups), many pattern matches,
   the k shortest paths, many cycles, and walks that revisit a node.
6. **Endpoint references.** An edge reads `source.x` and `target.x`: the edges inside a group
   (both ends in it), cut edges (ends on different sides), the edges between selected nodes.
7. **One-hop lists.** A node reads `neighbors.x` and `incidentEdges.x`, through the same list
   rules. The main use is live: highlight the neighbors of the selected or hovered node as the
   selection or hover moves, which the existing hover-highlight and neighborhood-expansion
   requirements call for. Other uses are guilt by association (a neighbor has `fraud = true`),
   bridges (a neighbor in another community), and neighborhood summaries (count, average, max).
   Today graphty-element has a fixed "within N hops of these seeds" set
   (element/catalog/types.ts:1144), and the non-live uses could instead be published as algorithm
   results. Following a live selection or hover is what truly needs neighbor reads.
8. **Computed and column-relative values.** An expression over values (`flow / capacity`), and
   rank, percentile and quantile over any column ("top 10 by revenue", a data column).
9. **Multi-input bindings.** One property from two values through a two-dimensional scale: a
   bivariate color, or a value plus a clock for animation.
10. **Edges read their endpoints' final node styles.** Nodes resolve first, edges after, so there
    is no cycle. That gives "color an edge by its source", gradient edges, and "do not draw an
    edge whose endpoint is hidden".

### Split by value

A layer whose property is derived from a categorical value (or a numeric value cut into bins) can
be split into one generated child layer per value. The owner's reason: "if there are 10+ groups,
restyling each group manually becomes a pain", and each group still needs to be controllable on
its own.

**The split parent** is a layer, not a folder. It holds the binding and the schemes its children
inherit: the value it splits on and a scheme for each property it derives (a palette for color, a
shape scheme for shape, and so on). Its "which elements" applies to every child. It shows in the
tree like a folder, with its children beneath it, but unlike a folder it carries a binding, and
its children are generated from the value rather than placed there by the reader.

- **The children are generated.** One child per value present, each a full layer: "the parent's
  elements where `group` is 3", with every property of the catalog available, not only the ones
  the parent derives. So community 3 can get a glow, a different shape or a label while the
  parent binds only color.
- **Only overrides are stored.** An unedited child stores nothing; it exists because the value
  exists. An edited child stores only the properties the reader changed.
- **A scheme change on the parent reaches every property a child has not overridden.** Switching
  the palette recolors every community the reader has not recolored by hand, in one step.
- **Re-runs keep overrides with the right group.** The value's label kind decides how children
  line up across a re-run: arbitrary labels (community ids) are matched by member overlap, so the
  override made on "community 3" stays with those members even if the algorithm now calls them
  community 5. Meaningful labels match by name. Groups that cannot be matched are reported, not
  guessed.
- **Overlaps resolve by ordinary stacking.** When an element belongs to two groups (a list
  value), both children match it, and the higher child wins per property. The reader drags
  children to change that.
- **It scales.** At 5 groups the children are listed; at 40 or 500 only how the app lists them
  changes (collapsed, searchable). Storage grows only with the children a reader edits.

### Unmapped values: "skip" (approved)

The owner has approved this option. A binding with a value table (`map`: "Engineering" is blue,
"Sales" is orange) gets the option `unmapped: "skip"`: an element whose value is not in the table
is left to the layers beneath, exactly as an element with no value is.

Why it is needed: today a table with no scale named takes the channel's default scale, which on a
color or number channel is linear. A linear scale cannot place text, so an unmatched text value is
skipped; an unmatched number is painted from the numeric ramp instead: a table naming only
communities 1 and 2 painted community 3 brown (`#662506`, measured). And under the passthrough
scale, any value that parses as a CSS color is painted as that color, so a value "green" paints
green. Passthrough exists for data that already is the style (labels from `name`, tooltips,
shapes or colors already in a column); it is the wrong tool for "these values, these looks, and
nothing else". With `unmapped: "skip"`, a table paints exactly the values it lists, whatever
their type.

### Property catalog additions

- **Defaults as the floor.** Each property's default is the bottom of the stack, not a layer.
- **visible.** A layer can stop drawing an element. This is styling: the element is still counted,
  laid out and selectable (see filtering, section 7).
- **Position along an edge** (0 to 1), for marks that move along a path.
- **A two-ended edge color,** for gradients from one endpoint's color to the other's.

---

## 4. Default layers

A new graph starts with three ordinary layers. Each can be edited, hidden, locked or deleted like
any other, and a "restore starting layers" command brings back any that were deleted. Deleting
one is legitimate and undoable, and the floor still draws every element. graphty-element
provides these layers and the restore command, so a consumer gets a selection highlight without
writing any code.

- **Everything**, pinned to the bottom. Fixed values over every node and edge: the reader's base
  look. It sits on the floor.
- **Selected**, pinned to the top. Which elements: is-selected. Its properties combine by append
  or multiply rather than replace -- for example, a ring and a larger size -- so the selected
  element keeps its community color. Its value is view-scoped, so each view shows its own
  selection. Its default look is deferred (see the end of the document).
- **Hovered**, pinned to the top, the same way, reading is-hovered. Whether graphty-element or the
  application adds it, and whether it paints anything by default, are deferred.

**Why selection is a layer.** graphty-element's source records why selection was kept out of
layers (element/config/GraphStyle.ts:31-34). Each reason has an answer in the model, and that
comment is replaced when selection moves into a layer:

- "Reorderable": that is the point. A reader whose highlight is hard to see against the
  background or against a node's own color can change it, move it, or give it any property.
- "Persistable": only the layer's look is saved. Is-selected is a view-scoped value, so the
  selection itself is never saved with the graph.
- "Lost at a dataset boundary": the layer stays when the data is replaced; only the value resets.
- "Changes many times a minute": a change of selection changes one value on a few elements, and
  only those elements are re-resolved.

**What a run adds.** A run that suggests a look adds one ordinary layer on top of the unpinned
stack (beneath Selected and Hovered), with the suggested look filled in. The reader can change any
of it, reorder it or delete it; it is then no different from a layer they built. Whether applying
a run replaces an earlier result's layer or adds beside it (a second shortest path) is an option
the caller chooses each time it applies a run, not a property of the layer. Nothing decides from
who made a layer whether a run may paint, or where its layer goes.

---

## 5. Use cases

Each walk-through lists the stack top first. "Floor" is the property defaults.

**A community run (Louvain).** The run publishes `group` per node. Its suggested layer derives
node color from `group` through a categorical palette. Split by value, it shows in the tree as the
"Louvain" split parent with one child per community. Stack: Hovered, Selected, Louvain (children:
Community 1 ... 6), Everything, floor. (Whether a run's categorical suggestion arrives already
split, or the reader splits it, is deferred.)

**Degree, as a gradient.** Degree publishes a number per node. Its suggested layer derives color
from it. The same result in a hand layer is one click: on any property bound to a continuous
value, a "gradient" button fills a sequential scale and range. Stack: Hovered, Selected, Degree,
Louvain, Everything, floor. Degree then covers Louvain's color on every node; the tree marks
Louvain as covered (section 6). The reader drags Louvain up, or sets Degree to drive size instead.

**A path (Dijkstra).** The run publishes on-path for nodes and edges, and order for nodes. One
layer paints the route's nodes and edges together: which elements is "on-path", and the
properties apply where they exist (color on both, width on edges, size on nodes). Stack:
Hovered, Selected, Route A to B, ... Applying a second route either adds a second layer or
replaces the first, as chosen when applying it. If both are kept and they overlap, the higher one
wins, or both show when their rings use append. Later, animation in sequence reads path order and
a clock into position along an edge; nothing about the layer changes.

**Edge betweenness.** One value per edge; the suggested layer derives edge color (or width) from
it through a scale. It is a degree gradient on edges.

**Node or edge sets, and cuts.** A k-core, a spanning tree or a matched pattern is a set: a layer
whose which-elements is "member of this result". A minimum cut publishes a side per node; one
layer split by side colors the sides, and an edge layer reading its endpoints ("source side is
not target side") picks out the cut edges.

**A result with nothing per element.** Link prediction gives scored pairs that are not edges; a
graph statistic gives one number. Neither has elements to paint, so neither adds a layer. Pairs
can be drawn once graphty-element derives virtual edges for them (section 7); a statistic is a
fact the app shows.

**Add layer.** The tree's "+" menu has Add layer. It creates a draft at the top of the unpinned
stack that opens on "Which elements", because a layer that starts on everything covers every
layer beneath it by surprise. The draft is app state until its first value is set; then it
becomes a real layer in one undo step (graphty-element refuses a layer that writes nothing, and
that is fine). From there it has full parity with a suggestion: the same rules for which
elements, every property fixed or derived, split by value, gradient and scheme buttons.

**Add folder.** The same "+" menu has Add folder. A folder holds rows that sit together in the
stack; dragging a row in moves its paint position to the folder's place. The folder's eye and
lock apply to all its rows. It paints nothing itself.

**Adjusting Everything.** The reader clicks Everything and sets node color gray and edge width 1.
Every layer above still wins where it paints; a run that lands later lands above Everything and
paints normally. (Today it does not: section 9.)

**Adjusting Selected and Hovered.** The default highlight can be hard to see: against a dark
background, or on a selected node whose own color is close to the highlight color. The reader
clicks Selected and sets a bright glow and outline, appended over whatever color the node has.
Because Selected is an ordinary layer, it offers every property: a label for selected nodes, a
thicker edge line, a different shape. Hovered works the same way.

**Recoloring one community.** The reader clicks Community 3 under Louvain and picks a color. That
child now stores one override: its color. Everything else about it still follows the parent.

**Switching a scheme.** The reader clicks the Louvain parent and picks another palette (or a shape
scheme for shape). Every child that has not overridden that property follows; Community 3 keeps
its hand color.

**Re-run.** The reader re-runs Louvain with a new resolution. The layer is unchanged; its values
change. Overrides stay with the community whose members best match, and a community with no match
is reported ("Community 7 is new"). (Whether a gradient's range re-fits to the new values unless
the reader fixed the range is deferred.)

**Removing a result.** Removing Louvain removes every layer that reads it, whoever made those
layers, in one undo step. The app lists the layers that will go before the reader confirms. (What
happens to a layer that also reads another result is deferred.)

**Replacing the data.** The reader loads a newer copy of the file. Every layer stays; values are
read from the new data. Results computed on the old data are marked out of date and can be
re-run. A layer whose which-elements names ids reports how many it still finds; one bound to a
column the new data lacks paints nothing and says why.

**Saving and reopening.** The saved project holds every layer, folder, pin, lock and split
override, and every graph-scoped value (data and results). View-scoped values (selection, hover)
are not graph data; reopening starts with nothing selected, and Selected paints nothing until
something is.

**Undo.** Each settled edit is one step: adding a layer with its first value, an override, a
scheme switch, a reorder, a folder move, a run with the layer it adds. A draft with no value yet
is zero steps, and so is a change of selection or hover.

**The assistant and file styles.** The assistant writes layers through the same calls as the
panels, and a reader can edit them like any other. A file's own look, such as GEXF node colors
and sizes, becomes ordinary layers bound to those columns with passthrough, since the model has
only one kind of layer. (Who builds them and how they are grouped and named is deferred.)

---

## 6. Panels

**The layer tree (left panel).** Rows are layers and folders, in paint order, top first.

- Each row has an eye, a lock, a pin, and drags to reorder. Split parents expand to their
  children.
- A row whose paint is entirely covered by layers above it carries a covered mark ("Painted over
  by Degree"). Today graphty-element reports painted counts per property through `styles.counts`
  (element/session/styles/StylesApi.ts:520), which is enough to draw it.
- One "+" menu holds Add layer and Add folder.

**The Style tab (right panel).** One bar for every layer:

- A "Which elements" section on every layer.
- Every property in the catalog, each off, fixed, or derived from a value (with scale, palette or
  range, a one-click "gradient" for continuous values and "scheme" for categorical values), and
  its combine mode.
- On a split parent, the scheme controls. On a child, every property as an override of the
  parent, with a way back to "follow the parent".

**The Values tab (right panel): information, not styling.** On every layer, built from the values
it reads: a histogram per bound continuous value, group sizes per categorical value, the members,
path order, painted counts. Histograms also appear in the binding popover (where scale and range
are chosen) and in the attribute inspector. Nothing statistical goes in the Style tab or the
canvas legend.

**The legend (canvas card).** Built from what layers read: one key per derived property that is
visible, named by the value it reads. A hand layer reading Louvain's `group` gets the same key,
run name and out-of-date note as a layer the run suggested.

---

## 7. Where layers stop

Some things look like styling but change what the graph is, or have no elements to style. Each has
an owner outside layers; once it exists, layers style what it produces.

| Not styling                                            | Why                                                                                                                        | Owner                                                                     |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Predicted links (link prediction)                      | A layer picks existing elements; it cannot create an edge                                                                  | graphty-element derives virtual edges; layers style them                  |
| A hull or bubble around a group                        | It belongs to the group, not to any node                                                                                   | graphty-element derives group regions; layers style them                  |
| Collapsing a group into one node                       | It changes what layout and algorithms see                                                                                  | a data or view operation in graphty-element                               |
| Edge bundling                                          | Rerouting edges is a layout decision                                                                                       | layout                                                                    |
| Filtering                                              | Hiding changes the picture; filtering changes what layout, counts and selection see. Styling must never change computation | graphty-element's view and data scope. Layers can still set `visible`     |
| Graph-level facts and time series not tied to elements | Nothing per element to paint                                                                                               | graphty-element publishes neutral facts; the app decides how to show them |
| Background and camera                                  | Not a property of any element                                                                                              | scene and camera settings                                                 |
| Label collision                                        | Which label wins a spot on screen is decided across the whole scene                                                        | the scene; layers can set each label's priority                           |

---

## 8. Looked like variation, but is not

- **Nodes and edges have different properties.** A layer offers the union; each property applies
  where it exists. One layer can paint a route's nodes and edges together.
- **Selection always on top.** That is pin plus append, available to any layer.
- **A new path replaces or adds.** An option on applying the run, not a layer type.
- **Ten, forty or five hundred groups.** Only changes how many split children the app lists.
- **Group identity across re-runs.** The value source's job, through label kind and alignment.
- **Live references, dynamic graphs, fast hover.** Values change; the engine re-resolves only the
  elements whose values changed.
- **Built-in layers that cannot be deleted.** With defaults as the floor, lock as a reader's flag,
  and "restore starting layers", deleting Selected is legitimate and undoable.
- **Removing results, saving, replacing data, undo, legends.** Each keys on which values a layer
  reads, never on who made it.

---

## 9. The code at commit 00a27ad9f (2026-10-11) against the model

Fix types: **additive** (a new option or API; no owner approval needed), **bug fix** (the code
does not do what its own documentation says, and fixing it changes no documented behavior), and
**behavior change** (changes what an existing API does; a breaking change, section 10).

### graphty-element

| Where it breaks the model                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Citation                                                                                                                                                                                                                                                                                | Fix type                                                                                                                                                                 |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **A hand layer covering every element stops runs that finish after it from painting.** An enabled user, template or plugin layer (the assistant's included, since it writes plugin layers) whose selector is exactly "everything" and that drives a channel suppresses any later run suggestion for that channel; a layer whose rule happens to match every element does not. A hand layer on some elements pulls new run layers beneath it. So a fixed Everything color stops Louvain painting, and the app shows "Hidden by your layer Everything". In the model a run's layer goes on top, like any new layer, and the reader reorders | element/session/styles/autoApply.ts:16-22, 170-171, 216-233, 317-324; element/ai/commands/StyleCommands.ts:89; app/workspace/canvas/runNotice.ts:19-45                                                                                                                                  | behavior change                                                                                                                                                          |
| **A batch of runs paints once.** Suggestions from a batch are held and coalesced per channel, keeping the one that would end up on top. This decides how many layers a batch adds, not where they stack, so it fits the model and can stay                                                                                                                                                                                                                                                                                                                                                                                                | element/session/styles/autoApply.ts:24-28                                                                                                                                                                                                                                               | no change                                                                                                                                                                |
| **A run's layers are found by who made them.** `runs.remove`, `runs.bindings` and `runs.move` all find a run's layers by `layer.source` being that run, though each is documented as every layer reading the run. A hand layer reading the run is left out of all three: it survives removal and paints nothing, it is missing from the list a confirmation dialog shows, and it does not move with the run                                                                                                                                                                                                                               | element/session/GraphSession.ts:2431-2435; element/session/runs/RunsApi.ts:889-891, 1690-1691; element/session/runs/types.ts:892, 901, 917-923                                                                                                                                          | bug fix toward the docs, but it changes what happens to hand layers: behavior change. One fix for all three                                                              |
| **`styles.highlight()` removes every unlocked layer of kind highlight before adding its own,** whoever wrote it, so a second route deletes the first. Run suggestions go through it                                                                                                                                                                                                                                                                                                                                                                                                                                                       | element/session/styles/StylesApi.ts:2100-2105; autoApply.ts:33-34                                                                                                                                                                                                                       | an "add instead" option is additive; changing the default is a behavior change                                                                                           |
| **`styles.encode()` takes over any layer of kind encoding that reads the run's field,** whoever wrote it, while the comment beside it says a hand-written layer is never taken over. In the model the rule may key only on what a layer reads, never on its kind label or source                                                                                                                                                                                                                                                                                                                                                          | element/session/styles/StylesApi.ts:1246-1260 vs 1982-1986                                                                                                                                                                                                                              | behavior change                                                                                                                                                          |
| **"Locked" means "made by the element".** `locked` is exactly `source.by === "element"`, and a locked layer cannot be edited, moved or removed. In the model lock is a flag the reader sets on any row                                                                                                                                                                                                                                                                                                                                                                                                                                    | element/session/styles/Layer.ts:100-106, 1053                                                                                                                                                                                                                                           | behavior change                                                                                                                                                          |
| **The base look is two locked layers.** graphty-element seeds "Node defaults" and "Edge defaults", covering everything. In the model they become the floor                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | element/session/GraphSession.ts:1586-1604                                                                                                                                                                                                                                               | behavior change                                                                                                                                                          |
| **Selection is graph configuration, deliberately not a layer.** Its look is a halo color, scale and opacity for nodes and a band for edges; it cannot take a shape, glow, label or a value. Hover has no value at all. The source reasons "selection" and "hover" are declared and unused                                                                                                                                                                                                                                                                                                                                                 | element/config/GraphStyle.ts:28-76; element/catalog/types.ts:694-695                                                                                                                                                                                                                    | is-selected and is-hovered values, combine modes, pins and view scope are additive; moving the selection look from configuration to a default layer is a behavior change |
| **One layer paints nodes or edges, never both;** a route is two layers, "(nodes)" and "(edges)"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | element/session/styles/Layer.ts:109-110; StylesApi.ts:2075-2086                                                                                                                                                                                                                         | widens the `target` a consumer reads back: behavior change                                                                                                               |
| **No folders, computed values, lists, endpoint or neighbor reads, combine modes, pins, split by value, time cursor or derived elements**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | element/session/styles/Layer.ts:83-128; sources.ts:4-8                                                                                                                                                                                                                                  | additive                                                                                                                                                                 |
| **The "top N" rule accepts only a run's field,** not a data column                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | element/session/styles/selector.ts:236-243                                                                                                                                                                                                                                              | additive                                                                                                                                                                 |
| **An unmatched number in a value table is painted from the numeric ramp.** On a color or number channel the default scale is linear (passthrough on every other channel), and the default ramp is ylorbr, whose darkest stop is `#662506`                                                                                                                                                                                                                                                                                                                                                                                                 | element/session/styles/encoding.ts:975-977; element/session/styles/palettes.ts:59; element/config/palettes/sequential.ts:20                                                                                                                                                             | `unmapped: "skip"`: additive (approved)                                                                                                                                  |
| **Shape overflow is dropped.** `overflowOf` returns nothing for any channel that is not a color, though its documentation says "A policy the caller asked for is always recorded"; a run with more than 25 groups bound to shape is refused with `E_CAP_EXCEEDED` (there are 25 shapes)                                                                                                                                                                                                                                                                                                                                                   | element/session/styles/EncodingSpec.ts:457-472; element/session/styles/encoding.ts:1212-1221; element/config/NodeStyle.ts:50-75                                                                                                                                                         | bug fix                                                                                                                                                                  |
| **Shapes are handed out by group size in schema order,** so the largest group gets box and the second gets sphere, which reads as the default icosphere. No shape schemes exist; the one curated list is internal                                                                                                                                                                                                                                                                                                                                                                                                                         | element/session/styles/encoding.ts:688-704, 747-758; element/config/NodeStyle.ts:50-52; encoding.ts:236-243                                                                                                                                                                             | shape schemes: additive                                                                                                                                                  |
| **Per-group recolors and hides are keyed by the raw group number.** A re-run renumbers communities, so an edit can land on a different community silently. graphty-element already refuses this for saved sets: "a group number means nothing after a re-run"                                                                                                                                                                                                                                                                                                                                                                             | app/workspace/style/row.ts:573-581; element/catalog/types.ts:652-659; element/session/sets/dependencies.ts:480-488                                                                                                                                                                      | split by value with label-kind alignment: additive                                                                                                                       |
| **A run summary keeps 10 groups; a run's group binding with no palette named colors 8 groups and paints the rest gray.** The default categorical palette is okabe-ito (8 colors); with no palette named, overflow is "other", and the folded groups are painted `#686868`. A data column with no palette named gets the smallest palette that fits instead. The categorical palette list includes three 2-color highlight pairs                                                                                                                                                                                                           | element/session/results/RunResult.ts:75, 932-941; element/session/styles/palettes.ts:70; element/catalog/palettes.ts:120-124, 183-206; element/session/styles/EncodingSpec.ts:477-480, 598-599; element/session/styles/encoding.ts:1124-1127; element/config/palettes/categorical.ts:40 | an unbounded group list: additive. Which palette a run picks by default: behavior change                                                                                 |
| **The legend links a key to its run only for run-made layers,** though field identity already comes from the path                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | element/session/styles/legend.ts:1004                                                                                                                                                                                                                                                   | additive                                                                                                                                                                 |
| **The assistant can only write fixed values,** on everything or on an expression, as a plugin layer; it cannot derive a property from a value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | element/ai/commands/StyleCommands.ts:89, 212-223                                                                                                                                                                                                                                        | additive                                                                                                                                                                 |
| **A "by id" rule compares ids exactly,** while `data.node()` accepts either spelling of an integer id (issue #2061). The assistant's false report of coloring 17 nodes came from this                                                                                                                                                                                                                                                                                                                                                                                                                                                     | element/session/styles/selector.ts:309-313; element/session/styles/predicate.ts:1375                                                                                                                                                                                                    | bug fix                                                                                                                                                                  |
| **No motion along a path.** The only motion is `edge.animationSpeed`, a constant scroll on straight solid 3D lines; a route publishes order on nodes only                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | element/session/styles/channels.ts:413-428; element/session/results/types.ts:452-458                                                                                                                                                                                                    | position along an edge, a clock: additive                                                                                                                                |
| **Reopening a project mints new layer ids,** because it applies the saved style document as a template. So the saved form must not key folders, pins, locks or split overrides by layer id, unless ids become stable across reopen                                                                                                                                                                                                                                                                                                                                                                                                        | element/session/projectFile.ts:1014; element/session/styles/StylesApi.ts:2523                                                                                                                                                                                                           | input to the save format (deferred)                                                                                                                                      |
| **A layer that writes nothing is refused**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | element/session/styles/Layer.ts:854-860                                                                                                                                                                                                                                                 | no change: Add layer holds a draft in the app                                                                                                                            |

### The graphty app

| Where it breaks the model                                                                                                                                                                                                                             | Citation                                                                                                                 | Fix type                          |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------- |
| **Row types are styled differently:** six row kinds, with Selection editing configuration (color, opacity, size only) and a group row offering one fill color                                                                                         | app/workspace/graph-place/rows.ts:15; app/workspace/style/StyleTab.tsx:466-489, 556-598                                  | app change                        |
| **The "folder" under a community run is not a folder:** its children are the run's values, built from the run summary and owning no layers                                                                                                            | app/workspace/graph-place/rows.ts:118-147                                                                                | app change, with split by value   |
| **A reader's own layer has no Values tab**                                                                                                                                                                                                            | app/workspace/inspector/Inspector.tsx:482-483                                                                            | app change                        |
| **No Add layer or Add folder in the workspace.** Layers appear only as side effects (editing a selected node adds a layer naming its ids). The classic shell's Add layer created a layer over everything, which falls into the suppression rule above | app/workspace/style/StyleTab.tsx:143-150; app/components/shell/AppShell.tsx:2647-2669                                    | app change                        |
| **A property can be newly bound to a value only for colors, node size, edge width, tooltip and labels;** shape, line style, arrows and opacity cannot                                                                                                 | app/workspace/style/SetLine.tsx:145-146 via app/workspace/style/words.ts:76-83; app/workspace/style/LabelSection.tsx:357 | app change                        |
| **The tree shows covered rows as visible.** After Degree runs over Louvain, Louvain keeps an open eye and colored swatches; only the legend drops painted-over keys                                                                                   | app/workspace/canvas/legendWords.ts:67-73                                                                                | app bug fix, from `styles.counts` |
| **The community palette list offers the 2-color highlight pairs**                                                                                                                                                                                     | app/workspace/style/BindingPopover.tsx:91-94                                                                             | app bug fix                       |

---

## 10. Breaking changes the model requires

The model and its direction are settled. Everything in section 9 marked additive or bug fix can be
built now. The changes below alter what an existing graphty-element API does, so they are breaking:
the owner's approval covers shipping them and grouping them into a planned major release, not the
direction itself.

1. **Run suggestions stop yielding to hand layers.** A run's layer goes on top of the unpinned
   stack; no layer suppresses it and none pulls it beneath itself. This replaces the documented
   rule "a layer somebody wrote by hand wins" (autoApply.ts:16-22).
2. **A run's layers are found by what they read.** `runs.remove`, `runs.bindings` and `runs.move`
   cover every layer that reads the run, whoever made it, as their docs already promise.
3. **`styles.encode()` finds the layer to replace by what it reads,** ignoring its kind label and
   its source, and its comment is corrected.
4. **`styles.highlight()` gains an "add" option,** so the caller chooses on each application
   whether a run's layer adds beside an earlier one or replaces it. The option is additive;
   changing the default from "replace" would be breaking, so the default is decided when the
   planned major is grouped, and keeping it until then is for compatibility only, not a preference
   of the model.
5. **Selection and hover become default layers.** The selection look moves from the
   `selectionStyle` configuration to a pinned Selected layer. `selectionStyle` can keep working as
   a deprecated way to set that layer's look until the next planned major release.
6. **Lock becomes a reader's flag,** and graphty-element's two base layers become the floor of
   property defaults rather than locked layers.
7. **One layer can paint nodes and edges together,** which widens the `target` a consumer reads
   back from a layer.

### Deferred details

- How value paths are spelled (issue #2029).
- How folders, pins, locks and split overrides are written in the saved style document (today
  reopening mints new layer ids; see section 9).
- Which earlier layer "replace" replaces when applying a run. It must be chosen by what the layer
  reads (the earlier run's values), never by kind or by who made it.
- What happens on removal to a layer that also reads another result. Today's documentation says it
  survives (element/session/runs/types.ts:919); if it does, the removed run's values read as
  absent and the reader is told.
- Whether a run's categorical suggestion arrives already split by value.
- Whether a gradient's range re-fits on a re-run unless the reader fixed it.
- The relative order of Selected and Hovered, their default looks and combine modes, and what
  Everything holds at the start.
- Whether graphty-element or the application adds the Hovered layer, and whether it paints
  anything by default.
- Who builds the layers for a file's own look, and how they are grouped and named (grouping and
  naming are the application's choice).
- Whether a layer's `kind` and `source` are removed in the planned major or kept as display text
  that nothing branches on.
- How deep folders nest.
- The default way a list becomes one input, per property.
- The cost of a deep stack: an edit in the middle of the stack repaints its dirty elements from
  the bottom (element/session/styles/repaint.ts:34-45), and split children add depth.
- Not yet checked against reader studies or comparable tools.
