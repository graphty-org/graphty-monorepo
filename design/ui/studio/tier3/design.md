# Unified styles in the real app: the tier 3 design

This document decides how graphty's unified style layers are built into the real graphty app (the
new workspace) and into graphty-element. It answers the owner's twelve open questions about the
style panel, specifies the panel, lists what graphty-element and compact-mantine must add, and plans
the build as units. The owner reviews the panel as it is built and approves it before any user study
runs.

Inputs, all fixed: the agreed layer model (`design/ui/unified-style-layers.md`), the style panel
mock and its organization design (pull request #2098, `design/ui/style-panel-organization.md` on
branch `mock/style-panel`), and every style graphty-element has today (`tier3/style-catalog.md`).
The model is not reopened here: every layer is equal and who made it never changes what it does; a
layer is "which elements" times a setting per property (off, fixed, or derived from a value through
a scale); folders organize; split by value; combine modes; pin and lock; Selected and Hovered are
default layers; Everything is at the bottom; a Values tab holds information; studio lighting is the
default 3D look.

Three rules bind everything below:

- **The element owns the graph, the app owns the words.** Every fact the panel shows (what the
  layers beneath paint, whether a column fits a property, where a value falls on a ramp, which
  elements a rule matches) comes from graphty-element as a value or a `{ code, params }` fact. The
  app never computes it.
- **No unbuilt item is drawn.** The mock drew things graphty-element cannot do yet and marked
  them. The real app does not: a control appears when the element can do what it says, and not
  before. There are no disabled "coming soon" controls.
- **One home per thing.** One place to choose which elements a layer paints, one place to add a
  list entry, one name per command.

---

## 1. The twelve decisions

Each decision gives the choice, the reason, the options rejected, and what the owner should look at
to judge it. The stories named under "Look at" are built in the last build unit (section 9).

### 1.1 "+" and properties that hold one value

**Decision.** "+" means "add another entry to a list", and nothing else. A property that holds at
most one value per layer never has a "+".

- **Seven core properties are always drawn, on four rows**, paired the way Figma pairs width
  and height: Nodes `Shape | Size` and `Color`; Edges `Color | Width` and `Head | Tail`. An
  empty field means "this layer does not set it", and the layers beneath decide. Typing or
  picking writes a value; Clear takes it back (below).
- **Rarer one-value properties live behind the settings button at the start of the row they
  modify** (opacity behind Color; wireframe and show behind Shape; pattern, curve and show behind
  the edge line; arrow size, color and opacity behind Ends). Once set, a rare property is drawn as
  its own row under its parent row, with its minus, so nothing a layer does is ever hidden.
- **Yes-or-no properties are two-word selects with an empty state**: "Solid / Wireframe",
  "Shown / Hidden", "Straight / Curved". Empty means not set, exactly like every other field. One
  rule for every yes-or-no property.

**Setting and clearing a field.** Layers stack, and a layer covers the layers beneath it only where
it sets a value. So "unset" means "stop covering": the field goes back to empty and the elements
show what the layers beneath give them. That is a different act from turning something off. "None"
arrowheads, Show "Hidden", or a label entry with its eye off are values: they cover the layers
beneath with nothing, and they are cleared like any other value.

Every field is in one of three states, and each looks different at rest by two cues, never by color
alone:

| State          | At rest                                                                                        | Meaning                   |
| -------------- | ---------------------------------------------------------------------------------------------- | ------------------------- |
| Not set        | empty; the value beneath as gray placeholder text ("Mixed" when the elements differ); no minus | the layers beneath decide |
| Set            | the value in normal text (a value pill when it varies), and a minus at the row's end           | this layer paints it      |
| Set to nothing | "None", "Hidden", or an entry's eye off, in normal text, and a minus                           | this layer turns it off   |

- **One command, Clear, on the minus.** Only set fields have a minus, and it is always drawn, not
  only on hover, so the panel's right edge is a list of what this layer writes. It clears every
  kind of field the same way: a number, a color, a glyph select, a two-word select, a varied value
  (the whole binding goes) and a list entry (the entry goes). The minus is the next tab stop after
  its field.
- **Keyboard shortcuts for the same act.** In a text field (number, hex, typed words), empty it and
  press Enter or Tab. On a focused, closed select, color chit or value pill, press Delete or
  Backspace.
- **Before clearing, the reader sees what comes back.** The minus's tooltip and accessible
  description name the value and the layer it comes from: "Clear: back to Icosphere, from
  Everything", or "Clear: back to mixed, from Degree and Louvain". graphty-element already answers
  this: `styles.agreement(scope, channel, { below })` returns the value beneath and the layer that
  paints it, or a breakdown by layer when they differ.
- **After clearing,** the canvas and legend repaint at once, the field shows the value beneath as
  its placeholder, focus moves to the field (its minus is gone), and one Undo, "Clear node color",
  restores the old value. There is no confirmation.
- **Screen readers hear the state in the field's name**: "Node color, set here, #D55E00" against
  "Node color, not set, Degree gives #3388FF".
- **Lists show what they inherit, like fields.** An empty Text or Effects list shows each entry a
  layer beneath writes as one gray line ("Glow, from Selected") with an eye and no minus. Turning
  that eye off adds an entry on this layer that draws nothing there; that entry is then set, with
  its own minus. The "+" adds an entry of this layer's own.

**Why.** A property row that must be "added" before it can be set costs a click and hides the
property: in tier 1, 18 of 18 participants found Size behind Shape's "+" only by guessing. A switch
cannot say "not set", and "not set" is the state that lets the layers beneath show through. The
seven core properties are the ones nearly every layer writes; the rest are rare enough that one
extra click is the right price for a shorter panel.

**Rejected.** "+" per section (the mock): a click per property and a promise of a second value that
never exists. Every property always drawn: about 30 rows of gray placeholders. A switch per
property, or a checkbox: no "not set" state. A row of toggle icons per kind that marks what the
layer writes: a second control for the state the row's minus already sets. Adding yes-or-no
properties already switched on: a row's presence becomes the only sign it is set, unlike every other
field. For clearing: a minus shown only on hover (a mouse reader cannot see at rest what the layer
writes); gray text as the only cue (fails WCAG 1.4.1); a "Not set" first option in every select (a
second way to clear in the same row, listed next to "None", which means the opposite); an eye on
each one-value field (a second way to let the beneath show through); "Clear all" on a layer (Delete
or Undo already does it).

**Look at.** The Selected layer and the route layer, at rest, in the style panel story. Judge
whether the placeholders read as "not set here", whether the minuses read as "what this layer
writes", and whether the Selected layer's seven gray fields are acceptable noise for a layer that
writes one effect. Then hover a minus and clear a field.

### 1.2 What "+" opens where it stays

**Decision.** "+" stays on the lists: label entries (Text), effects, Which elements conditions,
value-table entries, and the tree's own Add layer / Add folder. Each "+" opens a menu with a glyph
and a noun per item; an item that cannot be added is disabled with its reason on a second line
(Figma's effect type menu). Picking an item adds the entry and opens its value picker at once: a
ring opens the color picker with focus in its hex field, a label opens its source picker. Nothing is
written until a value is chosen, and Escape leaves nothing behind. Clicking the title of an empty
Text or Effects list opens the same "+" menu, as Figma's empty Fill title does.

Value selects with many look-alike options (25 node shapes, 14 arrow kinds, 9 line patterns) open a
grid of glyphs with names, not a text list. The glyphs come from graphty-element's catalog, so the
app never keeps its own picture of a shape the element draws.

**Why.** Adding and choosing become one gesture without painting anything the reader did not pick. A
fixed value on a layer covers every layer beneath it, so a default added by "+" repaints by
surprise.

**Rejected.** Figma's "add a default entry, then change its type": repaints before the reader
chooses. "+" opening a color picker directly: one glyph would mean both "add" and "color". Rendering
each menu glyph live with the 3D renderer: a mesh render per menu item for a picture that never
changes; static catalog glyphs cost nothing.

**Look at.** The Effects "+" menu on a node layer, and the Shape grid.

### 1.3 Keeping the panel short when a layer paints nodes and edges

**Decision.** Shorten the panel instead of hiding parts of it:

1. No empty section titles. The mock's dimmed titles were about 440 of the route layer's 770 px;
   the core rows (decision 1.1) and the two list headers (Text, Effects) replace them.
2. Two fields per row where they belong together (Shape | Size, Color | Width, Head | Tail).
3. The Nodes and Edges headings stick to the top of the panel while it scrolls.

The route layer (nodes and edges, a step label, a head arrow) must fit without scrolling at 1440 x
900, and is measured at 900 x 700 in the build. Nothing collapses and there are no tabs.

**Why.** Every collapsible or tabbed answer hides part of what a layer does, and "a layer never
hides what it does" is a rule the owner set. The length came from empty titles, not from content.

**Rejected.** Collapsible Nodes and Edges groups with a one-line summary: it reverses the owner's
"advanced options in popovers, never accordions" rule, and a summary is a second way to read the
same values. If the 900 x 700 measurement still fails, collapsible groups go to the owner as a
reversal of his rule; they are not built first. Nodes / Edges tabs: hide half of a route layer. A
"jump to" control that appears only when the panel overflows: clutter that comes and goes.

**Look at.** The route layer at 1440 x 900 and 900 x 700.

### 1.4 A layer with no nodes, or no edges

**Decision.** Hide the group the layer does not paint. Which groups show follows the kind chosen in
Which elements (Nodes, Edges, or Both), never the current count. A layer on both kinds that matches
no edges right now (Selected, with only nodes selected) keeps both groups, and its count line says
"0 edges".

**Why.** The one way to make a layer paint edges is the kind choice at the top of the same panel, so
"where is edge color?" has one answer. A disabled Edges group is eight dead controls, and a stub
line ("Edges: not reached") is words at rest that tell the reader nothing the kind choice does not.

**Rejected.** Showing the group disabled: dead tab stops and a false promise. A heading with an
"Include edges" button: a second door to the kind choice. Deciding by today's count: groups would
appear and vanish as the selection changes.

**Look at.** The Edge betweenness layer (edges only) next to the route layer.

### 1.5 The "vary by" picker on data with many fields

**Decision.** A popover opened by the vary glyph on a field, or by typing "=" in a number field. A
search box is focused on open. Below it, groups: **In use** (values other layers already read),
**Data**, one group per run, and **Facts** (is selected, is hovered). Each row shows a glyph for the
kind of value, its name and one fact ("1 to 36", "6 values", "84% have a value"), all from
graphty-element's attribute descriptors, which are already computed. Columns that cannot drive this
property fold into one closing row ("12 that do not fit size"); opened, each shows graphty-element's
reason. A categorical column with more values than the property's scheme can tell apart shows its
value count and what the element would do with the rest (fold into Other, cycle, extend), and is
listed after the columns that fit cleanly.

**Why.** Search is the only thing that scales to 200 columns; grouping by origin answers "which
degree?" when two runs publish one. The facts tell the reader which column is which without opening
a table. graphty-element already says whether a column fits a property, and why not
(`styles.proposeEncoding`), and already describes every column (`data.attributes()`), so no new
element call is needed and the panel cannot disagree with what the element will paint.

**Rejected.** A flat list (slow past 20). Type filter chips (one more control; search does the job).
A second "does this fit" check in the element: the existing proposal already answers it, and two
checks of one question have produced this project's worst defects. "Vary color by this" in a data
table column's menu: a second door; held until a study shows readers start from the column.

**Look at.** The picker on a 200-column fixture, searched and unsearched.

### 1.6 A visual gradient

**Decision.** A new shared control in compact-mantine, the ramp editor: the value's histogram on the
value's own axis, each bar painted the color (or drawn the size) its values get.

- Two handles under the bars set the domain ends.
- A clamp is its own pair of brackets with shaded tails, each tail counted ("14 outside").
- A diverging palette adds a midpoint handle.
- A stepped ramp draws its cut lines on the bars; the step count is a number beside "Smooth /
  Steps".
- The scale (Linear, Log, Square root, Equal counts, and the rest of graphty-element's scales) is
  a select with a curve glyph; changing it redraws the axis, so the reader sees what log does.
- The palette is a select of ramp strips with Reverse beside it, and colorblind-safe palettes are
  named as such from the element's palette facts.
- Elements with no value are a chit at the end of the bar ("No value: 3") that chooses Skip or
  Paint.
- Every handle is a keyboard slider whose value is spoken in the data's terms ("Lowest color at
  degree 3, 12th percentile"). The typed fields stay below the picture as the precise and keyboard
  path.

Every position, bin, color and count comes from one new graphty-element call that previews a
binding, so the picture is exactly what the canvas paints.

**Why.** It keeps every feature of today's degree control (palette, reverse, domain, clamp,
midpoint, steps, scale, exponent, no-value color) and makes each one visible before it is committed:
the analyst's "gradients that clip or center in the wrong place" becomes something seen.

**Rejected.** The mock's text fields: complete but read rather than seen. A palette gallery alone:
loses domain, clamp and midpoint. compact-mantine's `GradientEditor` as is: its stops sit on a color
axis, not the data. Dragging a handle past the data to set a clamp, or a mode switch that decides
whether a handle means domain or clamp: both hide which of two settings a gesture changed.

**Look at.** The Degree layer's color ramp, on Linear and on Log, with a clamp set.

### 1.7 The Louvain "folder" and folders in general

**Decision.** The tree has two row kinds, **layer** and **folder**, and no third. Every row the
reader meets behaves like one or the other.

- **Louvain is one ordinary layer** whose color varies by community. Its communities are not tree
  rows. They are the category rows of its color binding, listed in the binding popover (section 4)
  and in the Values tab: each with its chit, name, count and eye.
- **Changing one group's color is an entry in that binding's value table.** Recoloring community 3
  edits its chit; the chit's minus clears the entry and the community goes back to the palette.
  A palette change reaches every community without an entry, because the entries and the palette
  live in one binding. That is the model's "split by value", kept without a row type.
- **Anything else for one group** (a larger size, a label, a glow) is an ordinary layer: "New layer
  for <value>" on a category row makes a layer above, rule "community is 3", selected and open on
  its first property. It is the same door as "New layer from selection" (section 3.4), and the
  layer behaves like every other layer.
- **The mechanism is not about communities.** Category rows, value-table entries and "New layer for
  <value>" work on any categorical binding: a data column (department, an edge's relationship), a
  run's labels, k-core shells, the sides of a minimum cut. A number drawn in steps lists its steps
  the same way in the ramp popover, and "New layer for <step>" gives a layer whose rule is that
  step's range.
- **Re-runs keep each entry with its group.** A community run renumbers its groups on every run.
  graphty-element matches each old group to the new group that shares the most members, and moves
  value-table entries, hidden values and rule conditions naming that group along with it; a group
  it cannot match is reported on the layer as a code, which the Values tab shows. A hand layer whose
  rule says "community is 3" gets the same matching, so this is a property of rules and bindings,
  not of any one row type.
- **A folder paints nothing**: no Which elements, no property groups. Its panel is its rows in
  paint order and its Selection colors (decision 1.13). Each tree row's accessible name says which
  kind it is ("Louvain, layer, 77 nodes"; "Annotations, folder, 2 layers").
- **Editing several rows at once** is selecting them in the tree (Shift- or Control-click) and
  editing them together, Figma's way: the panel shows the fields they share, "Mixed" where they
  differ, and each write reaches every selected row in one undo step.

**Why.** The owner's test is consistency of interaction: every row behaves like a layer or a
folder. A split parent and its generated children needed rules of their own (refused drops,
children that move only among their siblings, a read-only child rule, "Follow parent", a search
inside the tree past eight children), each learned for one row kind. The value table already gives
the one property that justified the split, palette changes reaching untouched groups, and it does
so in the binding the reader already edits. Nothing is generated, so a 500-community run is still
one row. Every mechanism used here has other uses: value-table entries serve any categorical
binding, "New layer for <value>" is "New layer from selection" with the rule filled in, and editing
several rows serves every layer.

**Rejected.** A split parent as its own row kind: a third kind with five
special rules. A split layer as "an ordinary layer that has children", like a Figma frame: the
children still move only among their siblings and refuse drops, so the special rules come back
under another name. "Split into layers" as a command that fills a folder with empty layers, one per
value: 500 communities flood the tree, each group's rule is copied at the moment of the split and
drifts from the original's, and readers would meet layers that set nothing. Folders that paint
their children: they would silently override each child's choices.

**Given up.** A tree row per community with its own lock. The eye moves to the category row; a
group that needs its own lock gets its own layer by "New layer for <value>".

**Look at.** Louvain's color binding popover with community 3 recolored, then the palette changed;
"New layer for 3" from the same row; and the Annotations folder's panel.

### 1.8 Which elements: together or separately

**Decision.** One Which elements section at the top of every layer's Style tab. It starts with a
three-way choice, **Nodes | Edges | Both**, then one rule. When Both is chosen and the rule reads
only node values, one more choice says which edges: **between them** or **touching them**. The
section reads back as one sentence with its count: "Nodes where group is 3, and the edges between
them. 12 nodes, 30 edges."

A layer that paints both kinds is one row in the tree and one panel. In graphty-element it is a row
of the new style tree that owns a node part and an edge part sharing one rule. The element keeps
every existing layer with a single `target`, so nothing a consumer reads today changes; the planned
major release, if the owner approves it, merges the two parts into one layer that widens `target`.
The app only ever reads rows from the element's tree, so the major changes nothing in the app.

**Why.** A route is one set of nodes and edges; two rules that must be kept in step drift. The model
says one layer paints both. Painting both through one element layer changes what `target` reads
back, which is breaking; a tree row that owns two parts is additive and is the element's own
representation, so no consumer pairs layers itself.

**Rejected.** A rule per kind inside each group: two editors for one idea. A `targets` field beside
`target`: a layer painting both would then answer one question two ways. The app pairing two layers
into one row: that would be the app working around the element.

**Look at.** The route layer's Which elements, read and edited.

### 1.9 Does the mock include every style?

**Decision.** No. Coverage is a test, not a review: an app test walks graphty-element's published
channel list, label style fields and graph settings, and fails when one has neither a control nor a
written "not offered" reason. Section 6 is the table that test checks. What the mock missed and the
build adds: the lighting choice (studio, headlight, matte, flat) in Graph settings; the label
formatting tags (bold, italic, color, size, font, background inside the words) as help on the
typed-words field; the edge selection band as an effect of the Selected layer; the highlight color
in Graph settings. What is deliberately not offered, with the reason in the table: gradient fills
(no style channel reaches them), `node.flat` (nothing draws it), `node.marker` (the element refuses
it), and the label fields no channel reaches.

**Why.** The mock was checked by reading and three readings gave three answers; a test gives one and
keeps the panel from falling behind as the element grows.

**Rejected.** A one-time audit: it is stale at the next channel.

**Look at.** The coverage table (section 6) and the test's output.

### 1.10 Text labels

**Decision.** A label is one entry in its kind's Text list. At rest it is two lines: its source (a
value pill, or typed words), then its look, size and position. The **look** is a select of named
label looks shown as previews, offered the way palettes are. Everything else is in one "Label
settings" popover with captioned groups (Type, Box, Letters, Placement, Motion and distance, Badge),
no tabs. Each entry has an eye: off, the entry draws no label on these elements (the element's
`enabled: false`), which covers any label a layer beneath writes there.

Inside Label settings, the look is what lies beneath: a field the reader has not changed shows the
look's value as its placeholder, and a changed field is set, with its minus. Clear works there
exactly as in decision 1.1, back to the look's value. The look select reads "Default, edited" while
any field differs from the look. There is no separate Reset.

The looks are a new graphty-element catalog list, each passing 4.5:1 text contrast, tested in the
element. A layer stores the look's id plus only the fields the reader changed, so which fields are
changed is a fact the element reports, not a comparison the app makes. graphty-element's nine badges stay where they
are, as the Badge field in the popover. Saved looks of the reader's own wait until a study shows
people reuse them.

**Why.** A label has 49 look fields; nobody should meet them at rest, and a named look is one step
by pointer or keyboard. Offering the existing badges as one-click looks would ship contrast
failures: with white text, only one of the nine passes 4.5:1 (`label-success` measures 2.22:1).
Recoloring the badges changes existing output, which is the owner's call.

**Rejected.** Tabs inside the popover: tabs hide fields. A docked pop-out panel: slows every edit.
Badges as the looks list: contrast failures. Two names for an edited look ("Custom" and "Edited"):
one word, "edited". An "Edited" mark with its own Reset: a second way to take a value back, beside
the minus every other field uses. Figma's Detach on a look: the entry already stores the look plus
changes, so there is nothing to detach into. A "No label" source to hide a label from beneath: the
eye does it. Saved looks now: no evidence of reuse yet.

**Look at.** The Key people layer's label entry, its look select, and its settings popover.

### 1.11 Picking elements for a hand-made layer

**Decision.** One editor, Which elements, with three ways in. No algorithm has its own entry.

1. **Conditions** (the default): rows of value, comparison and operand, joined by "and", the same
   rule editor Data > Filters uses, so readers learn one editor. Comparisons: is, is not, is one
   of, at least, at most, between, contains, starts with, ends with, matches pattern, has a value;
   plus Top N by any number, Members of a set, Named elements, Selected, Hovered, and an
   "Expression" condition (graphty-element's query subset) for experts.
2. **Search**: a find field at the top of the editor. Typing "bob" lists what find matches and
   offers each hit as a live rule ("Nodes where name contains bob, 3 nodes") or as a fixed list
   ("These 3 nodes").
3. **Selection**: "New layer from selection", among a selection's actions in the inspector and
   the canvas menu, makes a layer whose rule is the
   rule the selection came from, when it came from one, else the named elements.

Text matching in rules is answered by the same matcher find uses, so a search and the rule it
becomes can never disagree. See section 3 for the two worked examples.

**Why.** Conditions are readable and need no syntax; in the earlier study rounds participants almost
never typed an expression. Search is how readers already look for "Bob". Selection covers "these
ones, by eye". Today neither of the owner's examples can be written: the layer rule language refuses
functions, so "contains" is impossible, and nothing reads the id as a value.

**Rejected.** An expression language as the main path: almost nobody types one. Special entries for
Louvain, degree or betweenness: favors some runs; "Top N by" and "Where a value" take any value. A
remainder operator for "odd ids": a pattern on the last digit covers the example, and no persona
needs arithmetic in rules yet. JMESPath functions in rules: a second text matcher that would
disagree with find.

**Look at.** The two worked examples, done live in the panel.

### 1.12 What can vary

**Decision.** The vary glyph is on every field whose graphty-element channel takes a binding, and
the picker it opens follows the field: a number gives a ramp of numbers, a color a palette ramp or a
scheme, shape, pattern and arrow kind a scheme of categories, label words pass a value through or
use a value table. That is 29 of today's 35 channels plus the new label size, label color and label
background channels this build adds. Yes-or-no properties have no vary glyph: "on for these values"
is a Which elements rule. A field the element cannot bind shows no glyph at all.

**Why.** One pattern everywhere, and the owner's examples (vary size, shape, labels) all work. The
label channels are built rather than shown disabled, because a disabled "not yet" control is an
unbuilt item drawn.

**Rejected.** Color and size only: hides what the element already binds. A separate "mappings"
section: a second home for one setting. Disabled vary glyphs on label size and color until the
element supports them: build them instead. "Show by" in the Values tab: a second door, held.

**Look at.** The Edge betweenness layer (width varies) and Key people (label size varies by degree).

### 1.13 Consistency with Figma's right sidebar

**Decision.** The panel follows Figma's right sidebar wherever Figma has solved the same problem,
and departs only where a graph fact or a fixed rule forces it. The pass covered every decision above
and the panel's structure, against Figma's help center and the repository's capture of the Figma
editor (`design/ui/figma/`, `compact-mantine/design/figma-spec.md`). The framework's single list of
departures is `design/ui/framework/figma-crosswalk.md` section 4; each departure below already has
a row there or is added with the build.

**Adopted as Figma does it**

| Figma pattern                                                                                     | In the style panel                                                                                                          |
| ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| "Mixed" in a field whose values differ; typing over it writes one value                           | a not-set field whose beneath values differ, and a field shared by several selected rows                                    |
| Several selected rows edited together                                                             | Shift- or Control-click rows in the tree; shared fields, "Mixed" where they differ, one undo step (decision 1.7)            |
| "Click + to replace mixed content" on a list                                                      | Text and Effects lists under several selected rows                                                                          |
| "+" on a list's title, "-" on each entry                                                          | Text, Effects, conditions and value-table entries (decision 1.2)                                                            |
| Clicking an empty list's title adds an entry                                                      | empty Text and Effects titles open their "+" menu                                                                           |
| An eye on each fill and effect entry                                                              | an eye on each Text and Effects entry, including the gray inherited lines (decision 1.1)                                    |
| A settings button at the start of a row                                                           | the rare one-value properties (decision 1.1)                                                                                |
| A bound field shows a pill; "Apply variable" sits at the field's end on hover and focus           | a varied value is a pill; the vary glyph sits where "Apply variable" does                                                   |
| The variable picker: search, groups, only what fits                                               | the vary picker (decision 1.5)                                                                                              |
| The selection's type row: name, then actions                                                      | the panel header: kind glyph, name, "Select what it paints" (Figma's "Select matching layers"), the row menu                |
| Eye and lock live on the layer row only                                                           | the panel header drops its eye and lock; two controls for one state are a defect                                            |
| Selection colors: every color in the selection, each editable                                     | on a folder and on several selected rows (below)                                                                            |
| Sections that do not apply are absent, not disabled                                               | the Nodes or Edges group is hidden (decision 1.4)                                                                           |
| A fixed section order whatever the selection holds; popovers open beside the panel, one at a time | Which elements, Nodes, Edges, and inside each group the same row order; popovers open to the left of the panel, 240 px wide |
| Frame and group as different things                                                               | layer and folder; the folder paints nothing (decision 1.7)                                                                  |

**Adapted, with the reason**

- **Instance overrides and Reset become Clear, drawn at rest.** Figma leaves overrides unmarked and
  resets them from a menu. "What does this layer write?" is the main question a stack raises, so
  a set field always carries its minus (decision 1.1).
- **Detach on a bound value becomes "Fix at <value>".** Detach keeps the one value a variable
  held; a varied property paints a different value per element, so the command must name the value
  it keeps. Already a crosswalk row ("Detach keeps the one value").
- **Text styles become label looks** that keep their name, read "edited" once changed, and clear
  per field, without Detach (decision 1.10).
- **Selection colors names the layers each color comes from.** On a folder or several selected
  rows it lists the fixed colors their rows write (values and value-table entries), up to three
  chits and "+N", expanding to one row per color. Each row names the layers that write that color,
  and editing it rewrites the color in exactly those layers, in one undo step. Colors painted by
  layers outside the selection are not listed. Reason: the crosswalk's existing rule that a
  Selection colors row must show which layer it changes, since appearance is written only through
  style layers. It replaces the folder panel's three chits from the first draft.

**Rejected, with the reason**

- **"+" adding a default entry at once** (Figma's Effects and Fill). A fixed value covers every
  layer beneath it, so a default would repaint by surprise; picking writes. Already a crosswalk row
  (`"+" on a Fill section adds`).
- **Switches for yes-or-no properties.** A switch has no "not set" state (decision 1.1).
- **Non-sticky group titles.** Figma's titles scroll away; ours stick, because "Color" is in both
  the Nodes and Edges groups and the heading says which.
- **Gradient as a paint type inside the color picker.** It would be a second door to "vary by", for
  color only.
- **Components and variable modes as features.** Reuse here is the value table and label looks; a
  second inheritance system would compete with the stack.

**Look at.** The route layer's header next to Figma's type row; a folder's Selection colors; three
selected rows with a "Mixed" color.

---

## 2. The panel

### 2.1 The layer tree (left)

Rows are style layers and folders in paint order, top first, from graphty-element's style tree.

```
Style layers                                 [+]
   Hovered                          (pin)(lk)(eye)
   Selected                         (pin)(lk)(eye)
 v Annotations                           (lk)(eye)      folder glyph
     Key people                          (lk)(eye)
   Route Valjean to Javert               (lk)(eye)      paints nodes and edges
   Edge betweenness                      (lk)(eye)
   Louvain                               (lk)(eye)      color varies by community
   Degree                                (lk)(eye)
   Everything                       (pin)(lk)(eye)
-------------------------------------------------
 Graph settings
```

- **Two row kinds**, each with its own glyph: layer and folder. A layer's marks say what it paints
  (a dot for nodes, a line for edges, both for both) and whether every property it writes is
  painted over by layers above ("Painted over by Degree", from `styles.counts`).
- **Selecting rows**: a click selects one row; Shift-click and Control-click select several, and
  the right panel edits them together (decision 1.7). compact-mantine's `Tree` already selects
  several rows.
- **Eye and lock** on hover, focus, and always when on; **pin** from the row menu, shown as a mark.
  Lock is the reader's flag on any row.
- **"+"** opens a menu: Add layer, Add folder. Add layer makes a draft at the top of the unpinned
  stack, selected, with Which elements open and focus on the kind choice. The draft is app state
  until its first value is set, then becomes a layer in one undo step. Add folder makes "New
  folder" in rename.
- **Row menu**: Rename, Duplicate, Move to folder, Pin to top, Pin to bottom, Unpin, Select what it
  paints, Delete; Ungroup on a folder. The same menu for every layer.
- **Moves**: rows drag to reorder; a drop onto a folder's middle moves a row in; a pinned row moves
  within its band. compact-mantine's `Tree` already reports moves (`onMove`) and refuses drops
  (`canDrop`).
- **Footer**: Graph settings; Restore starting layers only when Everything, Selected or Hovered
  has been deleted.

### 2.2 The Style tab (right)

```
+------------------------------------------------+
| [Style] [Values]                                |
| (glyph) Route Valjean to Javert  (select)(...)  |
+------------------------------------------------+
| Which elements                                  |
|  Nodes and edges where on path, Dijkstra        |
|  5 nodes, 4 edges                               |
+------------------------------------------------+
| (o) Nodes                                       |  sticky heading
|  [Icosphere v]  [1        ]   Shape | Size      |
|  [set] [# D55E00     ] (=) (-)  Color           |
|  Text                                     [+]   |
|   [set] (step, route)            (-)            |
|         Default  36 px  Above right             |
|  Effects                                  [+]   |
| (-) Edges                                       |  sticky heading
|  [set] [# D55E00 ] [24     ] (-)  Color | Width |
|  [set] [Normal v] [None v]       Head | Tail    |
|  Text                                     [+]   |
|  Effects                                  [+]   |
+------------------------------------------------+
```

**Header.** Kind glyph, name (rename in place), "Select what it paints", and "..." for the row
menu. The eye and lock stay on the tree row only. A locked layer's controls are disabled with "This
layer is locked" at the top; a hidden one says "Hidden: changes will not show until it is shown".
Those two lines state the row's state; they are not a second control for it.

**Which elements** (section 3).

**Groups.** Nodes, then Edges, each shown only when the kind choice includes it (decision 1.4).

**Rows per property.** Field widths follow compact-mantine's 240 px grid. Every row has its settings
button at the start where it has rare settings, the value control, the vary glyph on hover and focus
(always on touch), and a minus once set (decision 1.1).

| Group | Row            | Control                                                                     | Values per layer       | Settings button holds                                                                                        |
| ----- | -------------- | --------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------ |
| Nodes | Shape \| Size  | glyph-grid select (25 shapes) \| number field                               | 0 or 1 each            | Wireframe ("Solid / Wireframe"), Show ("Shown / Hidden")                                                     |
| Nodes | Color          | `CompactColorInput` (opaque)                                                | 0 or 1                 | Opacity                                                                                                      |
| Nodes | Text           | list of entries, "+" menu: Label, Tooltip                                   | one of each kind today | per entry: Label settings popover                                                                            |
| Nodes | Effects        | list, "+" menu: Outline, Glow, Halo                                         | one of each kind today | Glow: strength. Halo: size, opacity                                                                          |
| Edges | Color \| Width | `CompactColorInput` \| number field in the element's own unit               | 0 or 1 each            | Opacity, Pattern (glyph grid, 9), Pattern count (repeating patterns only), Curve ("Straight / Curved"), Show |
| Edges | Head \| Tail   | glyph-grid select each (14 kinds; "None" is a value, empty is not set)      | 0 or 1 each            | per end: size, color (empty reads "Line color"), opacity                                                     |
| Edges | Text           | list, "+" menu: Label, Caption at the target end, Caption at the source end | one of each kind today | per entry: settings popover                                                                                  |
| Edges | Effects        | list, "+" menu: Band, Motion                                                | one of each kind today | Band: width multiple, opacity. Motion: none                                                                  |

- A list kind that is already present is disabled in its "+" menu with the reason ("One label per
  element"); when every kind is present, "+" is disabled with that reason.
- A rare property that is set draws as its own row under its parent row, with a minus.
- **Combine mode** is in the row menu of number properties (Replace, Multiply, Add) and shows only
  when not Replace, as the field's prefix ("x 2", spoken "Edge width, multiplied by"). Mixing
  colors and stacking rings are not built in this tier, so they are not offered.
- **Derived rows** replace the value control with a value pill (the value's name, its run when it
  has one) and a second line: a ramp strip with its domain ends, a From / To pair for numbers, or
  up to 8 category chits and "+N". Notes for non-neutral settings print below as plain secondary
  text ("Log scale", "Clamped at 2nd to 98th percentile, 14 outside"), written from the element's
  codes. The ramp strip and the settings button both open the binding popover.
- **Folders** show no groups: a list of their rows in paint order (each with its eye; a click
  selects the row), then Selection colors (decision 1.13).
- **Several selected rows** show a header "3 layers", no Which elements, the groups their kinds
  share, each field holding the shared value or "Mixed", Selection colors last, and every write
  going to each selected row in one undo step. A row that is locked is left out of the write and
  named in a line under the header.
- **The draft** shows Which elements open and no groups until a kind is chosen.

### 2.3 Labels

```
 Text                                           [+]
  [set] (name)                    (=) (eye) (-)
        [Default v]  [48 px] (=)  [Below v]
   Label, from Degree                  (eye)        gray: written beneath
```

- Line 1: the settings button, the source (a value pill when passed through from a value, a text
  field for typed words, with a help tooltip listing the six formatting tags), vary glyph, eye,
  minus.
- A gray line is an entry a layer beneath writes (decision 1.1): its eye off adds an entry here
  that draws no label on these elements.
- Line 2: the look select (previews), size (label px, varies with the new label size channel), and
  position as a word (a node's ten locations; an edge's On the line, Above, Below, At source end,
  At target end).
- "Label settings" popover: Text color and Background first (both vary), then captioned groups:
  Type (font, weight, line height, alignment), Box (padding, corners, margins, border, background
  gradient), Letters (outline, shadow), Placement (offset, pointer, draw over the graph, clicking
  picks the node), Motion and distance (animation and its speed, fade with distance), Badge (the
  nine badges and None, icon and its side, progress, shorten large numbers). A field the reader has
  not changed shows the look's value as its placeholder; a changed field has its minus, which
  clears it back to the look's value. The look select reads "Default, edited" while any field
  differs.
- Tooltip and captions are the same entry with their own defaults.

### 2.4 The Values tab

Information, never styling, built the same way for every row from the values it reads:

- Always: Matched (the rule's count) and Values read (each with its run's state, or "this view
  only" for is selected and is hovered).
- A number value: its histogram with minimum, median and maximum; the step bounds and counts when
  the layer draws it in steps; a ranked list under a "Top N by" rule.
- A category value: group sizes, largest first, each row with its chit; a click on a row selects
  that group's elements on the canvas (so "New layer from selection" works from here too); the
  last re-run's matching from the element's codes ("Community 7 is new").
- A small rule result or a set: its members, 8 then "N more" with search.
- An ordered set (a route's steps): the numbered list, its length and total weight.
- Selected and Hovered: the current elements, or "Nothing hovered".
- A layer with labels: labeled, drawn, hidden by overlap.
- Always last: painted counts per property ("Node color: 11 of 77").

A folder lists the values its layers read, each with the layers that read it.

### 2.5 Graph settings (no row selected)

Background (color or image), View mode, Lighting (studio, headlight, matte, flat; studio is the
default), Labels (hide overlapping labels; move labels off nodes and edges), Same size at any depth,
Highlight color (the color a run paints its result in when no layer says otherwise).

---

## 3. Choosing which elements, generically

### 3.1 The editor

At rest the section is the rule as a sentence and its count. Clicking the sentence opens the editor
in place, focus on the kind choice:

```
Which elements
 [ Nodes | Edges | Both ]
 [ Find elements...                          ]
 Where
  [ name      v ] [ contains     v ] [ Bob     ]  (-)
  [+ Add condition]
 Edges  [ between them | touching them ]          (Both, node rule)
                                     3 nodes, 2 edges
                                    [Done]
```

- Rule kinds, offered by the first condition's value select and the "+" menu: Every node / edge,
  Where a value (the condition rows), Top N by any number, Named elements, Members of a set,
  Selected, Hovered, Expression.
- The condition rows are the same component as Data > Filters, moved to one shared place in the
  app so both use it.
- Done keeps the rule; Escape restores it. Either returns focus to the sentence.
- The count is the element's, live as the rule is edited.

### 3.2 Worked example: "name contains Bob"

By search:

1. Add layer. The draft opens on Which elements.
2. Choose Nodes. Type "bob" in Find elements.
3. Find lists its hits and offers "Nodes where name contains bob, 3 nodes" and "These 3 nodes".
   Each offer carries the rule leaf graphty-element built for that hit, so the app turns no text
   into a rule.
4. Pick the first. The editor shows one condition row, `name` / `contains` / `bob`, and the count.
5. Done, then set Color. The layer becomes real with its first value.

By conditions: Add condition, pick `name`, pick "contains", type "Bob". Same rule, same count.

Because the rule is live, a node renamed "Bobby" joins the layer on the next data change.

### 3.3 Worked example: odd-numbered node ids

1. Add layer, Nodes.
2. Add condition: `Id` / `matches pattern` / `[13579]$`.
3. The count shows the nodes whose id ends in an odd digit.

This works for whole-number ids; an id that is not a number never matches. Today the id is not a
value a rule can read, and the rule language has no pattern test; the build adds both (section 7).
No arithmetic is added for this: a pattern covers it, and a remainder operator waits until a need
goes beyond it.

### 3.4 From the selection

Lasso, Shift-click or a find in the toolbar selects elements. "New layer from selection", among the
selection's actions in the inspector and the canvas menu, makes a layer, at the top of the unpinned
stack, whose rule is the rule the selection came from (graphty-element records it) or else the named
elements, and opens it on its first property.

---

## 4. Vary by, in detail

- The vary glyph sits at the end of every bindable field; "=" in a number field opens the same
  picker; arrows move, Enter picks, Escape closes.
- Picking a number makes a ramp with the element's defaults (node size 1 to 3, edge width 8 to
  16, a sequential palette for color); picking categories makes a scheme. Picking is the owner's
  one-click "gradient" or "scheme" button.
- "Fix at <value>" in the binding popover turns a derived field back into one value, naming the
  value it keeps.
- The binding popover for categories holds the scheme (palettes by plain name, shape schemes,
  pattern and arrow lists that fit), the category rows, Other's share and the overflow choice,
  values not listed (Skip or Paint), elements with no value, and combine. A category row is its
  chit, name, count and eye. Editing the chit writes a value-table entry for that value, and the
  chit then carries a minus that clears it back to the palette (decision 1.1). The row's menu has
  "New layer for <value>" (decision 1.7). Past 8 rows, a search field filters them.
- The binding popover for numbers holds the ramp editor (decision 1.6), Range (number fields for
  sizes and widths), elements with no value, and combine. A ramp drawn in steps lists its steps
  with their counts, each with "New layer for <step>".

---

## 5. Default rows

- **Everything**, pinned to the bottom, on nodes and edges. It starts writing nothing; its
  placeholders show the floor (graphty-element's defaults), and whatever the reader sets there is
  the base look.
- **Selected**, pinned to the top, on nodes and edges, reading is selected. It starts with
  graphty-element's selection look: the node halo and the edge band, at today's values, as ordinary
  effects any reader can change.
- **Hovered**, pinned to the top, reading is hovered. It starts writing nothing.

graphty-element provides all three, and Restore starting layers, behind one option the app turns on
(section 7), so any consumer gets the same rows by setting the same option.

---

## 6. Coverage of every style

Where each style in `tier3/style-catalog.md` lives in the panel. "New" marks a channel this build
adds to graphty-element. The coverage test (unit `app-coverage-test`) checks this table against the
element's published lists.

| Style (channel or field)                                                                                                                          | Where in the panel                                                             | Varies                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------- |
| `node.color`                                                                                                                                      | Nodes, Color                                                                   | ramp, scheme              |
| `node.size`                                                                                                                                       | Nodes, Shape \| Size                                                           | ramp, value table         |
| `node.shape`                                                                                                                                      | Nodes, Shape \| Size (glyph grid)                                              | scheme (up to 25)         |
| `node.opacity`                                                                                                                                    | Nodes, Color's settings                                                        | ramp                      |
| `node.wireframe`                                                                                                                                  | Nodes, Shape's settings ("Solid / Wireframe")                                  | no (a rule)               |
| `node.visible` (new)                                                                                                                              | Nodes, Shape's settings ("Shown / Hidden")                                     | no (a rule)               |
| `node.label`                                                                                                                                      | Nodes, Text, Label entry source                                                | pass through, value table |
| `node.labelStyle`                                                                                                                                 | Label entry look and Label settings                                            | no                        |
| `node.labelSize`, `node.labelColor`, `node.labelBackground` (new)                                                                                 | Label entry size; Label settings colors                                        | ramp, scheme              |
| `node.tooltip`, `node.tooltipStyle`                                                                                                               | Nodes, Text, Tooltip entry and its settings                                    | words: yes; look: no      |
| `node.outline`                                                                                                                                    | Nodes, Effects, Outline                                                        | palette                   |
| `node.glow`, `node.glowStrength`                                                                                                                  | Nodes, Effects, Glow and its settings                                          | palette; ramp             |
| node halo color, size, opacity (new channels)                                                                                                     | Nodes, Effects, Halo and its settings                                          | palette; ramp             |
| `node.flat`                                                                                                                                       | not offered: nothing draws it (Lighting "flat" gives the look)                 | --                        |
| `node.marker`                                                                                                                                     | not offered: graphty-element refuses it                                        | --                        |
| `edge.color`                                                                                                                                      | Edges, Color \| Width                                                          | ramp, scheme              |
| `edge.width`                                                                                                                                      | Edges, Color \| Width                                                          | ramp, value table         |
| `edge.opacity`                                                                                                                                    | Edges, line settings                                                           | ramp                      |
| `edge.style`                                                                                                                                      | Edges, line settings, Pattern (glyph grid)                                     | scheme (up to 9)          |
| `edge.patternCount`                                                                                                                               | Edges, line settings, only for a repeating pattern                             | ramp                      |
| `edge.curvature`                                                                                                                                  | Edges, line settings ("Straight / Curved")                                     | no (a rule)               |
| `edge.visible` (new)                                                                                                                              | Edges, line settings ("Shown / Hidden")                                        | no (a rule)               |
| `edge.animationSpeed`                                                                                                                             | Edges, Effects, Motion                                                         | ramp                      |
| edge band color, width, opacity (new channels from the selection band settings)                                                                   | Edges, Effects, Band                                                           | palette; ramp             |
| `edge.label`, `edge.labelStyle`                                                                                                                   | Edges, Text, Label entry and its settings                                      | words: yes; look: no      |
| `edge.labelSize`, `edge.labelColor`, `edge.labelBackground` (new)                                                                                 | Edge label entry size and settings colors                                      | ramp, scheme              |
| `edge.arrowHead`, `edge.arrowTail`                                                                                                                | Edges, Head \| Tail                                                            | scheme (up to 14)         |
| `edge.arrowHeadSize` / `Color` / `Opacity`, and the tail's                                                                                        | Ends settings                                                                  | ramp; palette             |
| `edge.arrowHeadText` / `TextStyle`, and the tail's                                                                                                | Edges, Text, Caption at the target / source end                                | words: yes; look: no      |
| Label fields: `font`, `sizePx`, `weight`, `color`, `lineHeight`, `textAlign`                                                                      | Label settings, Type (size on the entry, color first)                          | size, color: yes          |
| Label fields: `background`, `padding`, `cornerRadius`, margins, `borderWidth`, `borderColor`, `gradient*`                                         | Label settings, Box (background first)                                         | background: yes           |
| Label fields: `outline`, `outlineWidth`, `shadow*`                                                                                                | Label settings, Letters                                                        | no                        |
| Label fields: `location`, `attachOffset`, `pointer*`, `onTop`, `pickable`                                                                         | Entry position; Label settings, Placement                                      | no                        |
| Label fields: `animation`, `animationSpeed`, `depthFade*`                                                                                         | Label settings, Motion and distance                                            | no                        |
| Label fields: `badge`, `icon`, `iconPosition`, `progress`, `smartOverflow`, `maxNumber`, `overflowSuffix`                                         | Label settings, Badge                                                          | no                        |
| Label field `enabled`                                                                                                                             | the entry's eye (off draws no label here); the minus removes the entry         | --                        |
| Text fields no channel reaches: `textPath`, `position`, `attachPosition`, `autoSize`, `resolution`, `billboardMode`, `borders`, `textOutlineJoin` | not offered: no channel reaches them; words from a value use the source picker | --                        |
| Formatting tags inside label words (6)                                                                                                            | help on the typed-words field                                                  | --                        |
| Badge presets (9)                                                                                                                                 | Label settings, Badge                                                          | --                        |
| Gradient fills (`texture.color` gradient forms)                                                                                                   | not offered: no channel reaches them                                           | --                        |
| `background` (color, image)                                                                                                                       | Graph settings, Background                                                     | --                        |
| `selection.*` (halo, band)                                                                                                                        | the Selected row's Halo and Band effects                                       | --                        |
| `viewMode`                                                                                                                                        | Graph settings, View                                                           | --                        |
| `lighting` (element property)                                                                                                                     | Graph settings, Lighting                                                       | --                        |
| `layoutBehavior.labels` (declutter, avoidance)                                                                                                    | Graph settings, Labels                                                         | --                        |
| `layoutBehavior.node.depthIndependentSize`                                                                                                        | Graph settings, Same size at any depth                                         | --                        |
| Highlight color (`styles.setHighlightColor`)                                                                                                      | Graph settings, Highlight color                                                | --                        |
| `twoD`, `addDefaultStyle`                                                                                                                         | not offered: deprecated / ignored by the element                               | --                        |
| `startingCameraDistance`, `layout`, `layoutOptions`, auto framing                                                                                 | not styles: camera and Layout                                                  | --                        |
| Context point                                                                                                                                     | not offered: part of visibility filters, set by the element                    | --                        |
| Palettes (18), scales (9), binding options                                                                                                        | binding popovers                                                               | --                        |

---

## 7. What graphty-element adds

Every item is additive: a new export, method, option, channel, rule kind or optional field whose
default keeps today's behavior. Each is recorded under "decided by the team" in `owner-decisions.md`
when it is built.

1. **A style tree.** `styles.tree()` returns rows in paint order: layers and folders, each with its
   name, pin (top, bottom or none), lock (the reader's flag),
   hidden flag and children. Calls to add, rename, move, pin, lock, hide and delete rows, each one
   undo step, saved in the style document. A row may own a node part and an edge part sharing one
   rule (section 1.8). `styles.list()` and every `Layer` keep their single `target`, and
   `Layer.locked` keeps its meaning. The two base layers are not rows: they are the floor.
2. **Default rows.** An option (`startingRows`) under which the element creates Everything,
   Selected and Hovered (section 5) and offers `styles.restoreStartingRows()`. With it on, the
   selection look is drawn by the Selected row's halo and band, not by `selectionStyle`. New facts
   is selected and is hovered (view-scoped) and rule kinds Selected and Hovered. New channels for
   the node halo and the edge band. A placement option for run suggestions, `top`, under which a
   run's layer lands on top of the unpinned stack and no hand layer suppresses it. Every option
   defaults to today's behavior; the graphty app turns them on.
3. **Rules.** A selector that takes a rule tree directly (`{ match: "rule", where, edges }`) with
   edge readings for "between them" and "touching them" (a new `EdgeReading`, `incident`). A text
   leaf on `RuleTree` evaluated by find's own matcher, with find's text modes plus starts with and
   ends with added to that one matcher. The element id as a value a leaf can read. "Top N by" any
   number column, not only a run's field. Each `FindResult` value row carries the rule leaf that
   reproduces it.
4. **Panel facts.** `styles.agreement` takes `{ below: rowId }` and answers what the layers
   beneath that row give its elements, per property, with the layer that paints it (or a
   breakdown by layer when mixed), which is everything Clear's tooltip needs.
   `styles.preview(binding)` answers, for a binding not yet written, the bins in the scale's space with their counts, what each bin paints,
   the step bounds, and the counts clamped below and above and without a value. A binding may
   carry its own palette stops, saved with the layer.
5. **Per-value entries that follow their groups.** For any categorical binding: each value with
   its count, whether it is hidden and its value-table entry, read in one call; a call that sets or
   clears one value's entry, one undo step. When a run renumbers its groups, value-table entries,
   hidden values and rule conditions that name a group follow it by member overlap (by name for
   meaningful values), on any layer, and groups that cannot be matched are reported on the layer as
   codes. There is no split command and no split row: these replace them (decision 1.7).
6. **New channels and writes.** `node.visible`, `edge.visible`; label size, text color and
   background as bindable channels for node labels, tooltips, edge labels and captions; a combine
   mode (replace, multiply, add) on number writes.
7. **Catalog.** Descriptors for node shapes, arrow kinds and line patterns, each with its plain
   name and a static glyph. A list of named label looks, each tested to pass 4.5:1 text contrast,
   and an optional `look` field on `LabelStyle`, so a layer stores a look plus only the fields the
   reader changed.
8. **Colors across rows, and an off value for effects.** For a set of rows: the fixed colors they
   write (fixed values and value-table entries), normalized so two spellings of one color are one,
   each with the layers and channels that write it; and a call that replaces one color with
   another in exactly those writes, one undo step. Each effect channel (outline, glow, halo, band,
   motion) accepts a value that draws nothing, as `LabelStyle.enabled: false` does for labels, so
   an entry's eye can cover what a layer beneath writes. Writing one value to several rows at once
   needs nothing new: `session.transaction` already makes it one undo step.

Not added in this tier, because nothing in the panel needs them yet: endpoint and neighbor reads,
list values, computed values, multi-input bindings, color mixing, stacking rings, a per-property
pause, saved label looks, derived elements and a time cursor.

compact-mantine adds: glyphs on `StyleSelect` options with a grid layout; an optional heading level
on `ControlSection`, so a screen reader can move by the Nodes and Edges headings; and the ramp
editor.

---

## 8. For the owner

These are breaking changes or reversals of the owner's own rules. None is built. The build uses the
additive alternatives in section 7, and the app reads the same element calls either way.

1. **One element layer that paints nodes and edges together.** It widens the `target` a consumer
   reads back. Until then a both-kinds layer is a style tree row with two parts. Suggested: join
   the held major release.
2. **Starting rows and run placement on by default.** Making `startingRows` and run placement
   `top` the defaults, and deprecating `selectionStyle`, changes what every consumer sees.
   Together with the model's other breaking items (runs found by what they read; `styles.encode`
   replacing by what a layer reads; lock as a reader's flag replacing `locked`; the base layers
   becoming the floor), they belong in the same major.
3. **The default selection look and the badge colors fail contrast.** The selection halo measures
   1.13:1 against the default background (3:1 needed), and with white text only one of the nine
   badges passes 4.5:1. Recoloring either changes existing output.
4. **Reduced motion.** Label animations and edge motion ignore the reader's reduced-motion
   setting. Following it by default changes a default.
5. **Accordions, only if needed.** If the route layer still scrolls at 900 x 700 after the changes
   in decision 1.3, the next step is collapsible Nodes and Edges groups, which reverses the owner's
   "never accordions" rule.

---

## 9. Build plan

Units by layer: graphty-element first, then compact-mantine, then the app, then the Values tab,
tests, stories and docs. A unit depends only on units in earlier layers unless it says so. Every app
unit replaces code rather than adding a second path: the current Style tab
(`graphty/src/workspace/style/`) and paint tree (`graphty/src/workspace/graph-place/PaintTree.tsx`,
`rows.ts`) are deleted as their replacements land. UI acceptance is tested with real input
(`userEvent` from `vitest/browser`) in `*.real-element.test.tsx` against the real element.

Already built on the design branch, and kept: `element-style-tree`, `element-both-kinds-rows`,
`element-rules` and `element-panel-facts` (its `agreement` already names the layer beneath, so Clear
needs nothing more). `element-split-by-value` was built too; its value-table storage and re-run
matching are kept, and `element-value-entries` replaces its split command and split fields. None of
it has been released, so removing those is not a breaking change for any consumer.

### Layer 1: graphty-element

**`element-style-tree`: rows, folders, pins and a reader's lock.**

- Files: `graphty-element/src/session/styles/tree.ts` (new), `StylesApi.ts`, `Layer.ts`,
  `graphty-element/src/catalog/types.ts`, `graphty-element/src/session/projectFile.ts`,
  `graphty-element/test/session/styles-tree.test.ts` (new), `graphty-element/api/session.api.md`.
- What: `styles.tree()` returns rows in paint order (layer, folder), each
  with name, pin (top, bottom, none), the reader's lock, hidden and children. Calls to add a folder,
  rename, move (parent and index), pin, lock, hide and delete a row, each one undo step and one
  change event. A folder's eye and lock reach its rows; the tree order is the paint order. Saved in
  the style document by position, since reopening mints new layer ids. The two base layers are not
  rows. `styles.list()`, `Layer.target` and `Layer.locked` are unchanged.
- Acceptance: moving a folder below a layer changes the resolved color of a node both paint (read
  through `styles.explain`); hiding a folder stops its rows painting; a row pinned to the bottom
  stays below a layer added later; an update to a locked row is refused with a code; save and reopen
  keeps folders, pins, locks and order; each call is one undo step; a snapshot of `styles.list()`
  for an existing stack is unchanged; the API report shows additions only.

**`element-both-kinds-rows`: one row that paints nodes and edges.**

- Files: `tree.ts`, `StylesApi.ts`, `selector.ts`, `graphty-element/src/catalog/types.ts`
  (`EdgeReading` gains `incident`), `graphty-element/test/session/styles-both-kinds.test.ts` (new).
- What: a row may own a node part and an edge part that share one rule (a node rule plus "between
  them" or "touching them", or a rule that speaks both kinds). A write goes to the part whose kind
  has that channel. Move, hide, lock and delete act on the row. `styles.list()` still returns one
  layer per part with its single `target`.
- Acceptance: on Les Miserables with a Valjean-to-Javert shortest path, a row on "on path" with Both
  paints 5 nodes and 4 edges with one color write, and a width write reaches only the 4 edges;
  deleting the row removes both parts in one undo step; `incident` includes an edge with one matched
  end and `induced` does not.

**`element-starting-rows`: Everything, Selected and Hovered.**

- Files: `graphty-element/src/session/GraphSession.ts`, `graphty-element/src/config/GraphStyle.ts`,
  `channels.ts`, `selector.ts`, `autoApply.ts`, `graphty-element/src/Node.ts`,
  `graphty-element/src/Edge.ts`, `graphty-element/test/session/starting-rows.test.ts` (new),
  `graphty-element/test/browser/selected-row.test.ts` (new).
- What: an option, `startingRows`, default off. On, the element creates Everything (both kinds,
  pinned bottom, writing nothing), Selected (both kinds, pinned top, writing the node halo and the
  edge band at today's selection values) and Hovered (nodes, pinned top, writing nothing), and
  offers `styles.restoreStartingRows()`. New view-scoped facts is selected and is hovered, and
  Selected and Hovered rule kinds. New channels for the node halo (color, size, opacity) and the
  edge band (color, width multiple, opacity); with the option on, the selection settings draw
  nothing themselves. A run placement option, `top`, under which a run's suggested layer lands on
  top of the unpinned stack and is never suppressed by a hand layer.
- Acceptance: with the option off, every existing selection and auto-apply test passes unchanged;
  with it on, a real click on a node draws exactly one halo (pixel count), changing Selected's halo
  color repaints it, deselecting leaves Selected matching nothing, a real pointer hover makes
  Hovered match that node, deleting Selected and restoring it is one undo step each; with placement
  `top`, a Louvain run after a fixed Everything node color paints its groups.

**`element-rules`: generic rules, text matching, the id as a value.**

- Files: `graphty-element/src/catalog/types.ts`, `selector.ts`, `predicate.ts`,
  `graphty-element/src/session/query.ts`, `graphty-element/src/session/types.ts`,
  `graphty-element/src/session/visibility/VisibilityApi.ts`,
  `graphty-element/test/session/rule-text.test.ts` (new).
- What: a selector that takes a rule tree, `{ match: "rule", where, edges? }`. A `RuleTree` text
  leaf (what it reads, a text mode, the text, case sensitivity) evaluated by find's own text
  matcher, with starts with and ends with added to that matcher's modes. The element id as a value a
  leaf can read. "Top N by" any number column, not only a run's field. Each `FindResult` value row
  carries the rule leaf that reproduces it. The leaf works in visibility filters too, since they
  share the rule tree.
- Acceptance: "name contains bob" as a layer rule paints exactly the nodes `session.find("bob")`
  reports for `name`; a pattern `[13579]$` on the id of a 100-node fixture with ids 0 to 99 matches
  50 nodes; a find row's `rule` used as a layer rule matches the row's count; top 10 by a data
  column paints 10 nodes; the same text leaf in a visibility filter hides the same nodes.

**`element-panel-facts`: what lies beneath, and a binding preview.**

- Files: `StylesApi.ts`, `graphty-element/src/session/styles/scales.ts`, `encoding.ts`,
  `EncodingSpec.ts`, `graphty-element/test/session/styles-preview.test.ts` (new).
- What: `styles.agreement(scope, channel, { below: rowId })`: the value the layers beneath a row
  give its elements, or mixed. `styles.preview(binding, { bins? })`: for a binding not yet written,
  bins in the scale's space with counts, what each bin paints, step bounds, and counts clamped
  below, above and without a value. A binding may carry its own palette stops, saved with the layer.
- Acceptance: below a Degree row that sits above Louvain, node color agreement is mixed, and below
  Everything it is the floor; for degree on a log scale, the color the preview gives each bin equals
  the color `styles.explain` reports for a node in that bin, on five sampled nodes; the clamped
  counts equal the nodes outside the clamp; a binding with its own stops survives save and reopen.

**`element-value-entries`: per-value entries that follow their groups (replaces split).**

- Files: `graphty-element/src/session/styles/split.ts` (renamed `values.ts`), `StylesApi.ts`,
  `Layer.ts`, `graphty-element/src/catalog/types.ts`, `graphty-element/src/session/runs/RunsApi.ts`,
  `graphty-element/src/session/styles/selector.ts`, `graphty-element/test/session/styles-split.test.ts`
  (renamed `styles-value-entries.test.ts`), `graphty-element/api/*.api.md`.
- What: remove `styles.split`, `styles.unsplit`, `LayerSplit` and the layer's `split` field. Keep
  the rest under neutral names: `styles.categories(layerId, channel)` (was `splitChildren`: each
  value, its count, hidden, its entry) and `styles.setValueEntry(layerId, channel, value, entry)`
  (was `setSplitOverride`; `undefined` clears). Re-run matching runs for every layer, not only a
  split one: value-table entries, hidden values and rule conditions naming a group of a run's
  partition follow it by member overlap, other values by name. Unmatched groups are an optional
  field on the layer with codes `group.new` and `group.gone`.
- Acceptance: on a Louvain-colored layer, setting community 3's color entry and switching the
  palette recolors every other community and leaves 3; clearing the entry returns 3 to the
  palette; a re-run that renumbers the ids keeps the entry, a hidden value and a hand layer's rule
  "community is 3" on the community with most shared members; a new community is reported with
  `group.new`; the same calls work on a data column's categories; the API report shows no
  `split` name.

**`element-colors-and-off`: colors across rows, and an off value for effects.**

- Files: `StylesApi.ts`, `graphty-element/src/session/styles/intern.ts`, `channels.ts`,
  `graphty-element/src/managers/StylePainter.ts`, `graphty-element/test/session/styles-colors.test.ts`
  (new), `graphty-element/api/session.api.md`.
- What: `styles.colors(rowIds)`: the fixed colors those rows write (fixed values and value-table
  entries), normalized, each with the layers and channels that write it.
  `styles.replaceColor(rowIds, from, to)`: rewrites exactly those writes, one undo step. An effect
  value that draws nothing for each effect channel (outline, glow, halo, band, motion). Additive.
- Acceptance: `#d55e00` and `#D55E00` written by two rows come back as one color naming both;
  replacing it repaints both rows' elements (read through `styles.explain`) and one Undo restores
  both; a row outside the given ids keeps the color; a glow written as off on a top layer hides a
  glow a layer beneath writes, by pixel count.

**`element-channels`: visible, label looks that vary, and combine.**

- Files: `channels.ts`, `encoding.ts`, `graphty-element/src/session/styles/repaint.ts`,
  `graphty-element/src/managers/StylePainter.ts`,
  `graphty-element/test/session/new-channels.test.ts` (new).
- What: `node.visible` and `edge.visible` (still counted, laid out and selectable); label size, text
  color and background as bindable channels for node labels, tooltips, edge labels and both
  captions; a combine mode (replace, multiply, add) on number writes.
- Acceptance: an edge set hidden by `edge.visible` is not drawn yet still counted by selection and
  statistics; label size bound to degree gives the highest-degree node the largest label; Selected's
  edge width "multiply 2" over an edge-betweenness width doubles each edge's beneath value.

**`element-catalog`: glyphs and label looks.**

- Files: `graphty-element/src/catalog/shapes.ts` (new), `graphty-element/src/catalog/label-looks.ts`
  (new), `graphty-element/src/catalog/index.ts`, `graphty-element/src/catalog/label-style.ts`,
  `graphty-element/test/catalog/glyphs.test.ts` (new), `graphty-element/api/catalog.api.md`.
- What: descriptors for node shapes, arrow kinds and line patterns, each with a plain name and a
  static glyph (SVG path data). A list of named label looks. An optional `look` field on
  `LabelStyle`: a layer stores the look plus only the changed fields and reports which fields differ
  from the look.
- Acceptance: every value of `NodeShapes`, `EdgeArrowTypes` and `EdgeLineTypes` has a descriptor (a
  new value without one fails the test); every look's text color measures at least 4.5:1 against its
  background; a layer with a look and one changed field reports that one field; the `./catalog`
  entry stays free of Babylon.js and the DOM.

### Layer 2: compact-mantine

**`cm-glyph-select`: pictures in selects, and real headings.**

- Files: `compact-mantine/src/components/StyleSelect.tsx`, `ControlSection.tsx`,
  `compact-mantine/tests/components/StyleSelect.test.tsx`, `ControlSection.test.tsx`, their stories.
- What: an optional glyph per `StyleSelect` option and a grid layout; an optional heading level on
  `ControlSection`.
- Acceptance: a 25-option grid moves focus in two dimensions with the arrow keys and picks with
  Enter, by real keyboard; each cell's accessible name is the option's name; type-ahead works; a
  `ControlSection` with a heading level exposes a heading of that level; every existing caller's
  screenshot is unchanged.

**`cm-ramp-editor`: the ramp editor.**

- Files: `compact-mantine/src/components/RampEditor.tsx` (new),
  `compact-mantine/src/components/rows/ChartRow.tsx`, `GradientEditor.tsx`,
  `compact-mantine/tests/components/RampEditor.browser.test.tsx` (new), its story.
- What: the control of decision 1.6, fed with bins, paints and counts by its caller: domain handles,
  clamp brackets with counted tails, a midpoint handle, step lines, a scale select, a palette strip
  select with Reverse, a no-value chit, and typed fields below.
- Acceptance: dragging the lower domain handle with a real pointer reports a value in data units; an
  arrow key moves a handle one bin; Home and End reach the data's ends; each handle's
  `aria-valuetext` is the caller's words; the clamp tails show the counts given; typing a domain end
  and pressing Enter reports it; nothing in it computes a scale.

### Layer 3: the graphty app

**`app-layer-tree`: the new tree.**

- Files: `graphty/src/workspace/graph-place/StyleTree.tsx` (new), `GraphPlace.tsx`, `commands.ts`;
  deletes `PaintTree.tsx` and the paint rows in `rows.ts`;
  `graphty/src/workspace/graph-place/__tests__/StyleTree.real-element.test.tsx` (new).
- What: section 2.1 from `styles.tree()`.
- Acceptance (real input): Add folder from "+" makes a folder in rename; dragging Key people onto it
  moves it in the element's tree; dragging a row into a pinned band is refused and nothing moves;
  Alt+ArrowUp moves the focused row; Shift-click selects two rows and the right panel heads "2
  layers"; the lock click disables the Style tab's controls; the eye stops
  the row painting (node color through `styles.explain`); each row's accessible name names its kind;
  Add layer selects a draft with focus on the kind choice, and abandoning it leaves nothing.

**`app-style-tab`: the Style tab and property rows.**

- Files: `graphty/src/workspace/style/StylePanel.tsx` (new), `PropertyRow.tsx` (new), `words.ts`,
  `commands.ts`; deletes `StyleTab.tsx` and `SetLine.tsx`;
  `graphty/src/workspace/style/__tests__/StylePanel.real-element.test.tsx` (new).
- What: section 2.2: header, groups by kind, the paired core rows with placeholders from the
  agreement below the row, settings popovers with the rare properties, written rare rows, two-word
  selects, glyph grids, Clear (decision 1.1), the combine prefix, sticky headings; the header with
  "Select what it paints" and no eye or lock.
- Acceptance (real input): on Selected, Size is empty with the beneath value as placeholder; typing
  2 and Enter writes size on that row only; the minus's tooltip names the value and layer beneath
  (from `styles.agreement` below the row); the minus clears it, focus lands in the field and one
  Undo restores 2; emptying the field and pressing Enter clears it too; Delete on the focused Shape
  select clears a set shape; each field's accessible name says set or not set; Shape's grid picks
  Octahedron;
  "Hidden" in Shape's settings writes visible false and draws its own row; an edges-only layer shows
  no Nodes heading; the route layer fits without scrolling at 1440 x 900 and its height at 900 x 700
  is recorded in the test output.

**`app-which-elements`: the Which elements editor.**

- Files: `graphty/src/workspace/rules/RuleRows.tsx` (new, moved out of
  `graphty/src/workspace/data-place/Filters.tsx`), `graphty/src/workspace/style/WhichElements.tsx`
  (new), `Filters.tsx`, `graphty/src/workspace/style/__tests__/WhichElements.real-element.test.tsx`
  (new).
- What: section 3.1: the kind choice, condition rows shared with Data > Filters, the edge clause,
  the Expression condition, the live count, Done and Escape.
- Acceptance (real input): the odd-ids example (section 3.3) gives 50 of 100 nodes; Escape restores
  the earlier rule; Both with a node rule offers between and touching, and the count changes between
  them; every existing Filters test passes on the shared rows.

**`app-find-and-selection`: search and selection as ways in.**

- Files: `WhichElements.tsx`, `graphty/src/workspace/graph-place/FindBox.tsx`, the selection bar in
  `graphty/src/workspace/canvas/`, `__tests__/FindToRule.real-element.test.tsx` (new).
- What: the find field in the editor offering live rules and fixed lists from find's rows, using
  each row's rule; "New layer from selection".
- Acceptance (real input): the "name contains Bob" example (section 3.2) by typing; Shift-clicking
  two nodes and choosing New layer from selection makes a layer of those 2; a selection made by a
  rule makes a layer with that rule.

**`app-vary-picker`: the value picker.**

- Files: `graphty/src/workspace/style/ValuePicker.tsx` (new, replaces `FromDataList.tsx`),
  `graphty/src/workspace/style/__tests__/ValuePicker.real-element.test.tsx` (new), a 200-column
  fixture.
- What: section 1.5.
- Acceptance (real input): "=" in Size opens it with search focused; typing narrows to matches; In
  use comes first; the folded row's count equals the columns `proposeEncoding` refuses; arrows and
  Enter pick and write the binding; on the 200-column fixture it opens without reading any column's
  values (no data scan in the profile).

**`app-binding-popovers`: ramp and category popovers.**

- Files: `graphty/src/workspace/style/BindingPopover.tsx` (rewritten),
  `__tests__/BindingPopover.real-element.test.tsx`.
- What: section 4, the ramp editor fed by `styles.preview`, and the categories popover with its
  category rows from `styles.categories`, value-table entries through `styles.setValueEntry`, and
  "New layer for <value>". Depends on `element-value-entries`.
- Acceptance (real input): dragging the domain handle changes the ramp ends and the color
  `styles.explain` reports for a known node; choosing Log redraws the axis; a clamp shows the count
  the preview gives; on Louvain, editing community 3's chit recolors only community 3, then a
  palette change recolors every other community and leaves 3, and the chit's minus returns it to
  the palette; "New layer for 3" adds a layer above with rule "community is 3" and the same count;
  the same works on a hand layer bound to a data column's categories.

**`app-labels`: label entries.**

- Files: `graphty/src/workspace/style/LabelSection.tsx` (rewritten), `LabelSettings.tsx` (new),
  `__tests__/Labels.real-element.test.tsx`.
- What: section 2.3.
- Acceptance (real input): clicking the empty Text title opens the "+" menu; Label opens the
  source picker; picking `name` labels the nodes; picking a look applies it; changing the font
  makes the look read "Default, edited" and the font's minus clears it back to the look's value;
  the entry's eye off removes the labels from the canvas and a label written beneath with them;
  on a layer with no entry, a label written beneath shows as a gray line; the size's vary glyph
  binds label size to degree.

**`app-effects-and-ends`: effects and arrow ends.**

- Files: `graphty/src/workspace/style/Effects.tsx` (new), `Ends.tsx` (new),
  `__tests__/Effects.real-element.test.tsx`.
- What: the Effects lists (Outline, Glow, Halo; Band, Motion) with an eye per entry and gray lines
  for effects written beneath, and the Head | Tail row with its settings. Depends on
  `element-colors-and-off`.
- Acceptance (real input): Effects "+" then Glow opens the color picker with focus in its hex field;
  Escape writes nothing; typing a hex writes the glow; Glow is then disabled in the menu with its
  reason; turning the Glow entry's eye off stops the glow drawing; picking None for Head writes
  `none`; an empty end color reads "Line color".

**`app-folder-rows-draft`: folders, several rows at once, and the draft.**

- Files: `graphty/src/workspace/style/FolderPanel.tsx` (new), `MultiRowPanel.tsx` (new),
  `SelectionColors.tsx` (new), `StylePanel.tsx`, `__tests__/RowKinds.real-element.test.tsx`.
- What: the folder's row list and Selection colors; several selected rows edited together
  (section 2.2), writes in one `session.transaction`; Selection colors from `styles.colors` and
  `styles.replaceColor`; the draft. Depends on `element-colors-and-off`.
- Acceptance (real input): a folder's panel lists its rows in paint order and clicking one selects
  it; editing a color in its Selection colors repaints every row that wrote it and one Undo restores
  all; with two rows of different sizes selected, Size reads "Mixed" and typing 2 writes 2 to both
  in one undo step; a locked row among them is named and left unwritten; a draft with Nodes chosen
  shows only the Nodes group.

**`app-graph-settings`: Graph settings.**

- Files: `graphty/src/workspace/settings/GraphSettings.tsx` (new or rewritten from the current graph
  settings), `__tests__/GraphSettings.real-element.test.tsx`.
- What: section 2.5.
- Acceptance (real input): Lighting set to Matte changes `element.lighting`; the declutter switch,
  the background color and the highlight color each read back from the element after a real click.

### Layer 4: Values tab, tests, stories, docs

**`app-values-tab`: the Values tab.**

- Files: `graphty/src/workspace/inspector/LayerValues.tsx` (new), `Inspector.tsx`,
  `__tests__/LayerValues.real-element.test.tsx`.
- What: section 2.4, for every row kind.
- Acceptance (real input): Degree shows a histogram whose minimum, median and maximum match
  `data.attributes()`; Louvain's group sizes add up to 77, and clicking one selects that many nodes;
  the route lists 5 steps in order;
  Selected lists the node a real click selected; painted counts match `styles.counts`.

**`app-coverage-test`: every style has a home.**

- Files: `graphty/src/workspace/style/coverage.ts` (new), `__tests__/coverage.test.ts` (new).
- What: a map from every published channel, label style field and graph setting to its control or
  its "not offered" reason, and a test that walks the element's lists against it.
- Acceptance: the test passes on the build and fails when the element's list gains an entry the map
  lacks (checked with a stubbed extra channel).

**`owner-review-stories`: what the owner reviews.**

- Files: `graphty/src/workspace/style/StylePanel.stories.tsx` (new), screenshots under
  `design/ui/studio/tier3/build/`.
- What: Les Miserables with the mock's rows (Everything, Selected, Hovered, Annotations, Key people,
  the route, Edge betweenness, Louvain with community 3 recolored, Degree, a draft, and two rows
  selected together) on the real element, each state
  reached by real input in its play function; captures at 1440 x 900 and 900 x 700.
- Acceptance: every play function passes in the storybook project; the screenshot set for the three
  review checkpoints exists.

**`docs-unified-styles`: graphty-element's guide and API reports.**

- Files: `graphty-element/docs/guide/` (new pages on the style tree, rows on both kinds, starting
  rows, rules and text matching, previews, per-value entries and re-run matching, colors across
  rows), `graphty-element/api/*.api.md`, `graphty-element/test/documentation/` (the example
  compiled), `design/ui/studio/owner-decisions.md`, `design/ui/framework/figma-crosswalk.md`.
- What: each addition documented with a first example of about 15 lines that names no internal
  concept, and recorded under "decided by the team" (the split entries there marked replaced). The
  crosswalk's rows that this design supersedes are rewritten to match decision 1.13: Selection
  colors, hand-made folders, "+" on a section, sticky group titles.
- Acceptance: the docs build passes its dead-link check; the guide's examples compile against the
  published types in a test; the API reports show additions only.

### How the owner reviews

The owner sees the panel in three checkpoints, each a set of screenshots of the stories in
`owner-review-stories` plus the app's new workspace on Les Miserables:

1. After `app-layer-tree`, `app-style-tab` and `app-folder-rows-draft`: the tree with its two row
   kinds, Everything, Selected and the route layer at rest, a field cleared with its tooltip
   showing, a folder's Selection colors, two rows edited together (decisions 1.1, 1.3, 1.4, 1.7,
   1.8, 1.13).
2. After the picker, popover, label and effect units: vary by, the ramp editor, Louvain's category
   rows and "New layer for <value>", labels, the "+" menus and the worked examples (decisions 1.2,
   1.5, 1.6, 1.7, 1.10, 1.11, 1.12).
3. After layer 4: the Values tab, Graph settings and the coverage test's output (decision 1.9).

The owner approves the UI before any study runs.

---

## Change log

- **2026-10-12, first version.** The twelve decisions, the panel, the coverage table, the element
  additions, the owner items and the build plan.
- **2026-10-12, after the owner's first review** (`tier3/owner-feedback-1.md`).
    - Unsetting: decision 1.1 now defines three field states (not set, set, set to nothing), one
      command (Clear on an always-drawn minus, only on set fields), its keyboard shortcuts, what the
      reader sees before and after, and inherited list entries as gray lines.
    - Split parents are gone (decision 1.7): two row kinds, layer and folder. Per-group colors are
      value-table entries in the ordinary binding; anything else for one group is "New layer for
      <value>"; several rows are edited at once. The built split command is replaced by
      `element-value-entries`; `app-split-folder-draft` became `app-folder-rows-draft`.
    - New decision 1.13, the Figma consistency pass: the panel header loses its eye and lock and
      gains "Select what it paints"; an eye on every Text and Effects entry; clicking an empty list
      title opens its "+" menu; Selection colors on folders and on several rows; label looks clear
      per field with no Reset. New element unit `element-colors-and-off`.
